import multiprocessing
import os
import sys
import time
import signal
import argparse


def start_worker(worker_id):
    print(f"Starting worker {worker_id}")
    os.execv(sys.executable, [sys.executable, "agent_worker.py", str(worker_id)])


class WorkerManager:
    def __init__(self, num_workers=4):
        self.num_workers = num_workers
        self.workers = []
        self.running = False
        self.worker_states = {}

    def start_workers(self):
        print(f"Starting {self.num_workers} workers")
        self.running = True

        for i in range(self.num_workers):
            self._spawn_worker(i)

        signal.signal(signal.SIGINT, self._handle_shutdown)
        signal.signal(signal.SIGTERM, self._handle_shutdown)

        self._monitor_workers()

    def _spawn_worker(self, worker_id):
        worker = multiprocessing.Process(target=start_worker, args=(worker_id,))
        worker.daemon = True  # Make worker a daemon so it exits when manager exits
        worker.start()
        self.workers.append(worker)
        self.worker_states[worker.pid] = {"id": worker_id, "started": time.time(), "status": "active"}
        print(f"Worker {worker_id} spawned with PID {worker.pid}")

    def _monitor_workers(self):
        while self.running:
            for i, worker in enumerate(self.workers[:]):
                if not worker.is_alive():
                    print(f"Worker {self.worker_states[worker.pid]['id']} (PID {worker.pid}) died, respawning")

                    self.workers.remove(worker)
                    worker_id = self.worker_states[worker.pid]["id"]
                    del self.worker_states[worker.pid]

                    self._spawn_worker(worker_id)

            time.sleep(5)

    def _handle_shutdown(self, signum, frame):
        print("Received shutdown signal. Gracefully terminating...")
        self.stop_workers()
        sys.exit(0)

    def stop_workers(self):
        print("Shutting down workers...")
        self.running = False

        for worker in self.workers:
            worker.terminate()

        for worker in self.workers:
            worker.join(timeout=2)

        for worker in self.workers:
            if worker.is_alive():
                print(f"Worker PID {worker.pid} did not terminate gracefully, killing")
                os.kill(worker.pid, signal.SIGKILL)

        self.workers = []
        self.worker_states = {}
        print("All workers terminated.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Podcast Agent Worker Manager")
    parser.add_argument("--workers", type=int, default=4, help="Number of worker processes to spawn")
    args = parser.parse_args()

    manager = WorkerManager(num_workers=args.workers)
    try:
        manager.start_workers()
    except KeyboardInterrupt:
        print("Keyboard interrupt received, shutting down")
        manager.stop_workers()