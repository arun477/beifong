import os
import json
import re
import uuid
import requests
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from openai import OpenAI
from db.config import get_tracking_db_path, get_podcasts_db_path, get_tasks_db_path
from db.podcasts import store_podcast
from db.podcast_configs import get_podcast_config, get_all_podcast_configs
from utils.get_articles import search_articles
from utils.tts_engine_selector import generate_podcast_audio
from utils.load_api_keys import load_api_key

PODCAST_ASSETS_DIR = "podcasts"
IMAGE_GENERATION_MODEL = "dall-e-3"
PODCAST_SCRIPT_MODEL = "gpt-4o"


def generate_podcast_from_prompt(
    prompt: str,
    openai_api_key: str,
    tracking_db_path: Optional[str] = None,
    podcasts_db_path: Optional[str] = None,
    output_dir: str = PODCAST_ASSETS_DIR,
    limit: int = 20,
    from_date: Optional[str] = None,
    tts_engine: str = "kokoro",
    language_code: str = "en",
    podcast_script_prompt: Optional[str] = None,
    image_prompt: Optional[str] = None,
    debug: bool = False,
) -> Dict[str, Any]:
    if tracking_db_path is None:
        tracking_db_path = get_tracking_db_path()
    if podcasts_db_path is None:
        podcasts_db_path = get_podcasts_db_path()
    client = OpenAI(api_key=openai_api_key)
    os.makedirs(output_dir, exist_ok=True)
    images_dir = os.path.join(output_dir, "images")
    os.makedirs(images_dir, exist_ok=True)
    if from_date is None:
        from_date = (datetime.now() - timedelta(hours=24)).isoformat()
    articles = search_articles(prompt, tracking_db_path, openai_api_key, limit=limit, from_date=from_date)
    if not articles:
        print(f"WARNING: No articles found for prompt: {prompt}")
        return {"error": "No articles found"}
    print(f"Found {len(articles)} articles for prompt: {prompt}")
    podcast_data = generate_podcast_script(
        client,
        articles,
        custom_prompt=podcast_script_prompt,
        language_code=language_code,
        debug=debug,
    )
    if not podcast_data:
        print("ERROR: Failed to generate podcast script")
        return {"error": "Failed to generate podcast script"}
    if not podcast_data.get("sections"):
        print("ERROR: Generated podcast script is missing required sections")
        return {"error": "Invalid podcast script structure"}
    banner_path = generate_banner_image(client, podcast_data, custom_prompt=image_prompt, output_dir=images_dir)
    banner_filename = os.path.basename(banner_path) if banner_path else None
    audio_format = convert_script_to_audio_format(podcast_data)
    audio_filename = f"podcast_{datetime.now().strftime('%Y%m%d_%H%M%S')}.wav"
    audio_path = os.path.join(output_dir, "audio", audio_filename)
    try:

        class DictPodcastScript:
            def __init__(self, entries):
                self.entries = entries

            def __iter__(self):
                return iter(self.entries)

        script_obj = DictPodcastScript(audio_format["entries"])
        full_audio_path = generate_podcast_audio(
            script=script_obj,
            output_path=audio_path,
            tts_engine=tts_engine,
            language_code=language_code,
        )
        if full_audio_path:
            print(f"Generated podcast audio: {full_audio_path}")
        else:
            print("ERROR: Failed to generate audio")
            audio_filename = None

    except Exception as e:
        print(f"ERROR: Error generating audio: {e}")
        import traceback

        traceback.print_exc()
        audio_filename = None

    try:
        podcast_id = store_podcast(
            podcasts_db_path,
            podcast_data,
            audio_filename,
            banner_filename,
            tts_engine=tts_engine,
            language_code=language_code,
        )
        print(f"Stored podcast data with ID: {podcast_id}")
    except Exception as e:
        print(f"ERROR: Error storing podcast data: {e}")
        podcast_id = 0
    if audio_filename:
        frontend_audio_path = os.path.join(output_dir, audio_filename).replace("\\", "/")
    else:
        frontend_audio_path = None
    if banner_filename:
        frontend_banner_path = os.path.join(images_dir, banner_filename).replace("\\", "/")
    else:
        frontend_banner_path = None
    return {
        "podcast_id": podcast_id,
        "title": podcast_data.get("title", "Podcast"),
        "audio_path": frontend_audio_path,
        "banner_path": frontend_banner_path,
        "script": podcast_data,
        "tts_engine": tts_engine,
        "language": language_code,
    }


