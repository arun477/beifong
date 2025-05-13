from agno.agent import Agent
import os
import json
import sqlite3  # Changed from aiosqlite
from datetime import datetime
from db.config import get_podcasts_db_path
from typing import List, Dict, Any


DB_PATH = "databases"
PODCAST_DIR = "podcasts"
PODCAST_IMG_DIR = PODCAST_DIR + "/images"
PODCAST_AUIDO_DIR = PODCAST_DIR + "/audio"
PODCAST_RECORDINGS_DIR = PODCAST_DIR + "/recordings"


def add_to_search_results(agent: Agent, items: List[Dict[str, Any]]) -> str:
    """
    Add search results to the session state search_results.
    Args:
        agent: The agent instance
        items: List of search results
    Returns:
        Confirmation message
    """
    agent.session_state["search_results"].extend(items)
    return f"Source added: {items}"


def remove_from_search_results(agent: Agent, url: str, all: bool = False) -> str:
    """
    Remove search results from the session state search_results.
    Args:
        agent: The agent instance
        url: URL of the search result to remove
        all: Boolean indicating whether to remove all search results
    Returns:
        Confirmation message
    """
    if all:
        agent.session_state["search_results"] = []
        return "All sources removed"
    else:
        agent.session_state["search_results"] = [item for item in agent.session_state["search_results"] if item["url"] != url]
        return f"Source removed: {url}"


def select_sources(agent: Agent, selected_ids: str) -> str:
    """
    Store the user's selected article sources.

    Args:
        agent: The agent instance
        selected_ids: String containing article numbers comma separted without any spaces.

    Returns:
        Confirmation message
    """
    agent.session_state["show_sources_for_selection"] = False
    try:
        selected_numbers = [int(num.strip()) for num in selected_ids.replace(",", " ").split()]
        selected_indices = [num - 1 for num in selected_numbers]
    except ValueError:
        return "Please provide valid article numbers, e.g., '1, 3, 5'."
    search_results = agent.session_state.get("search_results", [])
    selected_articles = []
    for idx in selected_indices:
        if 0 <= idx < len(search_results):
            article = search_results[idx]
            if "source_id" in article and "source_name" not in article:
                article["source_name"] = article.get("source_id", "Unknown")
            if "content" in article and "summary" not in article:
                article["summary"] = article.get("content", "")
            selected_articles.append(article)
    agent.session_state["selected_sources"] = selected_articles
    agent.session_state["stage"] = "script"
    selected_language = agent.session_state.get("selected_language", {"code": "en", "name": "English"})
    language_name = selected_language.get("name", "English")
    if selected_articles:
        titles = [f"• {article['title']} ({article.get('url', 'No URL')})" for article in selected_articles]
        return (
            f"Great! You've selected {len(selected_articles)} sources:\n"
            + "\n".join(titles)
            + f"\n\nI'll use these to generate your podcast script in {language_name}. Would you like me to create the script now?"
        )
    else:
        return "No valid sources were selected. Please select at least one source by number to continue."


def update_podcast_info(agent: Agent, topic: str) -> str:
    """
    Update the podcast information with the specified topic.
    This ensures the topic is properly tracked for generating titles and context.

    Args:
        agent: The agent instance
        topic: The podcast topic

    Returns:
        Confirmation message
    """
    podcast_info = agent.session_state.get("podcast_info", {})
    if not podcast_info:
        podcast_info = {}
    podcast_info["topic"] = topic
    agent.session_state["podcast_info"] = podcast_info
    return f"Podcast topic set to: {topic}"


def toggle_source_selection(agent: Agent, status: bool = False) -> str:
    """
    Toggle the show_sources_for_selection flag.
    This controls whether the source selection UI is shown to the user.
    """
    if status:
        agent.session_state["show_script_for_confirmation"] = False
        agent.session_state["show_banner_for_confirmation"] = False
        agent.session_state["show_audio_for_confirmation"] = False
    agent.session_state["show_sources_for_selection"] = status
    return f"source selection status changed to: {status}"


def toggle_script_confirm(agent: Agent, status: bool = False) -> str:
    """
    Toggle the show_script_for_confirmation flag.
    This controls whether the script confirmation UI is shown to the user.
    """
    if status:
        agent.session_state["show_sources_for_selection"] = False
        agent.session_state["show_banner_for_confirmation"] = False
        agent.session_state["show_audio_for_confirmation"] = False
    agent.session_state["show_script_for_confirmation"] = status
    return f"script confirmation status changed to: {status}"


def toggle_banner_confirm(agent: Agent, status: bool = False) -> str:
    """
    Toggle the show_banner_for_confirmation flag.
    This controls whether the banner confirmation UI is shown to the user.
    """
    if status:
        agent.session_state["show_sources_for_selection"] = False
        agent.session_state["show_script_for_confirmation"] = False
        agent.session_state["show_audio_for_confirmation"] = False
    agent.session_state["show_banner_for_confirmation"] = status
    return f"banner confirmation status changed to: {status}"


def toggle_audio_confirm(agent: Agent, status: bool = False) -> str:
    """
    Toggle the show_audio_for_confirmation flag.
    This controls whether the audio player is shown to the user.
    """
    if status:
        agent.session_state["show_sources_for_selection"] = False
        agent.session_state["show_script_for_confirmation"] = False
        agent.session_state["show_banner_for_confirmation"] = False
    agent.session_state["show_audio_for_confirmation"] = status
    return f"audio confirmation status changed to: {status}"


