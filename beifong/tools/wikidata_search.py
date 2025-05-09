from agno.agent import Agent
import requests
from typing import List, Dict, Any, Optional
import time
import html
from datetime import datetime

def wikidata_search(agent: Agent, query: str) -> str:
    """
    Search Wikidata for structured information about podcast topics.
    Retrieves factual, structured data that complements narrative content.
    
    Args:
        agent: The agent instance
        query: The search query
        
    Returns:
        A formatted string response with structured data results
    """
    agent.session_state["stage"] = "search"
    
    try:
        # First search for relevant Wikidata entities
        search_url = "https://www.wikidata.org/w/api.php"
        search_params = {
            "action": "wbsearchentities",
            "format": "json",
            "search": query,
            "language": "en",
            "limit": 5,  # Get top 5 relevant entities
            "type": "item"
        }
        
        search_response = requests.get(search_url, params=search_params)
        search_data = search_response.json()
        
        if "search" not in search_data or not search_data["search"]:
            print(f"No Wikidata entities found for query: {query}")
            return "No relevant Wikidata entities found for this topic. Continuing with other search methods."
        
        entity_ids = [item["id"] for item in search_data["search"]]
        
        # Retrieve detailed information about the found entities
        results = []
        
        for batch in _batch_list(entity_ids, batch_size=2):  # Process 2 entities at a time
            entity_details = _get_entity_details(batch)
            
            if not entity_details:
                continue
                
            for entity_id, entity_data in entity_details.items():
                # Extract useful information from the entity
                formatted_result = _format_entity_data(entity_id, entity_data)
                if formatted_result:
                    results.append(formatted_result)
            
            # Respect Wikidata API rate limits
            time.sleep(0.5)
        
        if not results:
            print("No useful Wikidata content could be extracted")
            return "No detailed Wikidata content could be extracted. Continuing with other search methods."
        
        # Combine with existing results
        existing_results = agent.session_state.get("search_results", [])
        combined_results = results + existing_results
        combined_results = combined_results[:20]  # Limit to 20 total results
        
        # Update session state
        agent.session_state["search_results"] = combined_results
        
        print(f"Found {len(results)} Wikidata entries about: {query}")
        return f"Found {len(results)} factual data entries from Wikidata. These provide structured facts and relationships about your topic. Continuing with additional search methods."
        
    except Exception as e:
        print(f"Error during Wikidata search: {str(e)}")
        return f"Error in Wikidata search: {str(e)}. Continuing with other search methods."


def _batch_list(items, batch_size=5):
    """Split a list into batches of specified size"""
    for i in range(0, len(items), batch_size):
        yield items[i:i + batch_size]


def _get_entity_details(entity_ids: List[str]) -> Optional[Dict]:
    """
    Retrieve detailed information about Wikidata entities
    
    Args:
        entity_ids: List of Wikidata entity IDs (e.g., ['Q76', 'Q7'])
        
    Returns:
        Dictionary with entity details or None if failed
    """
    try:
        entity_url = "https://www.wikidata.org/w/api.php"
        entity_params = {
            "action": "wbgetentities",
            "format": "json",
            "ids": "|".join(entity_ids),
            "languages": "en",
            "props": "labels|descriptions|claims|sitelinks"
        }
        
        entity_response = requests.get(entity_url, params=entity_params)
        entity_data = entity_response.json()
        
        if "entities" in entity_data:
            return entity_data["entities"]
        
        print(f"Could not retrieve entity details for: {entity_ids}")
        return None
    
    except Exception as e:
        print(f"Error retrieving entity details: {str(e)}")
        return None


