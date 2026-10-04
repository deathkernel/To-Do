import hashlib, json, os, secrets, uuid
from datetime import datetime, timedelta, timezone
from functools import wraps
from pathlib import Path

from argon2 import PasswordHasher
from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory

from db import execute, fetch_all, fetch_one, init_db

load_dotenv()
ROOT = Path(__file__).resolve().parent
app = Flask(__name__, static_folder="static")
ph = PasswordHasher()
SCOPES = {"tasks:read","tasks:write","projects:read","projects:write","labels:read","labels:write","comments:read","comments:write","reminders:read","reminders:write","sync:read","sync:write"}

def now(): return datetime.now(timezone.utc)
def iso(v): return v.isoformat() if isinstance(v, datetime) else v
def bad(msg, code=400): return jsonify({"error": msg}), code
def body():
    value = request.get_json(silent=True)
    if not isinstance(value, dict): raise ValueError("JSON object required")
    return value
def uid(value):
    try: return str(uuid.UUID(str(value)))
    except Exception: raise ValueError("Invalid UUID")
def dt(value):
    if value in (None, ""): return None
    try:
        x = datetime.fromisoformat(str(value).replace("Z","+00:00"))
        return (x if x.tzinfo else x.replace(tzinfo=timezone.utc)).astimezone(timezone.utc)
    except Exception: raise ValueError("Invalid date/time")
def h(value): return hashlib.sha256(value.encode("utf-8")).hexdigest()

def task_json(r):
    return {"id":r["id"],"userId":r["user_id"],"parentTaskId":r["parent_task_id"],"projectId":r["project_id"],"sectionId":r["section_id"],"title":r["title"],"description":r["description"] or "","priority":"P"+str(r["priority"]),"status":r["status"],"dueAt":iso(r["due_at"]),"deadlineAt":iso(r["deadline_at"]),"durationMinutes":r["duration_minutes"],"recurrence":r["recurrence"],"position":r["position"],"completedAt":iso(r["completed_at"]),"deletedAt":iso(r["deleted_at"]),"createdAt":iso(r["created_at"]),"updatedAt":iso(r["updated_at"])}
def project_json(r): return {"id":r["id"],"userId":r["user_id"],"name":r["name"],"description":r["description"],"color":r["color"],"icon":r["icon"],"favorite":r["favorite"],"archived":r["archived"],"position":r["position"],"createdAt":iso(r["created_at"]),"updatedAt":iso(r["updated_at"])}
def label_json(r): return {"id":r["id"],"userId":r["user_id"],"name":r["name"],"color":r["color"],"description":r["description"],"favorite":r["favorite"],"createdAt":iso(r["created_at"]),"updatedAt":iso(r["updated_at"])}

def current_user():
    token = request.headers.get("Authorization","")
    if not token.startswith("Bearer "): raise PermissionError("Authentication required")
    raw = token[7:].strip()
    if not raw or len(raw) > 512: raise PermissionError("Invalid token")
    if raw.startswith("td_"):
        r = fetch_one("SELECT t.*,u.email,u.display_name FROM api_tokens t JOIN users u ON u.id=t.owner_id WHERE t.token_hash=%s AND t.revoked_at IS NULL",(h(raw),))
        if not r: raise PermissionError("Invalid or revoked API token")
        try: scopes=json.loads(r["scopes"])
        except Exception: scopes=[]
        return {"id":r["owner_id"],"email":r["email"],"displayName":r["display_name"],"authType":"api-token","scopes":scopes}
    r = fetch_one("SELECT s.*,u.email,u.display_name FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=%s AND s.revoked_at IS NULL AND s.expires_at>%s",(h(raw),now()))
    if not r: raise PermissionError("Invalid or expired session")
    return {"id":r["user_id"],"email":r["email"],"displayName":r["display_name"],"authType":"session","scopes":None}

