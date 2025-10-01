import pytest
from fastapi.testclient import TestClient
from app.main import app


def test_get_uuid():
    """Test the UUID generation endpoint."""
    client = TestClient(app)
    response = client.get("/api/v1/utils/uuid")
    
    assert response.status_code == 200
    data = response.json()
    assert "uuid" in data
    assert isinstance(data["uuid"], str)
    assert len(data["uuid"]) == 36


def test_post_slug():
    """Test the slug generation endpoint."""
    client = TestClient(app)
    response = client.post("/api/v1/utils/slug", json={"text": "Hello World"})
    
    assert response.status_code == 200
    data = response.json()
    assert "slug" in data
    assert data["slug"] == "hello-world"


def test_slug_endpoint_validation():
    """Test slug endpoint validation."""
    client = TestClient(app)
    
    # Missing text field
    response = client.post("/api/v1/utils/slug", json={})
    assert response.status_code == 422
    
    # Invalid text type
    response = client.post("/api/v1/utils/slug", json={"text": 123})
    assert response.status_code == 422


def test_utils_endpoints_error_handling():
    """Test error handling for invalid methods."""
    client = TestClient(app)
    
    # GET on slug endpoint should return 405
    response = client.get("/api/v1/utils/slug")
    assert response.status_code == 405
    
    # POST on UUID endpoint should return 405
    response = client.post("/api/v1/utils/uuid")
    assert response.status_code == 405