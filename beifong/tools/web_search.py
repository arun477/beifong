import os
import asyncio
import multiprocessing
from typing import Dict, List, Any, Tuple, Optional
from datetime import datetime
from pydantic import BaseModel
from browser_use import Agent as BrowserAgent, Browser
from browser_use.browser.context import BrowserContextConfig, BrowserContext
from browser_use import BrowserConfig
from agno.agent import Agent
from utils.load_api_keys import load_api_key
from langchain_openai import ChatOpenAI
from browser_use import Controller
from dotenv import load_dotenv

load_dotenv()

PODCAST_DIR = "podcasts"
BROWSER_AGENT_MODEL = "gpt-4o"


class WebSearchResult(BaseModel):
    """Model for structured web search results"""

    title: str
    url: str
    content: str
    source_name: str = "Web Search"


class WebSearchResults(BaseModel):
    """Container for multiple search results"""

    results: List[WebSearchResult]


class SearchResult(BaseModel):
    """Model for single search result"""

    title: str
    url: str
    content: str
    source_name: str = "Web Search"
    metadata: Dict[str, Any] = {}


class SearchResults(BaseModel):
    """Container for multiple search results"""

    results: List[SearchResult]


# Function to run browser search in a separate process to avoid fork-related issues
def _run_browser_search_in_process(topic, session_id, task, result_queue):
    try:
        # Initialize browser-specific resources inside this process
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        results, recording_path = loop.run_until_complete(_web_search_async(topic, session_id, task))
        result_queue.put((results, recording_path))
    except Exception as e:
        print(f"Error in browser search process: {e}")
        result_queue.put(([], None))
    finally:
        # Clean up
        try:
            loop.close()
        except:
            pass


async def _web_search_async(
    topic: str, session_id: str, task: str
) -> Tuple[List[Dict[str, Any]], Optional[str]]:
    """
    Perform a web search using BrowserUse and return structured results.
    BrowserUse is a browser Agent with vision and interaction capacity that can perform instructed tasks like an agent operating on the browser.

    Args:
        topic: The search topic
        session_id: Unique session ID for recording path
        task: Detailed Instruction to browseruse agent how to perform this search and information extractions.

    Returns:
        Tuple of (search results list, recording path)
    """
    recordings_dir = os.path.join(PODCAST_DIR, "recordings", session_id)
    os.makedirs(recordings_dir, exist_ok=True)
    browser_config = BrowserConfig(
        headless=True,  # Changed to headless mode for better stability
        disable_security=False,
    )
    context_config = BrowserContextConfig(
        highlight_elements=True,
        save_recording_path=recordings_dir,
    )
    browser = None
    recording_path = None
    formatted_results = []
    try:
        for path in os.listdir(recordings_dir):
            if path.endswith(".webm"):
                recording_path = os.path.join("recordings", session_id, path)
                print(f"Found existing recording at: {recording_path}")
                break

        enhanced_prompt = f"""
        OBJECTIVE: Find 3-5 high-quality, diverse, and recent sources about "{topic}" that would be valuable for creating an informative podcast and go to the source and extract the content.

        YOUR CAPABILITIES:
        You are an intelligent research agent with the ability to:
        - Determine the most effective search strategy for any given topic
        - Adapt your approach based on initial search results
        - Evaluate source quality and relevance autonomously
        - Extract meaningful content even from complex pages
        - Skip obstacles like paywalls and logins sites

        SEARCH APPROACH:
        - Begin with a thoughtful analysis of "{topic}" to determine the best search strategy
        - Formulate search queries that will yield authoritative, diverse results
        - Try different query formulations if initial results are unsatisfactory
        - Look beyond the first page of search results when necessary
        - Use your judgment to select sources with different perspectives and information types

        EXTRACTION GUIDELINES:
        - Capture the full, accurate title of each source
        - Record the complete, functional URL
        - Get the comprehensive content of each source

        QUALITY CONSIDERATIONS:
        - Assess each source's credibility based on:
          * Publication reputation and editorial standards
          * Author expertise (if identifiable)
          * Citation of evidence and references
          * Currency and timeliness of information
          * Depth and thoroughness of analysis

        HANDLING SPECIAL CASES:
        - For user-provided URLs: Navigate directly and extract comprehensive information
        - For paywalled content: Extract available information and note limitations
        - For technical/academic topics: Focus on accessible explanations when available
        - For controversial topics: Ensure representation of multiple perspectives

        Remember to prioritize DIVERSITY, QUALITY, and RELEVANCE in your source selection.
        """

        if task and task.strip():
            agent_instruction = f"""
            {enhanced_prompt}
            
            SPECIFIC TASK FROM USER: {task.strip()}
            
            NOTE: If the task above contains a specific URL to visit (rather than a general search request),
            prioritize visiting that URL directly and extracting detailed information from it. In such cases,
            focus on thorough content extraction rather than searching for additional sources.
            """
        else:
            agent_instruction = enhanced_prompt

        browser = Browser(config=browser_config)
        context = BrowserContext(browser=browser, config=context_config)

        openai_api_key = load_api_key("OPENAI_API_KEY")
        if not openai_api_key:
            print("OpenAI API key not found")
            return [], recording_path

        controller = Controller(output_model=SearchResults)

        browser_agent = BrowserAgent(
            browser_context=context,
            task=agent_instruction,
            llm=ChatOpenAI(model=BROWSER_AGENT_MODEL, api_key=openai_api_key),
            use_vision=False,
            max_actions_per_step=5,
            controller=controller,
        )

        print(f"Starting web search for: {topic}")

        try:
            # Set a timeout of 5 minutes for the entire search operation
            history = await asyncio.wait_for(
                browser_agent.run(max_steps=15),  # Reduced from 20 to 15 steps
                timeout=300  # 5 minute timeout
            )
            
            print("Web search completed, processing results")
            for path in os.listdir(recordings_dir):
                if path.endswith(".webm"):
                    recording_path = os.path.join("recordings", session_id, path)
                    print(f"Found recording at: {recording_path}")
                    break

            try:
                formatted_results = history.final_result()
            except Exception as e:
                print(f"Error parsing structured output: {e}")
        except asyncio.TimeoutError:
            print("Web search timed out after 5 minutes")
        except Exception as e:
            print(f"Error running browser agent: {e}")
    except Exception as e:
        print(f"Error during web search: {e}")
    finally:
        if browser:
            try:
                await browser.close()
            except Exception as e:
                print(f"Error closing browser: {e}")

    return formatted_results, recording_path


