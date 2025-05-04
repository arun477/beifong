import json
import redis
from typing import Dict, List, Any, Optional, Union
import time
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Redis configuration
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_DB = int(os.getenv("REDIS_DB", 0))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", None)

# Redis key prefixes
TASK_STATUS_PREFIX = "podcast:task:status:"
TASK_RESULT_PREFIX = "podcast:task:result:"
TASK_QUEUE = "podcast:task:queue"
USER_TASKS_PREFIX = "podcast:session:tasks:"
SESSION_LOCK_PREFIX = "podcast:session:lock:"

# Result TTL in Redis (seconds)
RESULT_TTL = 3600 * 24  # 24 hours
SESSION_LOCK_TTL = 300  # 5 minutes

# Task status constants
class TaskStatus:
    PENDING = "PENDING"
    STARTED = "STARTED"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

# Create Redis client connection
try:
    redis_client = redis.Redis(
        host=REDIS_HOST,
        port=REDIS_PORT,
        db=REDIS_DB,
        password=REDIS_PASSWORD,
        decode_responses=True  # Automatically decode responses to strings
    )
    redis_client.ping()  # Test connection
    print(f"Successfully connected to Redis at {REDIS_HOST}:{REDIS_PORT}")
except Exception as e:
    print(f"Failed to connect to Redis: {e}")
    redis_client = None

# Task queue functions
def enqueue_task(task_id: str, session_id: str, data: Dict[str, Any]) -> bool:
    """
    Enqueue a new task in Redis.
    
    Args:
        task_id: Unique identifier for the task
        session_id: Session ID for the task
        data: Task data including message content
        
    Returns:
        bool: Success status
    """
    if redis_client is None:
        print("Redis client not available")
        return False
    
    try:
        task_data = {
            "task_id": task_id,
            "session_id": session_id,
            "data": data,
            "enqueued_at": time.time()
        }
        # Add to processing queue
        redis_client.lpush(TASK_QUEUE, json.dumps(task_data))
        
        # Add to session's active tasks set
        redis_client.sadd(f"{USER_TASKS_PREFIX}{session_id}", task_id)
        
        # Set initial status
        set_task_status(task_id, TaskStatus.PENDING)
        
        return True
    except Exception as e:
        print(f"Error enqueueing task: {e}")
        return False

def dequeue_task() -> Optional[Dict[str, Any]]:
    """
    Dequeue a task from Redis.
    
    Returns:
        dict or None: Task data if available, None otherwise
    """
    if redis_client is None:
        print("Redis client not available")
        return None
    
    try:
        # Block for 1 second waiting for a task, then move on
        result = redis_client.brpop(TASK_QUEUE, timeout=1)
        if result:
            _, task_data_str = result
            return json.loads(task_data_str)
        return None
    except Exception as e:
        print(f"Error dequeuing task: {e}")
        return None

# Task status functions
def set_task_status(task_id: str, status: str, progress: Optional[int] = None, message: Optional[str] = None) -> bool:
    """
    Set task status in Redis.
    
    Args:
        task_id: Task identifier
        status: Task status string
        progress: Optional progress percentage (0-100)
        message: Optional status message
        
    Returns:
        bool: Success status
    """
    if redis_client is None:
        print("Redis client not available")
        return False
    
    try:
        status_data = {
            "status": status,
            "updated_at": time.time()
        }
        if progress is not None:
            status_data["progress"] = progress
        if message is not None:
            status_data["message"] = message
        
        status_key = f"{TASK_STATUS_PREFIX}{task_id}"
        redis_client.set(status_key, json.dumps(status_data))
        
        # Set expiration for completed or failed tasks
        if status in [TaskStatus.COMPLETED, TaskStatus.FAILED]:
            redis_client.expire(status_key, RESULT_TTL)
        
        return True
    except Exception as e:
        print(f"Error setting task status: {e}")
        return False

def get_task_status(task_id: str) -> Optional[Dict[str, Any]]:
    """
    Get task status from Redis.
    
    Args:
        task_id: Task identifier
        
    Returns:
        dict or None: Task status data if available
    """
    if redis_client is None:
        print("Redis client not available")
        return None
    
    try:
        status_data = redis_client.get(f"{TASK_STATUS_PREFIX}{task_id}")
        return json.loads(status_data) if status_data else None
    except Exception as e:
        print(f"Error getting task status: {e}")
        return None

