"""Tests for watchlist, alert, and note endpoints."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_watchlist(client: AsyncClient, auth_token: str, sample_stock):
    response = await client.post(
        "/api/v1/watchlists/",
        json={"name": "My Watchlist", "stock_ids": [str(sample_stock.id)]},
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "My Watchlist"
    assert str(sample_stock.id) in data["stock_ids"]
    assert "id" in data
    return data["id"]


@pytest.mark.asyncio
async def test_list_watchlists(client: AsyncClient, auth_token: str, sample_stock):
    # Create a watchlist first
    await client.post(
        "/api/v1/watchlists/",
        json={"name": "List Test", "stock_ids": []},
        headers={"Authorization": f"Bearer {auth_token}"},
    )

    response = await client.get("/api/v1/watchlists/", headers={
        "Authorization": f"Bearer {auth_token}",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    assert len(data["watchlists"]) >= 1


@pytest.mark.asyncio
async def test_get_watchlist_detail(client: AsyncClient, auth_token: str, sample_stock):
    # Create a watchlist with a stock
    create_resp = await client.post(
        "/api/v1/watchlists/",
        json={"name": "Detail Test", "stock_ids": [str(sample_stock.id)]},
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    watchlist_id = create_resp.json()["id"]

    response = await client.get(f"/api/v1/watchlists/{watchlist_id}", headers={
        "Authorization": f"Bearer {auth_token}",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Detail Test"
    assert "stocks" in data
    assert len(data["stocks"]) == 1
    assert data["stocks"][0]["ticker"] == "AAPL"


@pytest.mark.asyncio
async def test_update_watchlist(client: AsyncClient, auth_token: str):
    create_resp = await client.post(
        "/api/v1/watchlists/",
        json={"name": "Old Name", "stock_ids": []},
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    watchlist_id = create_resp.json()["id"]

    response = await client.put(
        f"/api/v1/watchlists/{watchlist_id}",
        json={"name": "New Name"},
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    assert response.status_code == 200
    assert response.json()["name"] == "New Name"


@pytest.mark.asyncio
async def test_add_remove_stock(client: AsyncClient, auth_token: str, sample_stock):
    create_resp = await client.post(
        "/api/v1/watchlists/",
        json={"name": "Modify Test", "stock_ids": []},
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    watchlist_id = create_resp.json()["id"]

    # Add stock
    add_resp = await client.post(
        f"/api/v1/watchlists/{watchlist_id}/stocks",
        json={"stock_id": str(sample_stock.id)},
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    assert add_resp.status_code == 200
    assert str(sample_stock.id) in add_resp.json()["stock_ids"]

    # Remove stock
    remove_resp = await client.delete(
        f"/api/v1/watchlists/{watchlist_id}/stocks/{sample_stock.id}",
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    assert remove_resp.status_code == 200
    assert str(sample_stock.id) not in remove_resp.json()["stock_ids"]


@pytest.mark.asyncio
async def test_delete_watchlist(client: AsyncClient, auth_token: str):
    create_resp = await client.post(
        "/api/v1/watchlists/",
        json={"name": "To Delete", "stock_ids": []},
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    watchlist_id = create_resp.json()["id"]

    response = await client.delete(f"/api/v1/watchlists/{watchlist_id}", headers={
        "Authorization": f"Bearer {auth_token}",
    })
    assert response.status_code == 204

    # Verify deleted
    get_resp = await client.get(f"/api/v1/watchlists/{watchlist_id}", headers={
        "Authorization": f"Bearer {auth_token}",
    })
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_watchlist_unauthorized(client: AsyncClient):
    response = await client.get("/api/v1/watchlists/")
    assert response.status_code == 403


# --- Alert Tests ---

@pytest.mark.asyncio
async def test_create_alert(client: AsyncClient, auth_token: str, sample_stock):
    response = await client.post(
        "/api/v1/watchlists/alerts",
        json={
            "stock_id": str(sample_stock.id),
            "metric": "pe",
            "operator": "lt",
            "threshold": 15.0,
            "channels": ["push", "email"],
        },
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["metric"] == "pe"
    assert data["threshold"] == 15.0
    assert data["enabled"] is True


@pytest.mark.asyncio
async def test_list_alerts(client: AsyncClient, auth_token: str, sample_stock):
    # Create an alert first
    await client.post(
        "/api/v1/watchlists/alerts",
        json={
            "stock_id": str(sample_stock.id),
            "metric": "roe",
            "operator": "gte",
            "threshold": 20.0,
        },
        headers={"Authorization": f"Bearer {auth_token}"},
    )

    response = await client.get("/api/v1/watchlists/alerts", headers={
        "Authorization": f"Bearer {auth_token}",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_update_alert(client: AsyncClient, auth_token: str, sample_stock):
    create_resp = await client.post(
        "/api/v1/watchlists/alerts",
        json={
            "stock_id": str(sample_stock.id),
            "metric": "pe",
            "operator": "gt",
            "threshold": 30.0,
        },
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    alert_id = create_resp.json()["id"]

    response = await client.put(
        f"/api/v1/watchlists/alerts/{alert_id}",
        json={"threshold": 25.0, "enabled": False},
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["threshold"] == 25.0
    assert data["enabled"] is False


# --- Note Tests ---

@pytest.mark.asyncio
async def test_create_note(client: AsyncClient, auth_token: str, sample_stock):
    response = await client.post(
        "/api/v1/watchlists/notes",
        json={
            "stock_id": str(sample_stock.id),
            "title": "My Analysis",
            "content": "This stock looks promising because...",
            "tags": ["growth", "tech"],
        },
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "My Analysis"
    assert "growth" in data["tags"]


@pytest.mark.asyncio
async def test_list_notes(client: AsyncClient, auth_token: str, sample_stock):
    await client.post(
        "/api/v1/watchlists/notes",
        json={
            "stock_id": str(sample_stock.id),
            "title": "Note 1",
            "content": "Content 1",
        },
        headers={"Authorization": f"Bearer {auth_token}"},
    )

    response = await client.get("/api/v1/watchlists/notes", headers={
        "Authorization": f"Bearer {auth_token}",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_filter_notes_by_stock(client: AsyncClient, auth_token: str, sample_stock):
    await client.post(
        "/api/v1/watchlists/notes",
        json={
            "stock_id": str(sample_stock.id),
            "title": "AAPL Note",
            "content": "Apple analysis",
        },
        headers={"Authorization": f"Bearer {auth_token}"},
    )

    response = await client.get("/api/v1/watchlists/notes", params={
        "stock_id": str(sample_stock.id),
    }, headers={"Authorization": f"Bearer {auth_token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1


@pytest.mark.asyncio
async def test_update_note(client: AsyncClient, auth_token: str, sample_stock):
    create_resp = await client.post(
        "/api/v1/watchlists/notes",
        json={
            "stock_id": str(sample_stock.id),
            "title": "Original Title",
            "content": "Original content",
        },
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    note_id = create_resp.json()["id"]

    response = await client.put(
        f"/api/v1/watchlists/notes/{note_id}",
        json={"title": "Updated Title", "content": "Updated content"},
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Updated Title"
    assert data["content"] == "Updated content"


@pytest.mark.asyncio
async def test_delete_note(client: AsyncClient, auth_token: str, sample_stock):
    create_resp = await client.post(
        "/api/v1/watchlists/notes",
        json={
            "stock_id": str(sample_stock.id),
            "title": "To Delete",
            "content": "Will be deleted",
        },
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    note_id = create_resp.json()["id"]

    response = await client.delete(f"/api/v1/watchlists/notes/{note_id}", headers={
        "Authorization": f"Bearer {auth_token}",
    })
    assert response.status_code == 204

    get_resp = await client.get(f"/api/v1/watchlists/notes/{note_id}", headers={
        "Authorization": f"Bearer {auth_token}",
    })
    assert get_resp.status_code == 404
