"""
Redis Client for Podcast Operations

A clean, focused Redis client for managing podcast operations
"""

import json
import redis
import time
from typing import Dict, Any, Optional

class RedisClient:
    """
    Redis client for tracking podcast operations and their status.
    Handles queuing, progress tracking, and result storage.
    """
    
    def __init__(
        self, 
        host: str = "localhost", 
        port: int = 6379,
        db: int = 0,
        password: str = None,
        operation_ttl: int = 86400
    ):
        self.redis = redis.Redis(
            host=host,
            port=port,
            db=db,
            password=password,
            decode_responses=True
        )
        self.operation_ttl = operation_ttl
        
        self.queue_key = "podcast:operation:queue"
        self.operation_key_prefix = "podcast:operation:"
        self.session_operation_key_prefix = "podcast:session:operation:"
        self.result_key_prefix = "podcast:operation:result:"
        
        # Test connection
        try:
            self.redis.ping()
            print("Connected to Redis")
        except redis.ConnectionError:
            print("Failed to connect to Redis")
            self.redis = None
    
    async def register_operation(
        self, 
        session_id: str,
        operation_id: str,
        operation_type: str,
        data: Dict[str, Any]
    ) -> bool:
        """
        Register a new operation in Redis.
        
        Args:
            session_id: The session ID
            operation_id: Unique identifier for this operation
            operation_type: Type of operation
            data: Operation data
            
        Returns:
            bool: Success status
        """
        if self.redis is None:
            return False
        
        try:
            # Create operation data
            operation_data = {
                "operation_id": operation_id,
                "session_id": session_id,
                "operation_type": operation_type,
                "status": "pending",
                "progress": 0,
                "data": data,
                "created_at": time.time(),
                "updated_at": time.time()
            }
            
            # Store operation data
            operation_key = f"{self.operation_key_prefix}{operation_id}"
            session_operation_key = f"{self.session_operation_key_prefix}{session_id}"
            
            pipe = self.redis.pipeline()
            pipe.set(
                operation_key, 
                json.dumps(operation_data),
                ex=self.operation_ttl
            )
            pipe.set(
                session_operation_key, 
                json.dumps(operation_data),
                ex=self.operation_ttl
            )
            pipe.execute()
            
            print("Registered operation")
            return True
        
        except Exception:
            print("Error registering operation")
            return False
    
    async def enqueue_operation(
        self,
        operation_id: str,
        session_id: str,
        operation_type: str,
        data: Dict[str, Any]
    ) -> bool:
        """
        Enqueue an operation for processing by a worker.
        
        Args:
            operation_id: Unique ID for this operation
            session_id: The session ID
            operation_type: Type of operation
            data: Operation data
            
        Returns:
            bool: Success status
        """
        if self.redis is None:
            print("Redis connection not available")
            return False
        
        try:
            # Create queue item
            queue_item = {
                "operation_id": operation_id,
                "session_id": session_id,
                "operation_type": operation_type,
                "data": data,
                "enqueued_at": time.time()
            }
            
            # Add to queue
            serialized_data = json.dumps(queue_item)
            await self.redis.rpush(self.queue_key, serialized_data)
            print("Enqueued operation")
            return True
        
        except Exception:
            print("Error enqueuing operation")
            return False
    
    async def dequeue_operation(self) -> Optional[Dict[str, Any]]:
        """
        Dequeue an operation for processing.
        
        Returns:
            dict or None: Operation data if available
        """
        if self.redis is None:
            print("Redis connection not available")
            return None
        
        try:
            operation_data = await self.redis.lpop(self.queue_key)

            if not operation_data:
                return None

            operation = json.loads(operation_data)
            print("Dequeued operation")

            return operation
        except Exception:
            print("Error dequeuing operation")
            return None
    
    async def update_operation_progress(
        self,
        operation_id: str,
        progress: int,
        message: Optional[str] = None,
        session_state: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Update the progress of an operation.
        
        Args:
            operation_id: Operation identifier
            progress: Progress percentage (0-100)
            message: Optional status message
            session_state: Optional session state
            
        Returns:
            bool: Success status
        """
        if self.redis is None:
            print("Redis connection not available")
            return False
        
        try:
            # Get existing operation data
            operation_key = self.operation_key_prefix + operation_id
            operation_data_str = self.redis.get(operation_key)
            
            if not operation_data_str:
                print("Operation " + operation_id + " not found")
                return False
            
            operation_data = json.loads(operation_data_str)
            session_id = operation_data.get("session_id")
            
            # Update progress
            operation_data["progress"] = progress
            operation_data["status"] = "running"
            operation_data["updated_at"] = time.time()
            
            if message is not None:
                operation_data["message"] = message
                
            if session_state is not None:
                if isinstance(session_state, dict):
                    operation_data["session_state"] = json.dumps(session_state)
                else:
                    operation_data["session_state"] = session_state
            
            # Update both operation records
            session_operation_key = self.session_operation_key_prefix + session_id
            
            pipe = self.redis.pipeline()
            pipe.set(
                operation_key, 
                json.dumps(operation_data),
                ex=self.operation_ttl
            )
            pipe.set(
                session_operation_key, 
                json.dumps(operation_data),
                ex=self.operation_ttl
            )
            pipe.execute()
            
            print("Updated operation progress")
            return True
            
        except Exception:
            print("Error updating operation progress")
            return False
    
    async def complete_operation(
        self,
        operation_id: str,
        result: Dict[str, Any]
    ) -> bool:
        """
        Mark an operation as completed and store its result.
        
        Args:
            operation_id: Operation identifier
            result: Operation result data
            
        Returns:
            bool: Success status
        """
        if self.redis is None:
            print("Redis connection not available")
            return False
        
        try:
            # Get existing operation data
            operation_key = self.operation_key_prefix + operation_id
            operation_data_str = self.redis.get(operation_key)
            
            if not operation_data_str:
                print("Operation " + operation_id + " not found")
                return False
            
            operation_data = json.loads(operation_data_str)
            session_id = operation_data.get("session_id")
            
            # Update status
            operation_data["status"] = "completed"
            operation_data["progress"] = 100
            operation_data["completed_at"] = time.time()
            operation_data["updated_at"] = time.time()
            operation_data["result"] = result
            
            # Store result separately
            result_key = self.result_key_prefix + operation_id
            
            # Update operation data and store result
            pipe = self.redis.pipeline()
            pipe.set(
                operation_key, 
                json.dumps(operation_data),
                ex=self.operation_ttl
            )
            pipe.set(
                result_key,
                json.dumps(result),
                ex=self.operation_ttl
            )
            
            # Clear the session operation association after completion
            session_operation_key = self.session_operation_key_prefix + session_id
            pipe.delete(session_operation_key)
            
            pipe.execute()
            
            print("Completed operation")
            return True
            
        except Exception:
            print("Error completing operation")
            return False
    
    async def fail_operation(
        self,
        operation_id: str,
        error: str
    ) -> bool:
        """
        Mark an operation as failed.
        
        Args:
            operation_id: Operation identifier
            error: Error message
            
        Returns:
            bool: Success status
        """
        if self.redis is None:
            print("Redis connection not available")
            return False
        
        try:
            # Get existing operation data
            operation_key = self.operation_key_prefix + operation_id
            operation_data_str = self.redis.get(operation_key)
            
            if not operation_data_str:
                print("Operation " + operation_id + " not found")
                return False
            
            operation_data = json.loads(operation_data_str)
            session_id = operation_data.get("session_id")
            
            # Update status
            operation_data["status"] = "failed"
            operation_data["error"] = error
            operation_data["updated_at"] = time.time()
            
            # Update operation data
            pipe = self.redis.pipeline()
            pipe.set(
                operation_key, 
                json.dumps(operation_data),
                ex=self.operation_ttl
            )
            
            # Clear the session operation association after failure
            session_operation_key = self.session_operation_key_prefix + session_id
            pipe.delete(session_operation_key)
            
            pipe.execute()
            
            print("Failed operation")
            return True
            
        except Exception:
            print("Error failing operation")
            return False
    
    async def get_operation(self, operation_id: str) -> Optional[Dict[str, Any]]:
        """
        Get operation data by ID.
        
        Args:
            operation_id: Operation identifier
            
        Returns:
            dict or None: Operation data if found
        """
        if self.redis is None:
            print("Redis connection not available")
            return None
        
        try:
            operation_key = self.operation_key_prefix + operation_id
            operation_data_str = self.redis.get(operation_key)
            
            if not operation_data_str:
                return None
                
            return json.loads(operation_data_str)
            
        except Exception:
            print("Error getting operation")
            return None
    
    async def get_session_operation(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Get the current operation for a session.
        
        Args:
            session_id: Session identifier
            
        Returns:
            dict or None: Operation data if found
        """
        if self.redis is None:
            print("Redis connection not available")
            return None
        
        try:
            session_operation_key = self.session_operation_key_prefix + session_id
            operation_data_str = self.redis.get(session_operation_key)
            
            if not operation_data_str:
                return None
                
            return json.loads(operation_data_str)
            
        except Exception:
            print("Error getting session operation")
            return None
    
    async def is_operation_running(self, session_id: str) -> bool:
        """
        Check if a session has an operation in progress.
        
        Args:
            session_id: Session identifier
            
        Returns:
            bool: True if an operation is in progress
        """
        if self.redis is None:
            print("Redis connection not available")
            return False
        
        try:
            key = self.session_operation_key_prefix + session_id
            session_operation = await self.redis.hgetall(key)

            if session_operation and session_operation.get('status') not in ['completed', 'failed']:
                print("Operation running for session")
                return True

            return False
        except Exception:
            print("Error checking operation status")
            return False
    
    async def get_operation_result(self, operation_id: str) -> Optional[Dict[str, Any]]:
        if self.redis is None:
            print("Redis connection not available")
            return None
        
        try:
            result_key = self.result_key_prefix + operation_id
            result_data_str = self.redis.get(result_key)
            
            if not result_data_str:
                print("No result found for operation")
                return None
                
            result_data = json.loads(result_data_str)
            print("Retrieved result for operation")
            return result_data
            
        except Exception:
            print("Error getting operation result")
            return None
    
    async def clear_session_operations(self, session_id: str) -> bool:
        if self.redis is None:
            print("Redis connection not available")
            return False
        
        try:
            session_operation_key = self.session_operation_key_prefix + session_id
            operation_keys = await self.redis.keys(session_operation_key + "*")
            
            if operation_keys:
                await self.redis.delete(*operation_keys)
                print("Cleared operations for session")
            
            return True
            
        except Exception:
            print("Error clearing session operations")
            return False