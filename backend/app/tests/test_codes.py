from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_get_code():
    r = client.get("/api/v1/codes/one")
    assert r.status_code == 200
    data = r.json()
    assert "code" in data
    assert isinstance(data["code"], str)
    assert len(data["code"]) == 4
