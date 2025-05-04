import uuid
from enum import Enum
from typing import Dict, Any
from services.async_podcast_agent_service import podcast_agent_service as ango_service

class OperationType(str, Enum):
    SESSION_CREATE = "session_create"
    CHAT = "chat"
    SCRIPT_GENERATION = "script_generation"
    BANNER_GENERATION = "banner_generation"
    AUDIO_GENERATION = "audio_generation"
    WEB_SEARCH = "web_search"

class OperationStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class PodcastOperationManager:
    def __init__(self, redis_client):
        self.redis = redis_client
        self.long_running_types = {
            OperationType.SCRIPT_GENERATION,
            OperationType.BANNER_GENERATION,
            OperationType.AUDIO_GENERATION,
            OperationType.WEB_SEARCH,
        }

    async def create_session(self, session_id: str = None) -> Dict[str, Any]:
        try:
            session_request = type("SessionRequest", (), {"session_id": session_id})
            result = await ango_service.create_session(session_request)
            return result
        except Exception:
            raise

    async def process_chat(self, session_id, message):
        try:
            if await self.redis.is_operation_running(session_id):
                operation = await self.redis.get_session_operation(session_id)
                return {
                    "session_id": session_id,
                    "operation_id": operation.get("operation_id"),
                    "operation_type": operation.get("operation_type"),
                    "status": "running",
                    "progress": operation.get("progress", 0),
                    "message": "An operation is already in progress. Please wait.",
                    "isProcessing": True,
                    "processingType": operation.get("operation_type"),
                }

            operation_type = await self._predict_operation_type(session_id, message)
            operation_id = str(uuid.uuid4())

            if operation_type in self.long_running_types:
                await self.redis.register_operation(
                    session_id=session_id, operation_id=operation_id, operation_type=operation_type, data={"message": message}
                )
                await self.redis.enqueue_operation(
                    operation_id=operation_id, session_id=session_id, operation_type=operation_type, data={"message": message}
                )
                return {
                    "session_id": session_id,
                    "operation_id": operation_id,
                    "operation_type": operation_type,
                    "status": "pending",
                    "response": f"Your {operation_type} request is being processed. Please wait.",
                    "isProcessing": True,
                    "processingType": operation_type,
                }

            chat_request = type("ChatRequest", (), {"session_id": session_id, "message": message})
            result = await ango_service.chat(chat_request)
            return result
        except Exception as e:
            error_str = str(e).lower()
            if "session not found" in error_str or "404" in error_str:
                return {
                    "session_id": session_id,
                    "error": True,
                    "response": "Your session has expired. Please refresh the page to start a new session.",
                    "session_expired": True,
                }
            raise

    async def get_operation_status(self, session_id: str) -> Dict[str, Any]:
        try:
            if await self.redis.is_operation_running(session_id):
                operation = await self.redis.get_session_operation(session_id)
                return {
                    "session_id": session_id,
                    "is_processing": True,
                    "operation_id": operation.get("operation_id"),
                    "operation_type": operation.get("operation_type"),
                    "progress": operation.get("progress", 0),
                    "message": operation.get("message", "Processing..."),
                    "stage": operation.get("operation_type"),
                    "session_state": operation.get("session_state", "{}"),
                }

            status_request = type("ProcessStatusRequest", (), {"session_id": session_id})
            result = await ango_service.check_processing_status(status_request)
            return result
        except Exception as e:
            error_str = str(e).lower()
            if "session not found" in error_str or "404" in error_str:
                return {
                    "session_id": session_id,
                    "is_processing": False,
                    "error": True,
                    "message": "Your session has expired. Please refresh the page.",
                    "session_expired": True,
                }
            return {"session_id": session_id, "is_processing": False, "error": True, "message": f"Error: {str(e)}"}

    async def update_operation_progress(self, operation_id: str, progress: int, message: str = None, session_state: Dict[str, Any] = None) -> None:
        update_data = {
            "status": OperationStatus.RUNNING,
            "progress": progress
        }
        if message:
            update_data["message"] = message
        if session_state:
            update_data["session_state"] = session_state
        await self.redis.update_operation(operation_id, update_data)

    async def complete_operation(self, operation_id: str, result: Dict[str, Any]) -> None:
        await self.redis.complete_operation(operation_id, result)

    async def fail_operation(self, operation_id: str, error: str) -> None:
        await self.redis.fail_operation(operation_id, error)

    async def get_operation_result(self, operation_id: str) -> Dict[str, Any]:
        return await self.redis.get_operation_result(operation_id)

    async def _predict_operation_type(self, session_id: str, message: str) -> OperationType:
        """
        Predict the type of operation based on the message content and session state.
        This helps determine if an operation should be queued or processed immediately.
        """
        try:
            # Get the current stage of the session
            status_request = type("ProcessStatusRequest", (), {"session_id": session_id})
            status = await ango_service.check_processing_status(status_request)
            current_stage = status.get("stage", "welcome")

            # Convert message to lowercase for easier pattern matching
            message_lower = message.lower()

            # Pattern matching based on message content and session stage
            if current_stage == "source_selection" and any(str(i) in message for i in range(10)):
                return OperationType.SCRIPT_GENERATION

            if current_stage == "script" and ("approve" in message_lower or "looks good" in message_lower):
                return OperationType.BANNER_GENERATION

            if current_stage == "banner" and ("approve" in message_lower or "looks good" in message_lower):
                return OperationType.AUDIO_GENERATION

            if "search" in message_lower and ("web" in message_lower or "internet" in message_lower):
                return OperationType.WEB_SEARCH

            # Default to regular chat if no patterns match
            return OperationType.CHAT

        except Exception as e:
            # Default to chat if prediction fails
            return OperationType.CHAT

    async def list_sessions(self, page: int = 1, per_page: int = 10) -> Dict[str, Any]:
        """List all saved podcast sessions with pagination"""
        return await ango_service.list_sessions(page, per_page)

    async def get_session_history(self, session_id: str) -> Dict[str, Any]:
        """Get the complete message history for a session"""
        return await ango_service.get_session_history(session_id)

    async def delete_session(self, session_id: str) -> Dict[str, Any]:
        """Delete a podcast session and all its data"""
        # Clean up any operations for this session
        await self.redis.clear_session_operations(session_id)
        return await ango_service.delete_session(session_id)