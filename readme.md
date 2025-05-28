# 🦉 Beifong: Your Junk-Free, Personalized Information and Podcasts

![image](https://github.com/user-attachments/assets/b2f24f12-6f80-46fa-aa31-ee42e17765b1)

Beifong manages your trusted articles and social media platform sources. It generates podcasts from the content you trust and curate. It handles the complete pipeline, from data collection and analysis to the production of scripts and visuals.

▶️ [Watch demo video HD](https://www.canva.com/design/DAGoUfv8ICM/Oj-vJ19AvZYDa2SwJrCWKw/watch?utm_content=D[…]hare&utm_medium=link2&utm_source=uniquelinks&utlId=h2508379667)

▶️ [Watch the demo on YouTube](https://youtu.be/uscEPkxjiYE?si=bH2EDpL6SP9EyEVT)

## Table of Contents

- [Getting Started](#getting-started)
  - [System Requirements](#system-requirements)
  - [Initial Setup and Installation](#initial-setup-and-installation)
  - [Environment Configuration](#environment-configuration)
  - [Starting the Application](#starting-the-application)
- [How to Use Beifong](#how-to-use-beifong)
  - [Three Usage Methods](#three-usage-methods)
- [Content Processing System](#content-processing-system)
  - [Built-in Content Processors](#built-in-content-processors)
  - [Creating Custom Content Processors](#creating-custom-content-processors)
- [AI Agent and Tools](#ai-agent-and-tools)
  - [Agent Architecture Overview](#agent-architecture-overview)
  - [Adding Custom Tools](#adding-custom-tools)
  - [Configuring Agent Behavior](#configuring-agent-behavior)
- [Web Search and Browser Automation](#web-search-and-browser-automation)
  - [Search Commands](#search-commands)
  - [Social Media Login Sessions](#social-media-login-sessions)
  - [Advanced Persistent Session Configuration](#advanced-persistent-session-configuration)
- [Audio and Voice Generation](#audio-and-voice-generation)
  - [Supported TTS Engines](#supported-tts-engines)
  - [Adding New Voice Engines](#adding-new-voice-engines)
- [Data Storage and File Management](#data-storage-and-file-management)
  - [Database Storage](#database-storage)
  - [Media Asset Storage](#media-asset-storage)
  - [Managing Storage Growth](#managing-storage-growth)
- [Deployment and Access Options](#deployment-and-access-options)
  - [Local Network Access](#local-network-access)
  - [Remote Access Solutions](#remote-access-solutions)
  - [Security](#security)
- [Cloud Options](#cloud-options)
  - [Beifong Cloud Features](#beifong-cloud-features)
  - [Join the Waitlist](#join-the-waitlist)

## Getting Started

### System Requirements

Before installing Beifong, ensure you have:

- Python 3.11+
- Redis Server
- OpenAI API key
- (Optional) ElevenLabs API key for enhanced voice options

### Initial Setup and Installation

```bash
# Clone the repository
git clone https://github.com/arun477/beifong.git
cd beifong

# Create virtual environment
cd beifong
python -m venv venv
source venv/bin/activate

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

### Environment Configuration

Create a `.env` file in the `/beifong` directory with your API keys:

```
OPENAI_API_KEY=your_openai_api_key
ELEVENSLAB_API_KEY=your_elevenlabs_api_key  # Optional
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
```

### Starting the Application

Launch all required services in separate terminals:

```bash
# Terminal 1: Start the main backend
cd beifong
python main.py

# Terminal 2: Start the scheduler
cd beifong
python -m beifong.scheduler

# Terminal 3: Start the chat workers
cd beifong
python -m beifong.celery_worker

# Verify Redis is running
redis-cli ping
```

#### Optional: Frontend Development Mode

```bash
# Navigate to web directory
cd web

# Install dependencies
npm install

# Start development server
npm start
```

## How to Use Beifong

### Three Usage Methods

Beifong offers flexibility in how you interact with the system:

1. **Interactive Web UI** - Web interface for content management and podcast generation
2. **API Integration** - Programmatic access for custom applications and workflows
3. **Automated Scheduling** - Set up recurring tasks for hands off content processing

## Content Processing System

### Built-in Content Processors

Beifong includes several specialized processors for different content sources:

- **RSS Feed Processor** - Monitors RSS feeds for new articles and content
- **URL Content Processor** - Extracts and processes content from web pages
- **AI Content Analyzer** - Categorizes, summarizes, and analyzes content quality
- **Vector Embedding Processor** - Creates searchable vector representations of content
- **FAISS Search Indexer** - Builds search indices for content discovery
- **Podcast Script Generator** - Creates complete podcast episodes from curated content
- **X.com Social Processor** - Crawls and processes your X.com social media feed
- **Facebook Social Processor** - Crawls and processes your Facebook social media feed

### Creating Custom Content Processors

Extend Beifong's capabilities by adding your own content processors:

#### Step 1: Create Your Processor Module

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

#### Step 2: Register Your Processor

Add your processor to the system in `models/tasks_schemas.py`:

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

#### Step 3: Deploy Your Processor

Create a new task using the API or UI with your custom processor type.

## AI Agent and Tools

### Agent Architecture Overview

Beifong's AI system is built on the [agno](https://github.com/agno-agi/agno) framework and includes:

- **Search Tools** - Semantic search, keyword search, and browser-based web research
- **Content Generation Tools** - Automated script writing, banner creation, and audio production
- **Persistent Session State** - Maintains conversation context across interactions
- **Tool Orchestration** - Manages multi step workflows automatically

### Adding Custom Tools

Extend the agent's capabilities with custom tools:

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

### Configuring Agent Behavior

Modify the agent's instructions and behavior in `db/agent_config_v2.py`:

```python
# Update the instructions to modify the agent's behavior
# Be careful to preserve the core flow stages while adding your customizations
```

## Web Search and Browser Automation

Beifong's search agent has full browser automation capabilities through the [browseruse](https://browser-use.com/) library, enabling web research and automated data collection from any website.

### Search Commands

You can give the agent specific search instructions like:
- *"Go to my X.com and collect top positive and informative feeds"*
- *"Browse Reddit for discussions about AI developments this week"*
- *"Search LinkedIn for recent posts about data science trends"*
- *"Visit news sites and gather articles about renewable energy"*

The agent will navigate websites, interact with page elements, and extract the requested information automatically.

### Social Media Login Sessions

For websites requiring authentication (X.com, Facebook, LinkedIn, etc.), you need to establish logged in sessions:

**Setting Up Social Media Sessions:**

1. **Navigate to Social Tab** in the Beifong web interface
2. **Click "Setup Session"** under the Setup section
3. **Login Process** - A browser window will open where you:
   - Log into your social media accounts normally
   - Complete any verification steps
   - Close the browser when finished
4. **Session Persistence** - Beifong will use these authenticated sessions for future automated searches

### Advanced Persistent Session Configuration

For persistent logged in sessions and advanced browser management:

**Persistent Session Path Configuration:**
- Default browser sessions are stored in `browsers/playwright_persistent_profile_web` folder
- For persistent session paths, modify `tools/web_search` to use `get_browser_session_path()` from `db/config.py`

**Important Persistent Session Management Notes:**
- **Avoid Concurrent Usage** - Ensure no other processes use the same browser session simultaneously
- **Social Monitor Processors** typically use the path from `get_browser_session_path()` function
- **Disable Conflicting Processes** - Switch off social monitoring in the Voyager section if using persistent session paths
- **Future Separation** - Session management will be separated into individual sessions in upcoming updates

**Persistent Session Troubleshooting:**
- If login sessions expire, repeat the Social Tab setup process
- Clear browser data if experiencing authentication issues
- Ensure only one process accesses browser sessions at a time

## Audio and Voice Generation

### Supported TTS Engines

Beifong supports multiple text to speech options:

**Commercial Options:**
- **OpenAI TTS** - Commercial voice synthesis
- **ElevenLabs** - Voice cloning and synthesis

**Open Source Options:**
- **Kokoro** - Open source voice generation

### Adding New Voice Engines

The TTS system supports integration of additional engines:

**Open Source Options:**
- **[Dia TTS](https://yummy-fir-7a4.notion.site/dia)** - Open source TTS engine
- **[CSM](https://github.com/SesameAILabs/csm)** - Speech model
- **[Orpheus-TTS](https://github.com/canopyai/Orpheus-TTS)** - Open source TTS

Add custom TTS engines through the tts_selector engine interface in the **utils** directory.

## Data Storage and File Management

### Database Storage

All application databases are organized in the **databases** directory for easy management and backup.

### Media Asset Storage

Generated podcasts, audio files, and visual assets are stored in the **podcasts** directory.

### Managing Storage Growth

For larger deployments, consider these storage optimization strategies:

**Cloud Storage Integration:**
- Use s3fs to mount an S3 bucket as a local folder for media assets
- Configure custom storage paths in `.env` to use larger drives

**Automated Cleanup:**
- Set up periodic archiving of older podcast episodes
- Implement automated cleanup for temporary recordings and unused assets
- Configure retention policies for different types of content

**Storage Monitoring:**
- Monitor disk usage as your content library grows
- Set up alerts for storage capacity thresholds

**Note:** More efficient storage management and cloud connectors will be added in the next version.

## Deployment and Access Options

### Local Network Access

Make Beifong available to other devices on your network:

```bash
# Start the backend with network access
cd beifong
python main.py --host 0.0.0.0 --port 7000
```

This makes the application accessible via your machine's IP address on your local network.

### Remote Access Solutions

For accessing Beifong from outside your local network:

#### SSH Port Forwarding
```bash
# Forward local port to remote machine
ssh -L 7000:localhost:7000 username@your-server-ip
```

#### Ngrok Tunneling
```bash
# Create temporary public tunnel
ngrok http 7000
```
Provides a temporary public URL that forwards to your local instance.

### Security

Beifong doesn't include an authentication layer yet. Authentication will be added in the next version.

## Cloud Options

### Beifong Cloud Features

✅ Cloud version of Beifong

✅ More social media connectors

✅ Podcast customization with more styles

✅ More voice options

✅ Better data collection and storage management

✅ Authentication layer

### Join the Waitlist

🚀 **[Join the Beifong Cloud Waitlist](https://www.makeform.ai/f/ix4eJqE0)**
