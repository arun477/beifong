from fastapi import APIRouter, HTTPException, status
from fastapi.responses import JSONResponse
from typing import Optional, Dict, Any, List
from pydantic import BaseModel
import uuid
import json
import time
import os
import aiosqlite
from agent import chat, is_session_processing  # Import from the worker module
from db.config import get_agent_session_db_path

router = APIRouter()

class SessionRequest(BaseModel):
    session_id: Optional[str] = None

class ChatRequest(BaseModel):
    session_id: str
    message: str

class ChatResponse(BaseModel):
    session_id: str
    response: str
    stage: str
    session_state: str
    is_processing: Optional[bool] = False
    process_type: Optional[str] = None
    elapsed_seconds: Optional[int] = None

class ProcessStatusRequest(BaseModel):
    session_id: str

# Store task IDs and their statuses
task_status: Dict[str, Dict] = {}

@router.post("/session")
async def create_session(request: SessionRequest = None):
    """Create or reuse a session with the podcast agent"""
    session_id = request.session_id if request and request.session_id else str(uuid.uuid4())
    
    # If a session ID is provided, check if it exists
    if request and request.session_id:
        try:
            db_path = get_agent_session_db_path()
            async with aiosqlite.connect(db_path) as conn:
                conn.row_factory = lambda cursor, row: {col[0]: row[idx] for idx, col in enumerate(cursor.description)}
                
                # Check if table exists
                async with conn.execute(
                    "SELECT name FROM sqlite_master WHERE type='table' AND name='podcast_sessions'"
                ) as cursor:
                    table = await cursor.fetchone()
                    if not table:
                        # Table doesn't exist, create a new session
                        return {"session_id": str(uuid.uuid4())}
                
                async with conn.execute(
                    "SELECT 1 FROM podcast_sessions WHERE session_id = ?", 
                    (session_id,)
                ) as cursor:
                    row = await cursor.fetchone()
                    if not row:
                        # Session ID doesn't exist, create a new one
                        session_id = str(uuid.uuid4())
        except Exception as e:
            print(f"Error checking session existence: {e}")
            # On error, create a new session
            session_id = str(uuid.uuid4())
    
    return {"session_id": session_id}

@router.post("/chat", response_model=ChatResponse)
async def send_message(request: ChatRequest):
    """Send a message to the podcast agent and get a response"""
    # Check if session is already processing
    if is_session_processing(request.session_id):
        # Try to get current session state
        session_state = {}
        stage = "processing"
        try:
            db_path = get_agent_session_db_path()
            async with aiosqlite.connect(db_path) as conn:
                conn.row_factory = lambda cursor, row: {col[0]: row[idx] for idx, col in enumerate(cursor.description)}
                
                # Check if table exists
                async with conn.execute(
                    "SELECT name FROM sqlite_master WHERE type='table' AND name='podcast_sessions'"
                ) as cursor:
                    table = await cursor.fetchone()
                    if not table:
                        # Table doesn't exist yet
                        pass
                    else:
                        # Get session state
                        async with conn.execute(
                            "SELECT session_data FROM podcast_sessions WHERE session_id = ?", 
                            (request.session_id,)
                        ) as cursor:
                            row = await cursor.fetchone()
                            if row and row["session_data"]:
                                try:
                                    session_data = json.loads(row["session_data"]) if isinstance(row["session_data"], str) else row["session_data"]
                                    if "session_state" in session_data:
                                        session_state = session_data["session_state"]
                                        stage = session_state.get("stage", "processing")
                                except Exception as e:
                                    print(f"Error parsing session data: {e}")
        except Exception as e:
            print(f"Error accessing database: {e}")
            
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={
                "session_id": request.session_id,
                "response": "This session already has a message being processed. Please wait for it to complete.",
                "stage": stage,
                "session_state": json.dumps(session_state),
                "is_processing": True,
                "process_type": "chat"
            }
        )
    
    # Submit the task to Celery
    try:
        # Submit task to Celery
        result = chat.delay(request.message, session_id=request.session_id)
        task_id = result.id
        
        # Store task status
        task_status[task_id] = {
            "status": "PENDING",
            "session_id": request.session_id,
            "message": request.message,
            "result": None
        }
        
        # Return immediate response with task ID
        return {
            "session_id": request.session_id,
            "response": "Your message is being processed...",
            "task_id": task_id,
            "stage": "processing",
            "session_state": json.dumps({"is_processing": True, "process_type": "chat"}),
            "is_processing": True,
            "process_type": "chat"
        }
    except Exception as e:
        print(f"Error sending message: {e}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "session_id": request.session_id,
                "response": f"An error occurred while processing your message: {str(e)}",
                "stage": "error",
                "session_state": json.dumps({"error": str(e)}),
                "is_processing": False,
                "error": str(e)
            }
        )

