from agno.agent import Agent
import requests
import time
from typing import List, Dict, Any, Optional
from datetime import datetime
import html


def jikan_search(agent: Agent, query: str) -> str:
    """
    Search for anime information using the Jikan API (unofficial MyAnimeList API).
    This provides anime data, reviews, and recommendations to enhance podcast content.

    Args:
        agent: The agent instance
        query: The search query

    Returns:
        A formatted string response with the search results
    """
    agent.session_state["stage"] = "search"

    try:
        # Format query for Jikan API
        formatted_query = query.replace(" ", "%20")

        # Step 1: Search for anime related to the topic
        anime_results = _search_anime(formatted_query)

        if not anime_results:
            print(f"No relevant anime found for query: {query}")
            return "No relevant anime found for this topic. Continuing with other search methods."

        # Step 2: Get detailed information for top anime results
        results = []

        for anime in anime_results[:5]:  # Process top 5 results
            # Get detailed information
            anime_id = anime.get("mal_id")
            if not anime_id:
                continue

            # Get additional details
            anime_details = _get_anime_details(anime_id)
            if anime_details:
                results.append(anime_details)

            # Respect API rate limits (3 requests per second)
            time.sleep(0.5)

        if not results:
            print("No detailed anime information could be retrieved")
            return "No detailed anime information could be retrieved. Continuing with other search methods."

        # Combine with existing results
        existing_results = agent.session_state.get("search_results", [])
        combined_results = results + existing_results
        combined_results = combined_results[:20]  # Limit to 20 total results

        # Update session state
        agent.session_state["search_results"] = combined_results

        print(f"Found {len(results)} anime related to: {query}")
        return f"Found {len(results)} anime titles related to your topic. These provide entertainment references and cultural context from Japanese animation. Continuing with additional search methods."

    except Exception as e:
        print(f"Error during Jikan search: {str(e)}")
        return f"Error in anime search: {str(e)}. Continuing with other search methods."


def _search_anime(query: str) -> List[Dict[str, Any]]:
    """
    Search for anime using the Jikan API.

    Args:
        query: The search query

    Returns:
        List of anime search results
    """
    try:
        # Use the Jikan v4 API
        search_url = f"https://api.jikan.moe/v4/anime?q={query}&sfw=true&order_by=popularity&sort=asc&limit=10"

        response = requests.get(search_url)

        # Check for rate limiting
        if response.status_code == 429:
            print("Rate limited by Jikan API. Waiting and retrying...")
            time.sleep(2)
            response = requests.get(search_url)

        if response.status_code != 200:
            print(f"Jikan API error: Status code {response.status_code}")
            return []

        data = response.json()

        if "data" not in data:
            return []

        return data["data"]

    except Exception as e:
        print(f"Error searching anime: {str(e)}")
        return []


def _get_anime_details(anime_id: int) -> Optional[Dict[str, Any]]:
    """
    Get detailed information about an anime using its MAL ID.

    Args:
        anime_id: MyAnimeList ID for the anime

    Returns:
        Formatted anime details or None if retrieval failed
    """
    try:
        # Get full anime details
        details_url = f"https://api.jikan.moe/v4/anime/{anime_id}/full"

        details_response = requests.get(details_url)

        # Check for rate limiting
        if details_response.status_code == 429:
            print("Rate limited by Jikan API. Waiting and retrying...")
            time.sleep(2)
            details_response = requests.get(details_url)

        if details_response.status_code != 200:
            print(f"Jikan API error for anime details: Status code {details_response.status_code}")
            return None

        details_data = details_response.json()

        if "data" not in details_data:
            return None

        anime = details_data["data"]

        # Format the anime details
        return _format_anime_info(anime)

    except Exception as e:
        print(f"Error getting anime details: {str(e)}")
        return None


def _get_anime_recommendations(anime_id: int) -> List[Dict[str, Any]]:
    """
    Get anime recommendations based on the given anime.

    Args:
        anime_id: MyAnimeList ID for the anime

    Returns:
        List of recommended anime
    """
    try:
        # Get recommendations
        recs_url = f"https://api.jikan.moe/v4/anime/{anime_id}/recommendations"

        recs_response = requests.get(recs_url)

        # Check for rate limiting
        if recs_response.status_code == 429:
            print("Rate limited by Jikan API. Waiting and retrying...")
            time.sleep(2)
            recs_response = requests.get(recs_url)

        if recs_response.status_code != 200:
            print(f"Jikan API error for recommendations: Status code {recs_response.status_code}")
            return []

        recs_data = recs_response.json()

        if "data" not in recs_data:
            return []

        recommendations = []
        for rec in recs_data["data"][:5]:  # Limit to top 5 recommendations
            if "entry" in rec:
                title = rec["entry"].get("title", "")
                if title:
                    recommendations.append(title)

        return recommendations

    except Exception as e:
        print(f"Error getting anime recommendations: {str(e)}")
        return []


