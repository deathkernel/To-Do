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
    html=Path("templates/index.html").read_text(encoding="utf-8")
    assert 'src="/static/app.js?v=7"' in html
    assert html.count("<script") == 1
    assert html.count("<div id=\"app\">") == 1

def auth_user(client):
    email="audit-"+uuid.uuid4().hex[:12]+"@example.com"
    password="correct-horse-battery"
    created=client.post("/api/v1/auth/register",json={"email":email,"password":password,"displayName":"Audit User"})
    assert created.status_code==201, created.get_json()
    return created.get_json(), email, password

def test_security_headers_and_public_error_handling():
    client=app.test_client()
    health=client.get("/health")
    assert health.headers["X-Content-Type-Options"]=="nosniff"
    assert health.headers["X-Frame-Options"]=="DENY"
    assert client.post("/api/v1/auth/password-reset/request",data="not-json",content_type="text/plain").status_code==400
    assert client.post("/api/v1/auth/mfa/verify",data="not-json",content_type="text/plain").status_code==400

def test_api_token_auth_namespace():
    init_db()
    client=app.test_client()
    _,email,password=auth_user(client)
    login=client.post("/api/v1/auth/login",json={"email":email,"password":password})
    token=login.get_json()["token"]
    created=client.post("/api/v1/api-tokens",json={"name":"audit-token","scopes":["tasks:read"]},headers={"Authorization":"Bearer "+token})
    assert created.status_code==201, created.get_json()
    api_token=created.get_json()["token"]
    assert api_token.startswith("api_")
    me=client.get("/api/v1/auth/me",headers={"Authorization":"Bearer "+api_token})
    assert me.status_code==200
    revoked=client.delete("/api/v1/api-tokens/"+created.get_json()["id"],headers={"Authorization":"Bearer "+token})
    assert revoked.status_code==204
    assert client.get("/api/v1/auth/me",headers={"Authorization":"Bearer "+api_token}).status_code==401

def test_automation_validation():
    init_db()
    client=app.test_client()
    _,email,password=auth_user(client)
    token=client.post("/api/v1/auth/login",json={"email":email,"password":password}).get_json()["token"]
    headers={"Authorization":"Bearer "+token}
    bad_rule=client.post("/api/v1/automations",json={"name":"Bad","trigger":"unknown","actions":[]},headers=headers)
    assert bad_rule.status_code==400
    label=client.post("/api/v1/labels",json={"name":"work"},headers=headers)
    assert label.status_code==201
    label_id=label.get_json()["id"]
    good=client.post("/api/v1/automations",json={"name":"Label completed","trigger":"task_completed","actions":[{"type":"add_label","labelId":label_id}]},headers=headers)
    assert good.status_code==201, good.get_json()
    executions=client.get("/api/v1/automations/"+good.get_json()["id"]+"/executions",headers=headers)
    assert executions.status_code==200

def test_service_worker_does_not_cache_api_routes():
    sw=Path("static/sw.js").read_text(encoding="utf-8")
    assert 'url.pathname.startsWith("/api/")' in sw
    assert "/static/app.js" in sw
    assert "/static/styles.css" in sw
