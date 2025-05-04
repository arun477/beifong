import os
import sys
import subprocess
import time
import signal
import argparse
worker_process = None
running = True


def signal_handler(sig, frame):
    global running
    print("Shutting down worker monitor...")
    if worker_process:
        print("Terminating worker process...")
        worker_process.terminate()
    running = False
    sys.exit(0)


signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)


def start_worker():
    worker_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "podcast_agent_worker.py")
    process = subprocess.Popen([sys.executable, worker_path])
    return process


def monitor_worker(auto_restart=True, max_restarts=5, check_interval=5):
    global worker_process
    restart_count = 0
    worker_process = start_worker()
    print(f"Started worker process with PID: {worker_process.pid}")

    while running:
        if worker_process.poll() is not None:
            exit_code = worker_process.returncode
            print(f"Worker process terminated with exit code: {exit_code}")

            if auto_restart and restart_count < max_restarts:
                restart_count += 1
                print(f"Restarting worker (attempt {restart_count}/{max_restarts})...")
                time.sleep(2)  # Brief delay before restart
                worker_process = start_worker()
                print(f"Restarted worker process with PID: {worker_process.pid}")
            else:
                if restart_count >= max_restarts:
                    print("Maximum restart attempts reached. Exiting.")
                break

        time.sleep(check_interval)

    if worker_process and worker_process.poll() is None:
        print("Terminating worker process...")
        worker_process.terminate()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Start and monitor the podcast worker")
    parser.add_argument("--no-restart", action="store_true", help="Don't automatically restart the worker if it crashes")
    parser.add_argument("--max-restarts", type=int, default=5, help="Maximum number of restart attempts")
    parser.add_argument("--check-interval", type=int, default=5, help="How often to check worker status (seconds)")

    args = parser.parse_args()

    print("Starting podcast worker monitor...")
    monitor_worker(auto_restart=not args.no_restart, max_restarts=args.max_restarts, check_interval=args.check_interval)