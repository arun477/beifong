from agno.agent import Agent
import requests
import time
from typing import List, Dict, Any, Optional
import json
from datetime import datetime


def openlibrary_search(agent: Agent, query: str) -> str:
    """
    Search Open Library for books related to a podcast topic.
    This provides literary references and book recommendations to enhance podcast content.

    Args:
        agent: The agent instance
        query: The search query

    Returns:
        A formatted string response with the search results
    """
    agent.session_state["stage"] = "search"

    try:
        # Format query for Open Library API
        formatted_query = query.replace(" ", "+")

        # Step 1: Search for books related to the topic
        search_url = f"https://openlibrary.org/search.json?q={formatted_query}&limit=10"

        response = requests.get(search_url)
        if response.status_code != 200:
            print(f"Open Library API error: Status code {response.status_code}")
            return "Open Library search unavailable. Continuing with other search methods."

        search_data = response.json()

        if "docs" not in search_data or not search_data["docs"]:
            print(f"No books found for query: {query}")
            return "No relevant books found on Open Library for this topic. Continuing with other search methods."

        # Step 2: Process the results and get more details for top books
        results = []
        processed_count = 0

        for book in search_data["docs"]:
            # Only process up to 5 most relevant books
            if processed_count >= 5:
                break

            # Skip items without key information
            if not book.get("title") or not book.get("key"):
                continue

            # Get additional book details
            book_details = _get_book_details(book)
            if book_details:
                results.append(book_details)
                processed_count += 1

            # Respect API rate limits
            time.sleep(0.5)

        if not results:
            print("No usable book information could be retrieved")
            return "No detailed book information could be retrieved from Open Library. Continuing with other search methods."

        # Combine with existing results
        existing_results = agent.session_state.get("search_results", [])
        combined_results = results + existing_results
        combined_results = combined_results[:20]  # Limit to 20 total results

        # Update session state
        agent.session_state["search_results"] = combined_results

        print(f"Found {len(results)} books on Open Library related to: {query}")
        return f"Found {len(results)} relevant books from Open Library that provide literary context and recommended reading for your topic. Continuing with additional search methods."

    except Exception as e:
        print(f"Error during Open Library search: {str(e)}")
        return f"Error in Open Library search: {str(e)}. Continuing with other search methods."


