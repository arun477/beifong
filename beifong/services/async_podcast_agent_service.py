import os
import json
import uuid
import time
from datetime import datetime
from fastapi import HTTPException, status
from fastapi.responses import JSONResponse
import aiosqlite

from agno.agent import Agent
from agno.models.openai import OpenAIChat
from agno.storage.sqlite import SqliteStorage
from tools.async_search_articles import search_articles
from tools.async_web_search import web_search
from tools.async_generate_podcast_script import generate_script
from tools.async_generate_podcast_banner import generate_banner
from tools.async_generate_podcast_audio import generate_audio
from tools.async_embedding_search import embedding_search
from db.config import get_podcasts_db_path, get_agent_session_db_path

DB_PATH = "databases"
PODCAST_DIR = "podcasts"
PODCAST_IMG_DIR = PODCAST_DIR + "/images"
PODCAST_AUIDO_DIR = PODCAST_DIR + "/audio"
PODCAST_RECORDINGS_DIR = PODCAST_DIR + "/recordings"
AGENT_MODEL = "gpt-4o"
AVAILABLE_LANGS = [
    {"code": "en", "name": "English"},
    {"code": "zh", "name": "Chinese (Mandarin)"},
    {"code": "hi", "name": "Hindi"},
    {"code": "es", "name": "Spanish"},
    {"code": "fr", "name": "French"},
    {"code": "ar", "name": "Arabic"},
    {"code": "bn", "name": "Bengali"},
    {"code": "ru", "name": "Russian"},
    {"code": "pt", "name": "Portuguese"},
    {"code": "id", "name": "Indonesian"},
    {"code": "ta", "name": "Tamil"},
]
AGENT_DESCRIPTION = "You are name is Beifong, a helpful assistant that guides users through creating podcast episodes."
# sacred commandments, touch these with devotion.
AGENT_INSTRUCTIONS = [
    "Guide users through creating a podcast with these exact steps:",
    "1. When the user starts a conversation, ask for their podcast topic and mention they can specify a language preference.",
    # search strategy
    "2. As soon as the user mentions a topic, call update_podcast_info to store the topic, then execute three search tools in this order: embedding_search, search_articles, and web_search with the topic as the query parameter. This provides semantic search, keyword search, and web results. IMPORTANT: You MUST check the response of each search method to determine if it found results or not. If a search returns a message indicating NO results were found, you MUST continue with the next search method. Only stop searching when you have at least 3 relevant sources. For web_search, include this task parameter: 'Find 3-5 recent, diverse sources about [TOPIC]. For each, extract the title, URL, and a 2-3 sentence summary relevant to [TOPIC]. Format as JSON array with title, url, and content properties. Focus on credible news sites, research publications, and industry reports. If you encounter any errors or limitations, return partial results rather than nothing. Even a single good source is better than no results. If you find multiple sources, prioritize information diversity over quantity.'",
    # quality filtering
    "2a. After all search results are collected but BEFORE calling toggle_source_selection(true), examine agent.session_state['search_results'] carefully. If this array is empty or contains fewer than 2 sources, inform the user: 'I couldn't find enough relevant sources for your topic. Would you like to try a broader topic or different keywords?' If there are sources, remove any that are clearly irrelevant to the user's topic. You should keep high-quality semantic matches (≥85% similarity) and relevant web results, but remove any that are off-topic, outdated, or low-quality. If you remove results, inform the user: 'I've filtered out some less relevant sources to focus on the most useful information for your podcast.' If after filtering, you have at least 2 sources, proceed to step 3. Otherwise, suggest the user try a different topic.",
    # source selection with SEPARATE language handling
    "3. After searches complete AND you have at least 2 relevant sources, call toggle_source_selection(true) to show source selection UI. Tell users they can select sources by number (e.g., '1, 3, 5') and also choose their preferred language from the dropdown in the UI. don't forget toggle_source_selection(true)",
    # recording player instructions
    "4. If the user asks about the web search process or wants to see how sources were found, call toggle_recording_player(true). After they indicate they're done viewing, call toggle_recording_player(false). IMPORTANT: When handling the recording player, first call toggle_source_selection(false) before calling toggle_recording_player(true) to avoid having multiple UI components active. Similarly, after the user indicates they're done viewing the recording (with phrases like 'thanks', 'that's interesting', 'I'm done', etc.), immediately call toggle_recording_player(false) and then call toggle_source_selection(true) to return to the source selection interface. Never leave the recording player active while proceeding to other steps.",
    # handle language selection separately
    "5. When the user mentions a language preference at ANY point, immediately call update_language with the appropriate language code (e.g., 'en' for English, 'es' for Spanish).",
    # handle user-provided URLs
    "5a. If the user provides a URL at any point before source selection is confirmed:",
    "    - Immediately use the web_search tool with the URL as the topic parameter",
    "    - For the task parameter, use: 'Visit ONLY this specific URL: [URL]. Extract the title and create a 2-3 sentence summary of the content. Do not search for additional sources. Return in JSON format with title, url, and content fields.'",
    "    - When the web_search completes, simply inform the user: 'I've added [domain.com] to your available sources.'",
    "    - If the URL processing fails, briefly inform the user: 'I couldn't extract content from that URL. Let's continue with the other sources.'",
    "    - If url extraction successfull make sure to toggle_source_selection(true)",
    # source selection
    "6. When the user provides source selections (e.g., '1, 3, 5'), first check if a language has been set. If not, ask them which language they prefer and call update_language. Then call select_sources with ONLY their numerical selections.",
    # script generation and review
    "7. After confirming sources, immediately call generate_script. Once complete, call toggle_script_confirm(true) and tell the user to review the script in the UI.",
    # banner generation
    "8. After script approval, call toggle_script_confirm(false) then call generate_banner. This will show the banner for review and set toggle_banner_confirm to true.",
    # audio generation
    "9. After banner approval, call toggle_banner_confirm(false) followed by generate_audio. This will show the audio player and set toggle_audio_confirm to true.",
    # finalization
    "10. After audio approval, call toggle_audio_confirm(false) and toggle_podcast_generated(true) to show the final presentation. and call update_podcast_info to store the updated final short topic (which will be used as chat title, irrespecitve of the original search topic always call with approriate short title)",
    # error handling
    "11. If any tool fails or returns an error, explain the issue to the user in simple terms and offer alternatives (e.g., 'The search didn't find relevant articles. Would you like to try a different topic or more specific keywords?').",
    # modification workflows
    "12. For change requests at any stage:",
    "    - Script changes: Call toggle_script_confirm(false), explain changes you'll make, then call generate_script with a custom_prompt describing the changes, followed by toggle_script_confirm(true)",
    "    - Banner changes: Call toggle_banner_confirm(false), ask for specific imagery preferences, then call generate_banner with a custom_prompt parameter, followed by toggle_banner_confirm(true)",
    "    - Audio changes: Currently limited capabilities - explain that regeneration will use the same voices but may have slight variations in delivery",
    # important rules
    "IMPORTANT: Only ONE toggle_X function should be set to true at any time.",
    "IMPORTANT: Always follow the exact sequence and don't skip steps.",
    "IMPORTANT: Handle language selection as a separate action from source selection.",
    "IMPORTANT: When a user pastes a URL, use the web_search tool with that specific URL to extract content.",
    "IMPORTANT: If search returns no results, suggest broader topics or different keywords.",
    "IMPORTANT: Acknowledge most user instructions before executing tool calls, EXCEPT for URL processing which should be handled silently and efficiently.",
    "IMPORTANT: NEVER tell the user you've found sources when you haven't. If search_results array is empty or contains no valid sources, do not proceed to source selection.",
]

