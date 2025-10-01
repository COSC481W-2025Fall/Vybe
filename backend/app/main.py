from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers.code_router import router as code_router
from app.routers.utils_router import router as utils_router
from app.routers.ytm_router import router as ytm_router

def create_app() -> FastAPI:
    app = FastAPI(title=settings.api_name, version=settings.api_version)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_origin_regex=r"chrome-extension://.*",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(code_router, prefix="/api/v1")
    app.include_router(utils_router, prefix="/api/v1")
    app.include_router(ytm_router)

    @app.get("/healthz", tags=["ops"])
    def health_check():
        return {"status": "ok"}

    # Alias for clients expecting /health
    @app.get("/health", tags=["ops"])
    def health_check_alias():
        return {"status": "ok"}

    return app

app = create_app()
