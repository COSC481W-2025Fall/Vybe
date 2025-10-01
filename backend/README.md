# Backend (FastAPI) — Expandable Starter

This repo is a minimal **FastAPI** backend you can grow from. It ships with:
- A **join-code** endpoint that returns a random 4‑char code (letters/digits + specials).
- A **utils** router with unrelated examples (UUID, slugify) to show how you can add totally different features.
- Clean, testable structure: services (logic), routers (HTTP), schemas (Pydantic), config (env-driven).

## Quickstart

```bash
# 1) Create a venv (recommended)
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate

# 2) Install deps
pip install -r requirements.txt

# 3) Run the server
uvicorn app.main:app --reload --port 8000
```

OpenAPI docs: http://localhost:8000/docs

### Example calls
- `GET /api/v1/codes/one` → `{ "code": "A7$Q" }`
- `GET /api/v1/utils/uuid` → `{ "uuid": "..." }`
- `POST /api/v1/utils/slug` `{ "text": "Hello World!" }` → `{ "slug": "hello-world" }`

## Project structure

```
app/
  main.py                # App factory + router registration
  config.py              # Env-driven settings (Pydantic Settings)
  routers/
    code_router.py       # /codes endpoints
    utils_router.py      # /utils endpoints (unrelated examples)
  services/
    code_service.py      # join-code generator logic
    utils_service.py     # uuid + slugify helpers
  schemas/
    code_models.py       # Pydantic response models for /codes
    utils_models.py      # Pydantic models for /utils
  tests/
    test_codes.py        # tiny example test
requirements.txt
README.md
```

## Settings

Configure via environment variables (prefix `APP_`). Defaults work out of the box.

- `APP_API_NAME` — API title (default: "Backend Service")
- `APP_API_VERSION` — API version (default: "1.0.0")
- `APP_CORS_ORIGINS` — JSON list of allowed origins
- `APP_CODE_LENGTH` — join code length (default: 4)
- `APP_CODE_ALPHABET` — alphabet for code generation

> Note: join codes are 4 chars by default. If you want them *always* 4 regardless of env, leave `APP_CODE_LENGTH` alone.

## How to add a new feature (router + service)

1. **Create service logic** in `app/services/<feature>_service.py`  
   Keep business logic isolated from HTTP concerns.
2. **Create Pydantic models** in `app/schemas/<feature>_models.py`  
   Define request/response shapes.
3. **Create a router** in `app/routers/<feature>_router.py`  
   Import your service + schemas, define endpoints.
4. **Register the router** in `app/main.py` with `app.include_router(...)`  
   Give it a clear `prefix` (e.g., `/api/v1/files`).
5. (Optional) **Add tests** under `app/tests/` using `TestClient`.

### Minimal template

**services/foo_service.py**
```python
def do_something(x: int) -> int:
    return x * 2
```

**schemas/foo_models.py**
```python
from pydantic import BaseModel

class FooRequest(BaseModel):
    x: int

class FooResponse(BaseModel):
    y: int
```

**routers/foo_router.py**
```python
from fastapi import APIRouter
from app.schemas.foo_models import FooRequest, FooResponse
from app.services.foo_service import do_something

router = APIRouter(prefix="/foo", tags=["foo"])

@router.post("/double", response_model=FooResponse)
def double(req: FooRequest) -> FooResponse:
    return {"y": do_something(req.x)}
```

**main.py**
```python
from app.routers.foo_router import router as foo_router
app.include_router(foo_router, prefix="/api/v1")
```

## Notes on join codes (design choices)

- **Truly random**: no enforced composition (no "must include special"), which keeps probability uniform and reduces bias.
- **Alphabet** excludes confusing chars (0,1,I,O). Specials used: `!@#$%&*?`.
- **Collision strategy**: keep it random; only add DB/Redis de-dup if real collisions impact UX at your scale.

## Testing

```bash
pytest -q
```

This runs a simple test that hits `/api/v1/codes/one` and asserts a 4‑char string comes back.

---

This starter stays small but is easy to extend. Drop in more routers for unrelated features without tangling concerns.
