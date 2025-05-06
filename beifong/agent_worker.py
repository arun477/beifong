import os
import sys
import json
import time
import asyncio
import signal
from redis.asyncio import Redis
from agno.agent import Agent
from agno.models.openai import OpenAIChat
from db.agent_config import (
    AGENT_MODEL,
    AGENT_DESCRIPTION,
    AGENT_INSTRUCTIONS,
    INITIAL_SESSION_STATE,
    STORAGE,
)
from tools.async_search_articles import search_articles
from tools.async_web_search import web_search
from tools.async_generate_podcast_script import generate_script
from tools.async_generate_podcast_banner import generate_banner
from tools.async_generate_podcast_audio import generate_audio
from tools.async_embedding_search import embedding_search
from tools.session_state_manager import (
    select_sources,
    toggle_source_selection,
    toggle_script_confirm,
    toggle_banner_confirm,
    toggle_audio_confirm,
    toggle_recording_player,
    toggle_podcast_generated,
    update_podcast_info,
    update_language,
)


class AgentWorker:
    def __init__(self, worker_id):
        self.worker_id = worker_id
        self.redis = None
        self.worker_id = worker_id
        self.active = False
        self.request_queue_key = "podcast:request_queue"
        self.result_key_prefix = "podcast:result:"

    async def init_redis(self):
        self.redis = Redis(host="localhost", port=6379, db=0)
        print(f"[Worker {self.worker_id}] Redis connection established")

    def create_podcast_agent(self, session_id):
        print(f"[Worker {self.worker_id}] Creating new agent for session {session_id}")
        return Agent(
            model=OpenAIChat(id=AGENT_MODEL),
            description=AGENT_DESCRIPTION,
            instructions=AGENT_INSTRUCTIONS,
            session_state=INITIAL_SESSION_STATE,
            tools=[
                search_articles,
                web_search,
                select_sources,
                generate_script,
                generate_banner,
                generate_audio,
                embedding_search,
                toggle_source_selection,
                toggle_script_confirm,
                toggle_banner_confirm,
                toggle_audio_confirm,
                toggle_recording_player,
                toggle_podcast_generated,
                update_podcast_info,
                update_language,
            ],
            show_tool_calls=True,
            add_state_in_messages=True,
            add_history_to_messages=True,
            storage=STORAGE,
            markdown=True,
            session_id=session_id,
        )

    async def process_message(self, message_data):
        try:
            data = json.loads(message_data)
            session_id = data["session_id"]
            message = data["message"]
            print(f"[Worker {self.worker_id}] Processing message for session {session_id}")
            agent = self.create_podcast_agent(session_id)

            start_time = time.time()
            response = await agent.arun(message)
            processing_time = time.time() - start_time

            print(f"[Worker {self.worker_id}] Completed processing for session {session_id} in {processing_time:.2f}s")

            result = {
                "session_id": session_id,
                "response": response.content if hasattr(response, "content") else str(response),
                "stage": agent.session_state.get("stage", "unknown"),
                "session_state": json.dumps(agent.session_state),
                "is_processing": False,
                "processing_time": processing_time,
            }

            result_key = f"{self.result_key_prefix}{session_id}"
            await self.redis.setex(result_key, 3600, json.dumps(result))

            lock_key = f"podcast:lock:{session_id}"
            await self.redis.delete(lock_key)

            print(f"[Worker {self.worker_id}] Result stored for session {session_id}")

        except Exception as e:
            print(f"[Worker {self.worker_id}] Error processing message: {str(e)}")

            if "session_id" in locals():
                error_result = {
                    "session_id": session_id,
                    "response": f"An error occurred while processing your request: {str(e)}",
                    "stage": "error",
                    "session_state": "{}",
                    "is_processing": False,
                    "error": str(e),
                }

                result_key = f"{self.result_key_prefix}{session_id}"
                await self.redis.setex(result_key, 3600, json.dumps(error_result))

                lock_key = f"podcast:lock:{session_id}"
                await self.redis.delete(lock_key)

    async def run(self):
        """Main worker loop"""
        self.active = True
        await self.init_redis()
        print(f"[Worker {self.worker_id}] Worker started and ready to process messages")

        while self.active:
            try:
                message = await self.redis.blpop(self.request_queue_key, timeout=1)
                if message:
                    _, data = message
                    print(f"[Worker {self.worker_id}] Received new message from queue")
                    await self.process_message(data)
            except asyncio.CancelledError:
                print(f"[Worker {self.worker_id}] Worker received cancellation request")
                self.active = False
                break
            except Exception as e:
                print(f"[Worker {self.worker_id}] Error in worker loop: {str(e)}")
                await asyncio.sleep(1)

        print(f"[Worker {self.worker_id}] Worker shutting down")
        if self.redis:
            self.redis.close()
            await self.redis.wait_closed()


async def main(worker_id):
    """Entry point for the worker process"""
    worker = AgentWorker(worker_id)

    loop = asyncio.get_event_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, lambda: asyncio.create_task(shutdown(worker, loop)))

    await worker.run()


async def shutdown(worker, loop):
    """Gracefully shutdown the worker"""
    print(f"[Worker {worker.worker_id}] Shutting down worker...")
    worker.active = False
    await asyncio.sleep(0.5)
    loop.stop()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python agent_worker.py <worker_id>")
        sys.exit(1)

    worker_id = sys.argv[1]

    try:
        import signal

        asyncio.run(main(worker_id))
    except KeyboardInterrupt:
        print(f"Worker {worker_id} interrupted")
    except Exception as e:
        print(f"Worker {worker_id} error: {e}")
        raise