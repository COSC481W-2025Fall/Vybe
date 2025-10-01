import pytest
import uuid
from app.services.utils_service import make_uuid, slugify


def test_make_uuid():
    """Test UUID generation."""
    uuid_str = make_uuid()
    assert isinstance(uuid_str, str)
    assert len(uuid_str) == 36
    
    # Should be valid UUID
    parsed_uuid = uuid.UUID(uuid_str)
    assert str(parsed_uuid) == uuid_str


def test_slugify_basic():
    """Test basic slugify functionality."""
    assert slugify("Hello World") == "hello-world"
    assert slugify("HELLO WORLD") == "hello-world"
    assert slugify("Hello, World!") == "hello-world"


def test_slugify_edge_cases():
    """Test slugify with edge cases."""
    assert slugify("") == "n-a"
    assert slugify("   ") == "n-a"
    assert slugify("!@#$%^&*()") == "n-a"
    assert slugify("Hello123World") == "hello123world"


def test_uuid_uniqueness():
    """Test that UUIDs are unique."""
    uuids = [make_uuid() for _ in range(10)]
    assert len(set(uuids)) == 10