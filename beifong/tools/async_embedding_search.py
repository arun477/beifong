from agno.agent import Agent
import os
import numpy as np
import faiss
from openai import AsyncOpenAI
from db.config import get_tracking_db_path, get_faiss_db_path, get_sources_db_path
from db.connection import execute_query
from utils.load_api_keys import load_api_key
import traceback

EMBEDDING_MODEL = "text-embedding-3-small"


async def generate_query_embedding(query_text, model=EMBEDDING_MODEL):
    try:
        api_key = load_api_key("OPENAI_API_KEY")
        if not api_key:
            return None, "OpenAI API key not found"
        client = AsyncOpenAI(api_key=api_key)
        response = await client.embeddings.create(input=query_text, model=model)
        return response.data[0].embedding, None
    except Exception as e:
        print(f"Error generating query embedding: {str(e)}")
        return None, str(e)


def load_faiss_index(index_path):
    if not os.path.exists(index_path):
        return None, f"FAISS index not found at {index_path}"
    try:
        return faiss.read_index(index_path), None
    except Exception as e:
        return None, f"Error loading FAISS index: {str(e)}"


def load_id_mapping(mapping_path):
    if not os.path.exists(mapping_path):
        return None, f"ID mapping not found at {mapping_path}"
    try:
        return np.load(mapping_path).tolist(), None
    except Exception as e:
        return None, f"Error loading ID mapping: {str(e)}"


async def get_article_details(tracking_db_path, article_ids):
    if not article_ids:
        return []
    placeholders = ",".join(["?"] * len(article_ids))
    query = f"""
    SELECT id, title, url, published_date, summary, source_id, feed_id, content
    FROM crawled_articles
    WHERE id IN ({placeholders})
    """
    return execute_query(tracking_db_path, query, article_ids, fetch=True)


async def get_source_names(source_ids):
    if not source_ids:
        return {}
    unique_ids = list(set([src_id for src_id in source_ids if src_id]))
    if not unique_ids:
        return {}
    try:
        sources_db_path = get_sources_db_path()
        check_query = """
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='sources'
        """
        table_exists = execute_query(sources_db_path, check_query, fetch=True)
        if not table_exists:
            print("Warning: 'sources' table not found in sources database")
            return {}
        placeholders = ",".join(["?"] * len(unique_ids))
        query = f"""
        SELECT id, name FROM sources
        WHERE id IN ({placeholders})
        """
        results = execute_query(sources_db_path, query, unique_ids, fetch=True)
        return {str(row["id"]): row["name"] for row in results} if results else {}
    except Exception as e:
        print(f"Error getting source names: {e}")
        return {}


async def embedding_search(agent: Agent, prompt: str) -> str:
    """
    Perform a semantic search using embeddings to find articles related to the query.
    This search uses vector representations to find semantically similar content,
    filtering for only high-quality matches (similarity score ≥ 85%).

    Args:
        agent: The Agno agent instance
        prompt: The search query

    Returns:
        A formatted string response with the search results
    """
    agent.session_state["stage"] = "search"
    tracking_db_path = get_tracking_db_path()
    index_path, mapping_path = get_faiss_db_path()
    top_k = 20
    similarity_threshold = 0.85
    if not os.path.exists(index_path) or not os.path.exists(mapping_path):
        print(f"FAISS index not found at {index_path} or mapping not found at {mapping_path}")
        return "Embedding search not available: index files not found. Continuing with other search methods."
    query_embedding, error = await generate_query_embedding(prompt)
    if not query_embedding:
        print(f"Failed to generate query embedding: {error}")
        return f"Semantic search unavailable: {error}. Continuing with other search methods."
    query_vector = np.array([query_embedding]).astype(np.float32)
    try:
        faiss_index, error = load_faiss_index(index_path)
        if error:
            print(error)
            return f"Semantic search unavailable: {error}. Continuing with other search methods."
        id_map, error = load_id_mapping(mapping_path)
        if error:
            print(error)
            return f"Semantic search unavailable: {error}. Continuing with other search methods."
        print(f"Searching FAISS index with {len(id_map)} articles...")
        distances, indices = faiss_index.search(query_vector, top_k)
        results_with_metrics = []
        for i, idx in enumerate(indices[0]):
            if idx >= 0 and idx < len(id_map):
                distance = float(distances[0][i])
                similarity = float(np.exp(-distance)) if distance > 0 else 0
                if similarity >= similarity_threshold:
                    article_id = id_map[idx]
                    results_with_metrics.append((idx, distance, similarity, article_id))
        results_with_metrics.sort(key=lambda x: x[2], reverse=True)
        result_article_ids = [item[3] for item in results_with_metrics]
        if not result_article_ids:
            print("No results met the similarity threshold")
            return "No high-quality semantic matches found (threshold: 85%). Continuing with other search methods."
        results = await get_article_details(tracking_db_path, result_article_ids)
        source_ids = [result.get("source_id") for result in results if result.get("source_id")]
        source_names = await get_source_names(source_ids)
        formatted_results = []
        for i, result in enumerate(results):
            # Get the original similarity score from our filtered results
            article_id = result.get("id")
            similarity = next((item[2] for item in results_with_metrics if item[3] == article_id), 0)

            # Format with percentage for easier human understanding
            similarity_percent = int(similarity * 100)

            source_id = str(result.get("source_id", "unknown"))
            source_name = source_names.get(source_id, source_id)

            formatted_result = {
                "id": article_id,
                "title": f"{result.get('title', 'Untitled')} (Relevance: {similarity_percent}%)",
                "url": result.get("url", "#"),
                "published_date": result.get("published_date"),
                "content": result.get("summary", result.get("content", "")),
                "summary": result.get("summary", ""),
                "source_id": source_id,
                "source_name": source_name,
                "similarity": similarity,
                "categories": ["semantic"],
            }
            formatted_results.append(formatted_result)
        existing_results = agent.session_state.get("search_results", [])
        combined_results = formatted_results + existing_results
        combined_results = combined_results[:20]
        agent.session_state["search_results"] = combined_results
        return f"Found {len(formatted_results)} high-quality semantically relevant articles (similarity ≥ 85%). Continuing with additional search methods."
    except Exception as e:
        print(f"Error during embedding search: {str(e)}")
        traceback.print_exc()
        return f"Error in semantic search: {str(e)}. Continuing with other search methods."