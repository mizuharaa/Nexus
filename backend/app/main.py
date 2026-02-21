import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import repos, features, branches, execution


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Product Evolution Engine API starting up")
    yield
    logger.info("Product Evolution Engine API shutting down")


app = FastAPI(
    title="Product Evolution Engine",
    description="AI-native developer tool for repo analysis, feature topology, and autonomous implementation",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — allow the Next.js frontend in dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(repos.router)
app.include_router(features.router)
app.include_router(branches.router)
app.include_router(execution.router)


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "product-evolution-engine"}
