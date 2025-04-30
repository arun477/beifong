# 🦉 Beifong: Your Junk-Free, Personalized Podcasts

Beifong generates high-quality podcasts from news articles and web content you trust and curate. It handles the complete pipeline from data collection and analysis to production of scripts, visuals, and audio.

## Installation

### Prerequisites

-   Python 3.11+
-   OpenAI API key
-   (Optional) ElevenLabs API key

### Backend Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/beifong.git
cd beifong

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# (Optional but recommended) Download demo content
# Navigate to the beifong directory if not already there
cd beifong  # Skip if already in the beifong folder
# This populates the system with sample data, curated source feeds, and assets
python bootstrap_demo.py
```

### API Keys

Create a `.env` file in the `/beifong` directory:

    OPENAI_API_KEY=your_openai_api_key
    ELEVENSLAB_API_KEY=your_elevenlabs_api_key  # Optional

### Frontend Setup

```bash
# Navigate to web directory
cd web

# Install dependencies
npm install

# Start development server
npm start
```

## Features

### Content Pipeline

-   **Collection**: RSS feeds, web scraping, real-time web search (using browser-use)
-   **Analysis**: AI-powered categorization, summarization, vector-based semantic search
-   **Generation**: Dynamic script creation, AI artwork, natural-sounding audio

### Content Collection

By default, Beifong uses RSS feeds as the primary content source, crawling linked articles to extract full content. The modular architecture allows for easy extension:

-   **Current flow**: RSS feeds → Extract article URLs → Crawl and process each URL
-   **Direct URL input**: The URL processor can be easily adapted to accept direct URLs without requiring RSS feeds
-   **Web search**: Implements direct content gathering through browser-use browser automation

Current web parsing uses simple BeautifulSoup extraction without complex rendering or interaction. This works for most standard news sites but could be enhanced by integrating:

-   **Headless browser crawling**: Tools like [browser-use](https://github.com/browser-use/browser-use) for JavaScript-heavy sites
-   **Intelligent extraction**: Readability algorithms that better identify main content
-   **Site-specific parsers**: Custom extractors for popular content platforms

To add direct URL crawling, you would only need to update the `url_processor.py` to accept URLs from additional sources beyond feed entries.

### Key Capabilities

-   **Multi-language Support**: English, Hindi, Spanish, French, German, Chinese, and more
-   **Multiple Voice Options**: OpenAI, ElevenLabs, and Kokoro TTS engines
-   **Automation**: Scheduled content processing and podcast generation
-   **Interactive Creation**: Step-by-step podcast creation interface
-   **Vector Search**: FAISS-powered semantic content discovery

## Installation

### Prerequisites

-   Python 3.11+
-   OpenAI API key
-   (Optional) ElevenLabs API key

### Backend Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/beifong.git
cd beifong

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### API Keys

Create a `.env` file in the `/beifong` directory:

    OPENAI_API_KEY=your_openai_api_key
    ELEVENSLAB_API_KEY=your_elevenlabs_api_key  # Optional

### Frontend Setup

```bash
# Navigate to web directory
cd web

# Install dependencies
npm install

# Start development server
npm start
```

## Architecture

### Core Components

-   **FastAPI Backend** (`/beifong`): REST API for content processing
-   **React Frontend** (`/web`): Mobile and desktop compatible UI
-   **SQLite Databases**: Content, sources, and podcast storage
-   **FAISS Vector Index**: Semantic search capabilities
-   **Task Scheduler**: Automated content processing pipeline

### Running the Application

```bash
# Start the backend
cd beifong
python main.py

# Start the scheduler (in a separate terminal)
cd beifong
python -m beifong.scheduler
```

## Usage

### Three Ways to Use Beifong

1.  **Interactive UI**: Create podcasts step-by-step in the web interface
2.  **API Integration**: Call endpoints for programmatic podcast generation
3.  **Automated Scheduling**: Configure regular podcast creation with templates

### Processor Pipeline

Beifong uses a modular processor system:

-   **Feed Processor**: Monitors RSS feeds for new content
-   **URL Processor**: Extracts content from web pages
-   **AI Analysis**: Categorizes and summarizes content
-   **Embedding Processor**: Creates vector representations
-   **FAISS Indexing**: Builds efficient search indices
-   **Podcast Generator**: Creates complete podcasts

#### Existing Processors

-   **`feed_processor.py`**: Fetches RSS feeds, detects changes using ETags/hashes, and stores new entries
-   **`url_processor.py`**: Crawls URLs from feed entries, extracts content using BeautifulSoup, and stores articles
-   **`ai_analysis_processor.py`**: Uses GPT-4o to categorize articles, generate summaries, and extract structured content
-   **`embedding_processor.py`**: Creates vector embeddings using OpenAI's text-embedding models for semantic search
-   **`faiss_indexing_processor.py`**: Adds embeddings to FAISS vector index for efficient similarity search
-   **`podcast_generator_processor.py`**: Creates podcasts from articles using AI for script, image, and audio generation

#### Adding Custom Processors

1.  Create a new processor module:

```python
# processors/my_custom_processor.py
def process_custom_task(parameter1=None, parameter2=None):
    # Your processing logic here
    stats = {"processed": 0, "success": 0, "errors": 0}
    # Processing implementation
    return stats

