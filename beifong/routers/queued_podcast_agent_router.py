from fastapi import APIRouter, Depends, HTTPException, status, Request
from typing import Optional, Dict, Any
from pydantic import BaseModel
import time

# Import the queued podcast agent service
from services.queued_podcast_agent_service import podcast_agent_service

router = APIRouter()

# Define request and response models (keeping the same as the original)
class SessionRequest(BaseModel):
    session_id: Optional[str] = None

class ChatRequest(BaseModel):
    session_id: str
    message: str

class ProcessStatusRequest(BaseModel):
    session_id: str

# API Endpoints
@router.post("/session")
async def create_session(request: SessionRequest = None):
    """Create or reuse a session with the podcast agent"""
    return await podcast_agent_service.create_session(request)

@router.post("/chat")
async def chat(request: ChatRequest):
    """
    Send a message to the podcast agent and get a response.
    Uses session locking to prevent concurrent processing.
    """
    start_time = time.time()
    result = await podcast_agent_service.chat(request)
    
    # Add processing time for metrics
    if isinstance(result, dict):
        elapsed_seconds = int(time.time() - start_time)
        result["elapsed_seconds"] = elapsed_seconds
    
    return result

@router.post("/status")
async def check_processing_status(request: ProcessStatusRequest):
    """
    Check if a session has a running process and provide status updates.
    Enhanced to check Redis queue status and session locks.
    """
    return await podcast_agent_service.check_processing_status(request)

@router.get("/sessions")
async def list_sessions(page: int = 1, per_page: int = 10):
    """List all saved podcast sessions with pagination"""
    return await podcast_agent_service.list_sessions(page, per_page)

@router.get("/session_history")
async def get_session_history(session_id: str):
    """Get the complete message history for a session"""
    return await podcast_agent_service.get_session_history(session_id)

@router.delete("/session/{session_id}")
async def delete_session(session_id: str):
    """Delete a podcast session and all its data"""
    return await podcast_agent_service.delete_session(session_id)

@router.get("/latest_message")
async def get_latest_message(session_id: str):
    """Get the latest message for a session (maintains API compatibility)"""
    try:
        history = await podcast_agent_service.get_session_history(session_id)
        if history and history.get("messages") and len(history["messages"]) > 0:
            return {"latest_message": history["messages"][-1]}
        return {"latest_message": None}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))