from fastapi import APIRouter
from app.schemas.utils_models import UUIDResponse, SlugRequest, SlugResponse
from app.services.utils_service import make_uuid, slugify

router = APIRouter(prefix="/utils", tags=["utils"])

@router.get("/uuid", response_model=UUIDResponse, summary="Generate a random UUID")
def get_uuid() -> UUIDResponse:
    return {"uuid": make_uuid()}

@router.post("/slug", response_model=SlugResponse, summary="Turn text into a URL-safe slug")
def post_slug(payload: SlugRequest) -> SlugResponse:
    return {"slug": slugify(payload.text)}