def generate_podcast_script(
    openai_client: OpenAI,
    articles: List[Dict[str, Any]],
    custom_prompt: Optional[str] = None,
    language_code: str = "en",
    debug: bool = False,
) -> Dict[str, Any]:
    if not articles:
        print("WARNING: No articles provided for podcast generation")
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
    if custom_prompt:
        prompt = custom_prompt
        prompt = prompt.replace("{date}", today)
        prompt = prompt.replace("{headlines}", headlines)
        prompt = prompt.replace("{detailed_content}", detailed_content)
        prompt = prompt.replace("{sources}", json.dumps(sources))
    else:
        prompt = f"""
                    Create a detailed and engaging podcast script for two hosts, Alex and Morgan, for {today}.

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
                        // Additional article sections for each news item
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

                    Make sure your response is valid JSON that can be parsed programmatically.
                """
    model = PODCAST_SCRIPT_MODEL
    print(f"Generating podcast script using OpenAI API in language: {language_code}")
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
        try:
            podcast_data = json.loads(response_text)
            if "sources" not in podcast_data:
                podcast_data["sources"] = sources
            return podcast_data
        except json.JSONDecodeError as e:
            print(f"ERROR: Error parsing JSON: {e}")
            json_match = re.search(r"({[\s\S]*})", response_text)
            if json_match:
                try:
                    podcast_data = json.loads(json_match.group(1))
                    if "sources" not in podcast_data:
                        podcast_data["sources"] = sources
                    return podcast_data
                except json.JSONDecodeError:
                    print("ERROR: Failed to parse extracted JSON")
            print("ERROR: Failed to parse JSON response from OpenAI")
            return None
    except Exception as e:
        print(f"ERROR: Error generating podcast script: {e}")
        return None


