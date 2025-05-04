"""
Podcast Router

FastAPI router for podcast operations with clean, well-defined endpoints
"""

import time
from fastapi import APIRouter, Depends, HTTPException, status, Request
from typing import Optional, Dict, Any
from pydantic import BaseModel

# Import the operation manager
from podcast_operation_manager import PodcastOperationManager
from redis_client import RedisClient

# Create components
redis_client = RedisClient()
operation_manager = PodcastOperationManager(redis_client)

# Create router
router = APIRouter()

# Define request and response models
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
    try:
        return await operation_manager.create_session(
            session_id=request.session_id if request else None
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating session: {str(e)}"
        )

@router.post("/chat")
async def chat(request: ChatRequest):
    """
    Send a message to the podcast agent and get a response or queue a long-running task.
    This endpoint handles both immediate responses and long-running operations.
    """
    start_time = time.time()
    
    try:
        result = await operation_manager.process_chat(
            session_id=request.session_id,
            message=request.message
        )
        
        # Add processing time
        elapsed_seconds = int(time.time() - start_time)
        if isinstance(result, dict):
            result["elapsed_seconds"] = elapsed_seconds
            
        return result
        
    except Exception as e:
        # Log the error but return a user-friendly response
        elapsed_seconds = int(time.time() - start_time)
        return {
            "session_id": request.session_id,
            "error": True,
            "response": f"Error: {str(e)}",
            "elapsed_seconds": elapsed_seconds
        }

@router.post("/status")
async def check_status(request: ProcessStatusRequest):
    """
    Check the status of any ongoing operation for a session.
    This endpoint provides progress updates for long-running operations.
    """
    try:
        return await operation_manager.get_operation_status(
            session_id=request.session_id
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error checking status: {str(e)}"
        )

@router.get("/sessions")
async def list_sessions(page: int = 1, per_page: int = 10):
    """List all saved podcast sessions with pagination"""
    try:
        return await operation_manager.list_sessions(page, per_page)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listing sessions: {str(e)}"
        )

@router.get("/session_history")
async def get_session_history(session_id: str):
    """Get the complete message history for a session"""
    try:
        return await operation_manager.get_session_history(session_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting session history: {str(e)}"
        )

@router.delete("/session/{session_id}")
async def delete_session(session_id: str):
    """Delete a podcast session and all its data"""
    try:
        return await operation_manager.delete_session(session_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting session: {str(e)}"
        )

@router.get("/latest_message")
async def get_latest_message(session_id: str):
    """Get the latest message for a session (maintains API compatibility)"""
    try:
        history = await operation_manager.get_session_history(session_id)
        if history and history.get("messages") and len(history["messages"]) > 0:
            return {"latest_message": history["messages"][-1]}
        return {"latest_message": None}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting latest message: {str(e)}"
        )