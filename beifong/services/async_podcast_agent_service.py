import os
import json
import uuid
import time
from redis.asyncio import Redis
from fastapi import status
from fastapi.responses import JSONResponse
import aiosqlite
import sys

from db.config import get_agent_session_db_path
from db.agent_config import (
    PODCAST_DIR,
    PODCAST_AUIDO_DIR,
    PODCAST_IMG_DIR,
    PODCAST_RECORDINGS_DIR,
)
from redis_stream_service import RedisStreamService
from worker_service import worker_service


class PodcastAgentService:
    def __init__(self):
        self.redis = None
        self.stream_service = RedisStreamService()  # New stream service
        os.makedirs(PODCAST_DIR, exist_ok=True)
        os.makedirs(PODCAST_AUIDO_DIR, exist_ok=True)
        os.makedirs(PODCAST_IMG_DIR, exist_ok=True)
        os.makedirs(PODCAST_RECORDINGS_DIR, exist_ok=True)
        self.request_queue_key = "podcast:request_queue"
        self.result_key_prefix = "podcast:result:"

    async def init_redis(self):
        self.redis = await self.stream_service.init_redis()
        print("Redis connection established")

    async def create_session(self, request=None):
        if request and request.session_id:
            session_id = request.session_id
            try:
                db_path = get_agent_session_db_path()
                async with aiosqlite.connect(db_path) as conn:
                    async with conn.execute("SELECT 1 FROM podcast_sessions WHERE session_id = ?", (session_id,)) as cursor:
                        row = await cursor.fetchone()
                        exists = row is not None
                if exists:
                    print(f"Loading session {session_id} from database")
                    return {"session_id": session_id}
                else:
                    print(f"Session {session_id} not found in database")
            except Exception as e:
                print(f"Error checking session existence: {e}")
        new_session_id = str(uuid.uuid4())
        print(f"Creating new session {new_session_id}")
        return {"session_id": new_session_id}

    async def chat(self, request):
        if not self.redis:
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={"error": "Redis connection not initialized"},
            )

        try:
            # Use the stream service to enqueue the message
            result = await self.stream_service.enqueue_message(request.session_id, request.message)
            
            if not result["success"]:
                # Message couldn't be enqueued, return the error
                return {
                    "session_id": request.session_id,
                    "response": result["message"],
                    "stage": "processing" if result["is_processing"] else "error",
                    "session_state": "{}",
                    "is_processing": result["is_processing"],
                    "process_type": result.get("process_type", "unknown"),
                }
            
            # Message was enqueued successfully
            return {
                "session_id": request.session_id,
                "response": "Your request is being processed.",
                "stage": "processing",
                "session_state": "{}",
                "is_processing": True,
                "process_type": "chat",
            }
        except Exception as e:
            print(f"Error queuing request: {str(e)}")
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={
                    "session_id": request.session_id,
                    "response": f"I encountered an error while queuing your request: {str(e)}. Please try again.",
                    "stage": "error",
                    "session_state": "{}",
                    "error": str(e),
                    "is_processing": False,
                },
            )

    async def check_result_status(self, request):
        try:
            if not self.redis:
                return JSONResponse(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    content={"error": "Redis connection not initialized"},
                )
            if not request.session_id:
                return JSONResponse(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    content={"error": "Session ID is required"},
                )
            
            # Use the stream service to get the result
            result = await self.stream_service.get_result(request.session_id)
            
            if not result:
                return {
                    "session_id": request.session_id,
                    "response": "No active request found for this session.",
                    "stage": "idle",
                    "session_state": "{}",
                    "is_processing": False,
                }
            
            # Check session ID match (keeping your original check)
            if result.get("session_id") != request.session_id:
                print(f"ERROR: Session ID mismatch! Expected {request.session_id}, got {result.get('session_id')}")
                return {
                    "session_id": request.session_id,
                    "response": "Error: Received result for wrong session.",
                    "stage": "error",
                    "session_state": "{}",
                    "is_processing": False,
                }
                
            if "is_processing" not in result:
                result["is_processing"] = False
                
            return result
        except Exception as e:
            print(f"Error checking result status: {str(e)}")
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={
                    "error": f"Error checking result status: {str(e)}",
                    "session_id": request.session_id,
                    "response": f"Error checking result status: {str(e)}",
                    "stage": "error",
                    "session_state": "{}",
                    "is_processing": False,
                },
            )

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
            if not self.redis:
                return JSONResponse(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    content={"error": "Redis connection not initialized"},
                )
            lock_key = f"podcast:lock:{session_id}"
            await self.redis.delete(lock_key)
            result_key = f"{self.result_key_prefix}{session_id}"
            await self.redis.delete(result_key)
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
            if not self.redis:
                return JSONResponse(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    content={"error": "Redis connection not initialized"},
                )
            lock_key = f"podcast:lock:{session_id}"
            lock_data = await self.redis.get(lock_key)
            is_processing = False
            process_type = None
            if lock_data:
                operation_info = json.loads(lock_data.decode("utf-8"))
                is_processing = True
                process_type = operation_info.get("operation_type", "unknown")
                print(f"Session {session_id} has active processing: {process_type}")
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
                        return {"session_id": session_id, "messages": [], "state": "{}", "is_processing": is_processing, "process_type": process_type}
                async with conn.execute("SELECT memory, session_data FROM podcast_sessions WHERE session_id = ?", (session_id,)) as cursor:
                    row = await cursor.fetchone()
                if not row:
                    return {"session_id": session_id, "messages": [], "state": "{}", "is_processing": is_processing, "process_type": process_type}
                formatted_messages = []
                session_state = {}
                if row["session_data"]:
                    try:
                        if isinstance(row["session_data"], str):
                            session_state = json.loads(row["session_data"])["session_state"]
                        else:
                            session_state = row["session_data"]["session_state"]
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
            return {
                "session_id": session_id,
                "messages": deduplicated_messages,
                "state": json.dumps(session_state),
                "is_processing": is_processing,
                "process_type": process_type,
            }
        except Exception as e:
            print(f"Error retrieving session history: {e}")
            return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content={"error": f"Error retrieving session history: {str(e)}"})


# Create the singleton instance
podcast_agent_service = PodcastAgentService()


async def startup_worker_event():
    """Initialize the worker service on application startup."""
    await podcast_agent_service.init_redis()
    await worker_service.start()


async def shutdown_worker_event():
    """Shutdown the worker service on application shutdown."""
    await worker_service.stop()