@router.post("/status")
async def check_status(request: ProcessStatusRequest):
    """Check if a session has any pending tasks and get the current status"""
    # Check if session is locked (being processed)
    is_processing = is_session_processing(request.session_id)
    
    # Get session state from database
    db_path = get_agent_session_db_path()
    session_state = {}
    stage = "unknown"
    
    try:
        async with aiosqlite.connect(db_path) as conn:
            conn.row_factory = lambda cursor, row: {col[0]: row[idx] for idx, col in enumerate(cursor.description)}
            
            # Check if table exists
            async with conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='podcast_sessions'"
            ) as cursor:
                table = await cursor.fetchone()
                if not table:
                    # Table doesn't exist yet
                    return {
                        "session_id": request.session_id,
                        "is_processing": is_processing,
                        "stage": "welcome",
                        "session_state": "{}"
                    }
            
            # Get session state
            async with conn.execute(
                "SELECT session_data FROM podcast_sessions WHERE session_id = ?", 
                (request.session_id,)
            ) as cursor:
                row = await cursor.fetchone()
                if row and row["session_data"]:
                    try:
                        session_data = json.loads(row["session_data"]) if isinstance(row["session_data"], str) else row["session_data"]
                        if "session_state" in session_data:
                            session_state = session_data["session_state"]
                            stage = session_state.get("stage", "unknown")
                    except Exception as e:
                        print(f"Error parsing session data: {e}")
    except Exception as e:
        print(f"Error checking session status: {e}")
    
    # Check for long-running processes
    processing_time = 0
    if is_processing:
        try:
            # This info would need to come from Redis lock timing
            processing_time = 0  # Placeholder
        except Exception as e:
            print(f"Error checking processing time: {e}")
    
    # If processing has been going on too long (10+ minutes), consider it stalled
    if processing_time > 600:
        message = "Process appears to have stalled and was reset"
        is_processing = False
    else:
        message = "Processing..." if is_processing else "Completed"
    
    return {
        "session_id": request.session_id,
        "is_processing": is_processing,
        "status": "PENDING" if is_processing else "COMPLETED",
        "stage": stage,
        "elapsed_seconds": processing_time if is_processing else None,
        "message": message,
        "session_state": json.dumps(session_state)
    }

@router.get("/sessions")
async def list_sessions(page: int = 1, per_page: int = 10):
    """List all saved podcast sessions with pagination"""
    db_path = get_agent_session_db_path()
    try:
        async with aiosqlite.connect(db_path) as conn:
            conn.row_factory = lambda cursor, row: {col[0]: row[idx] for idx, col in enumerate(cursor.description)}
            
            # Check if table exists
            async with conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='podcast_sessions'"
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
            
            # Count total sessions
            async with conn.execute("SELECT COUNT(*) as count FROM podcast_sessions") as cursor:
                row = await cursor.fetchone()
                total_sessions = row["count"] if row else 0
            
            # Get sessions for current page
            offset = (page - 1) * per_page
            async with conn.execute(
                "SELECT session_id, session_data, updated_at FROM podcast_sessions ORDER BY updated_at DESC LIMIT ? OFFSET ?",
                (per_page, offset)
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
                        sessions.append({
                            "session_id": row["session_id"],
                            "topic": topic,
                            "stage": stage,
                            "updated_at": updated_at
                        })
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
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"error": f"Failed to list sessions: {str(e)}"}
        )

@router.get("/session_history")
async def get_session_history(session_id: str):
    """Get the complete message history for a session"""
    db_path = get_agent_session_db_path()
    try:
        async with aiosqlite.connect(db_path) as conn:
            conn.row_factory = lambda cursor, row: {col[0]: row[idx] for idx, col in enumerate(cursor.description)}
            
            # Check if table exists
            async with conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='podcast_sessions'"
            ) as cursor:
                table = await cursor.fetchone()
                if not table:
                    return {"session_id": session_id, "messages": [], "state": "{}"}
            
            # Get session data and memory
            async with conn.execute(
                "SELECT memory, session_data FROM podcast_sessions WHERE session_id = ?",
                (session_id,)
            ) as cursor:
                row = await cursor.fetchone()
                if not row:
                    return {"session_id": session_id, "messages": [], "state": "{}"}
                
                messages = []
                session_state = {}
                
                # Parse session_data
                if row["session_data"]:
                    try:
                        if isinstance(row["session_data"], str):
                            session_state = json.loads(row["session_data"])["session_state"]
                        else:
                            session_state = row["session_data"]["session_state"]
                    except Exception as e:
                        print(f"Error parsing session_data: {e}")
                
                # Parse memory to extract messages
                if row["memory"]:
                    try:
                        memory_data = json.loads(row["memory"]) if isinstance(row["memory"], str) else row["memory"]
                        if "runs" in memory_data and isinstance(memory_data["runs"], list):
                            for run in memory_data["runs"]:
                                if "messages" in run and isinstance(run["messages"], list):
                                    for msg in run["messages"]:
                                        if msg.get("role") in ["user", "assistant"] and "content" in msg:
                                            # Skip assistant messages with tool calls but no content
                                            if msg.get("role") == "assistant" and "tool_calls" in msg and not msg.get("content"):
                                                continue
                                            
                                            if msg.get("content"):
                                                messages.append({"role": msg["role"], "content": msg["content"]})
                    except Exception as e:
                        print(f"Error parsing memory data: {e}")
                
                # Deduplicate messages to avoid repeats
                deduplicated_messages = []
                seen_contents = set()
                for msg in messages:
                    # Create a key from role and first 100 chars to detect duplicates
                    key = f"{msg['role']}:{msg['content'][:100]}"
                    if key not in seen_contents:
                        seen_contents.add(key)
                        deduplicated_messages.append(msg)
                
                return {
                    "session_id": session_id,
                    "messages": deduplicated_messages,
                    "state": json.dumps(session_state)
                }
    except Exception as e:
        print(f"Error retrieving session history: {e}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"error": f"Error retrieving session history: {str(e)}"}
        )

