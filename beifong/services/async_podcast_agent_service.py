import os
import json
import uuid
import time
import redis
from fastapi import HTTPException, status
from fastapi.responses import JSONResponse
import aiosqlite

from agno.agent import Agent
from agno.models.openai import OpenAIChat
from tools.async_search_articles import search_articles
from tools.async_web_search import web_search
from tools.async_generate_podcast_script import generate_script
from tools.async_generate_podcast_banner import generate_banner
from tools.async_generate_podcast_audio import generate_audio
from tools.async_embedding_search import embedding_search
from tools.session_state_manager import (
    select_sources,
    toggle_source_selection,
    toggle_script_confirm,
    toggle_banner_confirm,
    toggle_audio_confirm,
    toggle_recording_player,
    toggle_podcast_generated,
    update_podcast_info,
    update_language,
)
from db.config import get_agent_session_db_path
from db.agent_config import (
    AGENT_MODEL,
    AGENT_DESCRIPTION,
    AGENT_INSTRUCTIONS,
    PODCAST_DIR,
    PODCAST_AUIDO_DIR,
    PODCAST_IMG_DIR,
    PODCAST_RECORDINGS_DIR,
    INITIAL_SESSION_STATE,
    STORAGE,
)


class PodcastAgentService:
    def __init__(self):
        self.agent = self.create_podcast_agent()
        self.active_sessions = {}
        self.redis = redis.Redis(host="localhost", port=6379, db=0)
        os.makedirs(PODCAST_DIR, exist_ok=True)
        os.makedirs(PODCAST_AUIDO_DIR, exist_ok=True)
        os.makedirs(PODCAST_IMG_DIR, exist_ok=True)
        os.makedirs(PODCAST_RECORDINGS_DIR, exist_ok=True)

    def create_podcast_agent(self, session_id=None):
        return Agent(
            model=OpenAIChat(id=AGENT_MODEL),
            description=AGENT_DESCRIPTION,
            instructions=AGENT_INSTRUCTIONS,
            session_state=INITIAL_SESSION_STATE,
            tools=[
                search_articles,
                web_search,
                select_sources,
                generate_script,
                generate_banner,
                generate_audio,
                embedding_search,
                toggle_source_selection,
                toggle_script_confirm,
                toggle_banner_confirm,
                toggle_audio_confirm,
                toggle_recording_player,
                toggle_podcast_generated,
                update_podcast_info,
                update_language,
            ],
            show_tool_calls=True,
            add_state_in_messages=True,
            add_history_to_messages=True,
            storage=STORAGE,
            markdown=True,
            session_id=session_id,
        )

    async def create_session(self, request=None):
        if request and request.session_id:
            session_id = request.session_id
            if session_id in self.active_sessions:
                print(f"Reusing existing session {session_id}")
                return {"session_id": session_id}
            try:
                db_path = get_agent_session_db_path()
                async with aiosqlite.connect(db_path) as conn:
                    async with conn.execute("SELECT 1 FROM podcast_sessions WHERE session_id = ?", (session_id,)) as cursor:
                        row = await cursor.fetchone()
                        exists = row is not None
                if exists:
                    print(f"Loading session {session_id} from database")
                    agent = self.create_podcast_agent(session_id)
                    self.active_sessions[session_id] = agent
                    return {"session_id": session_id}
                else:
                    print(f"Session {session_id} not found in database")
            except Exception as e:
                print(f"Error checking session existence: {e}")
        new_session_id = str(uuid.uuid4())
        print(f"Creating new session {new_session_id}")
        agent = self.create_podcast_agent()
        agent.session_id = new_session_id
        self.active_sessions[new_session_id] = agent
        return {"session_id": new_session_id}

    async def chat(self, request):
        if request.session_id not in self.active_sessions:
            raise HTTPException(status_code=404, detail="Session not found")

        agent = self.active_sessions[request.session_id]

        # Create Redis lock key for this session
        lock_key = f"podcast:lock:{request.session_id}"

        # Check if there's an existing lock in Redis
        lock_data = self.redis.get(lock_key)
        current_time = time.time()

        if lock_data:
            # Deserialize the lock data from Redis
            operation_info = json.loads(lock_data)

            # Check if the lock is still valid (less than 300 seconds old)
            if current_time - operation_info["started_at"] < 300:
                return {
                    "session_id": request.session_id,
                    "response": "An operation is in progress. Please wait a moment before sending another message.",
                    "stage": agent.session_state.get("stage", "processing"),
                    "session_state": json.dumps(agent.session_state),
                    "is_processing": True,
                    "process_type": operation_info["operation_type"],
                }

        # Set a new lock in Redis with 300 second expiration
        lock_info = {"operation_type": "chat", "started_at": current_time}
        self.redis.setex(lock_key, 300, json.dumps(lock_info))

        try:
            response = await agent.arun(request.message)

            # Release the lock when done
            self.redis.delete(lock_key)

            return {
                "session_id": request.session_id,
                "response": response.content,
                "stage": agent.session_state.get("stage", "unknown"),
                "session_state": json.dumps(agent.session_state),
                "is_processing": False,
            }
        except Exception as e:
            # Make sure to release the lock on error
            self.redis.delete(lock_key)

            print(f"Error processing request: {str(e)}")
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={
                    "session_id": request.session_id,
                    "response": f"I encountered an error while processing your request: {str(e)}. Please try again.",
                    "stage": agent.session_state.get("stage", "unknown"),
                    "session_state": json.dumps(agent.session_state),
                    "error": str(e),
                },
            )

    async def check_processing_status(self, request):
        if request.session_id not in self.active_sessions:
            raise HTTPException(status_code=404, detail="Session not found")

        agent = self.active_sessions[request.session_id]
        processing_status = agent.session_state.get("processing_status", {})

        # Check for Redis lock instead of relying only on session state
        lock_key = f"podcast:lock:{request.session_id}"
        lock_data = self.redis.get(lock_key)

        if not processing_status or not processing_status.get("is_processing", False):
            # No processing status in session state
            if not lock_data:
                # No lock in Redis either, definitely not processing
                return {
                    "session_id": request.session_id,
                    "is_processing": False,
                    "stage": agent.session_state.get("stage", "unknown"),
                    "session_state": json.dumps(agent.session_state),
                }
            else:
                # Lock exists but session state doesn't match - use Redis as source of truth
                lock_info = json.loads(lock_data)
                started_at = lock_info.get("started_at", time.time())
                elapsed_time = time.time() - started_at

                if elapsed_time > 300:
                    # Lock is stale, remove it
                    self.redis.delete(lock_key)
                    agent.session_state["processing_status"] = {
                        "is_processing": False,
                        "process_type": None,
                        "started_at": None,
                        "message": "Process timed out and was reset",
                    }
                    return {
                        "session_id": request.session_id,
                        "is_processing": False,
                        "process_type": lock_info.get("operation_type", "unknown"),
                        "elapsed_seconds": round(elapsed_time),
                        "message": "Process appears to have stalled and was reset",
                        "stage": agent.session_state.get("stage", "unknown"),
                        "session_state": json.dumps(agent.session_state),
                    }
                else:
                    # Lock is valid - session is processing based on Redis
                    return {
                        "session_id": request.session_id,
                        "is_processing": True,
                        "process_type": lock_info.get("operation_type", "unknown"),
                        "elapsed_seconds": round(elapsed_time),
                        "message": processing_status.get("message", "Processing..."),
                        "stage": agent.session_state.get("stage", "unknown"),
                        "session_state": json.dumps(agent.session_state),
                    }

        # Processing status exists in session state
        started_at = processing_status.get("started_at", time.time())
        elapsed_time = time.time() - started_at

        if elapsed_time > 300:
            # Reset both session state and Redis lock
            agent.session_state["processing_status"] = {
                "is_processing": False,
                "process_type": None,
                "started_at": None,
                "message": "Process timed out and was reset",
            }
            if lock_data:
                self.redis.delete(lock_key)

            return {
                "session_id": request.session_id,
                "is_processing": False,
                "process_type": processing_status.get("process_type", "unknown"),
                "elapsed_seconds": round(elapsed_time),
                "message": "Process appears to have stalled and was reset",
                "stage": agent.session_state.get("stage", "unknown"),
                "session_state": json.dumps(agent.session_state),
            }

        return {
            "session_id": request.session_id,
            "is_processing": True if lock_data else False,  # Use Redis as source of truth
            "process_type": processing_status.get("process_type", "unknown"),
            "elapsed_seconds": round(elapsed_time),
            "message": processing_status.get("message", "Processing..."),
            "stage": agent.session_state.get("stage", "unknown"),
            "session_state": json.dumps(agent.session_state),
        }

    async def list_sessions(self, page=1, per_page=10):
        try:
            db_path = get_agent_session_db_path()
            async with aiosqlite.connect(db_path) as conn:
                conn.row_factory = lambda cursor, row: {col[0]: row[idx] for idx, col in enumerate(cursor.description)}
                async with conn.execute(
                    """
                    select name from sqlite_master
                    where type='table' and name='podcast_sessions'
                    """
                ) as cursor:
                    table = await cursor.fetchone()
                if not table:
                    return {
                        "sessions": [],
                        "pagination": {
                            "total": 0,
                            "page": page,
                            "per_page": per_page,
                            "total_pages": 0,
                        },
                    }
                async with conn.execute("SELECT COUNT(*) as count FROM podcast_sessions") as cursor:
                    row = await cursor.fetchone()
                    total_sessions = row["count"] if row else 0
                offset = (page - 1) * per_page
                async with conn.execute(
                    "SELECT session_id, session_data, updated_at FROM podcast_sessions ORDER BY updated_at DESC LIMIT ? OFFSET ?", (per_page, offset)
                ) as cursor:
                    rows = await cursor.fetchall()
                    sessions = []
                    for row in rows:
                        try:
                            session_data = json.loads(row["session_data"]) if isinstance(row["session_data"], str) else row["session_data"]
                            podcast_info = session_data.get("session_state", {}).get("podcast_info", {})
                            topic = podcast_info.get("topic", "Untitled Podcast")
                            stage = session_data.get("session_state", {}).get("stage", "welcome")
                            updated_at = row["updated_at"]
                            sessions.append({"session_id": row["session_id"], "topic": topic, "stage": stage, "updated_at": updated_at})
                        except Exception as e:
                            print(f"Error parsing session data: {e}")
            return {
                "sessions": sessions,
                "pagination": {
                    "total": total_sessions,
                    "page": page,
                    "per_page": per_page,
                    "total_pages": (total_sessions + per_page - 1) // per_page,
                },
            }
        except Exception as e:
            print(f"Error listing sessions: {e}")
            return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content={"error": f"Failed to list sessions: {str(e)}"})

    async def delete_session(self, session_id: str):
        try:
            # Clear any Redis locks for this session
            lock_key = f"podcast:lock:{session_id}"
            self.redis.delete(lock_key)

            db_path = get_agent_session_db_path()
            async with aiosqlite.connect(db_path) as conn:
                conn.row_factory = lambda cursor, row: {col[0]: row[idx] for idx, col in enumerate(cursor.description)}
                async with conn.execute("SELECT session_data FROM podcast_sessions WHERE session_id = ?", (session_id,)) as cursor:
                    row = await cursor.fetchone()
                if not row:
                    return JSONResponse(status_code=status.HTTP_404_NOT_FOUND, content={"error": f"Session with ID {session_id} not found"})
                try:
                    session_data = json.loads(row["session_data"]) if isinstance(row["session_data"], str) else row["session_data"]
                    stage = session_data.get("session_state", {}).get("stage")
                    is_completed = stage == "complete" or session_data.get("session_state", {}).get("podcast_generated", False)
                    banner_url = session_data.get("session_state", {}).get("banner_url")
                    audio_url = session_data.get("session_state", {}).get("audio_url")
                    web_search_recording = session_data.get("session_state", {}).get("web_search_recording")
                    await conn.execute("DELETE FROM podcast_sessions WHERE session_id = ?", (session_id,))
                    await conn.commit()
                    if is_completed:
                        print(f"Session {session_id} is in 'complete' stage, keeping assets but removing session record")
                    else:
                        if banner_url:
                            banner_path = os.path.join(PODCAST_IMG_DIR, banner_url)
                            if os.path.exists(banner_path):
                                try:
                                    os.remove(banner_path)
                                    print(f"Deleted banner image: {banner_path}")
                                except Exception as e:
                                    print(f"Error deleting banner image: {e}")
                        if audio_url:
                            audio_path = os.path.join(PODCAST_AUIDO_DIR, audio_url)
                            if os.path.exists(audio_path):
                                try:
                                    os.remove(audio_path)
                                    print(f"Deleted audio file: {audio_path}")
                                except Exception as e:
                                    print(f"Error deleting audio file: {e}")
                        if web_search_recording:
                            recording_dir = os.path.join(PODCAST_RECORDINGS_DIR, session_id)
                            if os.path.exists(recording_dir):
                                try:
                                    import shutil

                                    shutil.rmtree(recording_dir)
                                    print(f"Deleted recordings directory: {recording_dir}")
                                except Exception as e:
                                    print(f"Error deleting recordings directory: {e}")
                    if session_id in self.active_sessions:
                        del self.active_sessions[session_id]
                        print(f"Removed session {session_id} from active sessions")
                    if is_completed:
                        return {"success": True, "message": f"Session {session_id} deleted, but assets preserved"}
                    else:
                        return {"success": True, "message": f"Session {session_id} and its associated data deleted successfully"}
                except Exception as e:
                    print(f"Error parsing session data for deletion: {e}")
                    return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content={"error": f"Error deleting session: {str(e)}"})
        except Exception as e:
            print(f"Error deleting session: {e}")
            return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content={"error": f"Failed to delete session: {str(e)}"})

    async def get_session_history(self, session_id: str):
        try:
            if session_id not in self.active_sessions:
                agent = self.create_podcast_agent(session_id)
                self.active_sessions[session_id] = agent
            agent = self.active_sessions[session_id]
            db_path = get_agent_session_db_path()
            async with aiosqlite.connect(db_path) as conn:
                conn.row_factory = lambda cursor, row: {col[0]: row[idx] for idx, col in enumerate(cursor.description)}
                async with conn.execute(
                    """
                    select name from sqlite_master
                    where type='table' and name='podcast_sessions'
                    """
                ) as cursor:
                    table = await cursor.fetchone()
                    if not table:
                        return {"session_id": session_id, "messages": [], "state": json.dumps(agent.session_state)}
                async with conn.execute("SELECT memory, session_data FROM podcast_sessions WHERE session_id = ?", (session_id,)) as cursor:
                    row = await cursor.fetchone()
                if not row:
                    return {"session_id": session_id, "state": json.dumps(agent.session_state)}
                formatted_messages = []
                session_state = {}
                if row["session_data"]:
                    try:
                        if isinstance(row["session_data"], str):
                            session_state = json.loads(row["session_data"])["session_state"]
                        else:
                            session_state = row["session_data"]["session_state"]
                        agent.session_state = session_state
                    except json.JSONDecodeError as e:
                        print(f"Error parsing session_data: {e}")
                if row["memory"]:
                    try:
                        memory_data = json.loads(row["memory"]) if isinstance(row["memory"], str) else row["memory"]
                        if "runs" in memory_data and isinstance(memory_data["runs"], list):
                            for run in memory_data["runs"]:
                                if "messages" in run and isinstance(run["messages"], list):
                                    for msg in run["messages"]:
                                        if msg.get("role") in ["user", "assistant"] and "content" in msg:
                                            if msg.get("role") == "assistant" and "tool_calls" in msg:
                                                if not msg.get("content"):
                                                    continue
                                            if msg.get("content"):
                                                formatted_messages.append({"role": msg["role"], "content": msg["content"]})
                    except json.JSONDecodeError as e:
                        print(f"Error parsing memory data: {e}")
                deduplicated_messages = []
                seen_contents = set()
                for msg in formatted_messages:
                    key = f"{msg['role']}:{msg['content'][:100]}"
                    if key not in seen_contents:
                        seen_contents.add(key)
                        deduplicated_messages.append(msg)
            print(f"Retrieved history for session {session_id}: {len(deduplicated_messages)} messages")
            return {"session_id": session_id, "messages": deduplicated_messages, "state": json.dumps(session_state)}
        except Exception as e:
            print(f"Error retrieving session history: {e}")
            return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content={"error": f"Error retrieving session history: {str(e)}"})


podcast_agent_service = PodcastAgentService()