def require(scope):
    def deco(fn):
        @wraps(fn)
        def wrapped(*args,**kwargs):
            try:
                u=current_user()
                if u["authType"]=="api-token" and scope not in (u["scopes"] or []): return bad("API token lacks required scope: "+scope,403)
                return fn(u,*args,**kwargs)
            except PermissionError as e: return bad(str(e),401)
            except ValueError as e: return bad(str(e),400)
        return wrapped
    return deco

@app.get("/")
def index(): return send_from_directory(ROOT/"templates","index.html")
@app.get("/assets/<path:name>")
def asset(name): return send_from_directory(ROOT/"static",name)
@app.get("/health")
def health(): return jsonify({"status":"ok","service":"todo-python","timestamp":now().isoformat()})
@app.get("/ready")
def ready():
    try: fetch_one("SELECT 1"); return jsonify({"status":"ready"})
    except Exception: return bad("not_ready",503)

@app.post("/api/v1/auth/register")
def register():
    try:
        b=body();email=str(b.get("email","")).strip().lower();password=str(b.get("password",""));name=str(b.get("displayName","")).strip()
        if "@" not in email or len(email)>320: raise ValueError("Valid email is required")
        if len(password)<10: raise ValueError("Password must be at least 10 characters")
        if not name or len(name)>120: raise ValueError("Display name is required")
        if fetch_one("SELECT id FROM users WHERE email=%s",(email,)): raise ValueError("Email already registered")
        user_id=str(uuid.uuid4());execute("INSERT INTO users(id,email,display_name,password_hash) VALUES(%s,%s,%s,%s)",(user_id,email,name,ph.hash(password)))
        token=secrets.token_urlsafe(48);execute("INSERT INTO sessions(id,user_id,token_hash,expires_at) VALUES(%s,%s,%s,%s)",(str(uuid.uuid4()),user_id,h(token),now()+timedelta(days=30)))
        return jsonify({"user":{"id":user_id,"email":email,"displayName":name},"token":token}),201
    except ValueError as e:return bad(str(e))
    except Exception:return bad("Registration failed",500)

@app.post("/api/v1/auth/login")
def login():
    try:
        b=body();email=str(b.get("email","")).strip().lower();row=fetch_one("SELECT * FROM users WHERE email=%s",(email,))
        if not row or not row["password_hash"]: return bad("Invalid credentials",401)
        try: ph.verify(row["password_hash"],str(b.get("password","")))
        except Exception:return bad("Invalid credentials",401)
        token=secrets.token_urlsafe(48);execute("INSERT INTO sessions(id,user_id,token_hash,expires_at) VALUES(%s,%s,%s,%s)",(str(uuid.uuid4()),row["id"],h(token),now()+timedelta(days=30)))
        return jsonify({"user":{"id":row["id"],"email":row["email"],"displayName":row["display_name"]},"token":token})
    except Exception:return bad("Login failed",401)
@app.post("/api/v1/auth/logout")
def logout():
    t=request.headers.get("Authorization","")
    if t.startswith("Bearer "): execute("UPDATE sessions SET revoked_at=%s WHERE token_hash=%s",(now(),h(t[7:].strip())))
    return ("",204)
@app.get("/api/v1/auth/me")
@require("tasks:read")
def me(u): return jsonify(u)

@app.get("/api/v1/projects")
@require("projects:read")
def projects(u): return jsonify([project_json(x) for x in fetch_all("SELECT * FROM projects WHERE user_id=%s ORDER BY position,name",(u["id"],))])
@app.post("/api/v1/projects")
@require("projects:write")
def project_create(u):
    try:
        b=body();name=str(b.get("name","")).strip()
        if not 1<=len(name)<=200:raise ValueError("Project name must be 1-200 characters")
        t=now();r=fetch_one("INSERT INTO projects(id,user_id,name,description,color,icon,created_at,updated_at) VALUES(%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *",(str(uuid.uuid4()),u["id"],name,b.get("description"),b.get("color"),b.get("icon"),t,t))
        return jsonify(project_json(r)),201
    except ValueError as e:return bad(str(e))
