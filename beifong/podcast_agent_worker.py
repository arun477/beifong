import time
import signal
import sys
import uuid
import json
import os
import asyncio
from typing import Dict, Any
import traceback

# Import Redis client
from redis_client import (
    dequeue_task, 
    set_task_status, 
    set_task_result, 
    remove_completed_task,
    TaskStatus,
    unlock_session  # Import session unlocking function
)

# Import podcast agent service (original implementation)
from services.async_podcast_agent_service import PodcastAgentService

# Create an instance of the original service
podcast_agent_service = PodcastAgentService()

# Flag to control the worker loop
running = True

def signal_handler(sig, frame):
    """Handle termination signals gracefully"""
    global running
    print("\nShutting down podcast agent worker...")
    running = False
    sys.exit(0)

# Register signal handlers for graceful shutdown
signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

async def process_task(task_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Process a task using the podcast agent service.
    
    Args:
        task_data: Task data containing message and session ID
        
    Returns:
        dict: Result data including agent response
    """
    task_id = task_data["task_id"]
    session_id = task_data["session_id"]
    data = task_data["data"]
    
    # Extract message content
    message = data.get("message")
    
    try:
        # Update status to STARTED
        set_task_status(task_id, TaskStatus.STARTED, progress=10, message="Started processing message")
        print(f"Processing task {task_id} for session {session_id}")
        
        # Create proper chat request object
        chat_request = type('ChatRequest', (), {
            "session_id": session_id, 
            "message": message
        })
        
        try:
            # Try to process the message directly with the original service
            print(f"Processing message for session {session_id}")
            set_task_status(task_id, TaskStatus.PROCESSING, progress=50, 
                           message="Processing with podcast agent...")
            
            # Call the original service's chat method
            result = await podcast_agent_service.chat(chat_request)
            
            # Update progress
            set_task_status(task_id, TaskStatus.PROCESSING, progress=75, 
                           message="Finalizing response...")
            
            # Format the result
            formatted_result = {
                "session_id": session_id,
                "response": result.get("response", ""),
                "stage": result.get("stage", "unknown"),
                "session_state": result.get("session_state", "{}"),
                "processed_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            }
            
            # Store result in Redis
            set_task_result(task_id, formatted_result)
            
            # Update status to COMPLETED
            set_task_status(task_id, TaskStatus.COMPLETED, progress=100, 
                           message="Processing complete")
            
            print(f"Completed task {task_id} for session {session_id}")
            return formatted_result
            
        except Exception as chat_error:
            # Log the error
            error_str = str(chat_error)
            print(f"Error processing task: {error_str}")
            traceback_str = traceback.format_exc()
            print(f"Traceback: {traceback_str}")
            
            # Update status to FAILED
            set_task_status(task_id, TaskStatus.FAILED, 
                           message=f"Error: {error_str}")
            
            return {
                "error": error_str,
                "status": "failed"
            }
    
    except Exception as e:
        # Log the full traceback
        traceback_str = traceback.format_exc()
        print(f"Error processing task {task_id}: {str(e)}")
        print(traceback_str)
        
        # Update status to FAILED
        error_message = str(e)
        set_task_status(task_id, TaskStatus.FAILED, 
                       message=f"Error: {error_message}")
        
        return {
            "error": error_message,
            "traceback": traceback_str,
            "status": "failed"
        }
    finally:
        # Always unlock the session when done - successful or not
        print(f"Unlocking session {session_id}")
        unlock_session(session_id)

async def process_tasks_async():
    """Process tasks asynchronously from the Redis queue"""
    print("Podcast agent worker started. Waiting for tasks...")
    
    while running:
        try:
            # Try to get a task from the queue
            task_data = dequeue_task()
            
            if task_data:
                # Log the task reception
                task_id = task_data.get("task_id")
                print(f"Received task: {task_id}")
                
                # Process the task
                await process_task(task_data)
            else:
                # No task available, sleep briefly to avoid CPU spinning
                await asyncio.sleep(0.1)
                
        except Exception as e:
            print(f"Error in worker loop: {e}")
            # Sleep briefly before retrying
            await asyncio.sleep(1)

def main():
    """Main entry point for the worker process"""
    # Set up asyncio event loop
    loop = asyncio.get_event_loop()
    
    try:
        # Run the async task processing function
        loop.run_until_complete(process_tasks_async())
    except KeyboardInterrupt:
        print("Worker interrupted. Shutting down...")
    finally:
        # Close the event loop
        loop.close()

if __name__ == "__main__":
    main()