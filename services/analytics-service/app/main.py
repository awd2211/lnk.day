import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import analytics, reports, export, schedules, tasks
from app.funnels import router as funnels
from app.cohorts import router as cohorts
from app.core.config import settings
from app.services.realtime_service import realtime_service
from app.services.kafka_consumer import KafkaClickConsumer
from app.services.rabbitmq_consumer import get_rabbitmq_consumer, RabbitMQConsumer
from app.services.scheduler_runner import scheduler_runner
from app.services.task_scheduler import task_scheduler, register_all_tasks

logger = logging.getLogger(__name__)

# Global consumer instances
kafka_consumer: KafkaClickConsumer | None = None
rabbitmq_consumer: RabbitMQConsumer | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global kafka_consumer, rabbitmq_consumer

    # Startup
    await realtime_service.connect()

    # Start RabbitMQ Consumer in background (primary)
    try:
        rabbitmq_consumer = get_rabbitmq_consumer()
        asyncio.create_task(rabbitmq_consumer.start())
        logger.info("RabbitMQ consumer started in background")
    except Exception as e:
        logger.error(f"Failed to start RabbitMQ consumer: {e}")

    # Start Kafka Consumer in background (secondary/fallback)
    try:
        kafka_consumer = KafkaClickConsumer()
        asyncio.create_task(kafka_consumer.start())
        logger.info("Kafka consumer started in background")
    except Exception as e:
        logger.error(f"Failed to start Kafka consumer: {e}")

    # Register and start Task Scheduler in background
    try:
        register_all_tasks()
        asyncio.create_task(task_scheduler.start())
        logger.info("Task scheduler started in background")
    except Exception as e:
        logger.error(f"Failed to start task scheduler: {e}")

    # Start legacy Scheduler Runner for report schedules
    try:
        asyncio.create_task(scheduler_runner.start())
        logger.info("Report scheduler runner started in background")
    except Exception as e:
        logger.error(f"Failed to start scheduler runner: {e}")

    yield

    # Shutdown
    await realtime_service.close()
    if rabbitmq_consumer:
        await rabbitmq_consumer.stop()
        logger.info("RabbitMQ consumer stopped")
    if kafka_consumer:
        await kafka_consumer.stop()
        logger.info("Kafka consumer stopped")
    await task_scheduler.stop()
    logger.info("Task scheduler stopped")
    await scheduler_runner.stop()
    logger.info("Scheduler runner stopped")


app = FastAPI(
    title="Analytics Service",
    description="数据分析服务 API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["analytics"])
app.include_router(reports.router, prefix="/api/v1/reports", tags=["reports"])
app.include_router(export.router, prefix="/api/v1/export", tags=["export"])
app.include_router(schedules.router, prefix="/api/v1/schedules", tags=["schedules"])
app.include_router(tasks.router, prefix="/api/v1/tasks", tags=["tasks"])
app.include_router(funnels, prefix="/api/v1/funnels", tags=["funnels"])
app.include_router(cohorts, prefix="/api/v1/cohorts", tags=["cohorts"])


@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "analytics-service",
        "version": app.version,
        "timestamp": __import__("datetime").datetime.now().isoformat(),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=settings.PORT)
