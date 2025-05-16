from agno.agent import Agent
from dotenv import load_dotenv
from typing import List

load_dotenv()


def user_source_selection_run(
    agent: Agent,
    selected_sources: List[int],
) -> str:
    """
    User Source Selection that takes the selected sources indices as input and updates the final confirmed sources.
    Args:
        agent: The agent instance
        selected_sources: The selected sources indices
    Returns:
        Response status
    """
    for i, src in enumerate(agent.session_state["search_results"]):
        if (i+1) in selected_sources:
            src["confirmed"] = True
        else:
            src["confirmed"] = False
    return f"Updated selected sources to {selected_sources}."