@app.patch("/api/v1/projects/<id>")
@require("projects:write")
def project_update(u,id):
    try:
        pid=uid(id);b=body();r=fetch_one("SELECT * FROM projects WHERE id=%s AND user_id=%s",(pid,u["id"]))
        if not r:return bad("Project not found",404)
        name=str(b.get("name",r["name"])).strip()
        if not 1<=len(name)<=200:raise ValueError("Invalid project name")
        r=fetch_one("UPDATE projects SET name=%s,description=%s,color=%s,icon=%s,favorite=%s,archived=%s,updated_at=%s WHERE id=%s AND user_id=%s RETURNING *",(name,b.get("description",r["description"]),b.get("color",r["color"]),b.get("icon",r["icon"]),b.get("favorite",r["favorite"]),b.get("archived",r["archived"]),now(),pid,u["id"]))
        return jsonify(project_json(r))
    except ValueError as e:return bad(str(e))
@app.delete("/api/v1/projects/<id>")
@require("projects:write")
def project_delete(u,id):
    try:
        if not fetch_one("DELETE FROM projects WHERE id=%s AND user_id=%s RETURNING id",(uid(id),u["id"])):return bad("Project not found",404)
        return ("",204)
    except ValueError as e:return bad(str(e))

@app.get("/api/v1/projects/<project_id>/sections")
@require("projects:read")
def sections(u,project_id):
    try:
        pid=uid(project_id)
        if not fetch_one("SELECT id FROM projects WHERE id=%s AND user_id=%s",(pid,u["id"])):return bad("Project not found",404)
        rows=fetch_all("SELECT * FROM sections WHERE project_id=%s ORDER BY position,name",(pid,))
        return jsonify([{"id":x["id"],"projectId":x["project_id"],"name":x["name"],"position":x["position"]} for x in rows])
    except ValueError as e:return bad(str(e))
@app.post("/api/v1/projects/<project_id>/sections")
@require("projects:write")
def section_create(u,project_id):
    try:
        pid=uid(project_id);b=body();name=str(b.get("name","")).strip()
        if not 1<=len(name)<=200:raise ValueError("Section name must be 1-200 characters")
        if not fetch_one("SELECT id FROM projects WHERE id=%s AND user_id=%s",(pid,u["id"])):return bad("Project not found",404)
        r=fetch_one("INSERT INTO sections(id,project_id,name,position) VALUES(%s,%s,%s,%s) RETURNING *",(str(uuid.uuid4()),pid,name,int(b.get("position",0))))
        return jsonify({"id":r["id"],"projectId":r["project_id"],"name":r["name"],"position":r["position"]}),201
    except ValueError as e:return bad(str(e))
@app.patch("/api/v1/sections/<id>")
@require("projects:write")
def section_update(u,id):
    try:
        sid=uid(id);b=body();r=fetch_one("SELECT s.* FROM sections s JOIN projects p ON p.id=s.project_id WHERE s.id=%s AND p.user_id=%s",(sid,u["id"]))
        if not r:return bad("Section not found",404)
        name=str(b.get("name",r["name"])).strip();position=int(b.get("position",r["position"]))
        if not 1<=len(name)<=200 or position<0:raise ValueError("Invalid section")
        r=fetch_one("UPDATE sections SET name=%s,position=%s,updated_at=%s WHERE id=%s RETURNING *",(name,position,now(),sid))
        return jsonify({"id":r["id"],"projectId":r["project_id"],"name":r["name"],"position":r["position"]})
    except ValueError as e:return bad(str(e))
@app.delete("/api/v1/sections/<id>")
@require("projects:write")
def section_delete(u,id):
    try:
        sid=uid(id)
        if not fetch_one("SELECT s.id FROM sections s JOIN projects p ON p.id=s.project_id WHERE s.id=%s AND p.user_id=%s",(sid,u["id"])):return bad("Section not found",404)
        execute("DELETE FROM sections WHERE id=%s",(sid,));return ("",204)
    except ValueError as e:return bad(str(e))