# Task result functions
def set_task_result(task_id: str, result: Dict[str, Any]) -> bool:
    """
    Store task result in Redis.
    
    Args:
        task_id: Task identifier
        result: Result data
        
    Returns:
        bool: Success status
    """
    if redis_client is None:
        print("Redis client not available")
        return False
    
    try:
        result_key = f"{TASK_RESULT_PREFIX}{task_id}"
        redis_client.set(result_key, json.dumps(result))
        redis_client.expire(result_key, RESULT_TTL)  # Set TTL
        return True
    except Exception as e:
        print(f"Error setting task result: {e}")
        return False

def get_task_result(task_id: str) -> Optional[Dict[str, Any]]:
    """
    Get task result from Redis.
    
    Args:
        task_id: Task identifier
        
    Returns:
        dict or None: Task result if available
    """
    if redis_client is None:
        print("Redis client not available")
        return None
    
    try:
        result_data = redis_client.get(f"{TASK_RESULT_PREFIX}{task_id}")
        return json.loads(result_data) if result_data else None
    except Exception as e:
        print(f"Error getting task result: {e}")
        return None

# Session tasks functions
def get_session_active_tasks(session_id: str) -> List[str]:
    """
    Get all active tasks for a session.
    
    Args:
        session_id: Session identifier
        
    Returns:
        list: List of active task IDs
    """
    if redis_client is None:
        print("Redis client not available")
        return []
    
    try:
        return list(redis_client.smembers(f"{USER_TASKS_PREFIX}{session_id}"))
    except Exception as e:
        print(f"Error getting session tasks: {e}")
        return []

def remove_completed_task(session_id: str, task_id: str) -> bool:
    """
    Remove a task from a session's active tasks.
    
    Args:
        session_id: Session identifier
        task_id: Task identifier
        
    Returns:
        bool: Success status
    """
    if redis_client is None:
        print("Redis client not available")
        return False
    
    try:
        redis_client.srem(f"{USER_TASKS_PREFIX}{session_id}", task_id)
        return True
    except Exception as e:
        print(f"Error removing completed task: {e}")
        return False

# Session locking functions
def lock_session(session_id: str, lock_ttl: int = SESSION_LOCK_TTL) -> bool:
    """
    Lock a session to prevent concurrent processing.
    
    Args:
        session_id: Session identifier
        lock_ttl: Lock time-to-live in seconds
        
    Returns:
        bool: True if lock was acquired, False if already locked
    """
    if redis_client is None:
        print("Redis client not available")
        return False
    
    lock_key = f"{SESSION_LOCK_PREFIX}{session_id}"
    try:
        # Try to set the lock only if it doesn't exist (NX option)
        result = redis_client.set(lock_key, "1", nx=True, ex=lock_ttl)
        return result is not None and result
    except Exception as e:
        print(f"Error locking session: {e}")
        return False

def unlock_session(session_id: str) -> bool:
    """
    Unlock a session after processing is complete.
    
    Args:
        session_id: Session identifier
        
    Returns:
        bool: Success status
    """
    if redis_client is None:
        print("Redis client not available")
        return False
    
    lock_key = f"{SESSION_LOCK_PREFIX}{session_id}"
    try:
        redis_client.delete(lock_key)
        return True
    except Exception as e:
        print(f"Error unlocking session: {e}")
        return False

def is_session_locked(session_id: str) -> bool:
    """
    Check if a session is currently locked.
    
    Args:
        session_id: Session identifier
        
    Returns:
        bool: True if locked, False otherwise
    """
    if redis_client is None:
        print("Redis client not available")
        return False
    
    lock_key = f"{SESSION_LOCK_PREFIX}{session_id}"
    try:
        return redis_client.exists(lock_key) == 1
    except Exception as e:
        print(f"Error checking session lock: {e}")
        return False

# Health check function
def check_redis_connection() -> bool:
    """Check if Redis connection is active."""
    if redis_client is None:
        return False
    
    try:
        return redis_client.ping()
    except Exception:
        return False