def generate_banner_image(
    openai_client: OpenAI,
    podcast_data: Dict[str, Any],
    custom_prompt: Optional[str] = None,
    output_dir: str = None,
) -> Optional[str]:
    os.makedirs(output_dir, exist_ok=True)
    topics = []
    for section in podcast_data.get("sections", []):
        if section.get("type") == "article":
            topics.append(section.get("title", ""))
    top_topics = ", ".join(topics[:3]) if topics else "TOPIC INPUT IS MISSSING [DON'T GENERATE IMAGE]"
    if custom_prompt:
        prompt = custom_prompt.replace("{topics}", top_topics)
    else:
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
                    - AGAIN DO NOT include any texts in the output image.
                 """
    print(f"Generating banner image with prompt: {prompt}")
    try:
        response = openai_client.images.generate(
            model=IMAGE_GENERATION_MODEL,
            prompt=prompt,
            size="1024x1024",
            quality="standard",
            n=1,
        )
        image_url = response.data[0].url
        image_response = requests.get(image_url)
        if image_response.status_code == 200:
            unique_id = str(uuid.uuid4())
            filename = f"podcast_banner_{unique_id}.png"
            image_path = os.path.join(output_dir, filename)
            with open(image_path, "wb") as f:
                f.write(image_response.content)
            print(f"Banner image saved to {image_path}")
            return image_path
        else:
            print(f"ERROR: Failed to download image: {image_response.status_code}")
            return None
    except Exception as e:
        print(f"ERROR: Error generating banner image: {e}")
        return None


def convert_script_to_audio_format(
    podcast_data: Dict[str, Any],
) -> Dict[str, List[Dict[str, Any]]]:
    speaker_map = {"ALEX": 1, "MORGAN": 2}
    dict_entries = []
    for section in podcast_data.get("sections", []):
        for dialog in section.get("dialog", []):
            speaker = dialog.get("speaker", "ALEX")
            text = dialog.get("text", "")
            if text and speaker in speaker_map:
                dict_entries.append({"text": text, "speaker": speaker_map[speaker]})
    return {"entries": dict_entries}


def generate_podcast_from_config(
    config_id: int,
    openai_api_key: str,
    tracking_db_path: Optional[str] = None,
    podcasts_db_path: Optional[str] = None,
    tasks_db_path: Optional[str] = None,
    output_dir: str = PODCAST_ASSETS_DIR,
    debug: bool = False,
) -> Dict[str, Any]:
    if tracking_db_path is None:
        tracking_db_path = get_tracking_db_path()
    if podcasts_db_path is None:
        podcasts_db_path = get_podcasts_db_path()
    if tasks_db_path is None:
        tasks_db_path = get_tasks_db_path()
    config = get_podcast_config(tasks_db_path, config_id)
    if not config:
        print(f"ERROR: Podcast configuration not found: {config_id}")
        return {"error": f"Podcast configuration not found: {config_id}"}
    prompt = config.get("prompt", "")
    time_range_hours = config.get("time_range_hours", 24)
    limit_articles = config.get("limit_articles", 20)
    tts_engine = config.get("tts_engine", "elevenlabs")
    language_code = config.get("language_code", "en")
    podcast_script_prompt = config.get("podcast_script_prompt")
    image_prompt = config.get("image_prompt")
    from_date = (datetime.now() - timedelta(hours=time_range_hours)).isoformat()
    print(f"Generating podcast with config: {config.get('name', 'Unnamed')}")
    print(f"Prompt: {prompt}")
    print(f"Time range: {time_range_hours} hours")
    print(f"Limit: {limit_articles} articles")
    print(f"TTS Engine: {tts_engine}")
    print(f"Language: {language_code}")
    return generate_podcast_from_prompt(
        prompt=prompt,
        openai_api_key=openai_api_key,
        tracking_db_path=tracking_db_path,
        podcasts_db_path=podcasts_db_path,
        output_dir=output_dir,
        limit=limit_articles,
        from_date=from_date,
        tts_engine=tts_engine,
        language_code=language_code,
        podcast_script_prompt=podcast_script_prompt,
        image_prompt=image_prompt,
        debug=debug,
    )


def process_all_active_configs(
    openai_api_key: str,
    tracking_db_path: Optional[str] = None,
    podcasts_db_path: Optional[str] = None,
    tasks_db_path: Optional[str] = None,
    output_dir: str = PODCAST_ASSETS_DIR,
    debug: bool = False,
) -> List[Dict[str, Any]]:
    if tracking_db_path is None:
        tracking_db_path = get_tracking_db_path()
    if podcasts_db_path is None:
        podcasts_db_path = get_podcasts_db_path()
    if tasks_db_path is None:
        tasks_db_path = get_tasks_db_path()
    configs = get_all_podcast_configs(tasks_db_path, active_only=True)
    if not configs:
        print("WARNING: No active podcast configurations found")
        return [{"error": "No active podcast configurations found"}]
    results = []
    for config in configs:
        config_id = config["id"]
        config_name = config["name"]
        print(f"Processing podcast configuration {config_id}: {config_name}")
        try:
            result = generate_podcast_from_config(
                config_id=config_id,
                openai_api_key=openai_api_key,
                tracking_db_path=tracking_db_path,
                podcasts_db_path=podcasts_db_path,
                tasks_db_path=tasks_db_path,
                output_dir=output_dir,
                debug=debug,
            )
            result["config_id"] = config_id
            result["config_name"] = config_name
            results.append(result)
            print(f"Successfully generated podcast for config {config_id}: {config_name}")
        except Exception as e:
            print(f"ERROR: Error generating podcast for config {config_id}: {e}")
            results.append({"config_id": config_id, "config_name": config_name, "error": str(e)})
    return results


def main():
    openai_api_key = load_api_key()
    tasks_db_path = get_tasks_db_path()
    if not openai_api_key:
        print("ERROR: No OpenAI API key provided. Please set OPENAI_API_KEY environment variable.")
        return 1
    output_dir = PODCAST_ASSETS_DIR
    debug = False
    results = process_all_active_configs(
        openai_api_key=openai_api_key,
        tasks_db_path=tasks_db_path,
        output_dir=output_dir,
        debug=debug,
    )
    print("\nPodcast Generation Results:")
    for result in results:
        config_id = result.get("config_id", "Unknown")
        config_name = result.get("config_name", "Unknown")
        if "error" in result:
            print(f"Config {config_id} ({config_name}): {result['error']}")
        else:
            print(f"Config {config_id} ({config_name}): Success - Podcast ID: {result.get('podcast_id', 'Unknown')}")
    return 0


if __name__ == "__main__":
    exit(main())
