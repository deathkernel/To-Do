import uuid
from pathlib import Path

from app import app,parse_quick_add
from db import init_db

def test_quick_add():
    p=parse_quick_add("Finish report p1 @work #Inbox tomorrow every week")
    assert p["priority"]=="P1"
    assert p["labels"]==["work"]
    assert p["project"]=="Inbox"
    assert p["due"]=="tomorrow"
    assert p["recurrence"]=="every week"

def test_health():
    r=app.test_client().get("/health")
    assert r.status_code==200
    assert r.get_json()["status"]=="ok"

def test_ready_is_environment_dependent():
    r=app.test_client().get("/ready")
    assert r.status_code in (200,503)

def test_favicon():
    r=app.test_client().get("/favicon.ico")
    assert r.status_code==200
    assert r.mimetype=="image/svg+xml"

def test_auth_round_trip():
    init_db()
    client=app.test_client()
    email="test-"+uuid.uuid4().hex[:12]+"@example.com"
    password="correct-horse-battery"
    created=client.post("/api/v1/auth/register",json={"email":email,"password":password,"displayName":"Audit User"})
    assert created.status_code==201, created.get_json()
    token=created.get_json()["token"]
    assert token.startswith("ses_")
    me=client.get("/api/v1/auth/me",headers={"Authorization":"Bearer "+token})
    assert me.status_code==200
    assert me.get_json()["email"]==email

    login=client.post("/api/v1/auth/login",json={"email":email,"password":password})
    assert login.status_code==200, login.get_json()
    login_token=login.get_json()["token"]
    assert login_token.startswith("ses_")

    backup=client.get("/api/v1/backup/export",headers={"Authorization":"Bearer "+login_token})
    assert backup.status_code==200, backup.get_json()

def test_frontend_navigation_contract():
    js=Path("static/app.js").read_text(encoding="utf-8")
    assert "function setView(" in js
    assert "function selectProject(" in js
    assert 'src="/static/app.js"' in Path("templates/index.html").read_text(encoding="utf-8")
