import multiprocessing
import os
import sys
import time
import signal
import logging
import argparse

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("worker_manager")

def start_worker(worker_id):
    """Start a worker process with a specific ID"""
    logger.info(f"Starting worker {worker_id}")
    # Replace the current process with the worker script
    os.execv(sys.executable, [sys.executable, 'agent_worker.py', str(worker_id)])

class WorkerManager:
    def __init__(self, num_workers=4):
        self.num_workers = num_workers
        self.workers = []
        self.running = False
        self.worker_states = {}  # Track active/dead workers
        
    def start_workers(self):
        """Start the worker pool"""
        logger.info(f"Starting {self.num_workers} workers")
        self.running = True
        
        for i in range(self.num_workers):
            self._spawn_worker(i)
            
        # Set up signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, self._handle_shutdown)
        signal.signal(signal.SIGTERM, self._handle_shutdown)
        
        # Monitor and respawn workers as needed
        self._monitor_workers()
    
    def _spawn_worker(self, worker_id):
        """Spawn a new worker process"""
        worker = multiprocessing.Process(target=start_worker, args=(worker_id,))
        worker.daemon = True  # Make worker a daemon so it exits when manager exits
        worker.start()
        self.workers.append(worker)
        self.worker_states[worker.pid] = {
            "id": worker_id,
            "started": time.time(),
            "status": "active"
        }
        logger.info(f"Worker {worker_id} spawned with PID {worker.pid}")
    
    def _monitor_workers(self):
        """Monitor workers and respawn any that have died"""
        while self.running:
            for i, worker in enumerate(self.workers[:]):
                if not worker.is_alive():
                    logger.warning(f"Worker {self.worker_states[worker.pid]['id']} (PID {worker.pid}) died, respawning")
                    
                    # Remove the dead worker
                    self.workers.remove(worker)
                    worker_id = self.worker_states[worker.pid]["id"]
                    del self.worker_states[worker.pid]
                    
                    # Spawn a replacement
                    self._spawn_worker(worker_id)
            
            # Check every 5 seconds
            time.sleep(5)
    
    def _handle_shutdown(self, signum, frame):
        """Handle shutdown signals"""
        logger.info(f"Received signal {signum}, shutting down workers")
        self.stop_workers()
        sys.exit(0)
            
    def stop_workers(self):
        """Stop all worker processes"""
        logger.info("Stopping all workers")
        self.running = False
        
        for worker in self.workers:
            logger.info(f"Terminating worker PID {worker.pid}")
            worker.terminate()
        
        # Wait for all workers to terminate
        for worker in self.workers:
            worker.join(timeout=2)
            
        # Force kill any remaining workers
        for worker in self.workers:
            if worker.is_alive():
                logger.warning(f"Worker PID {worker.pid} did not terminate gracefully, killing")
                os.kill(worker.pid, signal.SIGKILL)
        
        self.workers = []
        self.worker_states = {}
        logger.info("All workers stopped")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Podcast Agent Worker Manager")
    parser.add_argument("--workers", type=int, default=4, help="Number of worker processes to spawn")
    args = parser.parse_args()
    
    manager = WorkerManager(num_workers=args.workers)
    try:
        manager.start_workers()
    except KeyboardInterrupt:
        logger.info("Keyboard interrupt received, shutting down")
        manager.stop_workers()