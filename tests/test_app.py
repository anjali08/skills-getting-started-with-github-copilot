import copy

import pytest
from fastapi.testclient import TestClient

from src.app import app, activities


@pytest.fixture()
def client():
    return TestClient(app)


@pytest.fixture(autouse=True)
def reset_activities():
    # make a deep copy of the activities dict and restore after each test
    orig = copy.deepcopy(activities)
    yield
    activities.clear()
    activities.update(orig)


def test_get_activities(client):
    res = client.get("/activities")
    assert res.status_code == 200
    data = res.json()
    # basic sanity checks
    assert isinstance(data, dict)
    assert "Chess Club" in data


def test_signup_and_unregister(client):
    activity = "Chess Club"
    email = "testuser@example.com"

    # Ensure not present
    assert email not in activities[activity]["participants"]

    # Sign up
    res = client.post(f"/activities/{activity}/signup", params={"email": email})
    assert res.status_code == 200
    assert email in activities[activity]["participants"]

    # Unregister
    res = client.delete(f"/activities/{activity}/signup", params={"email": email})
    assert res.status_code == 200
    assert email not in activities[activity]["participants"]


def test_duplicate_signup_is_blocked(client):
    activity = "Programming Class"
    email = "dupuser@example.com"

    # Ensure clean start
    if email in activities[activity]["participants"]:
        activities[activity]["participants"].remove(email)

    # First signup should succeed
    res = client.post(f"/activities/{activity}/signup", params={"email": email})
    assert res.status_code == 200
    assert email in activities[activity]["participants"]

    # Second signup should be rejected
    res = client.post(f"/activities/{activity}/signup", params={"email": email})
    assert res.status_code == 400
    # Ensure no duplicate entries were added
    occurrences = activities[activity]["participants"].count(email)
    assert occurrences == 1


def test_unregister_nonexistent_returns_404(client):
    activity = "Chess Club"
    email = "noone@example.com"
    # Ensure the email is not present
    if email in activities[activity]["participants"]:
        activities[activity]["participants"].remove(email)

    res = client.delete(f"/activities/{activity}/signup", params={"email": email})
    assert res.status_code == 404


def test_signup_activity_not_found(client):
    res = client.post("/activities/DoesNotExist/signup", params={"email": "a@b.com"})
    assert res.status_code == 404
