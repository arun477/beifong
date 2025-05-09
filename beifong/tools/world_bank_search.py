from agno.agent import Agent
import requests
import time
from typing import List, Dict, Any, Optional


def worldbank_search(agent: Agent, query: str) -> str:
    """
    Search the World Bank API for economic indicators and development statistics
    relevant to a podcast topic. This provides authoritative global data for topics
    related to countries, development, economics, and global issues.

    Args:
        agent: The agent instance
        query: The search query

    Returns:
        A formatted string response with the search results
    """
    agent.session_state["stage"] = "search"

    try:
        # Step 1: Extract potential keywords from the query for indicator search
        keywords = _extract_search_keywords(query)
        if not keywords:
            keywords = [query]

        # Step 2: Search for relevant indicators
        indicators = []
        for keyword in keywords:
            indicators.extend(_search_indicators(keyword))
            time.sleep(0.5)  # Respect API rate limits

        # Remove duplicates while preserving order
        unique_indicators = []
        seen = set()
        for indicator in indicators:
            if indicator["id"] not in seen:
                seen.add(indicator["id"])
                unique_indicators.append(indicator)

        indicators = unique_indicators[:5]  # Limit to top 5 indicators

        if not indicators:
            print(f"No relevant World Bank indicators found for: {query}")
            return "No relevant economic or development data found in World Bank database. Continuing with other search methods."

        # Step 3: Get actual data for these indicators for top countries
        results = []

        for indicator in indicators:
            indicator_data = _get_indicator_data(indicator["id"])
            if indicator_data:
                # Format the data into a podcast-friendly source
                formatted_result = _format_indicator_data(indicator, indicator_data)
                if formatted_result:
                    results.append(formatted_result)

            time.sleep(1)  # Respect API rate limits

        if not results:
            print("No usable World Bank data could be retrieved")
            return "No relevant World Bank data could be processed. Continuing with other search methods."

        # Combine with existing results
        existing_results = agent.session_state.get("search_results", [])
        combined_results = results + existing_results
        combined_results = combined_results[:20]  # Limit to 20 total results

        # Update session state
        agent.session_state["search_results"] = combined_results

        print(f"Found {len(results)} relevant economic/development datasets from World Bank")
        return f"Found {len(results)} authoritative economic and development statistics from the World Bank related to your topic. These provide factual data to strengthen your podcast. Continuing with additional search methods."

    except Exception as e:
        print(f"Error during World Bank search: {str(e)}")
        return f"Error in World Bank search: {str(e)}. Continuing with other search methods."


def _extract_search_keywords(query: str) -> List[str]:
    """
    Extract potential keywords from the search query that might match World Bank indicators.
    This improves the relevance of indicator matching.
    """
    # Common economic/development terms that match World Bank indicators
    economic_terms = [
        "GDP",
        "GNI",
        "poverty",
        "income",
        "inequality",
        "employment",
        "unemployment",
        "inflation",
        "debt",
        "deficit",
        "trade",
        "export",
        "import",
        "growth",
        "development",
        "economy",
        "economic",
        "population",
        "birth",
        "death",
        "mortality",
        "health",
        "education",
        "literacy",
        "school",
        "enrollment",
        "gender",
        "women",
        "agriculture",
        "industry",
        "manufacturing",
        "service",
        "energy",
        "electricity",
        "water",
        "sanitation",
        "environment",
        "emission",
        "climate",
        "forest",
        "land",
        "urban",
        "rural",
        "city",
        "infrastructure",
        "internet",
        "digital",
        "technology",
        "investment",
        "finance",
        "bank",
        "tax",
        "public",
        "private",
        "business",
        "enterprise",
        "corruption",
        "governance",
        "military",
        "defense",
        "aid",
        "assistance",
    ]

    # Also add country names if present
    countries = [
        "united states",
        "china",
        "india",
        "japan",
        "germany",
        "united kingdom",
        "france",
        "brazil",
        "italy",
        "canada",
        "russia",
        "south korea",
        "australia",
        "spain",
        "mexico",
        "indonesia",
        "netherlands",
        "saudi arabia",
        "switzerland",
        "turkey",
        "taiwan",
        "poland",
        "sweden",
        "belgium",
        "thailand",
        "ireland",
        "argentina",
        "norway",
        "nigeria",
        "austria",
        "united arab emirates",
        "israel",
        "egypt",
        "philippines",
        "malaysia",
        "singapore",
        "south africa",
        "bangladesh",
        "vietnam",
        "pakistan",
    ]

    query_lower = query.lower()
    keywords = []

    # Check for economic terms
    for term in economic_terms:
        if term.lower() in query_lower:
            keywords.append(term)

    # Check for country names
    for country in countries:
        if country in query_lower:
            keywords.append(country)

    # If no specific terms found, use general query words
    if not keywords:
        # Remove common words
        stopwords = ["the", "and", "or", "of", "in", "on", "at", "to", "for", "with", "about"]
        query_words = [word for word in query_lower.split() if word not in stopwords and len(word) > 3]
        keywords = query_words

    return keywords