class PodcastAgentService:
    """Service for managing podcast agent sessions and interactions."""

    def __init__(self):
        """Initialize the podcast agent service."""
        self.active_sessions = {}
        self.session_locks = {}
        os.makedirs(PODCAST_DIR, exist_ok=True)
        os.makedirs(PODCAST_AUIDO_DIR, exist_ok=True)
        os.makedirs(PODCAST_IMG_DIR, exist_ok=True)
        os.makedirs(PODCAST_RECORDINGS_DIR, exist_ok=True)

    async def select_sources(self, agent: Agent, selected_ids: str) -> str:
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

    async def update_podcast_info(self, agent: Agent, topic: str) -> str:
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

    async def toggle_source_selection(self, agent: Agent, status: bool = False) -> str:
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

    async def toggle_script_confirm(self, agent: Agent, status: bool = False) -> str:
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

    async def toggle_banner_confirm(self, agent: Agent, status: bool = False) -> str:
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

    async def toggle_audio_confirm(self, agent: Agent, status: bool = False) -> str:
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

    async def toggle_recording_player(self, agent: Agent, status: bool = False) -> str:
        """
        Toggle the show_recording_player flag.
        This controls whether the web search recording player is shown to the user.
        """
        agent.session_state["show_recording_player"] = status
        return f"Recording player visibility changed to: {status}"

    async def _save_podcast_to_database_async(self, agent: Agent) -> tuple[bool, str, int]:
        """
        Private asynchronous function to save a completed podcast to the podcasts database.
        Ensures sources are in the correct format (List[str]).

        Args:
            agent: The agent instance with the completed podcast data

        Returns:
            A tuple of (success, message, podcast_id)
        """
        try:
            if agent.session_state.get("podcast_id"):
                return True, f"Podcast already saved with ID: {agent.session_state['podcast_id']}", agent.session_state["podcast_id"]
            podcast_info = agent.session_state.get("podcast_info", {})
            generated_script = agent.session_state.get("generated_script", {})
            banner_url = agent.session_state.get("banner_url")
            audio_url = agent.session_state.get("audio_url")
            selected_language = agent.session_state.get("selected_language", {"code": "en", "name": "English"})
            language_code = selected_language.get("code", "en")
            if not generated_script or not isinstance(generated_script, dict):
                return False, "Cannot complete podcast: Generated script is missing or invalid.", None
            if "title" not in generated_script:
                generated_script["title"] = podcast_info.get("topic", "Untitled Podcast")
            if "sections" not in generated_script or not isinstance(generated_script["sections"], list):
                return False, "Cannot complete podcast: Generated script is missing required 'sections' array.", None
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
            async with aiosqlite.connect(db_path) as conn:
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
                await conn.execute(
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
                await conn.commit()
                async with conn.execute("SELECT last_insert_rowid()") as cursor:
                    podcast_id = await cursor.fetchone()
                    podcast_id = podcast_id[0] if podcast_id else None
            agent.session_state["podcast_id"] = podcast_id
            return True, f"Podcast successfully saved with ID: {podcast_id}", podcast_id
        except Exception as e:
            print(f"Error saving podcast to database: {e}")
            return False, f"Error saving podcast to database: {str(e)}", None

    async def toggle_podcast_generated(self, agent: Agent, status: bool = False) -> str:
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
                    success, message, podcast_id = await self._save_podcast_to_database_async(agent)
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

    async def update_language(self, agent: Agent, language_code: str) -> str:
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
        agent.session_state["selected_language"] = {"code": language_code, "name": language_name}
        podcast_info = agent.session_state.get("podcast_info", {})
        if not podcast_info:
            podcast_info = {}
        podcast_info["language"] = language_code
        podcast_info["language_name"] = language_name
        agent.session_state["podcast_info"] = podcast_info
        return f"Podcast language set to: {language_name} ({language_code})"

    def create_podcast_agent(self, session_id=None):
        """Create a new podcast agent instance or load an existing one."""

        return Agent(
            model=OpenAIChat(id=AGENT_MODEL),
            description=AGENT_DESCRIPTION,
            instructions=AGENT_INSTRUCTIONS,
            session_state={
                "podcast_id": "",
                "show_sources_for_selection": False,
                "show_script_for_confirmation": False,
                "show_banner_for_confirmation": False,
                "show_audio_for_confirmation": False,
                "show_recording_player": False,
                "podcast_generated": False,
                "stage": "welcome",
                "podcast_info": {},
                "selected_sources": [],
                "search_results": [],
                "web_search_results": [],
                "web_search_recording": None,
                "generated_script": {},
                "banner_url": "",
                "audio_url": "",
                "processing_status": {"is_processing": False, "process_type": None, "started_at": None, "message": None},
                "available_languages": AVAILABLE_LANGS,
                "selected_language": {"code": "en", "name": "English"},
            },
            tools=[
                search_articles,
                web_search,
                self.select_sources,
                generate_script,
                generate_banner,
                generate_audio,
                embedding_search,
                self.toggle_source_selection,
                self.toggle_script_confirm,
                self.toggle_banner_confirm,
                self.toggle_audio_confirm,
                self.toggle_recording_player,
                self.toggle_podcast_generated,
                self.update_podcast_info,
                self.update_language,
            ],
            show_tool_calls=True,
            add_state_in_messages=True,
            add_history_to_messages=True,
            storage=SqliteStorage(table_name="podcast_sessions", db_file=get_agent_session_db_path()),
            markdown=True,
            session_id=session_id,
        )

    async def create_session(self, request=None):
        """Create or reuse a session with the podcast agent"""
        if request and request.session_id:
            session_id = request.session_id
            if session_id in self.active_sessions:
                print(f"Reusing existing session {session_id}")
                return {"session_id": session_id}
            try:
                db_path = get_agent_session_db_path()
                async with aiosqlite.connect(db_path) as conn:
                    async with conn.execute("SELECT 1 FROM podcast_sessions WHERE session_id = ?", (session_id,)) as cursor:
                        row = await cursor.fetchone()
                        exists = row is not None
                if exists:
                    print(f"Loading session {session_id} from database")
                    agent = self.create_podcast_agent(session_id)
                    self.active_sessions[session_id] = agent
                    return {"session_id": session_id}
                else:
                    print(f"Session {session_id} not found in database")
            except Exception as e:
                print(f"Error checking session existence: {e}")
        new_session_id = str(uuid.uuid4())
        print(f"Creating new session {new_session_id}")
        agent = self.create_podcast_agent()
        agent.session_id = new_session_id
        self.active_sessions[new_session_id] = agent
        return {"session_id": new_session_id}

    async def chat(self, request):
        """Send a message to the podcast agent and get a response"""
        if request.session_id not in self.active_sessions:
            raise HTTPException(status_code=404, detail="Session not found")
        agent = self.active_sessions[request.session_id]
        operation_info = self.session_locks.get(request.session_id)
        current_time = time.time()
        if operation_info and current_time - operation_info["started_at"] < 300:
            return {
                "session_id": request.session_id,
                "response": "An operation is in progress. Please wait a moment before sending another message.",
                "stage": agent.session_state.get("stage", "processing"),
                "session_state": json.dumps(agent.session_state),
                "is_processing": True,
                "process_type": operation_info["operation_type"],
            }
        self.session_locks[request.session_id] = {"operation_type": "chat", "started_at": current_time}
        try:
            response = await agent.arun(request.message)
            self.session_locks.pop(request.session_id, None)
            return {
                "session_id": request.session_id,
                "response": response.content,
                "stage": agent.session_state.get("stage", "unknown"),
                "session_state": json.dumps(agent.session_state),
                "is_processing": False,
            }
        except Exception as e:
            self.session_locks.pop(request.session_id, None)
            print(f"Error processing request: {str(e)}")
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={
                    "session_id": request.session_id,
                    "response": f"I encountered an error while processing your request: {str(e)}. Please try again.",
                    "stage": agent.session_state.get("stage", "unknown"),
                    "session_state": json.dumps(agent.session_state),
                    "error": str(e),
                },
            )

    async def check_processing_status(self, request):
        """Check if a session has a running process and automatically reset if stalled"""
        if request.session_id not in self.active_sessions:
            raise HTTPException(status_code=404, detail="Session not found")
        agent = self.active_sessions[request.session_id]
        processing_status = agent.session_state.get("processing_status", {})
        if not processing_status or not processing_status.get("is_processing", False):
            return {
                "session_id": request.session_id,
                "is_processing": False,
                "stage": agent.session_state.get("stage", "unknown"),
                "session_state": json.dumps(agent.session_state),
            }
        started_at = processing_status.get("started_at", time.time())
        elapsed_time = time.time() - started_at
        if elapsed_time > 300:
            print(f"Process in session {request.session_id} timed out after {elapsed_time} seconds")
            agent.session_state["processing_status"] = {
                "is_processing": False,
                "process_type": None,
                "started_at": None,
                "message": "Process timed out and was reset",
            }
            return {
                "session_id": request.session_id,
                "is_processing": False,
                "process_type": processing_status.get("process_type", "unknown"),
                "elapsed_seconds": round(elapsed_time),
                "message": "Process appears to have stalled and was reset",
                "stage": agent.session_state.get("stage", "unknown"),
                "session_state": json.dumps(agent.session_state),
            }
        return {
            "session_id": request.session_id,
            "is_processing": False,
            "process_type": processing_status.get("process_type", "unknown"),
            "elapsed_seconds": round(elapsed_time),
            "message": processing_status.get("message", "Processing..."),
            "stage": agent.session_state.get("stage", "unknown"),
            "session_state": json.dumps(agent.session_state),
        }

    async def list_sessions(self, page=1, per_page=10):
        """List all saved podcast sessions with pagination"""
        try:
            db_path = get_agent_session_db_path()
            async with aiosqlite.connect(db_path) as conn:
                conn.row_factory = lambda cursor, row: {col[0]: row[idx] for idx, col in enumerate(cursor.description)}
                async with conn.execute(
                    """
                    select name from sqlite_master
                    where type='table' and name='podcast_sessions'
                    """
                ) as cursor:
                    table = await cursor.fetchone()
                if not table:
                    return {
                        "sessions": [],
                        "pagination": {
                            "total": 0,
                            "page": page,
                            "per_page": per_page,
                            "total_pages": 0,
                        },
                    }
                async with conn.execute("SELECT COUNT(*) as count FROM podcast_sessions") as cursor:
                    row = await cursor.fetchone()
                    total_sessions = row["count"] if row else 0
                offset = (page - 1) * per_page
                async with conn.execute(
                    "SELECT session_id, session_data, updated_at FROM podcast_sessions ORDER BY updated_at DESC LIMIT ? OFFSET ?", (per_page, offset)
                ) as cursor:
                    rows = await cursor.fetchall()
                    sessions = []
                    for row in rows:
                        try:
                            session_data = json.loads(row["session_data"]) if isinstance(row["session_data"], str) else row["session_data"]
                            podcast_info = session_data.get("session_state", {}).get("podcast_info", {})
                            topic = podcast_info.get("topic", "Untitled Podcast")
                            stage = session_data.get("session_state", {}).get("stage", "welcome")
                            updated_at = row["updated_at"]
                            sessions.append({"session_id": row["session_id"], "topic": topic, "stage": stage, "updated_at": updated_at})
                        except Exception as e:
                            print(f"Error parsing session data: {e}")
            return {
                "sessions": sessions,
                "pagination": {
                    "total": total_sessions,
                    "page": page,
                    "per_page": per_page,
                    "total_pages": (total_sessions + per_page - 1) // per_page,
                },
            }
        except Exception as e:
            print(f"Error listing sessions: {e}")
            return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content={"error": f"Failed to list sessions: {str(e)}"})

    async def delete_session(self, session_id: str):
        """Delete a podcast session and optionally its associated data"""
        try:
            db_path = get_agent_session_db_path()
            async with aiosqlite.connect(db_path) as conn:
                conn.row_factory = lambda cursor, row: {col[0]: row[idx] for idx, col in enumerate(cursor.description)}
                async with conn.execute("SELECT session_data FROM podcast_sessions WHERE session_id = ?", (session_id,)) as cursor:
                    row = await cursor.fetchone()
                if not row:
                    return JSONResponse(status_code=status.HTTP_404_NOT_FOUND, content={"error": f"Session with ID {session_id} not found"})
                try:
                    session_data = json.loads(row["session_data"]) if isinstance(row["session_data"], str) else row["session_data"]
                    stage = session_data.get("session_state", {}).get("stage")
                    is_completed = stage == "complete" or session_data.get("session_state", {}).get("podcast_generated", False)
                    banner_url = session_data.get("session_state", {}).get("banner_url")
                    audio_url = session_data.get("session_state", {}).get("audio_url")
                    web_search_recording = session_data.get("session_state", {}).get("web_search_recording")
                    await conn.execute("DELETE FROM podcast_sessions WHERE session_id = ?", (session_id,))
                    await conn.commit()
                    if is_completed:
                        print(f"Session {session_id} is in 'complete' stage, keeping assets but removing session record")
                    else:
                        if banner_url:
                            banner_path = os.path.join(PODCAST_IMG_DIR, banner_url)
                            if os.path.exists(banner_path):
                                try:
                                    os.remove(banner_path)
                                    print(f"Deleted banner image: {banner_path}")
                                except Exception as e:
                                    print(f"Error deleting banner image: {e}")
                        if audio_url:
                            audio_path = os.path.join(PODCAST_AUIDO_DIR, audio_url)
                            if os.path.exists(audio_path):
                                try:
                                    os.remove(audio_path)
                                    print(f"Deleted audio file: {audio_path}")
                                except Exception as e:
                                    print(f"Error deleting audio file: {e}")
                        if web_search_recording:
                            recording_dir = os.path.join(PODCAST_RECORDINGS_DIR, session_id)
                            if os.path.exists(recording_dir):
                                try:
                                    import shutil

                                    shutil.rmtree(recording_dir)
                                    print(f"Deleted recordings directory: {recording_dir}")
                                except Exception as e:
                                    print(f"Error deleting recordings directory: {e}")
                    if session_id in self.active_sessions:
                        del self.active_sessions[session_id]
                        print(f"Removed session {session_id} from active sessions")
                    if is_completed:
                        return {"success": True, "message": f"Session {session_id} deleted, but assets preserved"}
                    else:
                        return {"success": True, "message": f"Session {session_id} and its associated data deleted successfully"}
                except Exception as e:
                    print(f"Error parsing session data for deletion: {e}")
                    return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content={"error": f"Error deleting session: {str(e)}"})
        except Exception as e:
            print(f"Error deleting session: {e}")
            return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content={"error": f"Failed to delete session: {str(e)}"})

    async def get_session_history(self, session_id: str):
        """Get the complete message history for a session"""
        try:
            if session_id not in self.active_sessions:
                agent = self.create_podcast_agent(session_id)
                self.active_sessions[session_id] = agent
            agent = self.active_sessions[session_id]
            db_path = get_agent_session_db_path()
            async with aiosqlite.connect(db_path) as conn:
                conn.row_factory = lambda cursor, row: {col[0]: row[idx] for idx, col in enumerate(cursor.description)}
                async with conn.execute(
                    """
                    select name from sqlite_master
                    where type='table' and name='podcast_sessions'
                    """
                ) as cursor:
                    table = await cursor.fetchone()
                    if not table:
                        return {"session_id": session_id, "messages": [], "state": json.dumps(agent.session_state)}
                async with conn.execute("SELECT memory, session_data FROM podcast_sessions WHERE session_id = ?", (session_id,)) as cursor:
                    row = await cursor.fetchone()
                if not row:
                    return {"session_id": session_id, "state": json.dumps(agent.session_state)}
                formatted_messages = []
                session_state = {}
                if row["session_data"]:
                    try:
                        if isinstance(row["session_data"], str):
                            session_state = json.loads(row["session_data"])["session_state"]
                        else:
                            session_state = row["session_data"]["session_state"]
                        agent.session_state = session_state
                    except json.JSONDecodeError as e:
                        print(f"Error parsing session_data: {e}")
                if row["memory"]:
                    try:
                        memory_data = json.loads(row["memory"]) if isinstance(row["memory"], str) else row["memory"]
                        if "runs" in memory_data and isinstance(memory_data["runs"], list):
                            for run in memory_data["runs"]:
                                if "messages" in run and isinstance(run["messages"], list):
                                    for msg in run["messages"]:
                                        if msg.get("role") in ["user", "assistant"] and "content" in msg:
                                            if msg.get("role") == "assistant" and "tool_calls" in msg:
                                                if not msg.get("content"):
                                                    continue
                                            if msg.get("content"):
                                                formatted_messages.append({"role": msg["role"], "content": msg["content"]})
                    except json.JSONDecodeError as e:
                        print(f"Error parsing memory data: {e}")
                deduplicated_messages = []
                seen_contents = set()
                for msg in formatted_messages:
                    key = f"{msg['role']}:{msg['content'][:100]}"
                    if key not in seen_contents:
                        seen_contents.add(key)
                        deduplicated_messages.append(msg)
            print(f"Retrieved history for session {session_id}: {len(deduplicated_messages)} messages")
            return {"session_id": session_id, "messages": deduplicated_messages, "state": json.dumps(session_state)}
        except Exception as e:
            print(f"Error retrieving session history: {e}")
            return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content={"error": f"Error retrieving session history: {str(e)}"})


podcast_agent_service = PodcastAgentService()