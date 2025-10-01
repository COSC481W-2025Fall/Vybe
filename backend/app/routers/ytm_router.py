from fastapi import APIRouter, HTTPException, Header, Query, Request, Depends
from typing import Dict, Optional, List
from pydantic import BaseModel
from app.config import settings, Settings

import os
import json
import time
import asyncio
from functools import lru_cache
from concurrent.futures import ThreadPoolExecutor

from ytmusicapi import YTMusic, setup

router = APIRouter(prefix="/ytm", tags=["ytmusic"])

HEADERS_FILE = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "headers_dev.json"))
_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="ytmusic")

class HeaderIngest(BaseModel):
    url: str
    time: str
    headers: Dict[str, str]

class SimpleResponse(BaseModel):
    ok: bool
    message: Optional[str] = None
    sample: Optional[List[dict]] = None

def get_settings() -> Settings:
    return settings

def verify_token(x_client_token: Optional[str], cfg: Settings):
    if x_client_token != cfg.ytm_client_token:
        raise HTTPException(status_code=401, detail="Invalid token")

def load_headers() -> Optional[dict]:
    try:
        if os.path.exists(HEADERS_FILE):
            with open(HEADERS_FILE, "r") as f:
                return json.load(f)
    except Exception:
        pass
    return None

def save_headers(data: dict) -> bool:
    try:
        os.makedirs(os.path.dirname(HEADERS_FILE), exist_ok=True)
        with open(HEADERS_FILE, "w") as f:
            json.dump(data, f, indent=2)
        return True
    except Exception:
        return False

@router.post("/ingest")
async def ingest_headers(payload: HeaderIngest, x_client_token: Optional[str] = Header(None), cfg: Settings = Depends(get_settings)):
    verify_token(x_client_token, cfg)
    if not save_headers(payload.dict()):
        raise HTTPException(status_code=500, detail="Failed to save headers")
    # New headers ingested: invalidate cached auth so subsequent calls re-read file
    try:
        _get_cached_auth_string.cache_clear()  # type: ignore[attr-defined]
    except Exception:
        pass
    return "OK"

@lru_cache(maxsize=1)
def _get_cached_auth_string() -> Optional[str]:
    headers_data = load_headers()
    if not headers_data:
        return None
    headers = headers_data.get("headers") or {}
    # Build raw headers string compatible with ytmusicapi.setup
    raw_lines = []
    for key in [
        "authorization",
        "x-goog-authuser",
        "x-goog-visitor-id",
        "x-origin",
        "x-youtube-client-name",
        "x-youtube-client-version",
        "user-agent",
        "accept-language",
        "cookie",
    ]:
        val = headers.get(key)
        if val:
            raw_lines.append(f"{key}: {val}")
    if not raw_lines:
        return None
    raw = "\n".join(raw_lines)
    return setup(headers_raw=raw)

def _make_yt() -> Optional[YTMusic]:
    auth = _get_cached_auth_string()
    if not auth:
        return None
    return YTMusic(auth)

@router.get("/validate", response_model=SimpleResponse)
async def validate_connection(x_client_token: Optional[str] = Header(None), cfg: Settings = Depends(get_settings)):
    verify_token(x_client_token, cfg)
    yt = _make_yt()
    if not yt:
        # Return 200 with ok=false so frontend can render a friendly message
        return {"ok": False, "message": "Not connected yet. Open music.youtube.com with the extension enabled and play a track."}

    loop = asyncio.get_event_loop()
    def _try_history():
        try:
            return yt.get_history()
        except Exception:
            return []
    history = await loop.run_in_executor(_executor, _try_history)
    if not history:
        return {"ok": False, "message": "Connected, but no history returned yet. Try playing a track and retry."}
    sample = history[:5] if isinstance(history, list) else []
    # Minimal formatting to keep payload small
    formatted = []
    for i, item in enumerate(sample, 1):
        if not isinstance(item, dict):
            continue
        formatted.append({
            "number": i,
            "title": (item.get("title") or "Unknown"),
            "artists": [a.get("name") for a in (item.get("artists") or []) if isinstance(a, dict)],
            "played": item.get("played") or "",
        })
    return {"ok": True, "message": "Connection validated", "sample": formatted}

@router.get("/history")
async def get_history(limit: int = Query(50, ge=1, le=200), x_client_token: Optional[str] = Header(None), cfg: Settings = Depends(get_settings)):
    verify_token(x_client_token, cfg)
    yt = _make_yt()
    if not yt:
        raise HTTPException(status_code=404, detail="No headers found. Visit music.youtube.com with the extension loaded and play a track.")
    loop = asyncio.get_event_loop()
    def _try_history():
        try:
            return yt.get_history()
        except Exception:
            return []
    history = await loop.run_in_executor(_executor, _try_history)
    if not history:
        raise HTTPException(status_code=500, detail="Failed to get history from YouTube Music API")
    if isinstance(history, list) and len(history) > limit:
        history = history[:limit]
    # Normalize fields used by UI
    normalized = []
    for item in history:
        if not isinstance(item, dict):
            continue
        normalized.append({
            "videoId": item.get("videoId", ""),
            "title": item.get("title", "Unknown"),
            "artists": [a.get("name") for a in (item.get("artists") or []) if isinstance(a, dict)],
            "album": (item.get("album") or {}).get("name") if isinstance(item.get("album"), dict) else "",
            "thumbnail": (item.get("thumbnails") or [{}])[0].get("url", ""),
            "played": item.get("played", ""),
        })
    return normalized

@router.get("/library")
async def get_library(x_client_token: Optional[str] = Header(None), cfg: Settings = Depends(get_settings)):
    verify_token(x_client_token, cfg)
    yt = _make_yt()
    if not yt:
        raise HTTPException(status_code=404, detail="No headers found. Visit music.youtube.com with the extension loaded and play a track.")
    loop = asyncio.get_event_loop()
    playlists = await loop.run_in_executor(_executor, lambda: yt.get_library_playlists())
    return playlists or []

@router.get("/search")
async def search_music(query: str, x_client_token: Optional[str] = Header(None), cfg: Settings = Depends(get_settings)):
    verify_token(x_client_token, cfg)
    yt = _make_yt()
    if not yt:
        raise HTTPException(status_code=404, detail="No headers found. Visit music.youtube.com with the extension loaded and play a track.")
    loop = asyncio.get_event_loop()
    results = await loop.run_in_executor(_executor, lambda: yt.search(query, filter="songs", limit=20))
    return results or []

@router.delete("/connect", response_model=SimpleResponse)
async def disconnect(x_client_token: Optional[str] = Header(None), cfg: Settings = Depends(get_settings)):
    verify_token(x_client_token, cfg)
    try:
        if os.path.exists(HEADERS_FILE):
            os.remove(HEADERS_FILE)
            return {"ok": True, "message": "Deleted headers"}
        return {"ok": True, "message": "No headers to delete"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete files: {str(e)}")