@app.get("/api/v1/labels")
@require("labels:read")
def labels(u):return jsonify([label_json(x) for x in fetch_all("SELECT * FROM labels WHERE user_id=%s ORDER BY name",(u["id"],))])
@app.post("/api/v1/labels")
@require("labels:write")
def label_create(u):
    try:
        b=body();name=str(b.get("name","")).strip()
        if not 1<=len(name)<=100:raise ValueError("Label name must be 1-100 characters")
        t=now();r=fetch_one("INSERT INTO labels(id,user_id,name,color,description,created_at,updated_at) VALUES(%s,%s,%s,%s,%s,%s,%s) RETURNING *",(str(uuid.uuid4()),u["id"],name,b.get("color"),b.get("description"),t,t))
        return jsonify(label_json(r)),201
    except ValueError as e:return bad(str(e))

def task_data(b):
    title=str(b.get("title","")).strip()
    if not 1<=len(title)<=500:raise ValueError("Task title must be 1-500 characters")
    p=str(b.get("priority","P4"))
    if p not in ("P1","P2","P3","P4"):raise ValueError("Invalid priority")
    d={"title":title,"description":b.get("description",""),"priority":int(p[1]),"projectId":uid(b["projectId"]) if b.get("projectId") else None,"sectionId":uid(b["sectionId"]) if b.get("sectionId") else None,"parentTaskId":uid(b["parentTaskId"]) if b.get("parentTaskId") else None,"dueAt":dt(b.get("dueAt")),"deadlineAt":dt(b.get("deadlineAt")),"durationMinutes":b.get("durationMinutes"),"recurrence":b.get("recurrence"),"position":b.get("position") or "a0"}
    if d["durationMinutes"] is not None and (not isinstance(d["durationMinutes"],int) or d["durationMinutes"]<0 or d["durationMinutes"]>1440):raise ValueError("Invalid task duration")
    return d
def assert_task_owner(u,d):
    if d["projectId"] and not fetch_one("SELECT id FROM projects WHERE id=%s AND user_id=%s",(d["projectId"],u)):raise ValueError("Project not found")
    if d["sectionId"] and not fetch_one("SELECT s.id FROM sections s JOIN projects p ON p.id=s.project_id WHERE s.id=%s AND p.user_id=%s",(d["sectionId"],u)):raise ValueError("Section not found")
    if d["parentTaskId"] and not fetch_one("SELECT id FROM tasks WHERE id=%s AND user_id=%s",(d["parentTaskId"],u)):raise ValueError("Parent task not found")

@app.get("/api/v1/tasks")
@require("tasks:read")
def tasks(u):return jsonify([task_json(x) for x in fetch_all("SELECT * FROM tasks WHERE user_id=%s AND status<>'deleted' ORDER BY position,created_at",(u["id"],))])
@app.post("/api/v1/tasks")
@require("tasks:write")
def task_create(u):
    try:
        d=task_data(body());assert_task_owner(u["id"],d);t=now();r=fetch_one("""INSERT INTO tasks(id,user_id,parent_task_id,project_id,section_id,title,description,priority,status,due_at,deadline_at,duration_minutes,recurrence,position,created_at,updated_at)
          VALUES(%s,%s,%s,%s,%s,%s,%s,%s,'active',%s,%s,%s,%s,%s,%s,%s) RETURNING *""",(str(uuid.uuid4()),u["id"],d["parentTaskId"],d["projectId"],d["sectionId"],d["title"],d["description"],d["priority"],d["dueAt"],d["deadlineAt"],d["durationMinutes"],d["recurrence"],d["position"],t,t))
        return jsonify(task_json(r)),201
    except ValueError as e:return bad(str(e))
