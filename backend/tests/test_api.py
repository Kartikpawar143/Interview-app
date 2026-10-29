from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_endpoint() -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_departments_endpoint_has_expected_metadata() -> None:
    response = client.get("/api/departments")
    assert response.status_code == 200
    departments = response.json()
    assert [department["id"] for department in departments] == ["linux", "aws", "azure"]
    assert [department["status"] for department in departments] == ["available", "coming_soon", "coming_soon"]
    assert all(department["topics"] == [] for department in departments)