if __name__ == "__main__":
    stats = process_custom_task()
    print(f"Processed: {stats['processed']}, Success: {stats['success']}")
```

2.  Register your processor in `models/tasks_schemas.py`:

```python
class TaskType(str, Enum):
    # Existing task types...
    my_custom_processor = "my_custom_processor"

TASK_TYPES = {
    # Existing types...
    "my_custom_processor": {
        "name": "My Custom Processor",
        "command": "python -m processors.my_custom_processor",
        "description": "Performs custom processing task",
    },
}
```

3.  Create a new task using the API or UI with your processor type

## Agent System

Beifong uses an agent architecture built on the [agno](https://github.com/agno-agi/agno) framework:

-   **Search Tools**: Semantic, keyword, and browser-use web research
-   **Generation Tools**: Script, banner, and audio creation
-   **Session State**: Persistent conversation context
-   **Tool Orchestration**: Coordinated multi-step workflows

### Existing Agent Tools

-   **`async_embedding_search.py`**: Finds semantically similar articles using FAISS vector search
-   **`async_search_articles.py`**: Performs keyword-based article search in the database
-   **`async_web_search.py`**: Conducts browser-use powered web research with live browsing
-   **`async_generate_podcast_script.py`**: Creates structured podcast scripts with dynamic dialogue
-   **`async_generate_podcast_banner.py`**: Produces custom artwork using DALL-E
-   **`async_generate_podcast_audio.py`**: Synthesizes natural-sounding audio with TTS engines

### Controlling Browser-use Behavior

The web search functionality in Beifong uses [browser-use](https://github.com/browser-use/browser-use) for automated browsing. You can control its behavior by modifying parameters in `tools/async_web_search.py`:

```python
# Basic configuration
browser_config = BrowserConfig(
    headless=True,  # Set to False to see the browser in action
    disable_security=False,
)

# Browser context configuration
context_config = BrowserContextConfig(
    wait_for_network_idle_page_load_time=3.0,  # Adjust wait time
    minimum_wait_page_load_time=0.5,
    maximum_wait_page_load_time=10.0,
    locale="en-US",  # Change for different regions
    user_agent="Mozilla/5.0...",  # Customize user agent
    highlight_elements=True,  # Helpful for debugging
    save_recording_path=recordings_dir,  # Recording location
)
```

For more advanced customization options, refer to the [browser-use documentation](https://github.com/browser-use/browser-use). You can adjust settings like timeout durations, browser behavior, and recording preferences.

### Customizing the Agent System

#### Adding a New Tool

```python
# tools/async_my_custom_tool.py
from agno.agent import Agent

async def my_custom_tool(agent: Agent, param1: str, param2: str) -> str:
    """Tool description here"""
    agent.session_state["my_key"] = "my_value"
    # Tool implementation
    result = f"Processed {param1} and {param2}"
    return result
```

Register your tool in `services/async_podcast_agent_service.py`:

```python
# Add import
from tools.async_my_custom_tool import my_custom_tool
# Add to tools list
tools = [my_custom_tool]
```

#### Adjusting Agent Flow

1.  Modify stage transitions in tool functions:

```python
# Set the next stage in the conversation flow
agent.session_state["stage"] = "my_new_stage"
```

2.  Update prompts in tool functions:

```python
prompt = f"""
Create a podcast script for two hosts about {topic}.
# Custom format instructions
The podcast should follow this structure:
1. Custom intro format
2. Custom segment format
"""
```

3.  Control UI elements with session state flags:

```python
# Show/hide UI components
agent.session_state["show_my_component"] = True
```

4.  Modify tool orchestration in `services/async_podcast_agent_service.py`:

```python
# Add new stage handling
if current_stage == "my_new_stage":
    response = "Now in custom stage. What would you like to do next?"
