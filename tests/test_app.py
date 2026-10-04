from app import app,parse_quick_add

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