def _format_entity_data(entity_id: str, entity_data: Dict) -> Optional[Dict]:
    """
    Extract and format useful information from a Wikidata entity
    
    Args:
        entity_id: The Wikidata entity ID
        entity_data: The raw entity data from the API
        
    Returns:
        Formatted dictionary with extracted information or None if not enough useful data
    """
    try:
        # Get entity label and description
        label = entity_data.get("labels", {}).get("en", {}).get("value", "Unknown")
        description = entity_data.get("descriptions", {}).get("en", {}).get("value", "")
        
        # Get Wikipedia link if available
        wikipedia_link = None
        sitelinks = entity_data.get("sitelinks", {})
        if "enwiki" in sitelinks:
            title = sitelinks["enwiki"].get("title", "").replace(" ", "_")
            wikipedia_link = f"https://en.wikipedia.org/wiki/{title}"
        
        # Extract important facts from claims
        facts = []
        important_properties = {
            "P31": "is a",
            "P21": "gender",
            "P569": "date of birth",
            "P570": "date of death",
            "P19": "place of birth",
            "P20": "place of death",
            "P27": "country of citizenship",
            "P106": "occupation",
            "P131": "located in",
            "P1448": "official name",
            "P571": "inception date",
            "P856": "official website",
            "P1082": "population",
            "P17": "country",
            "P156": "followed by",
            "P155": "follows",
            "P159": "headquarters location",
            "P112": "founded by",
            "P169": "chief executive officer",
            "P452": "industry",
            "P463": "member of",
            "P101": "field of work",
            "P138": "named after",
            "P1128": "employees",
            "P2139": "total revenue",
            "P2295": "developed by"
        }
        
        claims = entity_data.get("claims", {})
        
        for prop_id, prop_name in important_properties.items():
            if prop_id in claims:
                for claim in claims[prop_id]:
                    if "mainsnak" in claim and "datavalue" in claim["mainsnak"]:
                        value = _extract_claim_value(claim["mainsnak"])
                        if value:
                            facts.append(f"{prop_name}: {value}")
        
        # Only create an entry if we have enough useful information
        if facts:
            # Create a Wikipedia-style URL if no English Wikipedia link is available
            if not wikipedia_link:
                wikipedia_link = f"https://www.wikidata.org/wiki/{entity_id}"
            
            # Format content as structured facts
            content = f"{description}\n\nKey Facts:\n" + "\n".join([f"- {fact}" for fact in facts])
            
            return {
                "id": f"wikidata_{entity_id}",
                "title": f"{label} (Wikidata Facts)",
                "url": wikipedia_link,
                "published_date": None,
                "content": content,
                "summary": description[:300] + "..." if len(description) > 300 else description,
                "source_id": "wikidata",
                "source_name": "Wikidata",
                "categories": ["wikidata", "structured_data"],
            }
        
        return None
    
    except Exception as e:
        print(f"Error formatting entity data: {str(e)}")
        return None


def _extract_claim_value(claim_snak: Dict) -> Optional[str]:
    """
    Extract a human-readable value from a Wikidata claim
    
    Args:
        claim_snak: The mainsnak part of a Wikidata claim
        
    Returns:
        Human-readable string value or None if extraction failed
    """
    try:
        data_type = claim_snak.get("datatype")
        data_value = claim_snak.get("datavalue", {})
        value_type = data_value.get("type")
        value = data_value.get("value")
        
        if not value:
            return None
        
        # Handle different data types
        if data_type == "wikibase-item" and value_type == "wikibase-entityid":
            # This is a reference to another entity, just return the ID
            # In a more complex implementation, you could resolve the entity label
            return f"Q{value.get('numeric-id')}"
        
        elif data_type == "string" and value_type == "string":
            return value
        
        elif data_type == "time" and value_type == "time":
            # Format time values nicely
            time_value = value.get("time", "")
            precision = value.get("precision", 0)
            
            # Remove leading + and precision indicator
            if time_value.startswith("+"):
                time_value = time_value[1:]
            
            # Handle different precision levels
            if precision >= 11:  # Day precision or better
                date_obj = datetime.strptime(time_value[:10], "%Y-%m-%d")
                return date_obj.strftime("%B %d, %Y")
            elif precision == 10:  # Month precision
                date_obj = datetime.strptime(time_value[:7], "%Y-%m")
                return date_obj.strftime("%B %Y")
            elif precision == 9:  # Year precision
                return time_value[:4]
            else:
                return time_value
        
        elif data_type == "monolingualtext" and value_type == "monolingualtext":
            return value.get("text", "")
        
        elif data_type == "quantity" and value_type == "quantity":
            amount = value.get("amount", "")
            unit = value.get("unit", "")
            
            # Clean up unit URL if present
            if unit and unit.startswith("http"):
                unit = unit.split("/")[-1]
            
            if unit and unit != "1":
                return f"{amount} {unit}"
            else:
                return amount
        
        elif data_type == "url" and value_type == "string":
            return value
        
        else:
            # Return the raw value for other types
            return str(value)
    
    except Exception as e:
        print(f"Error extracting claim value: {str(e)}")
        return None