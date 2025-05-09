from fastapi import APIRouter
from typing import Optional
from pydantic import BaseModel
from services.async_podcast_agent_service import podcast_agent_service

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
    is_processing: bool = False
    process_type: Optional[str] = None
    task_id: Optional[str] = None  # Add task_id to response model


class StatusRequest(BaseModel):
    session_id: str
    task_id: Optional[str] = None  # Add optional task_id for status checking


@router.post("/session")
async def create_session(request: SessionRequest = None):
    """Create or reuse a session with the podcast agent"""
    return await podcast_agent_service.create_session(request)


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Send a message to the podcast agent and get a response"""
    # This will queue the message and return immediately with processing status
    return await podcast_agent_service.chat(request)


@router.post("/status", response_model=ChatResponse)
async def check_status(request: StatusRequest):
    """Check if a result is available for the session"""
    # This will use the task_id if available, otherwise query the database
    return await podcast_agent_service.check_result_status(request)


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