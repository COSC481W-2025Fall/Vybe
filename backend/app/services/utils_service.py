import uuid
import re

def make_uuid() -> str:
    return str(uuid.uuid4())

_slug_re = re.compile(r"[^a-z0-9]+")

def slugify(text: str) -> str:
    s = text.strip().lower()
    s = _slug_re.sub("-", s).strip("-")
    return s or "n-a"
