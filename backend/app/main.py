import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .routers import tmux_router, settings_router, file_router

app = FastAPI(title=settings.app_name)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(tmux_router)
app.include_router(settings_router)
app.include_router(file_router)


@app.get("/health")
async def health_check():
    from datetime import datetime
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat()
    }


# Static file serving for Docker production mode
STATIC_DIR = os.environ.get("STATIC_DIR")

if STATIC_DIR and os.path.isdir(STATIC_DIR):
    from fastapi.staticfiles import StaticFiles
    from fastapi.responses import FileResponse

    _static_dir_real = os.path.realpath(STATIC_DIR)
    _static_dir_prefix = _static_dir_real + os.sep

    # Serve React's hashed JS/CSS bundles
    _static_assets = os.path.join(STATIC_DIR, "static")
    if os.path.isdir(_static_assets):
        app.mount("/static", StaticFiles(directory=_static_assets), name="static-assets")

    @app.get("/{path:path}")
    async def serve_spa(path: str):
        # API routes (/api/*, /health) are registered before this catch-all
        # and take priority in FastAPI's route resolution order.
        if path:
            file_path = os.path.realpath(os.path.join(STATIC_DIR, path))
            if file_path.startswith(_static_dir_prefix) and os.path.isfile(file_path):
                return FileResponse(file_path)
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))
else:
    @app.get("/")
    async def root():
        return {"message": "SSH Client Web Service API"}