def _web_search(
    topic: str, session_id: str, task: str
) -> Tuple[List[Dict[str, Any]], Optional[str]]:
    """
    Run web search in a separate process to avoid fork-related issues.

    Args:
        topic: The search topic
        session_id: Unique session ID for recording path
        task: Detailed Instruction to browseruse agent how to perform this search and information extractions.

    Returns:
        Tuple of (search results list, recording path)
    """
    try:
        # Create a queue for inter-process communication
        result_queue = multiprocessing.Queue()
        
        # Create and start a separate process for the browser search
        search_process = multiprocessing.Process(
            target=_run_browser_search_in_process,
            args=(topic, session_id, task, result_queue)
        )
        
        # Start the process with a timeout
        search_process.start()
        
        # Wait for the process to complete (with a 10-minute timeout)
        search_process.join(timeout=600)
        
        # Check if the process is still alive after timeout
        if search_process.is_alive():
            print("Web search process timed out after 10 minutes, terminating")
            search_process.terminate()
            search_process.join(timeout=5)
            return [], None
        
        # Get results from the queue
        if not result_queue.empty():
            results, recording_path = result_queue.get()
            return results, recording_path
        else:
            print("No results returned from search process")
            return [], None
            
    except Exception as e:
        print(f"Error in web search process management: {e}")
        return [], None


def web_search(agent: Agent, topic: str, task: str) -> str:
    return 'Temporily not available'
    """
    Synchronous tool for performing web searches using BrowserUse.

    Args:
        agent: The Agno agent instance
        topic: The search topic
        task: Detailed Instruction to browseruse agent how to perform this search and information extractions.

    Returns:
        A formatted string response with the search results
    """
    agent.session_state["stage"] = "web_search"
    session_id = agent.session_id

    try:
        # Limit topic length to avoid potential issues
        topic = topic[:200] if topic else ""
        task = task[:500] if task else ""
        
        # First check for existing recordings
        recordings_dir = os.path.join(PODCAST_DIR, "recordings", session_id)
        recording_path = None
        
        if os.path.exists(recordings_dir):
            for path in os.listdir(recordings_dir):
                if path.endswith(".webm"):
                    recording_path = os.path.join("recordings", session_id, path)
                    print(f"Using existing recording at: {recording_path}")
                    break
        
        # Perform the web search in a separate process
        results, new_recording_path = _web_search(topic, session_id, task)
        
        # Use the new recording path if found
        if new_recording_path:
            recording_path = new_recording_path
        
        agent.session_state["web_search_results"] = results
        agent.session_state["web_search_recording"] = recording_path

        existing_results = agent.session_state.get("search_results", [])
        if results:
            combined_results = results + existing_results
            combined_results = combined_results[:10]
            agent.session_state["search_results"] = combined_results
            agent.session_state["stage"] = "source_selection"

            recording_info = ""
            if recording_path:
                recording_info = " I recorded the search process, which you can view if you're interested in how I found these sources."

            return f"Found {len(results)} web search results and combined with {len(existing_results)} database results.{recording_info} You can now select sources for your podcast."
        else:
            agent.session_state["search_results"] = existing_results
            agent.session_state["stage"] = "source_selection"

            if recording_path:
                return "Web search didn't find any relevant results. Using only database results for your podcast."
            else:
                return "Web search didn't find any relevant results. Using only database results for your podcast."
    except Exception as e:
        print(f"Error in web search: {e}")
        agent.session_state["stage"] = "source_selection"
        existing_results = agent.session_state.get("search_results", [])
        agent.session_state["search_results"] = existing_results
        return f"Web search encountered an error: {str(e)}. Using only database results for your podcast."