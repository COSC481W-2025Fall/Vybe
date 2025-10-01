import pytest
from fastapi.testclient import TestClient
from app.main import app


def test_get_one_code():
    """Test the code generation endpoint."""
    client = TestClient(app)
    response = client.get("/api/v1/codes/one")
    
    assert response.status_code == 200
    data = response.json()
    assert "code" in data
    assert isinstance(data["code"], str)
    assert len(data["code"]) == 4


def test_code_endpoint_randomness():
    """Test that multiple calls return different codes."""
    client = TestClient(app)
    codes = []
    
    for _ in range(5):
        response = client.get("/api/v1/codes/one")
        assert response.status_code == 200
        codes.append(response.json()["code"])
    
    # Should have some variation
    assert len(set(codes)) > 1


def test_code_endpoint_error_handling():
    """Test error handling for invalid methods."""
    client = TestClient(app)
    
    # POST should return 405
    response = client.post("/api/v1/codes/one")
    assert response.status_code == 405