from agno.agent import Agent
from agno.models.openai import OpenAIChat
from agno.storage.sqlite import SqliteStorage
from agno.tools.newspaper4k import Newspaper4kTools
import os
from dotenv import load_dotenv
from services.celery_app import app, SessionLockedTask

from db.config import get_agent_session_db_path
from db.agent_config_v2 import (
    AGENT_DESCRIPTION,
    AGENT_INSTRUCTIONS,
    AGENT_MODEL,
    INITIAL_SESSION_STATE,
)
from agents.search_agent import search_agent_run
from agents.scrape_agent import scrape_agent_run
from agents.script_agent import podcast_script_agent_run
from agents.ui_manager import ui_manager_run
from agents.user_source_selection import user_source_selection_run
from agents.session_state_manager import update_language, update_chat_title, mark_session_finished
from agents.image_generate_agent import image_generation_agent_run
from agents.audio_generate_agent import audio_generate_agent_run
import json

load_dotenv()

db_file = get_agent_session_db_path()


@app.task(bind=True, max_retries=0, base=SessionLockedTask)
def agent_chat(self, session_id, message):
    try:
        print(f"Processing message for session {session_id}: {message[:50]}...")
        db_file = get_agent_session_db_path()
        os.makedirs(os.path.dirname(db_file), exist_ok=True)
        _agent = Agent(
            model=OpenAIChat(id=AGENT_MODEL, api_key=os.getenv("OPENAI_API_KEY")),
            storage=SqliteStorage(table_name="podcast_sessions", db_file=db_file),
            add_history_to_messages=True,
            read_chat_history=True,
            add_state_in_messages=True,
            num_history_runs=30,
            instructions=AGENT_INSTRUCTIONS,
            description=AGENT_DESCRIPTION,
            session_state=INITIAL_SESSION_STATE,
            tools=[
                search_agent_run,
                scrape_agent_run,
                ui_manager_run,
                user_source_selection_run,
                update_language,
                podcast_script_agent_run,
                image_generation_agent_run,
                audio_generate_agent_run,
                update_chat_title,
                mark_session_finished,
            ],
            markdown=True,
        )
        response = _agent.run(message, session_id=session_id)
        print(f"Response generated for session {session_id}")
        return {
            "session_id": session_id,
            "response": response.content,
            "stage": _agent.session_state.get("stage", "unknown"),
            "session_state": json.dumps(_agent.session_state),
            "is_processing": False,
            "process_type": None,
        }
    except Exception as e:
        print(f"Error in agent_chat for session {session_id}: {str(e)}")
        return {
            "session_id": session_id,
            "response": f"I'm sorry, I encountered an error: {str(e)}. Please try again.",
            "stage": "error",
            "session_state": "{}",
            "is_processing": False,
            "process_type": None,
        }