def _get_book_details(book: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Get detailed information about a book using its Open Library ID.

    Args:
        book: Basic book information from search results

    Returns:
        Formatted book details or None if retrieval failed
    """
    try:
        book_key = book.get("key")
        if not book_key:
            return None

        # Get additional book information from Works API
        works_url = f"https://openlibrary.org{book_key}.json"

        works_response = requests.get(works_url)
        if works_response.status_code != 200:
            print(f"Error fetching book details: Status code {works_response.status_code}")
            # Fall back to basic information
            return _format_basic_book_info(book)

        works_data = works_response.json()

        # Combine search result data with works data
        return _format_book_info(book, works_data)

    except Exception as e:
        print(f"Error retrieving book details: {str(e)}")
        # Fall back to basic information
        return _format_basic_book_info(book)


def _format_basic_book_info(book: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Format basic book information when detailed retrieval fails.

    Args:
        book: Basic book information from search results

    Returns:
        Formatted book details or None if insufficient information
    """
    try:
        title = book.get("title")
        if not title:
            return None

        # Create Open Library URL
        book_key = book.get("key", "")
        url = f"https://openlibrary.org{book_key}" if book_key else "https://openlibrary.org"

        # Extract available information
        authors = book.get("author_name", [])
        author_text = ", ".join(authors) if authors else "Unknown"

        publish_year = book.get("first_publish_year")
        publish_text = f" ({publish_year})" if publish_year else ""

        # Create content
        content = f"Title: {title}{publish_text}\n"
        content += f"Author(s): {author_text}\n"

        if book.get("publisher"):
            publishers = book.get("publisher", [])
            publisher_text = ", ".join(publishers[:3])
            if len(publishers) > 3:
                publisher_text += f" and {len(publishers) - 3} more"
            content += f"Publisher(s): {publisher_text}\n"

        # Add subject tags if available
        if book.get("subject"):
            subjects = book.get("subject", [])
            subject_text = ", ".join(subjects[:10])
            if len(subjects) > 10:
                subject_text += f" and {len(subjects) - 10} more"
            content += f"\nSubjects: {subject_text}\n"

        # Create summary
        summary = f"'{title}' by {author_text}{publish_text}. "
        if book.get("subject"):
            topics = book.get("subject", [])[:3]
            summary += f"Topics include: {', '.join(topics)}. "

        # Format result
        return {
            "id": f"openlibrary_{book_key.replace('/', '_')}",
            "title": f"{title} (Book)",
            "url": url,
            "published_date": str(publish_year) if publish_year else None,
            "content": content,
            "summary": summary,
            "source_id": "openlibrary",
            "source_name": "Open Library",
            "categories": ["book", "literature", "reference"] + book.get("subject", [])[:5],
        }

    except Exception as e:
        print(f"Error formatting basic book info: {str(e)}")
        return None


def _format_book_info(book: Dict[str, Any], works_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Format detailed book information combining search results and works API data.

    Args:
        book: Basic book information from search results
        works_data: Detailed information from Works API

    Returns:
        Formatted book details or None if insufficient information
    """
    try:
        title = works_data.get("title", book.get("title"))
        if not title:
            return None

        # Create Open Library URL
        book_key = works_data.get("key", book.get("key", ""))
        url = f"https://openlibrary.org{book_key}" if book_key else "https://openlibrary.org"

        # Extract available information
        authors = book.get("author_name", [])
        author_text = ", ".join(authors) if authors else "Unknown"

        publish_year = book.get("first_publish_year")
        publish_text = f" ({publish_year})" if publish_year else ""

        # Get description
        description = ""
        if works_data.get("description"):
            if isinstance(works_data["description"], dict) and "value" in works_data["description"]:
                description = works_data["description"]["value"]
            elif isinstance(works_data["description"], str):
                description = works_data["description"]

        # Create content
        content = f"Title: {title}{publish_text}\n"
        content += f"Author(s): {author_text}\n"

        if book.get("publisher"):
            publishers = book.get("publisher", [])
            publisher_text = ", ".join(publishers[:3])
            if len(publishers) > 3:
                publisher_text += f" and {len(publishers) - 3} more"
            content += f"Publisher(s): {publisher_text}\n"

        # Add description if available
        if description:
            # Truncate description if too long
            max_desc_length = 1000
            if len(description) > max_desc_length:
                description = description[:max_desc_length] + "..."
            content += f"\nDescription:\n{description}\n"

        # Add subject tags
        subjects = []
        if works_data.get("subjects"):
            subjects.extend(works_data.get("subjects", []))
        elif book.get("subject"):
            subjects.extend(book.get("subject", []))

        if subjects:
            subject_text = ", ".join(subjects[:10])
            if len(subjects) > 10:
                subject_text += f" and {len(subjects) - 10} more"
            content += f"\nSubjects: {subject_text}\n"

        # Create summary - shorter version of content
        summary = f"'{title}' by {author_text}{publish_text}. "
        if description:
            desc_preview = description[:200] + "..." if len(description) > 200 else description
            summary += desc_preview

        # Format result
        return {
            "id": f"openlibrary_{book_key.replace('/', '_')}",
            "title": f"{title} (Book)",
            "url": url,
            "published_date": str(publish_year) if publish_year else None,
            "content": content,
            "summary": summary,
            "source_id": "openlibrary",
            "source_name": "Open Library",
            "categories": ["book", "literature", "reference"] + subjects[:5],
        }

    except Exception as e:
        print(f"Error formatting detailed book info: {str(e)}")
        return None