# run_celery_worker.py
# Script to start the Celery worker for processing podcast agent tasks

import os
import subprocess
import sys
import time
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Create necessary directories
os.makedirs("tmp", exist_ok=True)
os.makedirs("logs", exist_ok=True)
os.makedirs("podcasts", exist_ok=True)
os.makedirs("podcasts/audio", exist_ok=True)
os.makedirs("podcasts/images", exist_ok=True)
os.makedirs("podcasts/recordings", exist_ok=True)

# Define worker name and number of processes
worker_name = "podcast_worker"
concurrency = os.environ.get("CELERY_CONCURRENCY", "2")  # Default to 2 concurrent tasks

# Configure log paths
log_dir = "logs"
log_file = os.path.join(log_dir, f"celery_{worker_name}.log")

def start_worker():
    """Start the Celery worker with the specified configuration"""
    print(f"Starting Celery worker '{worker_name}' with concurrency {concurrency}...")
    
    # Build the Celery command
    cmd = [
        "celery",
        "-A", "agent",  # app module
        "worker",
        "--loglevel=INFO",
        f"--concurrency={concurrency}",
        f"--hostname={worker_name}@%h",
        "--without-gossip",  # Disable event system (optional)
        "--without-mingle",  # Don't synchronize with other workers (optional)
        # "--pool=solo",       # Use solo pool for simplicity
    ]
    
    # Start the worker process
    try:
        with open(log_file, "a") as log:
            process = subprocess.Popen(
                cmd, 
                stdout=log, 
                stderr=log, 
                universal_newlines=True
            )
        
        print(f"Celery worker started with PID {process.pid}")
        print(f"Logs are being written to {log_file}")
        
        # Keep the script running
        try:
            while True:
                # Check if process is still running
                if process.poll() is not None:
                    print(f"Worker process exited with code {process.returncode}")
                    # Restart worker if it crashed
                    print("Restarting worker...")
                    time.sleep(5)  # Wait a bit before restarting
                    with open(log_file, "a") as log:
                        process = subprocess.Popen(
                            cmd, 
                            stdout=log, 
                            stderr=log, 
                            universal_newlines=True
                        )
                    print(f"Celery worker restarted with PID {process.pid}")
                
                time.sleep(10)  # Check every 10 seconds
                
        except KeyboardInterrupt:
            print("Stopping worker...")
            process.terminate()
            process.wait(timeout=10)
            print("Worker stopped")
    
    except Exception as e:
        print(f"Error starting Celery worker: {e}")
        sys.exit(1)

if __name__ == "__main__":
    start_worker()