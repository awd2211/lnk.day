import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.consumers.click_consumer import ClickConsumer
from app.producers.click_producer import ClickProducer
from app.api import stream

click_consumer = None
click_producer = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global click_consumer, click_producer
    # Start Kafka producer
    click_producer = ClickProducer()
    await click_producer.start()
    # Make producer accessible to routes
    app.state.click_producer = click_producer

    # Start Kafka consumer
    click_consumer = ClickConsumer()
    asyncio.create_task(click_consumer.start())
    yield
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


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "datastream-service"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=settings.PORT)
