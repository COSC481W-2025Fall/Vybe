import pytest
from pydantic import ValidationError
from app.schemas.code_models import CodeResponse
from app.schemas.utils_models import UUIDResponse, SlugRequest, SlugResponse


def test_code_response():
    """Test CodeResponse model."""
    response = CodeResponse(code="ABC123")
    assert response.code == "ABC123"
    
    # Test serialization
    data = response.model_dump()
    assert data == {"code": "ABC123"}


def test_uuid_response():
    """Test UUIDResponse model."""
    response = UUIDResponse(uuid="550e8400-e29b-41d4-a716-446655440000")
    assert response.uuid == "550e8400-e29b-41d4-a716-446655440000"


def test_slug_request():
    """Test SlugRequest model."""
    request = SlugRequest(text="Hello World")
    assert request.text == "Hello World"
    
    # Test validation
    with pytest.raises(ValidationError):
        SlugRequest()  # Missing required field


def test_slug_response():
    """Test SlugResponse model."""
    response = SlugResponse(slug="hello-world")
    assert response.slug == "hello-world"