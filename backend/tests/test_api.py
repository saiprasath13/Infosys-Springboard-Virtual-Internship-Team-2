import pytest


@pytest.mark.asyncio
async def test_health(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_register(client):
    resp = await client.post("/api/v1/auth/register", json={
        "name": "Alice",
        "email": "alice@example.com",
        "password": "password123",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert "access_token" in data
    assert data["user"]["email"] == "alice@example.com"
    assert data["user"]["name"] == "Alice"


@pytest.mark.asyncio
async def test_register_duplicate_email(client):
    payload = {"name": "Bob", "email": "bob@example.com", "password": "password123"}
    await client.post("/api/v1/auth/register", json=payload)
    resp = await client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_login(client):
    await client.post("/api/v1/auth/register", json={
        "name": "Charlie", "email": "charlie@example.com", "password": "secret123",
    })
    resp = await client.post("/api/v1/auth/login", json={
        "email": "charlie@example.com", "password": "secret123",
    })
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    await client.post("/api/v1/auth/register", json={
        "name": "Dave", "email": "dave@example.com", "password": "secret123",
    })
    resp = await client.post("/api/v1/auth/login", json={
        "email": "dave@example.com", "password": "wrongpassword",
    })
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_get_me(auth_client):
    resp = await auth_client.get("/api/v1/users/me")
    assert resp.status_code == 200
    assert resp.json()["email"] == "test@example.com"


@pytest.mark.asyncio
async def test_create_negotiation(auth_client):
    resp = await auth_client.post("/api/v1/negotiations", json={
        "title": "Test Vendor Negotiation",
        "scenario_type": "vendor_pricing",
        "mode": "simulation",
        "config": {"starting_price": 100000, "buyer_target_price": 80000},
        "max_rounds": 5,
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Test Vendor Negotiation"
    assert data["status"] == "pending"


@pytest.mark.asyncio
async def test_get_negotiation_detail(auth_client):
    created = await auth_client.post("/api/v1/negotiations", json={
        "title": "Negotiation Detail",
        "scenario_type": "vendor_pricing",
        "mode": "simulation",
        "config": {"starting_price": 100000},
        "max_rounds": 5,
    })
    negotiation_id = created.json()["id"]

    resp = await auth_client.get(f"/api/v1/negotiations/{negotiation_id}")

    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == negotiation_id
    assert data["config"] == {"starting_price": 100000}
    assert data["messages"] == []
    assert data["offers"] == []


@pytest.mark.asyncio
async def test_list_negotiations(auth_client):
    await auth_client.post("/api/v1/negotiations", json={
        "title": "Neg 1", "scenario_type": "vendor_pricing",
        "mode": "simulation", "config": {}, "max_rounds": 5,
    })
    await auth_client.post("/api/v1/negotiations", json={
        "title": "Neg 2", "scenario_type": "job_offer",
        "mode": "practice", "config": {}, "max_rounds": 8,
    })
    resp = await auth_client.get("/api/v1/negotiations")
    assert resp.status_code == 200
    assert len(resp.json()) == 2


@pytest.mark.asyncio
async def test_negotiation_ownership(auth_client, client):
    """Other user cannot access negotiation."""
    resp = await auth_client.post("/api/v1/negotiations", json={
        "title": "Secret", "scenario_type": "vendor_pricing",
        "mode": "simulation", "config": {}, "max_rounds": 5,
    })
    neg_id = resp.json()["id"]

    # Register a second user
    resp2 = await client.post("/api/v1/auth/register", json={
        "name": "Eve", "email": "eve@example.com", "password": "evepass123",
    })
    other_token = resp2.json()["access_token"]
    client.headers["Authorization"] = f"Bearer {other_token}"

    resp3 = await client.get(f"/api/v1/negotiations/{neg_id}")
    assert resp3.status_code == 403


@pytest.mark.asyncio
async def test_practice_offer_statuses_show_human_turn_and_ai_counter(auth_client):
    created = await auth_client.post("/api/v1/negotiations", json={
        "title": "Practice Vendor Negotiation",
        "scenario_type": "vendor_pricing",
        "mode": "practice",
        "config": {
            "starting_price": 100000,
            "buyer_target_price": 80000,
            "buyer_max_price": 95000,
            "vendor_min_price": 85000,
            "quantity": 100,
            "agent_b_personality": "collaborative",
        },
        "max_rounds": 5,
    })
    negotiation_id = created.json()["id"]
    started = await auth_client.post(f"/api/v1/negotiations/{negotiation_id}/start")
    assert started.status_code == 200

    submitted = await auth_client.post(
        f"/api/v1/negotiations/{negotiation_id}/offer",
        json={"offer_data": {"price": 80000}, "message": "My counter-offer"},
    )
    assert submitted.status_code == 200
    assert submitted.json()["decision"] == "counter"

    detail = await auth_client.get(f"/api/v1/negotiations/{negotiation_id}")
    assert detail.status_code == 200
    offers = detail.json()["offers"]
    assert offers[0]["made_by"] == "human"
    assert offers[0]["status"] == "countered"
    assert offers[1]["made_by"] == "agent_b"
    assert offers[1]["status"] == "pending"


@pytest.mark.asyncio
async def test_negotiation_report_returns_outcome_and_offer_timeline(auth_client):
    created = await auth_client.post("/api/v1/negotiations", json={
        "title": "Vendor Report",
        "scenario_type": "vendor_pricing",
        "mode": "practice",
        "config": {"starting_price": 100000},
        "max_rounds": 5,
    })
    negotiation_id = created.json()["id"]

    report = await auth_client.get(f"/api/v1/reports/{negotiation_id}")

    assert report.status_code == 200
    data = report.json()
    assert data["negotiation_id"] == negotiation_id
    assert data["scenario_type"] == "vendor_pricing"
    assert data["concession_timeline"] == []
    assert data["suggestions"]


@pytest.mark.asyncio
async def test_update_negotiation_title(auth_client):
    resp = await auth_client.post("/api/v1/negotiations", json={
        "title": "Old Title", "scenario_type": "vendor_pricing",
        "mode": "simulation", "config": {}, "max_rounds": 5,
    })
    neg_id = resp.json()["id"]

    resp2 = await auth_client.patch(f"/api/v1/negotiations/{neg_id}", json={"title": "New Title"})
    assert resp2.status_code == 200
    assert resp2.json()["title"] == "New Title"


@pytest.mark.asyncio
async def test_delete_negotiation(auth_client):
    resp = await auth_client.post("/api/v1/negotiations", json={
        "title": "To Delete", "scenario_type": "vendor_pricing",
        "mode": "simulation", "config": {}, "max_rounds": 5,
    })
    neg_id = resp.json()["id"]

    resp2 = await auth_client.delete(f"/api/v1/negotiations/{neg_id}")
    assert resp2.status_code == 204

    resp3 = await auth_client.get(f"/api/v1/negotiations/{neg_id}")
    assert resp3.status_code == 404


@pytest.mark.asyncio
async def test_scenario_defaults(auth_client):
    for endpoint in [
        "/api/v1/scenarios/defaults/vendor-pricing",
        "/api/v1/scenarios/defaults/job-offer",
        "/api/v1/scenarios/defaults/project-budget",
    ]:
        resp = await auth_client.get(endpoint)
        assert resp.status_code == 200

    job_offer = (await auth_client.get("/api/v1/scenarios/defaults/job-offer")).json()
    project_budget = (await auth_client.get("/api/v1/scenarios/defaults/project-budget")).json()
    assert job_offer["starting_salary"] == 900000
    assert project_budget["total_budget"] == 5000000
    assert project_budget["alpha_requested"] == 3000000


@pytest.mark.asyncio
async def test_personalities(auth_client):
    resp = await auth_client.get("/api/v1/scenarios/personalities")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 3
    ids = [p["id"] for p in data]
    assert "aggressive" in ids
    assert "collaborative" in ids
    assert "risk_averse" in ids
