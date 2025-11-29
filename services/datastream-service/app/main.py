import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.consumers.click_consumer import ClickConsumer
from app.producers.click_producer import ClickProducer
from app.api import stream, export, streams
from app.services.stream_service import stream_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

click_consumer = None
click_producer = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global click_consumer, click_producer

    # Initialize stream service
    await stream_service.initialize()
    logger.info("Stream service initialized")

    # Start Kafka producer
    click_producer = ClickProducer()
    await click_producer.start()
    # Make producer accessible to routes
    app.state.click_producer = click_producer

    # Start Kafka consumer
    click_consumer = ClickConsumer()
    asyncio.create_task(click_consumer.start())

    yield

    # Shutdown stream service
    await stream_service.shutdown()
    logger.info("Stream service shutdown")

    # Stop consumer and producer
    if click_consumer:
        await click_consumer.stop()
    if click_producer:
        await click_producer.stop()


app = FastAPI(
    title="Datastream Service",
    description="数据流处理服务 API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(stream.router, prefix="/api/stream", tags=["stream"])
app.include_router(export.router, prefix="/api/export", tags=["export"])
app.include_router(streams.router, prefix="/api", tags=["data-streams"])


@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "datastream-service",
        "version": app.version,
        "timestamp": __import__("datetime").datetime.now().isoformat(),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=settings.PORT)
