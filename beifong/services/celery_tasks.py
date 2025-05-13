from services.celery_app import app, SessionLockedTask
from agno.agent import Agent
from agno.models.openai import OpenAIChat
from agno.storage.sqlite import SqliteStorage
from agno.tools.newspaper4k import Newspaper4kTools
import os
import json
from db.config import get_agent_session_db_path
from db.agent_config import (
    AGENT_DESCRIPTION,
    AGENT_INSTRUCTIONS,
    AGENT_MODEL,
    INITIAL_SESSION_STATE,
)
from tools.web_search import web_search
from tools.generate_podcast_script import generate_script
from tools.generate_podcast_banner import generate_banner
from tools.generate_podcast_audio import generate_audio
from tools.embedding_search import embedding_search
from tools.search_articles import search_articles
from tools.wikipedia_search import wikipedia_search
from tools.wikidata_search import wikidata_search
from tools.arxiv_search import arxiv_search
from tools.world_bank_search import worldbank_search
from tools.openlibrary_search import openlibrary_search
from tools.jikan_search import jikan_search
from tools.session_state_manager import (
    toggle_banner_confirm,
    toggle_audio_confirm,
    toggle_recording_player,
    toggle_podcast_generated,
    update_language,
    select_sources,
    update_podcast_info,
    toggle_source_selection,
    toggle_script_confirm,
    add_to_search_results,
    remove_from_search_results,
)


@app.task(bind=True, max_retries=0, base=SessionLockedTask)
def agent_chat(self, session_id, message):
    try:
        print(f"Processing message for session {session_id}: {message[:50]}...")
        db_file = get_agent_session_db_path()
        os.makedirs(os.path.dirname(db_file), exist_ok=True)
        session_state_format = "[current session states: " + ", ".join([f"{key}: {{{key}}}" for key in INITIAL_SESSION_STATE.keys()]) + "]"
        agent = Agent(
            model=OpenAIChat(id=AGENT_MODEL, api_key=os.getenv("OPENAI_API_KEY")),
            session_id=session_id,
            storage=SqliteStorage(table_name="podcast_sessions", db_file=db_file),
            add_history_to_messages=True,
            read_chat_history=True,
            add_state_in_messages=True,
            num_history_runs=30,
            instructions=AGENT_INSTRUCTIONS + [session_state_format],
            description=AGENT_DESCRIPTION,
            session_state=INITIAL_SESSION_STATE,
            tools=[
                web_search,
                toggle_banner_confirm,
                toggle_audio_confirm,
                toggle_recording_player,
                toggle_podcast_generated,
                update_language,
                select_sources,
                update_podcast_info,
                toggle_source_selection,
                toggle_script_confirm,
                generate_script,
                generate_banner,
                generate_audio,
                embedding_search,
                search_articles,
                wikipedia_search,
                wikidata_search,
                arxiv_search,
                worldbank_search,
                openlibrary_search,
                jikan_search,
                Newspaper4kTools(),
                add_to_search_results,
                remove_from_search_results,
            ],
        )
        response = agent.run(message)
        print(f"Response generated for session {session_id}")
        return {
            "session_id": session_id,
            "response": response.content,
            "stage": agent.session_state.get("stage", "unknown"),
            "session_state": json.dumps(agent.session_state),
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