```

#### Changing Agent Instructions

The agent's behavior is controlled by instructions in `services/async_podcast_agent_service.py`:

```python
# Main agent instructions
AGENT_INSTRUCTIONS = """
You are a podcast creation assistant that helps users generate podcasts from articles.
Your goal is to guide users through the podcast creation process step by step.

Follow these stages:
1. Help the user select a podcast topic
2. Search for relevant articles and content
3. Let the user select specific sources to include
4. Generate a podcast script
5. Create a podcast banner image
6. Generate podcast audio
7. Finalize the podcast creation
"""

# Update the instructions to modify the agent's behavior
# Be careful to preserve the core flow stages while adding your customizations
```

## Voice Options

Beifong supports multiple TTS engines:

-   **OpenAI TTS** (commercial): High-quality voices with natural intonation
-   **ElevenLabs** (commercial): Professional voice synthesis with emotion
-   **Kokoro** (open source): Free TTS with good multilingual support

The extensible TTS system allows integration of additional engines, including:

-   **[Dia TTS](https://yummy-fir-7a4.notion.site/dia)** (open source): Potential integration
-   **[CSM](https://github.com/SesameAILabs/csm)** (open source): Potential integration
-   **[Orpheus-TTS](https://github.com/canopyai/Orpheus-TTS)** (open source): Potential integration

Custom TTS engines can be added through the engine interface.

## Storage and Asset Management

### Database Architecture

Beifong uses a modular SQLite database system:

-   **`sources.db`**: Content sources and RSS feed configurations
-   **`feed_tracking.db`**: Article tracking, status, and metadata
-   **`podcasts.db`**: Generated podcast content, settings, and paths
-   **`tasks.db`**: Scheduled tasks and execution history
-   **`agent_sessions.db`**: Conversation state for interactive sessions
-   **`faiss/`**: Vector indices for semantic search

### Asset Organization

-   **Audio**: Podcast audio files in `podcasts/audio/`
-   **Images**: Generated banners in `podcasts/images/`
-   **Recordings**: Browser-use web search recordings in `podcasts/recordings/{session_id}/`

### Content Management

-   ETags and hash-based change detection for feed updates
-   Multi-stage processing with status tracking
-   Deduplication across content sources
-   Efficient storage with binary blobs for embeddings

### Scaling Considerations

The local storage approach works fine for small projects, but as your data grows, you might encounter disk space issues. Some potential solutions:

-   Using s3fs to mount an S3 bucket as a local folder for media assets
-   Periodically archiving older podcast audio and images
-   Setting up automated cleanup for recordings and unused assets
-   Configuring custom paths in `.env` to store data on larger drives

These are optional optimizations and only necessary if you're generating lots of content.

## API Endpoints

-   `/api/articles`: Article management and search
-   `/api/sources`: Source and feed configuration
-   `/api/podcasts`: Podcast creation and access
-   `/api/podcast-configs`: Template management
-   `/api/tasks`: Scheduled task control
-   `/api/agent`: Interactive conversation API

## Deployment

Beifong is designed primarily as a local application, but can be accessed remotely with some additional setup:

### Local Network Access

```bash
# Start the backend with network access
cd beifong
python main.py --host 0.0.0.0 --port 8000
```

This makes the application available on your local network via your machine's IP address.

### Remote Access Options

For temporary remote access without a public-facing server:

1.  **SSH Port Forwarding**:
    ```bash
    # On the remote machine, forward local port 8000 to your computer
    ssh -L 8000:localhost:8000 username@your-server-ip
    ```

2.  **Ngrok Tunneling**:
    ```bash
    # Install ngrok, then create a tunnel to your local server
    ngrok http 8000
    ```
    This provides a temporary public URL that forwards to your local instance.

### Security Considerations

-   Beifong doesn't include built-in authentication - use a reverse proxy with auth for public deployments
-   Consider limiting API access if exposing to the internet
-   Backup your database files regularly if storing important content

## References

-   [Kokoro](https://github.com/hexgrad/kokoro): Open-source TTS engine
-   [browser-use](https://github.com/browser-use/browser-use): Browser automation
-   [agno](https://github.com/agno-agi/agno): Agent framework
-   [FAISS](https://github.com/facebookresearch/faiss): Vector similarity search
-   [FastAPI](https://fastapi.tiangolo.com/): API framework
-   [OpenAI API](https://platform.openai.com/): AI capabilities
-   [ElevenLabs](https://elevenlabs.io/): Voice synthesis
