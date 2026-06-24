"""
E2E tests for the Auth API (login, register, tokens).

Matches the current implementation of src/api/auth.py.
"""
from httpx import AsyncClient


# ============================================================
# Health Check
# ============================================================

async def test_health_check(client: AsyncClient):
    """Verify health endpoint returns OK."""
    resp = await client.get("/api/v1/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["service"] == "FundamentalsAI"


# ============================================================
# Registration
# ============================================================

REGISTER_URL = "/api/v1/auth/register"


async def test_register_success(client: AsyncClient):
    """Register a new user with valid data."""
    resp = await client.post(REGISTER_URL, json={
        "email": "newuser@example.com",
        "username": "newuser",
        "password": "TestPass123",
        "display_name": "New User",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["email"] == "newuser@example.com"
    assert data["username"] == "newuser"
    assert "id" in data


async def test_register_duplicate_email(client: AsyncClient):
    """Registering with existing email returns 400."""
    email = "dup@example.com"
    await client.post(REGISTER_URL, json={
        "email": email, "username": "user1", "password": "TestPass123"
    })
    resp = await client.post(REGISTER_URL, json={
        "email": email, "username": "user2", "password": "TestPass123"
    })
    assert resp.status_code == 400
    assert "already registered" in resp.json()["detail"].lower()


async def test_register_duplicate_username(client: AsyncClient):
    """Registering with existing username returns 400."""
    await client.post(REGISTER_URL, json={
        "email": "u1@example.com", "username": "sameuser", "password": "TestPass123"
    })
    resp = await client.post(REGISTER_URL, json={
        "email": "u2@example.com", "username": "sameuser", "password": "TestPass123"
    })
    assert resp.status_code == 400
    assert "already taken" in resp.json()["detail"].lower()


async def test_register_short_password(client: AsyncClient):
    """Password shorter than 8 chars should be rejected by Pydantic validation."""
    resp = await client.post(REGISTER_URL, json={
        "email": "short@example.com", "username": "shortuser", "password": "Ab1"
    })
    assert resp.status_code == 422


async def test_register_invalid_email(client: AsyncClient):
    """Invalid email format should be rejected."""
    resp = await client.post(REGISTER_URL, json={
        "email": "not-an-email", "username": "bademail", "password": "TestPass123"
    })
    assert resp.status_code == 422


# ============================================================
# Login
# ============================================================

LOGIN_URL = "/api/v1/auth/login"


async def test_login_success(client: AsyncClient, registered_user: dict):
    """Login with username + password returns valid tokens."""
    resp = await client.post(LOGIN_URL, json={
        "username": registered_user["username"],
        "password": registered_user["password"],
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


async def test_login_wrong_password(client: AsyncClient, registered_user: dict):
    """Login with wrong password returns 401."""
    resp = await client.post(LOGIN_URL, json={
        "username": registered_user["username"],
        "password": "WrongPassword99",
    })
    assert resp.status_code == 401


async def test_login_nonexistent_user(client: AsyncClient):
    """Login with a non-existent user returns 401."""
    resp = await client.post(LOGIN_URL, json={
        "username": "nonexistent",
        "password": "TestPass123",
    })
    assert resp.status_code == 401


# ============================================================
# Token Refresh
# ============================================================

REFRESH_URL = "/api/v1/auth/refresh"


async def test_refresh_token_valid(client: AsyncClient, registered_user: dict):
    """A valid refresh token yields new access + refresh tokens."""
    resp = await client.post(REFRESH_URL, json={
        "refresh_token": registered_user["refresh_token"],
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data


async def test_refresh_token_invalid(client: AsyncClient):
    """An invalid/expired refresh token returns 401."""
    resp = await client.post(REFRESH_URL, json={
        "refresh_token": "this.is.clearly.invalid",
    })
    assert resp.status_code == 401


# ============================================================
# Logout
# ============================================================

LOGOUT_URL = "/api/v1/auth/logout"


async def test_logout_authenticated(client: AsyncClient, registered_user: dict):
    """Logout succeeds for authenticated user."""
    resp = await client.post(
        LOGOUT_URL,
        headers={"Authorization": f"Bearer {registered_user['access_token']}"},
    )
    assert resp.status_code == 200
    assert "message" in resp.json()


async def test_logout_unauthenticated(client: AsyncClient):
    """Logout without token returns 401 (HTTPBearer)."""
    resp = await client.post(LOGOUT_URL)
    assert resp.status_code == 401


# ============================================================
# Full Auth Lifecycle
# ============================================================

async def test_full_auth_lifecycle(client: AsyncClient):
    """End-to-end: register → login → refresh → logout."""
    import uuid
    email = f"lifecycle_{uuid.uuid4().hex[:8]}@test.com"
    username = f"lifecycle_{uuid.uuid4().hex[:8]}"
    password = "Lifecycle99"

    # 1. Register
    r1 = await client.post(REGISTER_URL, json={
        "email": email, "username": username, "password": password,
    })
    assert r1.status_code == 201

    # 2. Login
    r2 = await client.post(LOGIN_URL, json={
        "username": username, "password": password,
    })
    assert r2.status_code == 200
    tokens = r2.json()

    # 3. Refresh token
    r3 = await client.post(REFRESH_URL, json={
        "refresh_token": tokens["refresh_token"],
    })
    assert r3.status_code == 200
    new_tokens = r3.json()

    # 4. Logout
    r4 = await client.post(LOGOUT_URL, headers={
        "Authorization": f"Bearer {new_tokens['access_token']}",
    })
    assert r4.status_code == 200