def toggle_recording_player(agent: Agent, status: bool = False) -> str:
    """
    Toggle the show_recording_player flag.
    This controls whether the web search recording player is shown to the user.
    """
    agent.session_state["show_recording_player"] = status
    return f"Recording player visibility changed to: {status}"


def _save_podcast_to_database_sync(agent: Agent) -> tuple[bool, str, int]:
    """
    Private synchronous function to save a completed podcast to the podcasts database.
    Ensures sources are in the correct format (List[str]).

    Args:
        agent: The agent instance with the completed podcast data

    Returns:
        A tuple of (success, message, podcast_id)
    """
    try:
        if agent.session_state.get("podcast_id"):
            return (
                True,
                f"Podcast already saved with ID: {agent.session_state['podcast_id']}",
                agent.session_state["podcast_id"],
            )
        podcast_info = agent.session_state.get("podcast_info", {})
        generated_script = agent.session_state.get("generated_script", {})
        banner_url = agent.session_state.get("banner_url")
        audio_url = agent.session_state.get("audio_url")
        selected_language = agent.session_state.get("selected_language", {"code": "en", "name": "English"})
        language_code = selected_language.get("code", "en")
        if not generated_script or not isinstance(generated_script, dict):
            return (
                False,
                "Cannot complete podcast: Generated script is missing or invalid.",
                None,
            )
        if "title" not in generated_script:
            generated_script["title"] = podcast_info.get("topic", "Untitled Podcast")
        if "sections" not in generated_script or not isinstance(generated_script["sections"], list):
            return (
                False,
                "Cannot complete podcast: Generated script is missing required 'sections' array.",
                None,
            )
        sources = []
        if "sources" in generated_script and generated_script["sources"]:
            for source in generated_script["sources"]:
                if isinstance(source, str):
                    sources.append(source)
                elif isinstance(source, dict) and "url" in source:
                    sources.append(source["url"])
                elif isinstance(source, dict) and "link" in source:
                    sources.append(source["link"])
        generated_script["sources"] = sources
        db_path = get_podcasts_db_path()
        db_directory = DB_PATH
        os.makedirs(db_directory, exist_ok=True)

        conn = sqlite3.connect(db_path)
        content_json = json.dumps(generated_script)
        sources_json = json.dumps(sources) if sources else None
        current_time = datetime.now().isoformat()
        query = """
            INSERT INTO podcasts (
                title, 
                date, 
                content_json, 
                audio_generated, 
                audio_path,
                banner_img_path, 
                tts_engine, 
                language_code, 
                sources_json,
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """
        conn.execute(
            query,
            (
                generated_script.get("title", "Untitled Podcast"),
                datetime.now().strftime("%Y-%m-%d"),
                content_json,
                1 if audio_url else 0,
                audio_url,
                banner_url,
                "openai",
                language_code,
                sources_json,
                current_time,
            ),
        )
        conn.commit()

        cursor = conn.execute("SELECT last_insert_rowid()")
        podcast_id = cursor.fetchone()
        podcast_id = podcast_id[0] if podcast_id else None
        cursor.close()
        conn.close()

        agent.session_state["podcast_id"] = podcast_id
        return True, f"Podcast successfully saved with ID: {podcast_id}", podcast_id
    except Exception as e:
        print(f"Error saving podcast to database: {e}")
        return False, f"Error saving podcast to database: {str(e)}", None


def toggle_podcast_generated(agent: Agent, status: bool = False) -> str:
    """
    Toggle the podcast_generated flag.
    When set to true, this indicates the podcast creation process is complete and
    the UI should show the final presentation view with all components.
    If status is True, also saves the podcast to the podcasts database.
    """
    if status:
        agent.session_state["show_sources_for_selection"] = False
        agent.session_state["show_script_for_confirmation"] = False
        agent.session_state["show_banner_for_confirmation"] = False
        agent.session_state["show_audio_for_confirmation"] = False
        agent.session_state["show_recording_player"] = False
        agent.session_state["podcast_generated"] = status
        agent.session_state["stage"] = "complete" if status else agent.session_state.get("stage")
        if status:
            try:
                success, message, podcast_id = _save_podcast_to_database_sync(agent)
                if success and podcast_id:
                    agent.session_state["podcast_id"] = podcast_id
                    return f"Podcast generated and saved to database with ID: {podcast_id}. You can now access it from the Podcasts section."
                else:
                    return f"Podcast generated, but there was an issue with saving: {message}"
            except Exception as e:
                print(f"Error saving podcast to database: {e}")
                return f"Podcast generated, but there was an error saving it to the database: {str(e)}"
    else:
        agent.session_state["podcast_generated"] = status
        agent.session_state["stage"] = "complete" if status else agent.session_state.get("stage")
    return f"Podcast generated status changed to: {status}"


def update_language(agent: Agent, language_code: str) -> str:
    """
    Update the podcast language with the specified language code.
    This ensures the language is properly tracked for generating content and audio.

    Args:
        agent: The agent instance
        language_code: The language code (e.g., 'en', 'es', 'fr')

    Returns:
        Confirmation message
    """
    language_name = "English"
    for lang in agent.session_state.get("available_languages", []):
        if lang.get("code") == language_code:
            language_name = lang.get("name")
            break
    agent.session_state["selected_language"] = {
        "code": language_code,
        "name": language_name,
    }
    podcast_info = agent.session_state.get("podcast_info", {})
    if not podcast_info:
        podcast_info = {}
    podcast_info["language"] = language_code
    podcast_info["language_name"] = language_name
    agent.session_state["podcast_info"] = podcast_info
    return f"Podcast language set to: {language_name} ({language_code})"