@router.delete("/session/{session_id}")
async def delete_session(session_id: str):
    """Delete a podcast session and all its associated data"""
    db_path = get_agent_session_db_path()
    try:
        async with aiosqlite.connect(db_path) as conn:
            conn.row_factory = lambda cursor, row: {col[0]: row[idx] for idx, col in enumerate(cursor.description)}
            
            # Get session data to check if it's a completed podcast
            async with conn.execute(
                "SELECT session_data FROM podcast_sessions WHERE session_id = ?",
                (session_id,)
            ) as cursor:
                row = await cursor.fetchone()
                if not row:
                    return JSONResponse(
                        status_code=status.HTTP_404_NOT_FOUND,
                        content={"error": f"Session with ID {session_id} not found"}
                    )
                
                # Parse session data to check if it's a completed podcast
                is_completed = False
                banner_url = None
                audio_url = None
                web_search_recording = None
                
                try:
                    session_data = json.loads(row["session_data"]) if isinstance(row["session_data"], str) else row["session_data"]
                    stage = session_data.get("session_state", {}).get("stage")
                    is_completed = stage == "complete" or session_data.get("session_state", {}).get("podcast_generated", False)
                    banner_url = session_data.get("session_state", {}).get("banner_url")
                    audio_url = session_data.get("session_state", {}).get("audio_url")
                    web_search_recording = session_data.get("session_state", {}).get("web_search_recording")
                except Exception as e:
                    print(f"Error parsing session data: {e}")
            
            # Delete the session record
            await conn.execute("DELETE FROM podcast_sessions WHERE session_id = ?", (session_id,))
            await conn.commit()
            
            # For completed podcasts, keep the assets but remove the session record
            if is_completed:
                return {
                    "success": True,
                    "message": f"Session {session_id} deleted, but assets preserved"
                }
            
            # For incomplete podcasts, also delete associated files
            podcast_dir = os.environ.get("PODCAST_DIR", "podcasts")
            podcast_img_dir = os.path.join(podcast_dir, "images")
            podcast_audio_dir = os.path.join(podcast_dir, "audio")
            podcast_recordings_dir = os.path.join(podcast_dir, "recordings")
            
            # Delete banner image if exists
            if banner_url:
                banner_path = os.path.join(podcast_img_dir, banner_url)
                if os.path.exists(banner_path):
                    try:
                        os.remove(banner_path)
                        print(f"Deleted banner image: {banner_path}")
                    except Exception as e:
                        print(f"Error deleting banner image: {e}")
            
            # Delete audio file if exists
            if audio_url:
                audio_path = os.path.join(podcast_audio_dir, audio_url)
                if os.path.exists(audio_path):
                    try:
                        os.remove(audio_path)
                        print(f"Deleted audio file: {audio_path}")
                    except Exception as e:
                        print(f"Error deleting audio file: {e}")
            
            # Delete web search recordings if they exist
            if web_search_recording:
                recording_dir = os.path.join(podcast_recordings_dir, session_id)
                if os.path.exists(recording_dir):
                    try:
                        import shutil
                        shutil.rmtree(recording_dir)
                        print(f"Deleted recordings directory: {recording_dir}")
                    except Exception as e:
                        print(f"Error deleting recordings directory: {e}")
            
            return {
                "success": True,
                "message": f"Session {session_id} and its associated data deleted successfully"
            }
            
    except Exception as e:
        print(f"Error deleting session: {e}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"error": f"Failed to delete session: {str(e)}"}
        )