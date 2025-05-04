import uuid
import json
import time
from typing import Dict, Any, Optional
from fastapi import HTTPException, status
from fastapi.responses import JSONResponse

# Import the original service for direct processing
from services.async_podcast_agent_service import podcast_agent_service as original_service

# Import Redis client for task queueing and session locking
from redis_client import (
    enqueue_task,
    get_task_status,
    get_task_result,
    get_session_active_tasks,
    TaskStatus,
    lock_session,
    unlock_session,
    is_session_locked
)

class QueuedPodcastAgentService:
    """
    Service for managing podcast agent sessions and interactions using a queue system.
    """

    def __init__(self):
        """Initialize the queued podcast agent service."""
        self.original_service = original_service
        print("Initialized QueuedPodcastAgentService")

    async def create_session(self, request=None):
        """
        Create or reuse a session with the podcast agent.
        This passes directly to the original service without queueing.
        """
        # Pass directly to original service - we won't queue session creation
        return await self.original_service.create_session(request)

    async def chat(self, request):
        """
        Send a message to the podcast agent and get a response.
        Uses session locking to prevent concurrent processing on the same session.
        """
        session_id = request.session_id
        message = request.message
        
        # Step 1: Check if session is already locked (being processed)
        if is_session_locked(session_id):
            return {
                "session_id": session_id,
                "response": "An operation is already in progress for this session. Please wait until it completes.",
                "stage": "processing",
                "session_state": "{}",
                "isProcessing": True,
                "processingType": "chat"
            }
        
        # Step 2: Try to lock the session for processing
        if not lock_session(session_id):
            return {
                "session_id": session_id,
                "response": "Unable to start processing. Please try again.",
                "stage": "error",
                "session_state": "{}",
                "isProcessing": False,
                "error": True
            }
        
        try:
            # Step 3: First check if the session exists by passing directly to original service
            try:
                # Use the original service's chat method directly to validate session
                direct_result = await self.original_service.chat(request)
                
                # If we get here, the session is valid and the message was processed directly
                # No need for queuing - return the result immediately
                return direct_result
                
            except Exception as direct_error:
                error_str = str(direct_error).lower()
                
                # If session not found, return error to frontend
                if "session not found" in error_str or "404" in error_str:
                    unlock_session(session_id)  # Release the lock
                    return {
                        "session_id": session_id,
                        "response": "Session not found or expired. Please create a new session.",
                        "stage": "error",
                        "session_state": "{}",
                        "isProcessing": False,
                        "error": True,
                        "session_expired": True  # Signal frontend to create new session
                    }
                
                # For other errors, we'll try processing via queue
                print(f"Direct processing failed, using queue: {error_str}")
                
                # Generate a unique task ID
                task_id = str(uuid.uuid4())
                
                # Enqueue the task
                task_data = {
                    "message": message,
                    "timestamp": time.time()
                }
                
                success = enqueue_task(task_id, session_id, task_data)
                if not success:
                    unlock_session(session_id)  # Release the lock if queueing fails
                    raise Exception("Failed to queue task")
                
                # Task successfully queued
                return {
                    "session_id": session_id,
                    "response": "Your message is being processed. Please wait a moment.",
                    "stage": "processing",
                    "session_state": "{}",
                    "isProcessing": True,
                    "processingType": "chat",
                    "task_id": task_id
                }
        
        except Exception as e:
            # Unlock the session on any error
            unlock_session(session_id)
            
            return {
                "session_id": session_id,
                "response": f"Error: {str(e)}",
                "stage": "error",
                "session_state": "{}",
                "isProcessing": False,
                "error": True
            }

    async def check_processing_status(self, request):
        """
        Check if a session has a running process and provide status updates.
        """
        session_id = request.session_id
        
        # Check if session is locked (being processed)
        session_locked = is_session_locked(session_id)
        
        # Check Redis for active tasks
        active_tasks = get_session_active_tasks(session_id)
        
        if active_tasks:
            # Get status for the most recent task
            task_id = active_tasks[0]
            status_data = get_task_status(task_id)
            
            if status_data:
                status = status_data.get("status")
                message = status_data.get("message", "")
                progress = status_data.get("progress", 0)
                
                # If task is completed, get the result and unlock session
                if status == TaskStatus.COMPLETED:
                    result = get_task_result(task_id)
                    unlock_session(session_id)  # Release the lock
                    
                    if result:
                        session_state = result.get("session_state", "{}")
                        return {
                            "session_id": session_id,
                            "is_processing": False,
                            "task_id": task_id,
                            "status": status,
                            "message": message,
                            "progress": progress,
                            "result": result,
                            "stage": result.get("stage", "unknown"),
                            "session_state": session_state
                        }
                
                # If task failed, unlock session
                elif status == TaskStatus.FAILED:
                    unlock_session(session_id)  # Release the lock
                    return {
                        "session_id": session_id,
                        "is_processing": False,
                        "task_id": task_id,
                        "status": status,
                        "message": message,
                        "progress": 100,
                        "error": True,
                        "stage": "error",
                        "session_state": "{}"
                    }
                
                # Task is still in progress
                return {
                    "session_id": session_id,
                    "is_processing": True,
                    "task_id": task_id,
                    "status": status,
                    "message": message,
                    "progress": progress,
                    "stage": "processing",
                    "session_state": "{}"
                }
        
        # If no active tasks but session is locked, report processing
        if session_locked:
            return {
                "session_id": session_id,
                "is_processing": True,
                "message": "Processing...",
                "progress": 50,  # Default progress
                "stage": "processing",
                "session_state": "{}"
            }
        
        # No active tasks or locks, check with original service
        try:
            return await self.original_service.check_processing_status(request)
        except Exception as e:
            # If original service errors (like session not found)
            return {
                "session_id": session_id,
                "is_processing": False,
                "error": True,
                "message": f"Error: {str(e)}",
                "stage": "error",
                "session_state": "{}"
            }

    async def list_sessions(self, page=1, per_page=10):
        """List all saved podcast sessions with pagination"""
        return await self.original_service.list_sessions(page, per_page)

    async def get_session_history(self, session_id):
        """Get the complete message history for a session"""
        return await self.original_service.get_session_history(session_id)

    async def delete_session(self, session_id):
        """Delete a podcast session and all its data"""
        # Unlock the session if it's locked
        unlock_session(session_id)
        return await self.original_service.delete_session(session_id)

# Create a singleton instance
podcast_agent_service = QueuedPodcastAgentService()