from agno.agent import Agent
import os
import uuid
import aiohttp
import aiofiles
from utils.load_api_keys import load_api_key

PODCASTS_FOLDER = "podcasts"
PODCAST_IMAGES_FOLDER = os.path.join(PODCASTS_FOLDER, "images")
IMAGE_MODEL = "dall-e-3"


async def generate_banner(agent: Agent, custom_prompt: str = None) -> str:
    """
    Generate a banner image for the podcast using OpenAI's DALL-E model.

    Args:
        agent: The agent instance
        custom_prompt: This is optional prompt if any user requests can be used here

    Returns:
        A URL to the generated banner image or error message
    """
    agent.session_state["show_script_for_confirmation"] = False
    agent.session_state["stage"] = "banner"
    script_data = agent.session_state.get("generated_script", {})
    if not script_data or (isinstance(script_data, dict) and not script_data.get("sections")):
        error_msg = "Cannot generate banner: No podcast script data found. Please generate a script first."
        print(error_msg)
        return error_msg
    images_dir = PODCAST_IMAGES_FOLDER
    try:
        openai_api_key = load_api_key("OPENAI_API_KEY")
        if not openai_api_key:
            error_msg = "Cannot generate banner: OpenAI API key not found."
            print(error_msg)
            return error_msg
        topics = []
        podcast_title = ""
        if isinstance(script_data, dict):
            podcast_title = script_data.get("title", "")
            for section in script_data.get("sections", []):
                if section.get("type") == "article":
                    topics.append(section.get("title", ""))
        if not topics and podcast_title:
            clean_title = podcast_title
            if ":" in clean_title:
                clean_title = clean_title.split(":", 1)[0]
            if "PODCAST" in clean_title:
                clean_title = clean_title.replace("PODCAST", "").strip()
            topics = [clean_title]
        top_topics = ", ".join(topics[:3]) if topics else "News and current events"
        prompt = f"""
                        Create a modern, eye-catching podcast cover image that represents a podcast about these topics: {top_topics}.

                        IMPORTANT INSTRUCTIONS:
                        - DO NOT include ANY text in the image
                        - DO NOT include any words, titles, or lettering
                        - Create a purely visual and symbolic representation
                        - Use imagery that represents the specific topics mentioned
                        - I like ghibli studio flavor if possible
                        - The image should work well as a podcast cover thumbnail
                        - Create a clean, professional design suitable for a podcast
                        - AGAIN DO NOT include ANY text
                        
                        OPTIONAL CUSTOM PROMT FROM USER (IF EMPYT IGNORE): {custom_prompt}
                    """

        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=openai_api_key)
        print(f"Generating banner image with prompt based on topics: {top_topics}")
        response = await client.images.generate(
            model=IMAGE_MODEL,
            prompt=prompt,
            size="1024x1024",
            quality="standard",
            n=1,
        )
        image_url = response.data[0].url
        async with aiohttp.ClientSession() as session:
            async with session.get(image_url) as image_response:
                if image_response.status != 200:
                    error_msg = f"Failed to download banner image: HTTP {image_response.status}"
                    print(error_msg)
                    return error_msg
                unique_id = str(uuid.uuid4())
                filename = f"podcast_banner_{unique_id}.png"
                image_path = os.path.join(images_dir, filename)
                async with aiofiles.open(image_path, "wb") as f:
                    await f.write(await image_response.read())
        frontend_path = f"{filename}"
        agent.session_state["banner_url"] = frontend_path
        agent.session_state["show_banner_for_confirmation"] = True
        print(f"Banner image successfully generated and saved to {image_path}")
        title_for_message = podcast_title if podcast_title else top_topics
        return f"![Podcast Banner]({frontend_path})\n\nI've created a banner for your '{title_for_message}' podcast based on the generated script. Please review it and let me know if you'd like any changes."
    except Exception as e:
        error_msg = f"Error generating banner image: {str(e)}"
        print(error_msg)
        return f"I encountered an error while generating the podcast banner: {str(e)}. Please try again or let me know if you'd like to proceed without a custom banner."
