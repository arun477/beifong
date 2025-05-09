from agno.agent import Agent
import requests
from typing import List, Dict, Any, Union
import html
import time


def wikipedia_search(agent: Agent, query: str) -> str:
    """
    Search Wikipedia for articles related to a podcast topic using the Wikipedia API.
    This provides encyclopedic, well-structured information to complement other search methods.

    Args:
        agent: The agent instance
        query: The search query

    Returns:
        A formatted string response with the search results
    """
    agent.session_state["stage"] = "search"

    try:
        # First search for relevant article titles
        search_url = "https://en.wikipedia.org/w/api.php"
        search_params = {
            "action": "query",
            "format": "json",
            "list": "search",
            "srsearch": query,
            "srlimit": 5,  # Limit to 5 most relevant results
            "utf8": 1,
        }

        search_response = requests.get(search_url, params=search_params)
        search_data = search_response.json()

        if "query" not in search_data or "search" not in search_data["query"] or not search_data["query"]["search"]:
            print(f"No Wikipedia results found for query: {query}")
            return "No relevant Wikipedia articles found for this topic. Continuing with other search methods."

        results = []

        # For each search result, fetch more details
        for item in search_data["query"]["search"]:
            page_id = item["pageid"]
            title = item["title"]
            snippet = html.unescape(item["snippet"].replace('<span class="searchmatch">', "").replace("</span>", ""))

            # Get full content for the article
            content_url = "https://en.wikipedia.org/w/api.php"
            content_params = {
                "action": "query",
                "format": "json",
                "prop": "extracts|info",
                "pageids": page_id,
                "exintro": 1,  # Only get the introduction section
                "explaintext": 1,  # Get plain text, not HTML
                "inprop": "url",  # Get the full URL
            }

            content_response = requests.get(content_url, params=content_params)
            content_data = content_response.json()

            if "query" in content_data and "pages" in content_data["query"] and str(page_id) in content_data["query"]["pages"]:
                page_data = content_data["query"]["pages"][str(page_id)]
                extract = page_data.get("extract", "No content available.")
                url = page_data.get("fullurl", f"https://en.wikipedia.org/wiki/{title.replace(' ', '_')}")

                # Format the result to match existing search pattern
                result = {
                    "id": f"wiki_{page_id}",
                    "title": f"{title} (Wikipedia)",
                    "url": url,
                    "published_date": None,  # Wikipedia doesn't provide this easily
                    "content": extract if extract else snippet,
                    "summary": extract[:300] + "..." if len(extract) > 300 else extract,
                    "source_id": "wikipedia",
                    "source_name": "Wikipedia",
                    "categories": ["wikipedia", "encyclopedia"],
                }

                results.append(result)

            # Respect Wikipedia API rate limits
            time.sleep(0.25)

        if not results:
            print("No Wikipedia article content could be retrieved")
            return "No detailed Wikipedia article content could be retrieved. Continuing with other search methods."

        # Combine with existing results
        existing_results = agent.session_state.get("search_results", [])
        combined_results = results + existing_results
        combined_results = combined_results[:20]  # Limit to 20 total results

        # Update session state
        agent.session_state["search_results"] = combined_results

        print(f"Found {len(results)} Wikipedia articles about: {query}")
        return f"Found {len(results)} relevant Wikipedia articles about your topic. These provide authoritative background information. Continuing with additional search methods."

    except Exception as e:
        print(f"Error during Wikipedia search: {str(e)}")
        return f"Error in Wikipedia search: {str(e)}. Continuing with other search methods."