@app.patch("/api/v1/tasks/<id>")
@require("tasks:write")
def task_update(u,id):
    try:
        tid=uid(id);r=fetch_one("SELECT * FROM tasks WHERE id=%s AND user_id=%s",(tid,u["id"]))
        if not r:return bad("Task not found",404)
        current={"title":r["title"],"description":r["description"],"priority":"P"+str(r["priority"]),"projectId":r["project_id"],"sectionId":r["section_id"],"parentTaskId":r["parent_task_id"],"dueAt":iso(r["due_at"]),"deadlineAt":iso(r["deadline_at"]),"durationMinutes":r["duration_minutes"],"recurrence":r["recurrence"],"position":r["position"]}
        d=task_data({**current,**body()});assert_task_owner(u["id"],d);x=fetch_one("""UPDATE tasks SET title=%s,description=%s,priority=%s,project_id=%s,section_id=%s,parent_task_id=%s,due_at=%s,deadline_at=%s,duration_minutes=%s,recurrence=%s,position=%s,updated_at=%s WHERE id=%s AND user_id=%s RETURNING *""",(d["title"],d["description"],d["priority"],d["projectId"],d["sectionId"],d["parentTaskId"],d["dueAt"],d["deadlineAt"],d["durationMinutes"],d["recurrence"],d["position"],now(),tid,u["id"]))
        return jsonify(task_json(x))
    except ValueError as e:return bad(str(e))
def change(u,id,status):
    try:
        tid=uid(id);r=fetch_one("SELECT id FROM tasks WHERE id=%s AND user_id=%s",(tid,u["id"]))
        if not r:return bad("Task not found",404)
        t=now()
        if status=="completed":r=fetch_one("UPDATE tasks SET status='completed',completed_at=%s,deleted_at=NULL,updated_at=%s WHERE id=%s AND user_id=%s RETURNING *",(t,t,tid,u["id"]))
        elif status=="active":r=fetch_one("UPDATE tasks SET status='active',completed_at=NULL,deleted_at=NULL,updated_at=%s WHERE id=%s AND user_id=%s RETURNING *",(t,tid,u["id"]))
        else:r=fetch_one("UPDATE tasks SET status='deleted',deleted_at=%s,updated_at=%s WHERE id=%s AND user_id=%s RETURNING *",(t,t,tid,u["id"]))
        return jsonify(task_json(r))
    except ValueError as e:return bad(str(e))
@app.post("/api/v1/tasks/<id>/complete")
@require("tasks:write")
def complete(u,id):return change(u,id,"completed")
@app.post("/api/v1/tasks/<id>/reopen")
@require("tasks:write")
def reopen(u,id):return change(u,id,"active")
@app.post("/api/v1/tasks/<id>/restore")
@require("tasks:write")
def restore(u,id):return change(u,id,"active")
@app.delete("/api/v1/tasks/<id>")
@require("tasks:write")
def task_delete(u,id):return change(u,id,"deleted")

@app.get("/api/v1/search/tasks")
@require("tasks:read")
def search(u):
    q=request.args.get("text","").strip().lower()
    rows=fetch_all("SELECT * FROM tasks WHERE user_id=%s AND status<>'deleted' AND LOWER(title) LIKE %s ORDER BY position,created_at",(u["id"],"%"+q+"%"))
    return jsonify([task_json(x) for x in rows])

@app.get("/api/v1/reminders")
@require("reminders:read")
def reminders(u):
    rows=fetch_all("SELECT * FROM reminders WHERE user_id=%s ORDER BY created_at DESC",(u["id"],))
    return jsonify([{"id":x["id"],"taskId":x["task_id"],"trigger":x["trigger"],"triggerAt":iso(x["trigger_at"]),"minutesBefore":x["minutes_before"],"enabled":x["enabled"]} for x in rows])
