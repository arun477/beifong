#!/bin/bash

set -e

echo "Setting up Beifong..."

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "Docker is required but not installed."
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "Docker Compose is required but not installed."
    exit 1
fi

# Create .env if missing
if [ ! -f "beifong/.env" ]; then
    cat > beifong/.env << EOF
OPENAI_API_KEY=your_openai_api_key_here
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
REDIS_URL=redis://redis:6379/0
EOF
    echo "Created .env file. Please add your API keys to beifong/.env"
    read -p "Press Enter after updating API keys..."
fi

# Build frontend
if [ ! -d "web/build" ]; then
    echo "Building frontend..."
    cd web && npm install && npm run build && cd ..
fi

# Start services
echo "Starting services..."
docker-compose up -d --build

# Wait for startup
sleep 15

# Check status
if docker-compose ps | grep -q "Up"; then
    echo "Beifong is running at http://localhost:7000"
    
    # Run bootstrap if requested
    read -p "Populate with demo data? (y/N): " -r
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker-compose exec beifong_app python bootstrap_demo.py
    fi
else
    echo "Startup failed. Check: docker-compose ps"
    exit 1
fi