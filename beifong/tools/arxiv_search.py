from agno.agent import Agent
import requests
import time
from typing import List, Dict, Any, Optional
import xml.etree.ElementTree as ET
import re
from datetime import datetime


def arxiv_search(agent: Agent, query: str) -> str:
    """
    Search arXiv for scientific papers related to a podcast topic.
    This provides academic research and scientific information to enhance podcast content.

    Args:
        agent: The agent instance
        query: The search query

    Returns:
        A formatted string response with the search results
    """
    agent.session_state["stage"] = "search"

    try:
        # Format query for arXiv API
        formatted_query = query.replace(" ", "+")
        search_url = f"http://export.arxiv.org/api/query?search_query=all:{formatted_query}&start=0&max_results=5&sortBy=relevance"

        # Execute the search
        response = requests.get(search_url)

        # Check for successful response
        if response.status_code != 200:
            print(f"arXiv API error: Status code {response.status_code}")
            return "arXiv search unavailable. Continuing with other search methods."

        # Parse XML response
        root = ET.fromstring(response.content)

        # Define namespace for parsing XML
        namespace = {"arxiv": "http://www.w3.org/2005/Atom"}

        # Extract entries
        entries = root.findall(".//arxiv:entry", namespace)

        if not entries:
            print("No arXiv papers found for the given query")
            return "No scientific papers found on arXiv for this topic. Continuing with other search methods."

        # Process each paper
        results = []
        for entry in entries:
            # Extract basic metadata
            title_elem = entry.find("./arxiv:title", namespace)
            title = title_elem.text.strip() if title_elem is not None else "Untitled Paper"

            # Extract URL (the PDF link)
            url = None
            links = entry.findall("./arxiv:link", namespace)
            for link in links:
                if link.attrib.get("title") == "pdf":
                    url = link.attrib.get("href")
                    break

            # Use alternate URL if PDF link not found
            if not url:
                id_elem = entry.find("./arxiv:id", namespace)
                if id_elem is not None:
                    url = id_elem.text

            # Get abstract
            summary_elem = entry.find("./arxiv:summary", namespace)
            summary = summary_elem.text.strip() if summary_elem is not None else ""

            # Clean up summary - remove newlines and excessive whitespace
            summary = re.sub(r"\s+", " ", summary).strip()

            # Get authors
            authors = []
            author_elems = entry.findall(".//arxiv:author/arxiv:name", namespace)
            for author_elem in author_elems:
                authors.append(author_elem.text)

            # Get publication date
            published_elem = entry.find("./arxiv:published", namespace)
            published_date = None
            if published_elem is not None:
                try:
                    date_str = published_elem.text[:10]  # Format: YYYY-MM-DD
                    published_date = date_str
                except:
                    pass

            # Get categories
            categories = []
            category_elems = entry.findall("./arxiv:category", namespace)
            for cat_elem in category_elems:
                if "term" in cat_elem.attrib:
                    categories.append(cat_elem.attrib["term"])

            # Check if we have essential elements
            if title and summary:
                # Format author list
                author_text = ", ".join(authors[:3])
                if len(authors) > 3:
                    author_text += f", et al. ({len(authors)} authors)"

                # Create content with structured information
                content = f"{summary}\n\n"
                content += f"Authors: {author_text}\n"
                if published_date:
                    content += f"Published: {published_date}\n"
                if categories:
                    content += f"Categories: {', '.join(categories)}\n"

                # Create short summary for preview
                short_summary = summary[:300] + "..." if len(summary) > 300 else summary

                # Create result entry
                result = {
                    "id": f"arxiv_{url.split('/')[-1] if url else 'unknown'}",
                    "title": f"{title} (arXiv)",
                    "url": url if url else "#",
                    "published_date": published_date,
                    "content": content,
                    "summary": short_summary,
                    "source_id": "arxiv",
                    "source_name": "arXiv",
                    "categories": ["arxiv", "research", "scientific"] + categories,
                }

                results.append(result)

            # Respect arXiv API rate limits
            time.sleep(0.3)

        if not results:
            print("No usable arXiv papers found")
            return "No relevant scientific papers could be processed from arXiv. Continuing with other search methods."

        # Combine with existing results
        existing_results = agent.session_state.get("search_results", [])
        combined_results = results + existing_results
        combined_results = combined_results[:20]  # Limit to 20 total results

        # Update session state
        agent.session_state["search_results"] = combined_results

        print(f"Found {len(results)} scientific papers on arXiv about: {query}")
        return f"Found {len(results)} scientific research papers on arXiv related to your topic. These provide academic perspective and latest research. Continuing with additional search methods."

    except Exception as e:
        print(f"Error during arXiv search: {str(e)}")
        return f"Error in arXiv search: {str(e)}. Continuing with other search methods."