@app.post("/api/v1/reminders")
@require("reminders:write")
def reminder_create(u):
    try:
        b=body();tid=uid(b.get("taskId"))
        if not fetch_one("SELECT id FROM tasks WHERE id=%s AND user_id=%s",(tid,u["id"])):return bad("Task not found",404)
        r=fetch_one("INSERT INTO reminders(id,user_id,task_id,trigger,trigger_at,minutes_before,location_id,recurring_rule,enabled) VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *",(str(uuid.uuid4()),u["id"],tid,str(b.get("trigger",""))[:32],dt(b.get("triggerAt")),b.get("minutesBefore"),b.get("locationId"),b.get("recurringRule"),bool(b.get("enabled",True))))
        return jsonify({"id":r["id"],"taskId":r["task_id"],"trigger":r["trigger"],"triggerAt":iso(r["trigger_at"]),"minutesBefore":r["minutes_before"],"enabled":r["enabled"]}),201
    except ValueError as e:return bad(str(e))

@app.get("/api/v1/comments/<task_id>")
@require("comments:read")
def comments(u,task_id):
    try:
        tid=uid(task_id)
        if not fetch_one("SELECT id FROM tasks WHERE id=%s AND user_id=%s",(tid,u["id"])):return bad("Task not found",404)
        return jsonify([{"id":x["id"],"taskId":x["task_id"],"userId":x["user_id"],"body":x["body"],"createdAt":iso(x["created_at"])} for x in fetch_all("SELECT * FROM comments WHERE task_id=%s ORDER BY created_at",(tid,))])
    except ValueError as e:return bad(str(e))
@app.post("/api/v1/comments/<task_id>")
@require("comments:write")
def comment_create(u,task_id):
    try:
        tid=uid(task_id);txt=str(body().get("body","")).strip()
        if not txt:raise ValueError("Comment body is required")
        if not fetch_one("SELECT id FROM tasks WHERE id=%s AND user_id=%s",(tid,u["id"])):return bad("Task not found",404)
        r=fetch_one("INSERT INTO comments(id,task_id,user_id,body) VALUES(%s,%s,%s,%s) RETURNING *",(str(uuid.uuid4()),tid,u["id"],txt))
        return jsonify({"id":r["id"],"taskId":r["task_id"],"userId":r["user_id"],"body":r["body"],"createdAt":iso(r["created_at"])}),201
    except ValueError as e:return bad(str(e))

@app.get("/api/v1/api-tokens")
@require("tasks:read")
def api_tokens(u):
    return jsonify([{"id":x["id"],"name":x["name"],"scopes":json.loads(x["scopes"]),"createdAt":iso(x["created_at"]),"revokedAt":iso(x["revoked_at"])} for x in fetch_all("SELECT * FROM api_tokens WHERE owner_id=%s ORDER BY created_at DESC",(u["id"],))])
@app.post("/api/v1/api-tokens")
@require("tasks:write")
def api_token_create(u):
    try:
        b=body();requested=b.get("scopes",["tasks:read","tasks:write"])
        if not isinstance(requested,list):raise ValueError("Invalid API token scopes")
        scopes=sorted({str(x) for x in requested})
        if not scopes or len(scopes)>20 or any(x not in SCOPES for x in scopes):raise ValueError("Invalid API token scopes")
        raw="td_"+secrets.token_hex(32);r=fetch_one("INSERT INTO api_tokens(id,owner_id,name,token_hash,scopes) VALUES(%s,%s,%s,%s,%s) RETURNING *",(str(uuid.uuid4()),u["id"],str(b.get("name","API token"))[:100],h(raw),json.dumps(scopes)))
        return jsonify({"id":r["id"],"name":r["name"],"scopes":scopes,"token":raw}),201
    except ValueError as e:return bad(str(e))
@app.delete("/api/v1/api-tokens/<id>")
@require("tasks:write")
def api_token_delete(u,id):
    try:
        if not fetch_one("UPDATE api_tokens SET revoked_at=%s WHERE id=%s AND owner_id=%s AND revoked_at IS NULL RETURNING id",(now(),uid(id),u["id"])):return bad("API token not found",404)
        return ("",204)
    except ValueError as e:return bad(str(e))

if __name__=="__main__":
    init_db()
    app.run(host=os.getenv("HOST","127.0.0.1"),port=int(os.getenv("PORT","3000")),debug=os.getenv("FLASK_DEBUG","0")=="1")
