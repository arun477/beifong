from services.celery_tasks import app

worker_options = [
    "worker",
    "--loglevel=INFO",
    "--concurrency=2",
    "--hostname=beifong_worker@%h",
    "--pool=prefork",
]

if __name__ == "__main__":
    print("Starting Beifong podcast agent workers...")
    app.worker_main(worker_options)