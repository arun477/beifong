# 🦉 Beifong: Your Junk-Free, Personalized Information and Podcasts
![image](https://github.com/user-attachments/assets/b2f24f12-6f80-46fa-aa31-ee42e17765b1)

Beifong manages your trusted articles and social media platform sources. It generates podcasts from the content you trust and curate. It handles the complete pipeline, from data collection and analysis to the production of scripts and visuals.

▶️ [Watch demo video HD](https://www.canva.com/design/DAGoUfv8ICM/Oj-vJ19AvZYDa2SwJrCWKw/watch?utm_content=D[…]hare&utm_medium=link2&utm_source=uniquelinks&utlId=h2508379667)

▶️ [Watch the demo on YouTube](https://youtu.be/uscEPkxjiYE?si=bH2EDpL6SP9EyEVT)

## Installation

### Prerequisites

- Python 3.11+
- Redis Server
- OpenAI API key
- (Optional) ElevenLabs API key

### Setup

```bash
# Clone the repository
git clone https://github.com/arun477/beifong.git
cd beifong

# Create virtual environment
cd beifong
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Install browser
python -m playwright install

# (Optional but recommended) Download demo content
# Navigate to the beifong directory if not already there
cd beifong  # Skip if already in the beifong folder
# This populates the system with sample data, curated source feeds, and assets
python bootstrap_demo.py
```

### API Keys

Create a `.env` file in the `/beifong` directory:

```
OPENAI_API_KEY=your_openai_api_key
ELEVENSLAB_API_KEY=your_elevenlabs_api_key  # Optional
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
```

### Running the Application

```bash
# Start the backend
cd beifong
python main.py

# Start the scheduler (in a separate terminal)
cd beifong
python -m beifong.scheduler

# Start the chat workers (in a separate terminal)
cd beifong
python -m beifong.celery_worker

# Make sure your Redis server is running with the configuration defined in .env
redis-cli ping
```

### Frontend Setup (only if you want to open in debug mode)

```bash
# Navigate to web directory
cd web

# Install dependencies
npm install

# Start development server
npm start
```

## Usage

### Three Ways to Use Beifong

1. **Interactive UI**
2. **API Integration**
3. **Automated Scheduling**

### Processor Pipeline

Beifong uses a modular processor system:

- **Feed Processor**: Monitors RSS feeds for new content
- **URL Processor**: Extracts content from web pages
- **AI Analysis**: Categorizes and summarizes content
- **Embedding Processor**: Creates vector representations
- **FAISS Indexing**: Builds efficient search indices
- **Podcast Generator**: Creates complete podcasts
- **X.com Processor**: Periodically crawls your X.com feed
- **Facebook.com Processor**: Periodically crawls your Facebook.com feed

#### Adding Custom Processors

1. Create a new processor module:

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

2. Register your processor in `models/tasks_schemas.py`:

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

3. Create a new task using the API or UI with your processor type

## Agent System

Beifong uses an agent architecture built on the [agno](https://github.com/agno-agi/agno) framework:

- **Search Tools**: Semantic, keyword, and browser-based web research
- **Generation Tools**: Script, banner, and audio creation
- **Session State**: Persistent conversation context
- **Tool Orchestration**: Coordinated multi-step workflows

### Customizing the Agent System

#### Adding a New Tool

```python
# tools/my_custom_tool.py
from agno.agent import Agent

def my_custom_tool(agent: Agent, param1: str, param2: str) -> str:
    """Tool description here"""
    agent.session_state["my_key"] = "my_value"
    # Tool implementation
    result = f"Processed {param1} and {param2}"
    return result
```

Register your tool in `services/celery_tasks.py`:

```python
# Add import
from tools.async_my_custom_tool import my_custom_tool
# Add to tools list
tools = [my_custom_tool]
```

#### Changing Agent Instructions

The agent's behavior is controlled by instructions in `db/agent_config_v2.py`:

```python
# Update the instructions to modify the agent's behavior
# Be careful to preserve the core flow stages while adding your customizations
```

## Voice Options

Beifong supports multiple TTS engines:

- **OpenAI TTS** (commercial)
- **ElevenLabs** (commercial)
- **Kokoro** (open source)

The extensible TTS system allows integration of additional engines, including:

- **[Dia TTS](https://yummy-fir-7a4.notion.site/dia)** (open source): Potential integration
- **[CSM](https://github.com/SesameAILabs/csm)** (open source): Potential integration
- **[Orpheus-TTS](https://github.com/canopyai/Orpheus-TTS)** (open source): Potential integration

Custom TTS engines can be added through the tts_selector engine interface under the **utils** directory.

## Storage and Asset Management

### Database

All databases are stored in the **databases** directory.

### Assets

All assets are stored in the **podcasts** directory.

### Storage Considerations

The local storage approach works fine for small projects, but as your data grows, you might encounter disk space issues. Some potential solutions:

- Using s3fs to mount an S3 bucket as a local folder for media assets
- Periodically archiving older podcast audio and images
- Setting up automated cleanup for recordings and unused assets
- Configuring custom paths in `.env` to store data on larger drives

These are optional optimizations and only necessary if you're generating lots of content.

## Deployment

Beifong is designed primarily as a local application for now, but can be accessed remotely with some additional setup:

### Local Network Access

```bash
# Start the backend with network access
cd beifong
python main.py --host 0.0.0.0 --port 7000
```

This makes the application available on your local network via your machine's IP address.

### Remote Access Options

For temporary remote access without a public-facing server:

1. **SSH Port Forwarding**:
   ```bash
   # On the remote machine, forward local port 8000 to your computer
   ssh -L 7000:localhost:7000 username@your-server-ip
   ```

2. **Ngrok Tunneling**:
   ```bash
   # Install ngrok, then create a tunnel to your local server
   ngrok http 7000
   ```
   This provides a temporary public URL that forwards to your local instance.

### Security Considerations

- Beifong doesn't include built-in authentication - use a reverse proxy with auth for public deployments
- Consider limiting API access if exposing to the internet
- Back up your database files regularly if storing important content

### Browser-based Web Search

> **⚠️ FEATURE - V1 BRANCH ONLY**
> 
> **This functionality is NOT active in the main version.** 
> When integrating this functionality into the main version, ensure compatibility with the other custom browser-based search tools which also rely on playwright and test thoroughly with existing web search options.
