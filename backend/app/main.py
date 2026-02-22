import asyncio
import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI

# Windows: asyncio subprocess requires ProactorEventLoop (SelectorEventLoop raises NotImplementedError)
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
from fastapi.middleware.cors import CORSMiddleware

from app.routers import repos, features, execution, plan, suggestions


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Product Evolution Engine API starting up")
    from app.services.execution_service import cleanup_stale_runs
    await cleanup_stale_runs()
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
app.include_router(execution.router)
app.include_router(plan.router)
app.include_router(suggestions.router)


@app.get("/api/health")
async def health_check():
    """Verify API is running and critical dependencies are reachable."""
    from app.config import settings
    from app.db import get_supabase

    checks = {}
    all_ok = True

    # Database (Supabase)
    if not settings.supabase_url or not settings.supabase_service_key:
        checks["database"] = "not_configured"
        all_ok = False
    else:
        try:
            db = get_supabase()
            db.table("repos").select("id").limit(1).execute()
            checks["database"] = "ok"
        except Exception as e:
            checks["database"] = "error"
            checks["database_detail"] = str(e)
            all_ok = False

    return {
        "status": "ok" if all_ok else "degraded",
        "service": "product-evolution-engine",
        "checks": checks,
    }
