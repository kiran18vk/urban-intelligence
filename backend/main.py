import os
import sys
from datetime import datetime, timezone
from pathlib import Path

# Ensure backend directory is in python path
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

DIST_DIR = BASE_DIR.parent / "dist"

from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse

from routers import stats, buses, events, defects, traffic, incidents, analytics, ai_traffic, anpr, ai_road_damage, reliability, digital_twin, pedestrian_risk, edge_queue, live_monitor, event_correlation, human_review, authority_actions, reobservation, predictive, system

app = FastAPI(
    title="Urban Intelligence Platform API",
    description="AI-Powered Mobile Urban Intelligence Platform Using Public Transport Fleet (SIH 2026 PS 26124)",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Configuration (environment-driven)
cors_origins_env = os.getenv("CORS_ORIGINS", "")
if cors_origins_env.strip():
    origins = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]
else:
    origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if "*" in origins else origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Router with /api prefix
api_router = APIRouter(prefix="/api")

@api_router.get("/health", tags=["health"])
def health_check():
    env = os.getenv("ENVIRONMENT", "production" if (DIST_DIR / "index.html").exists() else "development")
    return {
        "status": "ok",
        "service": "urban-intelligence-api",
        "environment": env,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

@api_router.get("/docs", include_in_schema=False)
def api_docs_alias():
    return RedirectResponse(url="/docs")

# Register all domain routers under /api
api_router.include_router(stats.router)
api_router.include_router(buses.router)
api_router.include_router(events.router)
api_router.include_router(defects.router)
api_router.include_router(traffic.router)
api_router.include_router(incidents.router)
api_router.include_router(analytics.router)
api_router.include_router(ai_traffic.router)
api_router.include_router(anpr.router)
api_router.include_router(ai_road_damage.router)
api_router.include_router(reliability.router)
api_router.include_router(digital_twin.router)
api_router.include_router(pedestrian_risk.router)
api_router.include_router(edge_queue.router)
api_router.include_router(live_monitor.router)
api_router.include_router(event_correlation.router)
api_router.include_router(human_review.router)
api_router.include_router(authority_actions.router)
api_router.include_router(reobservation.router)
api_router.include_router(predictive.router)
api_router.include_router(system.router)

app.include_router(api_router)

# Mount /assets if dist/assets exists
if (DIST_DIR / "assets").exists():
    app.mount("/assets", StaticFiles(directory=str(DIST_DIR / "assets")), name="assets")

# Root and SPA / Static file catch-all handler
@app.get("/{full_path:path}", include_in_schema=False)
async def serve_spa_or_static(full_path: str = ""):
    # Ensure unmatched /api/* routes return 404 rather than serving index.html
    if full_path.startswith("api/") or full_path == "api":
        raise HTTPException(status_code=404, detail=f"API route '/{full_path}' not found")

    file_path = DIST_DIR / full_path
    if full_path and file_path.is_file():
        return FileResponse(file_path)

    index_file = DIST_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file)

    return {
        "status": "ok",
        "service": "urban-intelligence-api",
        "message": "FastAPI backend running. Frontend dist not built yet. Run 'npm run build' to generate static assets.",
        "docs": "/docs",
        "health": "/api/health",
    }

if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host=host, port=port, reload=False)
