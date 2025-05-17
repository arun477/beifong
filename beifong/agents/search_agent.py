from typing import List
from agno.agent import Agent
from agno.models.openai import OpenAIChat
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from agno.tools.duckduckgo import DuckDuckGoTools
from textwrap import dedent
from agents.wikipedia_search import wikipedia_search
from agents.google_news_discovery import google_news_discovery_run

load_dotenv()


class ReturnItem(BaseModel):
    url: str = Field(..., description="The URL of the search result")
    title: str = Field(..., description="The title of the search result")
    description: str = Field(..., description="A brief description or summary of the search result content")
    source_name: str = Field(
        ...,
        description="The name/type of the source (e.g., 'wikipedia', 'general', or any reputable source tag)",
    )
    tool_used: str = Field(
        ...,
        description="The tools used to generate the search results, unknown if not used or not applicable",
    )
    published_date: str = Field(
        ...,
        description="The published date of the content in ISO format, if not available keep it empty",
    )


class SearchResults(BaseModel):
    items: List[ReturnItem] = Field(..., description="A list of search result items")


SEARCH_AGENT_DESCRIPTION = "You are a helpful assistant that can search the web for information."
SEARCH_AGENT_INSTRUCTIONS = dedent("""
    You are a helpful assistant that can search the web for information.
    For a given topic, your job is to search the web and return the top 5 sources about the topic.
    Keep the search sources of high quality and reputable, and sources should be relevant to the asked topic.
    Sources should be from diverse platforms with no duplicates.
    IMPORTANT: User queries might be fuzzy or misspelled. Understand the user's intent and act accordingly.
    IMPORTANT: The output source_name field can be one of ["wikipedia", "general", or any reputable source tag"].
    IMPORTANT: You have access to different search tools use them when appropriate which one is best for the given search query. Don't use particular tool if not required.
    IMPORTANT: Make sure you are able to detect what tool to use and use it available tool tags = ["google_news_discovery", "duckduckgo", "wikipedia_search", "unknown"].
    IMPORTANT: If query is news related please prefere google news over other news tools.
    IMPORTANT: If returned sources are not of high quality or not relevant to the asked topic, don't include them in the returned sources.
    """)


def search_agent_run(agent: Agent, query: str) -> str:
    """
    Search Agent which searches the web for relevant sources about the given topic or query.
    Args:
        agent: The agent instance
        query: The search query
    Returns:
        A formatted string response with the search results (link and gist only)
    """
    print("Search Agent Input:", query)
    search_agent = Agent(
        model=OpenAIChat(id="gpt-4o-mini"),
        instructions=SEARCH_AGENT_INSTRUCTIONS,
        description=SEARCH_AGENT_DESCRIPTION,
        use_json_mode=True,
        response_model=SearchResults,
        tools=[
            google_news_discovery_run,
            DuckDuckGoTools(),
            wikipedia_search,
        ],
        session_id=agent.session_id,
    )
    response = search_agent.run(query, session_id=agent.session_id)
    response_dict = response.to_dict()
    agent.session_state["search_results"] = response_dict["content"]["items"]
    return f"Found {len(response_dict['content']['items'])} sources about {query} {'and added to the search_results' if agent.session_state['search_results'] else ''}"
