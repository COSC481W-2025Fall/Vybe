import pytest
from fastapi.testclient import TestClient
from app.main import app


def test_full_api_workflow():
    """Test a complete workflow using all API endpoints."""
    client = TestClient(app)
    
    # 1. Check health
    response = client.get("/healthz")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    
    # 2. Generate a code
    response = client.get("/api/v1/codes/one")
    assert response.status_code == 200
    code = response.json()["code"]
    assert len(code) == 4
    
    # 3. Generate a UUID
    response = client.get("/api/v1/utils/uuid")
    assert response.status_code == 200
    uuid = response.json()["uuid"]
    assert len(uuid) == 36
    
    # 4. Create a slug
    response = client.post("/api/v1/utils/slug", json={"text": "Hello World"})
    assert response.status_code == 200
    slug = response.json()["slug"]
    assert slug == "hello-world"


def test_api_error_handling():
    """Test error handling across the API."""
    client = TestClient(app)
    
    # Test 404
    response = client.get("/nonexistent")
    assert response.status_code == 404
    
    # Test 405
    response = client.post("/healthz")
    assert response.status_code == 405
    
    # Test 422
    response = client.post("/api/v1/utils/slug", json={})
    assert response.status_code == 422


def test_openapi_documentation():
    """Test OpenAPI documentation endpoints."""
    client = TestClient(app)
    
    # Test OpenAPI JSON
    response = client.get("/openapi.json")
    assert response.status_code == 200
    openapi_spec = response.json()
    assert "openapi" in openapi_spec
    assert "paths" in openapi_spec
    
    # Test Swagger UI
    response = client.get("/docs")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]