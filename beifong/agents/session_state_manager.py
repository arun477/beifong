from agno.agent import Agent
from datetime import datetime


def update_language(agent: Agent, language_code: str) -> str:
    """
    Update the podcast language with the specified language code.
    This ensures the language is properly tracked for generating content and audio.
    Args:
        agent: The agent instance
        language_code: The language code (e.g., 'en', 'es', 'fr', etc..)

    Returns:
        Confirmation message
    """
    language_name = "English"
    for lang in agent.session_state.get("available_languages", []):
        if lang.get("code") == language_code:
            language_name = lang.get("name")
            break
    agent.session_state["selected_language"] = {
        "code": language_code,
        "name": language_name,
    }
    return f"Podcast language set to: {language_name} ({language_code})"


def update_chat_title(agent: Agent, title: str) -> str:
    """
    Update the chat title with the specified short title.
    Args:
        agent: The agent instance
        title: The short title to set for the chat

    Returns:
        Confirmation message
    """
    agent.session_state["title"] = title
    agent.session_state["created_at"] = datetime.now().isoformat()
    return f"Chat title updated to: {title}"


def mark_session_finished(agent: Agent) -> str:
    """
    Mark the session as finished.
    Args:
        agent: The agent instance

    Returns:
        Confirmation message
    """
    session_state = agent.session_state
    if not session_state.get("generated_script"):
        return "Podcast Script is not generated yet."
    if not session_state.get("banner_url"):
        return "Banner is not generated yet."
    if not session_state.get("audio_url"):
        return "Audio is not generated yet."
    agent.session_state["finished"] = True
    agent.session_state["stage"] = "complete"
    return "Session marked as finished and No further conversation are allowed and only new session can be started."
