"""Main FastAPI Application Entrypoint."""

import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.core.config import settings
from backend.app.core.database import init_db
from backend.app.core.seeder import seed_database
from backend.app.api.routes import router as api_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s"
)
logger = logging.getLogger(__name__)


import asyncio
from backend.app.engine.live_orchestrator import live_orchestrator


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle handler."""
    logger.info("Starting up Macro Fundamental Intelligence Platform...")
    await init_db()
    # Seed baseline universe if database is empty
    await seed_database()

    # Seed trailing out-of-sample forward-test tracker history
    from backend.app.engine.forward_test_tracker import ForwardTestTracker
    ForwardTestTracker.seed_recent_forward_test_history()

    # Start live data ingestion background scheduler (100% free feeds)
    logger.info("Launching Live Ingestion Background Scheduler (Free online feeds)...")
    scheduler_task = asyncio.create_task(live_orchestrator.start_background_scheduler())

    yield

    logger.info("Shutting down Macro Fundamental Intelligence Platform...")
    live_orchestrator.stop_background_scheduler()
    scheduler_task.cancel()
    try:
        await scheduler_task
    except (asyncio.CancelledError, Exception):
        pass


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "Automated Macro Fundamental Intelligence and Market-Bias Engine for Global Trading Assets "
        "(Forex Majors & Crosses, Equity Indices, Precious Metals, and Energy/Commodities)."
    ),
    lifespan=lifespan,
)

from backend.app.engine.vps_governor import vps_governor
from fastapi import Request

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# VPS Activity Monitoring Middleware
@app.middleware("http")
async def vps_governor_middleware(request: Request, call_next):
    vps_governor.record_user_activity()
    return await call_next(request)

# Mount API routes under /api/v1
@api_router.get("/info")
async def api_info():
    return {
        "platform": settings.PROJECT_NAME,
        "author": settings.AUTHOR,
        "copyright": settings.COPYRIGHT,
        "version": settings.VERSION,
        "status": "OPERATIONAL",
        "api_docs": "/docs",
        "api_v1": settings.API_V1_STR,
        "mode": "DEMO / HYBRID" if settings.DEMO_MODE else "PRODUCTION",
        "supported_classes": ["forex", "index", "metal", "commodity", "crypto"],
        "disclaimer": "Fundamental bias is an analytical output, not a guarantee of future market direction."
    }

app.include_router(api_router, prefix=settings.API_V1_STR)

# Mount frontend static distribution if built
frontend_dist = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "frontend", "dist")
if os.path.exists(frontend_dist):
    from fastapi.staticfiles import StaticFiles
    from fastapi.responses import FileResponse
    
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        if full_path.startswith("api/") or full_path == "api" or full_path.startswith("docs") or full_path.startswith("openapi.json"):
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail=f"API endpoint not found: /{full_path}")
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        
        # Always serve index.html with no-cache headers to prevent stale SPA builds
        no_cache_headers = {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
        }
        return FileResponse(os.path.join(frontend_dist, "index.html"), headers=no_cache_headers)
else:
    @app.get("/")
    async def root():
        return {
            "platform": settings.PROJECT_NAME,
            "version": settings.VERSION,
            "status": "OPERATIONAL",
            "api_docs": "/docs",
            "api_v1": settings.API_V1_STR,
            "mode": "DEMO / HYBRID" if settings.DEMO_MODE else "PRODUCTION",
            "supported_classes": ["forex", "index", "metal", "commodity", "crypto"],
            "disclaimer": "Fundamental bias is an analytical output, not a guarantee of future market direction."
        }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8080"))
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=port, reload=True)
