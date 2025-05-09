from celery import Celery, Task
import redis
import os
import json
import time

# Use environment variables or defaults for Redis configuration
REDIS_HOST = os.environ.get("REDIS_HOST", "localhost")
REDIS_PORT = int(os.environ.get("REDIS_PORT", 6379))
REDIS_DB = int(os.environ.get("REDIS_DB", 0))

# Redis client for session locking
redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=REDIS_DB+1)

# Create Celery app with Redis as broker and backend
app = Celery(
    "beifong_tasks", 
    broker=f"redis://{REDIS_HOST}:{REDIS_PORT}/{REDIS_DB}",
    backend=f"redis://{REDIS_HOST}:{REDIS_PORT}/{REDIS_DB}"
)

# Celery configuration
app.conf.update(
    result_expires=3600,
    task_track_started=True,
    worker_concurrency=2,  # Reduced from 4 to lower resource contention
    task_acks_late=True,
    task_time_limit=600,   # 10-minute time limit for tasks
    task_soft_time_limit=540,  # 9-minute soft time limit (allows for cleanup)
)

# Session locking mechanism to prevent concurrent processing of the same session
class SessionLockedTask(Task):
    def __call__(self, *args, **kwargs):
        session_id = args[0] if args else kwargs.get("session_id")

        if not session_id:
            print("No session_id provided for task")
            return super().__call__(*args, **kwargs)

        lock_key = f"lock:{session_id}"
        
        # Check for stale locks (locks older than 15 minutes)
        lock_info = redis_client.get(f"lock_info:{session_id}")
        if lock_info:
            try:
                lock_time = float(lock_info.decode('utf-8'))
                if time.time() - lock_time > 900:  # 15 minutes
                    print(f"Found stale lock for session {session_id}, removing")
                    redis_client.delete(lock_key)
                    redis_client.delete(f"lock_info:{session_id}")
            except (ValueError, TypeError) as e:
                print(f"Error checking lock time: {e}")
        
        # Try to acquire lock with 10-minute expiration
        acquired = redis_client.set(lock_key, "1", nx=True, ex=60 * 10)  
        
        # Store lock timestamp for stale lock detection
        if acquired:
            redis_client.set(f"lock_info:{session_id}", str(time.time()), ex=60 * 15)

        if not acquired:
            print(f"Session {session_id} is already being processed")
            return {
                "error": "Session busy",
                "response": "This session is already processing a message. Please wait.",
                "session_id": session_id,
                "stage": "busy",
                "session_state": "{}",
                "is_processing": True,
                "process_type": "chat"
            }

        try:
            print(f"Acquired lock for session {session_id}")
            return super().__call__(*args, **kwargs)
        finally:
            # Clean up lock and lock info
            redis_client.delete(lock_key)
            redis_client.delete(f"lock_info:{session_id}")
            print(f"Released lock for session {session_id}")