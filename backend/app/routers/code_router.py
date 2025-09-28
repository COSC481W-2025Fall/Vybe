from fastapi import APIRouter, Depends
from app.schemas.code_models import CodeResponse
from app.services.code_service import generate_code, DEFAULT_ALPHABET
from app.config import settings, Settings

router = APIRouter(prefix="/codes", tags=["codes"])

def get_settings() -> Settings:
    return settings

@router.get("/one", response_model=CodeResponse, summary="Get a 4-char join code")
def get_one_code(cfg: Settings = Depends(get_settings)) -> CodeResponse:
    code = generate_code(length=cfg.code_length, alphabet=cfg.code_alphabet or DEFAULT_ALPHABET)
    return {"code": code}
