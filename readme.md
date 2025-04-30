# 🦉 Beifong : Your Junk-Free, Personalized Informations and Podcasts.

Beifong generates podcasts from news articles and web content you trust and curate. It handles data collection, analysis, and production of scripts, visuals, and audio.

## Features

-   **Content Collection**: RSS feeds, web scraping, and web search
-   **Content Analysis**: Categorization, summarization, and semantic search
-   **Podcast Generation**: Script creation, artwork generation, audio synthesis
-   **Multi-language Support**: English, Hindi, Spanish, French, and more
-   **Automation**: Scheduled tasks for content processing

## Installation

### Prerequisites

-   Python 3.11+
-   OpenAI API key
-   Optional: ElevenLabs API key

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

_Frontend installation instructions will be added soon._

## Components

-   **Backend API** (`/beifong`): FastAPI service for content processing
-   **Web Interface** (`/web`): React frontend
-   **Databases**: SQLite databases for content, sources, and podcasts
-   **Vector Storage**: FAISS indexing for semantic search

## Running the Application

```bash
# Start the backend
cd beifong
python main.py

# Start the scheduler (in a separate terminal)
cd beifong
python -m beifong.scheduler
```

## Usage

The platform can be used in several ways:

1.  **Interactive UI**: Create podcasts step-by-step via web interface, UI is both mobile and desktop compatible.
2.  **API Integration**: Call endpoints for programmatic podcast generation
3.  **Automated Generation**: Schedule multipl eautomatic podcast creation with predefined configurations.

## Scheduler & Task Management

### Processors

-   **Feed Processor**: Crawls RSS feeds for new content
-   **URL Processor**: Extracts content from web pages
-   **AI Analysis Processor**: Categorizes articles and generates summaries
-   **Embedding Processor**: Creates vector embeddings for search
-   **FAISS Indexing Processor**: Builds vector indices
-   **Podcast Generator Processor**: Creates podcasts from templates

### Scheduling Features

-   Configurable task frequency (hourly, daily, weekly)
-   Task execution logging
-   Parallel task processing
-   Automatic retries
-   Task dependencies and sequencing

Example scheduling configuration:

1.  Feed crawling every hour
2.  Content processing every 3 hours
3.  Podcast generation once daily

### Adding Custom Processors

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

Beifong uses an agent architecture for interactive podcast creation, built on the [agno](https://github.com/agno-agi/agno) framework.

### Core Components

1.  **Agent Tools** in `tools/` directory:
    -   `async_embedding_search.py`: Semantic article search
    -   `async_search_articles.py`: Keyword-based search
    -   `async_web_search.py`: Browser-based web research
    -   `async_generate_podcast_script.py`: Script generation
    -   `async_generate_podcast_banner.py`: Banner image creation
    -   `async_generate_podcast_audio.py`: Audio synthesis

2.  **Agent Router**: API endpoints in `routers/async_podcast_agent_router.py`

3.  **Agent Service**: Tool orchestration in `services/async_podcast_agent_service.py`

4.  **Session State**: Conversation context management

### Customizing the Agent System

#### Adding a New Tool

1.  Create a tool file:

```python
# tools/async_my_custom_tool.py
from agno.agent import Agent

async def my_custom_tool(agent: Agent, param1: str, param2: str) -> str:
    """
    Description of what your tool does.
    
    Args:
        agent: The Agno agent instance
        param1: First parameter description
        param2: Second parameter description
        
    Returns:
        A formatted string response
    """
    agent.session_state["my_key"] = "my_value"
    
    # Tool implementation
    result = f"Processed {param1} and {param2}"
    
    return result
```

2.  Register your tool in `services/async_podcast_agent_service.py`:

```python
# Add import
from tools.async_my_custom_tool import my_custom_tool

# Add to tools list
tools = [
  my_custom_tool
]
```

#### Modifying Prompts

1.  Open the tool file (e.g., `tools/async_generate_podcast_script.py`)
2.  Locate and modify the prompt template:

```python
prompt = f"""
    Create a podcast script for two hosts, Alex and Morgan, for {today}.
    
    # Modify the structure below to change podcast format
    The podcast should follow this structure:
    1. Intro: Welcome and introduction
    2. Headlines: Quick rundown
    3. Deep Dives: Detailed discussion
    4. Outro: Wrap up
    
    HEADLINES:
    {headlines}
"""
```

#### Adjusting Agent Flow

1.  Modify stage transitions in tool functions:
    -   Each tool sets `agent.session_state["stage"]` to indicate the next stage
    -   Example: `agent.session_state["stage"] = "banner"` in script generation

2.  Update flow logic in `services/async_podcast_agent_service.py`

```python
# cotrols agent behaviour, change it with caution
AGENT_INSTRUCTIONS = []
"""
```

## Voice Options

Beifong supports multiple TTS engines:

-   **OpenAI TTS** (paid service)
-   **ElevenLabs** (paid service)
-   **Kokoro** (open source): Open-source TTS model with good English support.

The TTS selector system allows integration with potential additional engines following ones some really good ones for potential integration:

-   [Dia TTS](https://yummy-fir-7a4.notion.site/dia) (open source)
-   [CSM](https://github.com/SesameAILabs/csm) (open source)
-   [Orpheus-TTS](https://github.com/canopyai/Orpheus-TTS) (open source)

Custom TTS engines can be added through the engine interface.

## API Endpoints

-   `/api/articles`: Manage articles
-   `/api/sources`: Manage sources and feeds
-   `/api/podcasts`: Access podcasts
-   `/api/podcast-configs`: Configure podcast templates
-   `/api/tasks`: Manage scheduled tasks
-   `/api/agent`: Interactive podcast creation

## References

-   [Kokoro](https://github.com/hexgrad/kokoro)
-   [browser-use](https://github.com/browser-use/browser-use)
-   [agno](https://github.com/agno-agi/agno)
-   [FAISS](https://github.com/facebookresearch/faiss)
-   [FastAPI](https://fastapi.tiangolo.com/)
-   [OpenAI API](https://platform.openai.com/)
-   [ElevenLabs](https://elevenlabs.io/)

## License

[MIT License](LICENSE)