def _format_anime_info(anime: Dict[str, Any]) -> Dict[str, Any]:
    """
    Format anime information for podcast use.

    Args:
        anime: Raw anime data from Jikan API

    Returns:
        Formatted anime information
    """
    try:
        # Extract basic info
        mal_id = anime.get("mal_id")
        title = anime.get("title", "Unknown Anime")

        # Get English title if available
        title_english = anime.get("title_english")
        if title_english and title_english != title:
            title_display = f"{title} ({title_english})"
        else:
            title_display = title

        # Create MAL URL
        url = anime.get("url", f"https://myanimelist.net/anime/{mal_id}")

        # Get synopsis
        synopsis = anime.get("synopsis", "No synopsis available.")
        synopsis = html.unescape(synopsis)

        # Get basic metadata
        episodes = anime.get("episodes", "Unknown")
        status = anime.get("status", "Unknown")
        aired_string = anime.get("aired", {}).get("string", "Unknown")
        score = anime.get("score", "N/A")
        scored_by = anime.get("scored_by", 0)
        rank = anime.get("rank", "N/A")
        popularity = anime.get("popularity", "N/A")

        # Get studios
        studios = []
        for studio in anime.get("studios", []):
            if "name" in studio:
                studios.append(studio["name"])
        studio_text = ", ".join(studios) if studios else "Unknown"

        # Get genres
        genres = []
        for genre in anime.get("genres", []):
            if "name" in genre:
                genres.append(genre["name"])
        genre_text = ", ".join(genres) if genres else "Unknown"

        # Get themes
        themes = []
        for theme in anime.get("themes", []):
            if "name" in theme:
                themes.append(theme["name"])

        # Get demographics
        demographics = []
        for demo in anime.get("demographics", []):
            if "name" in demo:
                demographics.append(demo["name"])

        # Create content
        content = f"Title: {title_display}\n"
        content += f"Score: {score} (rated by {scored_by:,} users)\n"
        content += f"Rank: {rank}, Popularity: {popularity}\n"
        content += f"Episodes: {episodes}\n"
        content += f"Status: {status}\n"
        content += f"Aired: {aired_string}\n"
        content += f"Studio: {studio_text}\n"
        content += f"Genres: {genre_text}\n"

        if themes:
            content += f"Themes: {', '.join(themes)}\n"

        if demographics:
            content += f"Demographics: {', '.join(demographics)}\n"

        # Add synopsis
        content += f"\nSynopsis:\n{synopsis}\n"

        # Try to get recommendations
        if mal_id:
            recommendations = _get_anime_recommendations(mal_id)
            if recommendations:
                content += f"\nSimilar Anime: {', '.join(recommendations)}\n"

        # Create summary (shorter version)
        summary = f"{title_display} - {genre_text} anime with {episodes} episodes. "
        summary += f"Rating: {score}/10. "
        if synopsis:
            short_synopsis = synopsis[:150] + "..." if len(synopsis) > 150 else synopsis
            summary += short_synopsis

        # Create categories list
        categories = ["anime", "japanese animation", "entertainment"]
        if genres:
            categories.extend(genres[:5])
        if themes:
            categories.extend(themes[:2])

        # Format final result
        return {
            "id": f"jikan_{mal_id}",
            "title": f"{title_display} (Anime)",
            "url": url,
            "published_date": aired_string.split(" to ")[0] if " to " in aired_string else aired_string,
            "content": content,
            "summary": summary,
            "source_id": "jikan",
            "source_name": "MyAnimeList",
            "categories": categories,
        }

    except Exception as e:
        print(f"Error formatting anime info: {str(e)}")
        # Return basic info if detailed formatting fails
        return {
            "id": f"jikan_{anime.get('mal_id', 'unknown')}",
            "title": f"{anime.get('title', 'Unknown Anime')} (Anime)",
            "url": anime.get("url", "https://myanimelist.net"),
            "published_date": None,
            "content": anime.get("synopsis", "No information available."),
            "summary": anime.get("synopsis", "No information available.")[:150] + "...",
            "source_id": "jikan",
            "source_name": "MyAnimeList",
            "categories": ["anime", "japanese animation", "entertainment"],
        }