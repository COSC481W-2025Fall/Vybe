import pytest
from fastapi.testclient import TestClient
from app.main import create_app, app


def test_create_app():
    """Test that the app factory creates a FastAPI instance."""
    test_app = create_app()
    assert test_app.title == "Backend Service"
    assert test_app.version == "1.0.0"


def test_health_check():
    """Test the health check endpoint."""
    client = TestClient(app)
    response = client.get("/healthz")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_app_routes():
    """Test that main routes are accessible."""
    client = TestClient(app)
    
    # Test code endpoint
    response = client.get("/api/v1/codes/one")
    assert response.status_code == 200
    assert "code" in response.json()
    
    # Test utils endpoints
    response = client.get("/api/v1/utils/uuid")
    assert response.status_code == 200
    assert "uuid" in response.json()
    
    response = client.post("/api/v1/utils/slug", json={"text": "Hello World"})
    assert response.status_code == 200
    assert "slug" in response.json()