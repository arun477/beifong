# agent.py - Celery worker implementation for podcast agent

import asyncio
from celery import Celery
import os
import uuid
import redis
from dotenv import load_dotenv
import time
import json

# Import Agno components
from agno.agent import Agent
from agno.models.openai import OpenAIChat
from agno.storage.sqlite import SqliteStorage

# Import podcast agent tools
from tools.async_search_articles import search_articles
from tools.async_web_search import web_search
from tools.async_generate_podcast_script import generate_script
from tools.async_generate_podcast_banner import generate_banner
from tools.async_generate_podcast_audio import generate_audio
from tools.async_embedding_search import embedding_search
from db.config import get_agent_session_db_path

# Load environment variables
load_dotenv()

# Create necessary directories
os.makedirs("tmp", exist_ok=True)
os.makedirs("podcasts", exist_ok=True)
os.makedirs("podcasts/audio", exist_ok=True)
os.makedirs("podcasts/images", exist_ok=True)
os.makedirs("podcasts/recordings", exist_ok=True)

# Initialize Redis for session locking
redis_client = redis.Redis(host='localhost', port=6379, db=1)

# Initialize Celery
app = Celery('tasks', broker='redis://localhost:6379/0', backend='redis://localhost:6379/0')
app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    enable_utc=True,
    task_time_limit=3600,  # 1 hour time limit for long-running tasks
    task_soft_time_limit=3000,  # 50 minutes soft limit with warning
    worker_prefetch_multiplier=1,  # Don't prefetch tasks to prevent blocking
)

# Initialize storage
storage = SqliteStorage(table_name="podcast_sessions", db_file=get_agent_session_db_path())

def mark_session_processing(session_id):
    """Mark a session as being processed with a 30-minute expiration"""
    # Using SETNX for atomic operation
    result = redis_client.set(
        f"processing:{session_id}", 
        "1", 
        ex=1800,  # 30 minute expiration
        nx=True   # Only set if key doesn't exist
    )
    # Return True if lock was acquired, False if already locked
    return bool(result)

def clear_session_processing(session_id):
    """Clear the processing flag for a session"""
    redis_client.delete(f"processing:{session_id}")

def is_session_processing(session_id):
    """Check if a session is currently being processed"""
    return bool(redis_client.exists(f"processing:{session_id}"))

# PodcastAgentService tools adapted as async functions for the agent
async def select_sources(agent: Agent, selected_ids: str) -> str:
    """Store the user's selected article sources."""
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

async def update_podcast_info(agent: Agent, topic: str) -> str:
    """Update the podcast information with the specified topic."""
    podcast_info = agent.session_state.get("podcast_info", {})
    if not podcast_info:
        podcast_info = {}
    podcast_info["topic"] = topic
    agent.session_state["podcast_info"] = podcast_info
    return f"Podcast topic set to: {topic}"

async def toggle_source_selection(agent: Agent, status: bool = False) -> str:
    """Toggle the show_sources_for_selection flag."""
    if status:
        agent.session_state["show_script_for_confirmation"] = False
        agent.session_state["show_banner_for_confirmation"] = False
        agent.session_state["show_audio_for_confirmation"] = False
    agent.session_state["show_sources_for_selection"] = status
    return f"source selection status changed to: {status}"

async def toggle_script_confirm(agent: Agent, status: bool = False) -> str:
    """Toggle the show_script_for_confirmation flag."""
    if status:
        agent.session_state["show_sources_for_selection"] = False
        agent.session_state["show_banner_for_confirmation"] = False
        agent.session_state["show_audio_for_confirmation"] = False
    agent.session_state["show_script_for_confirmation"] = status
    return f"script confirmation status changed to: {status}"

async def toggle_banner_confirm(agent: Agent, status: bool = False) -> str:
    """Toggle the show_banner_for_confirmation flag."""
    if status:
        agent.session_state["show_sources_for_selection"] = False
        agent.session_state["show_script_for_confirmation"] = False
        agent.session_state["show_audio_for_confirmation"] = False
    agent.session_state["show_banner_for_confirmation"] = status
    return f"banner confirmation status changed to: {status}"

async def toggle_audio_confirm(agent: Agent, status: bool = False) -> str:
    """Toggle the show_audio_for_confirmation flag."""
    if status:
        agent.session_state["show_sources_for_selection"] = False
        agent.session_state["show_script_for_confirmation"] = False
        agent.session_state["show_banner_for_confirmation"] = False
    agent.session_state["show_audio_for_confirmation"] = status
    return f"audio confirmation status changed to: {status}"

async def toggle_recording_player(agent: Agent, status: bool = False) -> str:
    """Toggle the show_recording_player flag."""
    agent.session_state["show_recording_player"] = status
    return f"Recording player visibility changed to: {status}"

async def toggle_podcast_generated(agent: Agent, status: bool = False) -> str:
    """Toggle the podcast_generated flag."""
    if status:
        agent.session_state["show_sources_for_selection"] = False
        agent.session_state["show_script_for_confirmation"] = False
        agent.session_state["show_banner_for_confirmation"] = False
        agent.session_state["show_audio_for_confirmation"] = False
        agent.session_state["show_recording_player"] = False
        agent.session_state["podcast_generated"] = status
        agent.session_state["stage"] = "complete" if status else agent.session_state.get("stage")
        
        # Note: We're not saving to database here - that's handled by the async_podcast_agent_service
        return f"Podcast generated status changed to: {status}"
    else:
        agent.session_state["podcast_generated"] = status
        agent.session_state["stage"] = "complete" if status else agent.session_state.get("stage")
        return f"Podcast generated status changed to: {status}"

async def update_language(agent: Agent, language_code: str) -> str:
    """Update the podcast language with the specified language code."""
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

# Define the constants from the original agent
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

def create_podcast_agent(session_id=None, user_id=None):
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
        storage=storage,
        markdown=True,
        session_id=session_id,
        user_id=user_id,
    )

# The main worker task that processes chat messages
@app.task(bind=True)
def chat(self, user_input, session_id=None, user_id=None):
    """Process a chat message with the agent, properly handling async tools"""
    
    # Generate a session ID if none provided
    if not session_id:
        session_id = str(uuid.uuid4())
    
    # Try to acquire session lock
    if not mark_session_processing(session_id):
        # If session is already processing, return error
        return {
            "error": "Session already has a message being processed",
            "session_id": session_id,
            "status": "ERROR"
        }
    
    try:
        print(f"Processing request with session_id: {session_id}")
        
        # Create an async function to run the agent with async tools
        async def run_agent_async():
            try:
                agent = create_podcast_agent(session_id=session_id, user_id=user_id)
                
                # Process with the agent using arun for async tools
                response = await agent.arun(user_input)
                
                return {
                    "content": response.content,
                    "session_id": response.session_id or session_id,
                    "run_id": response.run_id,
                    "status": "COMPLETED"
                }
            except Exception as e:
                print(f"Agent error: {str(e)}")
                return {
                    "error": str(e),
                    "session_id": session_id,
                    "status": "ERROR"
                }
        
        # Run the async function with an event loop
        loop = asyncio.get_event_loop()
        if loop.is_closed():
            # Create a new event loop if the current one is closed
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        # Execute the async function and get results
        result = loop.run_until_complete(run_agent_async())
        return result
    
    except Exception as e:
        print(f"Task error: {str(e)}")
        return {
            "error": str(e),
            "session_id": session_id,
            "status": "ERROR"
        }
    finally:
        # Always clear the session processing flag
        clear_session_processing(session_id)