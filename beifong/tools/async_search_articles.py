import aiosqlite
from openai import AsyncOpenAI
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any
from agno.agent import Agent
from utils.load_api_keys import load_api_key
from db.config import get_tracking_db_path

api_key = load_api_key("OPENAI_API_KEY")
TOPICS_EXTRACTION_MODEL = "gpt-4o-mini"


async def extract_search_terms(prompt: str, max_terms: int = 8) -> list:
    client = AsyncOpenAI(api_key=api_key)
    system_msg = (
        "analyze the user's request and extract up to "
        f"{max_terms} key search terms or phrases (focus on nouns and concepts). "
        "Include broad variations and synonyms to increase match chances. "
        "For very specific topics, add general category terms too. "
        "output only a json object following this exact schema: "
        "{'terms': ['term1','term2',...]}. no additional keys or text."
    )
    try:
        resp = await client.chat.completions.create(
            model=TOPICS_EXTRACTION_MODEL,
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,
            response_format={"type": "json_object"},
        )
        parsed = json.loads(resp.choices[0].message.content.strip())
        if isinstance(parsed, dict) and isinstance(parsed.get("terms"), list):
            return parsed["terms"]
    except Exception as e:
        print(f"Error extracting search terms: {e}")
    return [prompt.strip()]


async def search_articles(
    agent: Agent,
    prompt: str,
) -> List[Dict[str, Any]]:
    """
    Search for articles related to a podcast topic.

    Args:
        agent: The agent instance
        prompt: Search prompt this will take care of the topic generation just give the proper prompt (this function uses llm to do the topic generation)

    Returns:
        A formatted string response with the search results
    """
    agent.session_state["stage"] = "search"
    use_categories = True
    limit = 5
    operator = "OR"
    db_path = get_tracking_db_path()
    from_date = (datetime.now() - timedelta(hours=100)).isoformat()
    terms = await extract_search_terms(prompt, api_key)
    if not terms:
        return []
    async with aiosqlite.connect(f"file:{db_path}?mode=ro", uri=True) as conn:
        conn.row_factory = lambda cursor, row: {col[0]: row[idx] for idx, col in enumerate(cursor.description)}
        results = []
        try:
            results = await _execute_search(conn, terms, from_date, operator, limit, use_categories)
            if not results:
                return "No results found in articles db."
            for article in results:
                article["categories"] = await _get_article_categories(conn, article["id"])
        except Exception as e:
            print(f"Error searching articles: {e}")
    if len(results) == 0:
        return "No results found ask user to be specific about the topics"
    agent.session_state["search_results"] = results
    agent.session_state["stage"] = "source_selection"
    return f"Found : {len(results)}"


async def _execute_search(
    conn,
    terms,
    from_date,
    operator,
    limit,
    use_categories=True,
    partial_match=False,
    days_fallback=0,
):
    if days_fallback > 0:
        try:
            from_date_obj = datetime.fromisoformat(from_date.replace("Z", "").split("+")[0])
            adjusted_date = (from_date_obj - timedelta(days=days_fallback)).isoformat()
            from_date = adjusted_date
        except Exception as e:
            print(f"Warning: Could not adjust date with fallback: {e}")
    base_query = """
        SELECT DISTINCT ca.id, ca.title, ca.url, ca.published_date, ca.summary as content, 
               ca.source_id, ca.feed_id
        FROM crawled_articles ca
        WHERE ca.processed = 1 AND ca.published_date >= ?
    """
    if use_categories:
        base_query = """
            SELECT DISTINCT ca.id, ca.title, ca.url, ca.published_date, ca.summary as content,
                   ca.source_id, ca.feed_id
            FROM crawled_articles ca
            LEFT JOIN article_categories ac ON ca.id = ac.article_id
            WHERE ca.processed = 1 AND ca.published_date >= ?
        """
    clauses, params = [], [from_date]
    for term in terms:
        term_clauses = []
        like = f"%{term}%"
        term_clauses.append("(ca.title LIKE ? OR ca.content LIKE ? OR ca.summary LIKE ?)")
        params.extend([like, like, like])

        if use_categories:
            term_clauses.append("(ac.category_name LIKE ?)")
            params.append(like)

        if term_clauses:
            clauses.append(f"({' OR '.join(term_clauses)})")
    where = f" {operator} ".join(clauses)
    sql = f"{base_query} AND ({where}) ORDER BY ca.published_date DESC LIMIT {limit}"
    async with conn.execute(sql, params) as cursor:
        return [dict(row) for row in await cursor.fetchall()]


async def _get_article_categories(conn, article_id):
    try:
        async with conn.execute(
            "SELECT category_name FROM article_categories WHERE article_id = ?",
            (article_id,),
        ) as cursor:
            return [row["category_name"] for row in await cursor.fetchall()]
    except Exception as e:
        print(f"Error fetching article categories: {e}")
        return []