def _search_indicators(keyword: str) -> List[Dict[str, Any]]:
    """
    Search for World Bank indicators related to the keyword.
    """
    # Encode keyword for URL
    encoded_keyword = requests.utils.quote(keyword)

    # API endpoint for indicator search
    url = f"https://api.worldbank.org/v2/indicator?format=json&per_page=10&search={encoded_keyword}"

    try:
        response = requests.get(url)
        if response.status_code != 200:
            print(f"World Bank API error: Status code {response.status_code}")
            return []

        data = response.json()

        # The API returns a two-element array where the second element contains actual data
        if len(data) < 2 or not data[1]:
            return []

        # Extract relevant indicator details
        indicators = []
        for item in data[1]:
            if "id" in item and "name" in item:
                indicators.append(
                    {
                        "id": item["id"],
                        "name": item["name"],
                        "source": item.get("source", {}).get("value", "World Bank"),
                        "sourceNote": item.get("sourceNote", ""),
                    }
                )

        return indicators

    except Exception as e:
        print(f"Error searching World Bank indicators for '{keyword}': {str(e)}")
        return []


def _get_indicator_data(indicator_id: str) -> Dict[str, Any]:
    """
    Get the most recent data for a specific indicator across major countries.
    """
    # Top 10 countries by GDP (plus world aggregate) for relevant comparison
    countries = ["WLD", "USA", "CHN", "JPN", "DEU", "GBR", "IND", "FRA", "ITA", "BRA", "CAN"]

    # Encode indicator ID for URL
    encoded_id = requests.utils.quote(indicator_id)

    # API endpoint for data retrieval (most recent 5 years)
    url = f"https://api.worldbank.org/v2/country/{','.join(countries)}/indicator/{encoded_id}?format=json&per_page=100&mrnev=5"

    try:
        response = requests.get(url)
        if response.status_code != 200:
            print(f"World Bank API error: Status code {response.status_code}")
            return {}

        data = response.json()

        # The API returns a two-element array where the second element contains actual data
        if len(data) < 2 or not data[1]:
            return {}

        return data[1]

    except Exception as e:
        print(f"Error getting data for indicator '{indicator_id}': {str(e)}")
        return {}


def _format_indicator_data(indicator: Dict[str, Any], data: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """
    Format the indicator data into a podcast-friendly source.
    """
    try:
        # Group data by country and find most recent value for each
        country_data = {}
        for item in data:
            country_name = item.get("country", {}).get("value", "Unknown")
            country_code = item.get("country", {}).get("id", "")
            year = item.get("date", "")
            value = item.get("value")

            if value is not None and year and country_name != "Unknown":
                if country_name not in country_data or year > country_data[country_name]["year"]:
                    country_data[country_name] = {"year": year, "value": value, "code": country_code}

        if not country_data:
            return None

        # Create a readable title
        title = f"{indicator['name']} (World Bank Data)"

        # Format the data as readable content
        content = f"Indicator: {indicator['name']}\n\n"
        content += f"Description: {indicator['sourceNote']}\n\n"
        content += "Recent Data:\n"

        # Sort countries, putting World first if present
        sorted_countries = sorted(country_data.keys())
        if "World" in sorted_countries:
            sorted_countries.remove("World")
            sorted_countries.insert(0, "World")

        # Limit to top 10 countries to avoid overwhelming content
        for country in sorted_countries[:10]:
            data_point = country_data[country]
            content += f"- {country} ({data_point['year']}): {data_point['value']}\n"

        content += f"\nSource: {indicator['source']}, World Bank"

        # Create a summary for preview
        summary = f"World Bank data for '{indicator['name']}' across major economies. "
        if "World" in country_data:
            world_data = country_data["World"]
            summary += f"Global value: {world_data['value']} ({world_data['year']}). "
        summary += "Includes data for multiple countries with recent figures."

        # Create a URL for the indicator on World Bank website
        url = f"https://data.worldbank.org/indicator/{indicator['id']}"

        return {
            "id": f"worldbank_{indicator['id']}",
            "title": title,
            "url": url,
            "published_date": None,  # No specific publication date for ongoing datasets
            "content": content,
            "summary": summary,
            "source_id": "worldbank",
            "source_name": "World Bank",
            "categories": ["worldbank", "statistics", "economic_data", "development", "global"],
        }

    except Exception as e:
        print(f"Error formatting indicator data: {str(e)}")
        return None