#!/usr/bin/env python
"""
Celery worker for the Beifong podcast agent.
Run this script to start a Celery worker that processes podcast agent tasks.
"""

import os
import sys
from dotenv import load_dotenv
from services.celery_tasks import app

# Ensure proper environment variables are loaded
load_dotenv()

# Import services/celery_tasks.py to register tasks
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

# Worker configuration
worker_options = [
    "worker",
    "--loglevel=INFO",
    "--concurrency=2",  # Reduced from 4 to lower resource contention
    "--hostname=beifong_worker@%h",  # Unique hostname
    "--pool=threads",   # Changed from prefork to threads to avoid fork-related issues on macOS
]

# Optional: Add Prometheus monitoring
if os.environ.get("ENABLE_PROMETHEUS", "false").lower() == "true":
    try:
        from prometheus_client import start_http_server

        # Start Prometheus metrics server
        start_http_server(int(os.environ.get("PROMETHEUS_PORT", 8001)))
        print(f"Prometheus metrics server started on port {os.environ.get('PROMETHEUS_PORT', 8001)}")
    except ImportError:
        print("Prometheus client not installed. Skipping metrics.")

# Start Celery worker
if __name__ == "__main__":
    print("Starting Beifong podcast agent worker...")
    app.worker_main(worker_options)