import os
import json
from typing import Dict, List, Any, Tuple, Optional
from datetime import datetime
from pydantic import BaseModel
from browser_use import Agent as BrowserAgent, Browser
from browser_use.browser.context import BrowserContextConfig, BrowserContext
from browser_use import BrowserConfig
from agno.agent import Agent
from utils.load_api_keys import load_api_key
from langchain_openai import ChatOpenAI

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


async def _web_search_async(topic: str, session_id: str, task: str) -> Tuple[List[Dict[str, Any]], Optional[str]]:
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
        headless=True,
        disable_security=False,
    )
    context_config = BrowserContextConfig(
        wait_for_network_idle_page_load_time=3.0,
        minimum_wait_page_load_time=0.5,
        maximum_wait_page_load_time=10.0,
        locale="en-US",
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
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
        base_instruction = (
            f"Find 3-5 recent, diverse sources about {topic}. For each, extract the title, URL, "
            f"and a 2-3 sentence summary relevant to '{topic}'. Format as JSON array with title, url, "
            f"and content properties. Focus on credible news sites, research publications, and industry reports. "
            f"If you encounter any errors or limitations, return partial results rather than nothing. "
            f"Even a single good source is better than no results. If you find multiple sources, "
            f"prioritize information diversity over quantity."
        )
        agent_instruction = base_instruction
        if task and task.strip():
            agent_instruction += f" {task.strip()}"
        agent_instruction += (
            "\n\nIMPORTANT: Your final answer MUST be a JSON array of objects with this structure:"
            '\n[\n  {\n    "title": "Article Title",\n    "url": "https://example.com/article",'
            '\n    "content": "Brief summary of the article"\n  },\n  ...\n]'
            "\n\nEven if you only find one source, return it in this format. If you can't complete the search,"
            " return whatever you found so far in this exact JSON format."
        )
        browser = Browser(config=browser_config)
        context = BrowserContext(browser=browser, config=context_config)
        openai_api_key = load_api_key("OPENAI_API_KEY")
        if not openai_api_key:
            print("OpenAI API key not found")
            return [], recording_path
        browser_agent = BrowserAgent(
            browser_context=context,
            task=agent_instruction,
            llm=ChatOpenAI(model=BROWSER_AGENT_MODEL, api_key=openai_api_key),
            use_vision=True,
            max_actions_per_step=5,
        )
        print(f"Starting web search for: {topic}")
        try:
            history = await browser_agent.run(max_steps=15)
            print("Web search completed, processing results")
            for path in os.listdir(recordings_dir):
                if path.endswith(".webm"):
                    recording_path = os.path.join("recordings", session_id, path)
                    print(f"Found recording at: {recording_path}")
                    break
            final_output = None
            try:
                final_output = history.final_result()
            except (AttributeError, TypeError) as e:
                print(f"Error getting final result: {e}")
            if not final_output or not (isinstance(final_output, str) and final_output.strip()):
                try:
                    model_outputs = history.model_outputs()
                    if model_outputs and isinstance(model_outputs, list) and len(model_outputs) > 0:
                        final_output = model_outputs[-1]
                        print("Using last model output instead of final result")
                except (AttributeError, TypeError) as e:
                    print(f"Error getting model outputs: {e}")
            if final_output and isinstance(final_output, str) and final_output.strip():
                json_data = None
                try:
                    import re

                    json_match = re.search(r"\[\s*\{.*\}\s*\]", final_output, re.DOTALL)
                    if json_match:
                        try:
                            json_data = json.loads(json_match.group(0))
                            print("Successfully extracted JSON with regex pattern")
                        except json.JSONDecodeError:
                            print("Failed to parse JSON with regex pattern")
                except Exception as e:
                    print(f"Error during regex JSON extraction: {e}")
                if not json_data:
                    try:
                        json_blocks = re.findall(r"```(?:json)?\s*([\s\S]*?)```", final_output)
                        for block in json_blocks:
                            try:
                                potential_json = json.loads(block.strip())
                                if isinstance(potential_json, list) and len(potential_json) > 0:
                                    json_data = potential_json
                                    print("Extracted JSON from code block")
                                    break
                            except json.JSONDecodeError:
                                continue
                    except Exception as e:
                        print(f"Error during code block JSON extraction: {e}")
                try:
                    if json_data and isinstance(json_data, list):
                        for item in json_data:
                            if isinstance(item, dict) and "title" in item and "url" in item:
                                content = item.get("content", item.get("summary", ""))
                                formatted_results.append(
                                    {
                                        "id": f"web_{hash(item['url']) & 0xFFFFFFFF}",
                                        "title": item["title"],
                                        "url": item["url"],
                                        "content": content,
                                        "summary": content,
                                        "source_id": "web",
                                        "source_name": "Web Search",
                                        "published_date": datetime.now().isoformat(),
                                        "categories": ["web", "research"],
                                    }
                                )
                        if formatted_results:
                            print(f"Successfully extracted {len(formatted_results)} results from JSON")
                except Exception as e:
                    print(f"Error processing JSON data: {e}")
            if not formatted_results:
                print("No structured results found, falling back to URL extraction")
                try:
                    urls = []
                    try:
                        urls = history.urls()
                    except (AttributeError, TypeError) as e:
                        print(f"Error getting URLs from history: {e}")
                    if not urls and final_output and isinstance(final_output, str):
                        try:
                            url_pattern = r"https?://(?:[-\w.]|(?:%[\da-fA-F]{2}))+"
                            urls = re.findall(url_pattern, final_output)
                            print(f"Extracted {len(urls)} URLs from text output")
                        except Exception as e:
                            print(f"Error extracting URLs from text: {e}")
                    visited_pages = []
                    for url in urls:
                        if url.startswith("http") and not any(
                            search_engine in url for search_engine in ["google.com/search", "bing.com/search", "duckduckgo", "search?"]
                        ):
                            if url not in [page.get("url") for page in visited_pages]:
                                visited_pages.append({"url": url})
                    for idx, page in enumerate(visited_pages[:5]):
                        url = page["url"]
                        domain = url.split("//")[-1].split("/")[0]
                        title = f"Article from {domain} about {topic}"
                        formatted_results.append(
                            {
                                "id": f"web_{hash(url) & 0xFFFFFFFF}",
                                "title": title,
                                "url": url,
                                "content": f"This source was found during web search for '{topic}'.",
                                "summary": f"This source may contain relevant information about {topic}.",
                                "source_id": "web",
                                "source_name": "Web Search",
                                "published_date": datetime.now().isoformat(),
                                "categories": ["web", "research"],
                            }
                        )
                    if formatted_results:
                        print(f"Created {len(formatted_results)} basic results from visited URLs")
                except Exception as e:
                    print(f"Error in URL fallback: {e}")
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


async def web_search(agent: Agent, topic: str, task: str) -> str:
    """
    Tool for performing web searches using BrowserUse.
    Perform a web search using BrowserUse and return structured results.
    BrowserUse is an browser Agent with vision and interaction capctity can perform instructed task like agent operating on the browser.


    Args:
        agent: The Agno agent instance
        topic: The search topic
        task: Detailed Instruction to browseruse agent how to peform this search and information extractions.
    Returns:
        A formatted string response with the search results
    """
    agent.session_state["stage"] = "web_search"
    session_id = agent.session_id
    try:
        results, recording_path = await _web_search_async(topic, session_id, task)
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
        print(e)
        return f"Web search encountered an error: {str(e)}. Using only database results for your podcast."