FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    libsndfile1 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy and install Python dependencies
COPY beifong/requirements.txt /app/beifong/requirements.txt
RUN pip install --no-cache-dir -r beifong/requirements.txt && \
    playwright install --with-deps

# Copy application code
COPY beifong/ /app/beifong/
COPY web/ /app/web/

# Create directories and set permissions
RUN mkdir -p /app/beifong/databases \
    /app/beifong/podcasts/audio \
    /app/beifong/podcasts/images \
    /app/beifong/podcasts/recordings \
    /app/beifong/browsers \
    /app/beifong/static && \
    chmod -R 755 /app/beifong

# Expose port
EXPOSE 7000

# Default command
CMD ["python", "main.py"]