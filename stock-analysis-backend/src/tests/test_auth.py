"""Tests for authentication endpoints."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_user(client: AsyncClient):
    response = await client.post("/api/v1/auth/register", json={
        "email": "new@example.com",
        "username": "newuser",
        "password": "securepassword123",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "new@example.com"
    assert data["username"] == "newuser"
    assert "hashed_password" not in data
    assert "id" in data


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient, sample_user_data: dict):
    """Duplicate email should return 400."""
    # Register first time is done in auth_token fixture
    response = await client.post("/api/v1/auth/register", json=sample_user_data)
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, auth_token: str):
    """Login should return access and refresh tokens."""
    assert auth_token is not None
    assert len(auth_token) > 0


@pytest.mark.asyncio
async def test_login_invalid_password(client: AsyncClient, sample_user_data: dict):
    response = await client.post("/api/v1/auth/login", json={
        "username": sample_user_data["username"],
        "password": "wrongpassword",
    })
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_refresh_token(client: AsyncClient, sample_user_data: dict):
    """Refresh token should return new tokens."""
    login_resp = await client.post("/api/v1/auth/login", json={
        "username": sample_user_data["username"],
        "password": sample_user_data["password"],
    })
    refresh_token = login_resp.json()["refresh_token"]

    response = await client.post("/api/v1/auth/refresh", json={
        "refresh_token": refresh_token,
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_protected_endpoint_without_token(client: AsyncClient):
    """Accessing protected endpoint without token should return 401."""
    response = await client.get("/api/v1/users/me")
    assert response.status_code == 403  # No Bearer token at all -> 403


@pytest.mark.asyncio
async def test_protected_endpoint_with_token(client: AsyncClient, auth_token: str):
    """Accessing protected endpoint with valid token should work."""
    response = await client.get("/api/v1/users/me", headers={
        "Authorization": f"Bearer {auth_token}",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@example.com"
    assert data["username"] == "testuser"


@pytest.mark.asyncio
async def test_register_short_password(client: AsyncClient):
    """Password less than 8 chars should be rejected."""
    response = await client.post("/api/v1/auth/register", json={
        "email": "short@example.com",
        "username": "shortpw",
        "password": "123",
    })
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_login_nonexistent_user(client: AsyncClient):
    response = await client.post("/api/v1/auth/login", json={
        "username": "nonexistent",
        "password": "somepassword",
    })
    assert response.status_code == 401
