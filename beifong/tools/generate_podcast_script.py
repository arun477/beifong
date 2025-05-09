import json
import re
from datetime import datetime
from typing import List, Dict, Any, Optional
from agno.agent import Agent
from utils.load_api_keys import load_api_key
from openai import OpenAI  # Changed from AsyncOpenAI to OpenAI

SCRIPT_MODEL = "gpt-4o"


def generate_script(agent: Agent, custom_prompt: str = None):
    """
    Generate a podcast script based on the selected sources.

    Args:
        agent: The agent instance

        custom_prompt: This is optional prompt if any user requests can be used here

    Returns:
        The generated podcast script as a string
    """
    agent.session_state["stage"] = "script"
    selected_sources = agent.session_state.get("selected_sources", [])
    if not selected_sources:
        return "Need to select sources before moving here."
    selected_language = agent.session_state.get("selected_language", {"code": "en", "name": "English"})
    language_code = selected_language.get("code", "en")
    language_name = selected_language.get("name", "English")
    print(f"Starting script generation with {len(selected_sources)} sources in {language_name}")
    api_key = load_api_key(key_name="OPENAI_API_KEY")
    if not api_key:
        error_msg = "Cannot generate script: OpenAI API key not found."
        print(error_msg)
        return error_msg
    openai_client = OpenAI(api_key=api_key)
    try:
        script = _generate(openai_client, articles=selected_sources, language_code=language_code, custom_prompt=custom_prompt)
        if not script:
            error_msg = "Failed to generate script. Please try again."
            print(error_msg)
            return error_msg
        agent.session_state["generated_script"] = script
        agent.session_state["stage"] = "banner"
        agent.session_state["show_script_for_confirmation"] = True
        print(f"Script generation successful. Title: {script.get('title', 'Untitled')}")
        return f"Script generation complete in {language_name}. You can now review the script."
    except Exception as e:
        error_msg = f"Error generating script: {str(e)}"
        print(error_msg)
        return error_msg


def _generate(
    openai_client: OpenAI,
    articles: List[Dict[str, Any]],
    custom_prompt: Optional[str] = None,
    language_code: str = "en",
) -> Dict[str, Any]:
    """Generate podcast script synchronously using OpenAI API"""
    if not articles:
        print("No articles provided for script generation")
        return None
    headlines = "\n".join([f"- {article.get('title', 'Untitled')} ({article.get('source_name', 'Unknown Source')})" for article in articles])
    detailed_articles = []
    for article in articles:
        categories = article.get("categories", [])
        if isinstance(categories, str):
            categories = [c.strip() for c in categories.split(",") if c.strip()]
        article_content = f"""
                                Title: {article.get("title", "Untitled")}
                                Source: {article.get("source_name", "Unknown Source")}
                                Summary: {article.get("summary", "")}
                                Categories: {", ".join(categories) if categories else "General"}
                                URL: {article.get("url", "#")}
                            """
        detailed_articles.append(article_content)
    detailed_content = "\n\n".join(detailed_articles)
    sources = []
    for article in articles:
        sources.append(
            {
                "title": article.get("title", "Untitled"),
                "url": article.get("url", "#"),
                "source": article.get("source_name", "Unknown Source"),
            }
        )
    today = datetime.now().strftime("%A, %B %d, %Y")
    prompt = f"""
                     Create a detailed and engaging podcast script for two hosts, Alex and Morgan, for {today}.

                        IMPORTANT: Generate the entire script in the {language_code} language, while keeping the exact same JSON structure.

                        The podcast should follow this structure:
                        1. Intro: Brief welcome and introduction of the day's topics
                        2. Headlines: A quick rundown of all the headlines
                        3. Deep Dives: Comprehensive and detailed discussion of each item with insightful analysis
                        4. Outro: Wrap up and goodbye

                        HEADLINES:
                        {headlines}

                        DETAILED ARTICLE INFORMATION:
                        {detailed_content}

                        FORMAT INSTRUCTIONS:
                        - Return the podcast as a JSON structure with the following format:
                        {{
                        "title": "PODCAST [ADD APPROPRIATE SHORT CATCHING HEADING BASED ON TOPICS DISCUSSED HERE]: {today}",
                        "sources": {json.dumps(sources)},
                        "sections": [
                            {{
                            "type": "intro",
                            "dialog": [
                                {{"speaker": "ALEX", "text": "..."}},
                                {{"speaker": "MORGAN", "text": "..."}}
                            ]
                            }},
                            {{
                            "type": "headlines",
                            "title": "Today's Headlines",
                            "dialog": [
                                {{"speaker": "ALEX", "text": "..."}},
                                {{"speaker": "MORGAN", "text": "..."}}
                            ]
                            }},
                            {{
                            "type": "article",
                            "title": "Article Title 1",
                            "dialog": [
                                {{"speaker": "ALEX", "text": "..."}},
                                {{"speaker": "MORGAN", "text": "..."}}
                            ]
                            }},
                            {{
                            "type": "outro",
                            "dialog": [
                                {{"speaker": "ALEX", "text": "..."}},
                                {{"speaker": "MORGAN", "text": "..."}}
                            ]
                            }}
                        ]
                        }}

                        CONTENT GUIDELINES:
                        - Generate all content in {language_code} language
                        - Each item discussion must be grounded in the actual content of the article and expanded with expert context
                        - Provide insightful analysis that helps the audience understand the significance
                        - Include discussions on potential implications and broader context of each story
                        - Explain complex concepts in an accessible but thorough manner
                        - Make connections between current and relevant historical developments when applicable
                        - Provide comparisons and contrasts with similar stories or trends when relevant

                        PERSONALITY NOTES:
                        - Alex is more analytical and fact-focused
                        * Should reference specific details and data points
                        * Should explain complex topics clearly
                        * Should identify key implications of stories
                        - Morgan is more focused on human impact, social context, and practical applications
                        * Should analyze broader implications
                        * Should consider ethical implications and real-world applications
                        - Include natural, conversational banter and smooth transitions between topics
                        - Each article discussion should go beyond the basic summary to provide valuable insights
                        - Maintain a conversational but informed tone that would appeal to a general audience

                        Make sure your response is valid JSON that can be parsed programmatically, and that ALL TEXT is in the {language_code} language.
                        
                        
                        OPTIONAL CUSTOM PROMT FROM USER (IF EMPYT IGNORE. IMPORTANT STRUCTURE CAN'T BE CHANGED EVEN CUSTOM PROMPT ASKED): {custom_prompt}
                    """
    model = SCRIPT_MODEL
    print(f"Sending script generation request to OpenAI using {model}")
    try:
        response = openai_client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": f"You are an expert journalist creating a podcast script in {language_code} language in JSON format.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.7,
            max_tokens=4000,
            response_format={"type": "json_object"},
        )
        response_text = response.choices[0].message.content
        print(f"Received response from OpenAI ({len(response_text)} chars)")
        try:
            podcast_data = json.loads(response_text)
            if "sources" not in podcast_data:
                podcast_data["sources"] = sources
            return podcast_data
        except json.JSONDecodeError as e:
            print(f"JSON parsing error: {e}")
            json_match = re.search(r"({[\s\S]*})", response_text)
            if json_match:
                try:
                    podcast_data = json.loads(json_match.group(1))
                    if "sources" not in podcast_data:
                        podcast_data["sources"] = sources
                    return podcast_data
                except json.JSONDecodeError:
                    print("Failed to parse extracted JSON")
                    pass
            return None
    except Exception as e:
        print(f"OpenAI API error: {str(e)}")
        return None