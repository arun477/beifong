import asyncio
import signal
import sys
import os
import traceback
from redis_client import RedisClient
from podcast_operation_manager import PodcastOperationManager
from services.async_podcast_agent_service import PodcastAgentService

redis_client = RedisClient(
    host=os.getenv("REDIS_HOST", "localhost"),
    port=int(os.getenv("REDIS_PORT", 6379)),
    db=int(os.getenv("REDIS_DB", 0)),
    password=os.getenv("REDIS_PASSWORD", None)
)
operation_manager = PodcastOperationManager(redis_client)
ango_service = PodcastAgentService()
running = True

def signal_handler(sig, frame):
    global running
    print("Shutting down podcast worker...")
    running = False
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

async def process_operation(operation_data):
    operation_id = operation_data.get("operation_id")
    session_id = operation_data.get("session_id")
    operation_type = operation_data.get("operation_type")
    data = operation_data.get("data", {})
    
    print(f"Processing operation {operation_id} of type {operation_type}")
    
    try:
        await operation_manager.update_operation_progress(
            operation_id=operation_id,
            progress=10,
            message=f"Starting {operation_type}..."
        )
        
        message = data.get("message", "")
        chat_request = type('ChatRequest', (), {
            "session_id": session_id, 
            "message": message
        })
        
        await operation_manager.update_operation_progress(
            operation_id=operation_id,
            progress=30,
            message=f"Processing {operation_type}..."
        )
        
        result = await ango_service.chat(chat_request)
        
        session_state = result.get("session_state", "{}")
        
        await operation_manager.update_operation_progress(
            operation_id=operation_id,
            progress=70,
            message=f"Finalizing {operation_type}...",
            session_state=session_state
        )
        
        await asyncio.sleep(1)
        
        await operation_manager.complete_operation(
            operation_id=operation_id,
            result=result
        )
        
        print(f"Completed operation {operation_id}")
        
    except Exception as e:
        error_message = str(e)
        print(f"Error processing operation {operation_id}: {error_message}")
        print(traceback.format_exc())
        
        await operation_manager.fail_operation(
            operation_id=operation_id,
            error=error_message
        )

async def process_operations_loop():
    print("Podcast worker started")
    
    while running:
        try:
            operation_data = await redis_client.dequeue_operation()
            
            if operation_data:
                operation_id = operation_data.get("operation_id")
                print(f"Dequeued operation: {operation_id}")
                
                await process_operation(operation_data)
            else:
                await asyncio.sleep(0.1)
                
        except Exception as e:
            print(f"Error in worker loop: {str(e)}")
            print(traceback.format_exc())
            await asyncio.sleep(1)

async def main():
    try:
        await process_operations_loop()
    except KeyboardInterrupt:
        print("Worker interrupted")
    except Exception as e:
        print(f"Unhandled exception: {str(e)}")
        print(traceback.format_exc())

if __name__ == "__main__":
    asyncio.run(main())