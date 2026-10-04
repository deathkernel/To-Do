
import hashlib, json, os, re, secrets, uuid
from datetime import datetime, timedelta, timezone
from functools import wraps
from pathlib import Path
from urllib import request as urlrequest
import pyotp
from argon2 import PasswordHasher
from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_file, send_from_directory
from werkzeug.utils import secure_filename
from db import execute, fetch_all, fetch_one, get_conn, init_db

load_dotenv()
ROOT=Path(__file__).resolve().parent
UPLOAD_ROOT=Path(os.getenv("UPLOAD_ROOT",str(ROOT/"data"/"uploads")));UPLOAD_ROOT.mkdir(parents=True,exist_ok=True)
app=Flask(__name__,static_folder="static");app.config["MAX_CONTENT_LENGTH"]=int(os.getenv("MAX_UPLOAD_BYTES",str(25*1024*1024)))
@app.get("/favicon.ico")
def favicon(): return send_from_directory(ROOT/"static","favicon.svg",mimetype="image/svg+xml")
ph=PasswordHasher()
SCOPES={"tasks:read","tasks:write","projects:read","projects:write","labels:read","labels:write","comments:read","comments:write","reminders:read","reminders:write","sync:read","sync:write","workspaces:read","workspaces:write","attachments:read","attachments:write","goals:read","goals:write","templates:read","templates:write","automations:read","automations:write","analytics:read","devices:write"}
ROLE={"viewer":10,"commenter":20,"editor":30,"manager":40,"owner":50};WROLE={"guest":10,"member":20,"admin":40,"owner":50}

def now(): return datetime.now(timezone.utc)
def iso(v): return v.isoformat() if isinstance(v,datetime) else v
def bad(msg,code=400): return jsonify({"error":msg}),code
def body():
    x=request.get_json(silent=True)
    if not isinstance(x,dict): raise ValueError("JSON object required")
    return x
def uid(v):
    try:return str(uuid.UUID(str(v)))
    except Exception as e:raise ValueError("Invalid UUID") from e
def dt(v):
    if v in (None,""):return None
    try:
        x=datetime.fromisoformat(str(v).replace("Z","+00:00"))
        return (x if x.tzinfo else x.replace(tzinfo=timezone.utc)).astimezone(timezone.utc)
    except Exception as e:raise ValueError("Invalid date/time") from e
def sh(v):return hashlib.sha256(v.encode()).hexdigest()
def j(v):return json.dumps(v,separators=(",",":"))
def pj(v,default=None):
    try:return json.loads(v) if v else ({} if default is None else default)
    except:return {} if default is None else default
def tok(prefix):return prefix+"_"+secrets.token_urlsafe(48)

def activity(user_id,action,kind,rid=None,details=None):
    try:execute("INSERT INTO activity_log(id,user_id,action,resource_type,resource_id,details) VALUES(%s,%s,%s,%s,%s,%s)",(str(uuid.uuid4()),user_id,action,kind,rid,j(details or {})))
    except Exception:pass
def rate_limit(key,limit=20,seconds=60):
    try:
        import redis
        c=redis.Redis.from_url(os.getenv("REDIS_URL","redis://localhost:6379"),decode_responses=True)
        n=c.incr(key)
        if n==1:c.expire(key,seconds)
        return n<=limit
    except Exception:return True
def limited(prefix,limit=20,seconds=60):
    def deco(fn):
        @wraps(fn)
        def wrap(*a,**kw):
            if not rate_limit("rl:%s:%s"%(prefix,request.remote_addr or "unknown"),limit,seconds):return bad("Too many requests; try again later",429)
            return fn(*a,**kw)
        return wrap
    return deco

def user_json(r):
    return {"id":r["id"],"email":r["email"],"displayName":r["display_name"],"emailVerified":bool(r.get("email_verified",False)),"mfaEnabled":bool(r.get("mfa_enabled",False))}
def task_json(r):
    return {"id":r["id"],"userId":r["user_id"],"workspaceId":r.get("workspace_id"),"parentTaskId":r["parent_task_id"],"projectId":r["project_id"],"sectionId":r["section_id"],"assigneeId":r.get("assignee_id"),"title":r["title"],"description":r["description"] or "","priority":"P"+str(r["priority"]),"status":r["status"],"startAt":iso(r.get("start_at")),"dueAt":iso(r["due_at"]),"deadlineAt":iso(r["deadline_at"]),"durationMinutes":r["duration_minutes"],"timezone":r.get("timezone") or "UTC","recurrence":r["recurrence"],"position":r["position"],"completedAt":iso(r["completed_at"]),"deletedAt":iso(r["deleted_at"]),"createdAt":iso(r["created_at"]),"updatedAt":iso(r["updated_at"])}
def project_json(r):
    return {"id":r["id"],"userId":r["user_id"],"workspaceId":r.get("workspace_id"),"parentId":r.get("parent_id"),"name":r["name"],"description":r["description"],"color":r["color"],"icon":r["icon"],"favorite":r["favorite"],"archived":r["archived"],"position":r["position"],"createdAt":iso(r["created_at"]),"updatedAt":iso(r["updated_at"])}
def label_json(r):
    return {"id":r["id"],"userId":r["user_id"],"name":r["name"],"color":r["color"],"description":r["description"],"favorite":r["favorite"],"createdAt":iso(r["created_at"]),"updatedAt":iso(r["updated_at"])}

def session_for(user_id):
    raw=tok("ses");execute("INSERT INTO sessions(id,user_id,token_hash,expires_at) VALUES(%s,%s,%s,%s)",(str(uuid.uuid4()),user_id,sh(raw),now()+timedelta(days=int(os.getenv("SESSION_DAYS","30")))));return raw
def current_user():
    h=request.headers.get("Authorization","")
    if not h.startswith("Bearer "):raise PermissionError("Authentication required")
    raw=h[7:].strip()
    if not raw or len(raw)>512:raise PermissionError("Invalid token")
    hashed=sh(raw)
    token=fetch_one("SELECT t.*,u.email,u.display_name,u.email_verified,u.mfa_enabled FROM api_tokens t JOIN users u ON u.id=t.owner_id WHERE t.token_hash=%s AND t.revoked_at IS NULL",(hashed,))
    if token:return {"id":token["owner_id"],"email":token["email"],"displayName":token["display_name"],"emailVerified":bool(token["email_verified"]),"mfaEnabled":bool(token["mfa_enabled"]),"authType":"api-token","scopes":pj(token["scopes"],[])}
    session=fetch_one("SELECT s.*,u.email,u.display_name,u.email_verified,u.mfa_enabled FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=%s AND s.revoked_at IS NULL AND s.expires_at>%s",(hashed,now()))
    if not session:raise PermissionError("Invalid or expired session")
    return {"id":session["user_id"],"email":session["email"],"displayName":session["display_name"],"emailVerified":bool(session["email_verified"]),"mfaEnabled":bool(session["mfa_enabled"]),"authType":"session","scopes":None}
def require(scope):
    def deco(fn):
        @wraps(fn)
        def wrap(*a,**kw):
            try:
                u=current_user()
                if u["authType"]=="api-token" and scope not in (u["scopes"] or []):return bad("API token lacks required scope: "+scope,403)
                return fn(u,*a,**kw)
            except PermissionError as e:return bad(str(e),401)
            except ValueError as e:return bad(str(e))
        return wrap
    return deco

def project_access(user_id,pid,minimum="viewer"):
    p=fetch_one("SELECT * FROM projects WHERE id=%s",(pid,))
    if not p:return None
    if str(p["user_id"])==str(user_id):return p
    m=fetch_one("SELECT role FROM project_members WHERE project_id=%s AND user_id=%s",(pid,user_id))
    if m and ROLE.get(m["role"],0)>=ROLE.get(minimum,10):return p
    if p.get("workspace_id"):
        m=fetch_one("SELECT role FROM workspace_members WHERE workspace_id=%s AND user_id=%s",(p["workspace_id"],user_id))
        if m and WROLE.get(m["role"],0)>= (10 if minimum=="viewer" else 20):return p
    return None
def project_can_mutate(user_id,pid,minimum="editor"):
    p=fetch_one("SELECT user_id,workspace_id FROM projects WHERE id=%s",(pid,))
    if not p:return False
    if str(p["user_id"])==str(user_id):return True
    m=fetch_one("SELECT role FROM project_members WHERE project_id=%s AND user_id=%s",(pid,user_id))
    if m and ROLE.get(m["role"],0)>=ROLE.get(minimum,30):return True
    if p.get("workspace_id"):
        m=fetch_one("SELECT role FROM workspace_members WHERE workspace_id=%s AND user_id=%s",(p["workspace_id"],user_id))
        return bool(m and WROLE.get(m["role"],0)>= (40 if minimum=="manager" else 20))
    return False
def task_access(user_id,tid,minimum="viewer"):
    t=fetch_one("SELECT * FROM tasks WHERE id=%s",(tid,))
    if not t:return None
    if str(t["user_id"])==str(user_id):return t
    if t["project_id"] and project_access(user_id,t["project_id"],minimum):return t
    if t.get("workspace_id"):
        m=fetch_one("SELECT role FROM workspace_members WHERE workspace_id=%s AND user_id=%s",(t["workspace_id"],user_id))
        if m and WROLE.get(m["role"],0)>= (10 if minimum=="viewer" else 20):return t
    return None

def parse_quick_add(text):
    v=text.strip();p="P4";labels=[]
    m=re.search(r"(?:^|\s)(p[1-4])(?:\s|$)",v,re.I)
    if m:p=m.group(1).upper();v=re.sub(r"(?:^|\s)p[1-4](?:\s|$)"," ",v,flags=re.I)
    labels=re.findall(r"@([A-Za-z0-9_-]{1,50})",v);v=re.sub(r"@([A-Za-z0-9_-]{1,50})"," ",v)
    project=None;pm=re.search(r"#([^#\s]+)",v)
    if pm:project=pm.group(1);v=v.replace("#"+project," ")
    due=None;dm=re.search(r"\b(today|tomorrow|next\s+week)\b",v,re.I)
    if dm:due=dm.group(1).lower();v=v[:dm.start()]+" "+v[dm.end():]
    rm=re.search(r"\bevery\s+(day|week|month)\b",v,re.I);rec=rm.group(0) if rm else None
    return {"title":re.sub(r"\s+"," ",v).strip(),"priority":p,"labels":labels,"project":project,"due":due,"recurrence":rec}
def resolve_due(v):
    if not v:return None
    base=now().replace(hour=18,minute=0,second=0,microsecond=0)
    return base + timedelta(days={"today":0,"tomorrow":1,"next week":7}.get(v,0)) if v in ("today","tomorrow","next week") else dt(v)

def validate_task(uid_user,p,existing=None):
    b={}
    current_id=str(existing["id"]) if existing and existing.get("id") else None
    if existing:b={"title":existing["title"],"description":existing["description"] or "","priority":"P"+str(existing["priority"]),"projectId":existing["project_id"],"sectionId":existing["section_id"],"parentTaskId":existing["parent_task_id"],"assigneeId":existing.get("assignee_id"),"workspaceId":existing.get("workspace_id"),"startAt":iso(existing.get("start_at")),"dueAt":iso(existing["due_at"]),"deadlineAt":iso(existing["deadline_at"]),"durationMinutes":existing["duration_minutes"],"timezone":existing.get("timezone"),"recurrence":existing["recurrence"],"position":existing["position"]}
    d={**b,**p};title=str(d.get("title","")).strip();priority=str(d.get("priority","P4")).upper()
    if not 1<=len(title)<=500:raise ValueError("Task title must be 1-500 characters")
    if priority not in ("P1","P2","P3","P4"):raise ValueError("Invalid priority")
    pid=uid(d["projectId"]) if d.get("projectId") else None;sid=uid(d["sectionId"]) if d.get("sectionId") else None;parent=uid(d["parentTaskId"]) if d.get("parentTaskId") else None;assignee=uid(d["assigneeId"]) if d.get("assigneeId") else None;wid=uid(d["workspaceId"]) if d.get("workspaceId") else None
    if pid:
        project=project_access(uid_user,pid,"editor")
        if not project:raise ValueError("Project not accessible")
        wid=project.get("workspace_id")
    if wid and not fetch_one("SELECT 1 FROM workspace_members WHERE workspace_id=%s AND user_id=%s",(wid,uid_user)):raise ValueError("Workspace not accessible")
    if sid:
        sec=fetch_one("SELECT project_id FROM sections WHERE id=%s",(sid,))
        if not sec:raise ValueError("Section not found")
        if pid and str(sec["project_id"])!=str(pid):raise ValueError("Section does not belong to project")
        pid=str(sec["project_id"])
        if not project_access(uid_user,pid,"editor"):raise ValueError("Section project not accessible")
        project=fetch_one("SELECT workspace_id FROM projects WHERE id=%s",(pid,))
        if project and project.get("workspace_id"):wid=str(project["workspace_id"])
    if parent:
        if current_id and str(parent)==current_id:raise ValueError("Task cannot be its own parent")
        cur=str(parent);seen=set()
        for _ in range(101):
            if cur in seen:raise ValueError("Task parent cycle detected")
            seen.add(cur)
            node=fetch_one("SELECT parent_task_id FROM tasks WHERE id=%s",(cur,))
            if not node or not node.get("parent_task_id"):break
            cur=str(node["parent_task_id"])
            if current_id and cur==current_id:raise ValueError("Task parent cycle detected")
        if not task_access(uid_user,parent):raise ValueError("Parent task not accessible")
    if assignee:
        if pid and not project_access(assignee,pid):raise ValueError("Assignee is not eligible")
        elif wid and not fetch_one("SELECT 1 FROM workspace_members WHERE workspace_id=%s AND user_id=%s",(wid,assignee)):raise ValueError("Assignee is not a workspace member")
        elif not pid and not wid and str(assignee)!=str(uid_user):raise ValueError("Assignee requires a shared project or workspace")
    dur=d.get("durationMinutes")
    if dur is not None and (isinstance(dur,bool) or not isinstance(dur,int) or dur<0 or dur>1440):raise ValueError("Invalid duration")
    return {"title":title,"description":str(d.get("description","")),"priority":int(priority[1]),"projectId":pid,"sectionId":sid,"parentTaskId":parent,"assigneeId":assignee,"workspaceId":wid,"startAt":dt(d.get("startAt")),"dueAt":dt(d.get("dueAt")),"deadlineAt":dt(d.get("deadlineAt")),"durationMinutes":dur,"timezone":str(d.get("timezone") or "UTC"),"recurrence":d.get("recurrence"),"position":str(d.get("position") or "a0")}
def record_sync(user_id,op_id,kind,rid,mutation):
    with get_conn() as c:
        with c.cursor() as cur:
            cur.execute("SELECT pg_advisory_xact_lock(hashtext(%s))",(str(user_id),))
            cur.execute("SELECT revision FROM sync_operations WHERE operation_id=%s AND user_id=%s",(op_id,user_id))
            if cur.fetchone():return
            cur.execute("INSERT INTO sync_state(user_id,revision) VALUES(%s,1) ON CONFLICT(user_id) DO UPDATE SET revision=sync_state.revision+1,updated_at=%s RETURNING revision",(user_id,now()))
            rev=cur.fetchone()['revision']
            cur.execute("INSERT INTO sync_operations(operation_id,user_id,revision,resource_type,resource_id,mutation_json) VALUES(%s,%s,%s,%s,%s,%s)",(op_id,user_id,rev,kind,rid,j(mutation)))
def set_labels(uid_user,task_id,ids):
    if ids is None: ids=[]
    if not isinstance(ids,list): raise ValueError("labelIds must be a list")
    execute("DELETE FROM task_labels WHERE task_id=%s",(task_id,))
    for lid in ids:
        try:lid=uid(lid)
        except ValueError:continue
        if fetch_one("SELECT id FROM labels WHERE id=%s AND user_id=%s",(lid,uid_user)):execute("INSERT INTO task_labels(task_id,label_id) VALUES(%s,%s) ON CONFLICT DO NOTHING",(task_id,lid))
def insert_task(user,task,labels=None,tid=None):
    tid=str(tid or uuid.uuid4());t=now()
    with get_conn() as c:
        with c.cursor() as cur:
            cur.execute("""INSERT INTO tasks(id,user_id,workspace_id,parent_task_id,project_id,section_id,assignee_id,title,description,priority,status,start_at,due_at,deadline_at,duration_minutes,timezone,recurrence,position,created_at,updated_at)
                           VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'active',%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *""",
                        (tid,user["id"],task["workspaceId"],task["parentTaskId"],task["projectId"],task["sectionId"],task["assigneeId"],task["title"],task["description"],task["priority"],task["startAt"],task["dueAt"],task["deadlineAt"],task["durationMinutes"],task["timezone"],task["recurrence"],task["position"],t,t))
            row=cur.fetchone()
    set_labels(user["id"],tid,labels);activity(user["id"],"create","task",tid);record_sync(user["id"],tok("op"),"task",tid,{"action":"create","data":task_json(row)});trigger_automation("task_created",row);return row
def change_task(user_id,tid,status,run_automation=True):
    row=task_access(user_id,tid,"editor")
    if not row:return None
    t=now();out=fetch_one("UPDATE tasks SET status=%s,completed_at=%s,deleted_at=%s,updated_at=%s WHERE id=%s RETURNING *",(status,t if status=="completed" else None,t if status=="deleted" else None,t,tid))
    activity(user_id,status,"task",tid);record_sync(user_id,tok("op"),"task",tid,{"action":status})
    if status=="completed" and run_automation:trigger_automation("task_completed",out)
    return out
def trigger_automation(event,row):
    try:
        rules=fetch_all("SELECT * FROM automation_rules WHERE enabled=true AND trigger=%s AND owner_id=%s",(event,row["user_id"]))
        for r in rules:
            try:
                cond=pj(r["conditions"],{})
                if cond.get("priority") and ("P"+str(row["priority"]))!=cond["priority"]:continue
                for a in pj(r["actions"],[]):
                    if a.get("type")=="complete_task":change_task(r["owner_id"],row["id"],"completed",run_automation=False)
                    elif a.get("type")=="add_label" and a.get("labelId"):set_labels(r["owner_id"],row["id"],[a["labelId"]])
                execute("INSERT INTO automation_executions(id,rule_id,status) VALUES(%s,%s,'success')",(str(uuid.uuid4()),r["id"]))
            except Exception as e:execute("INSERT INTO automation_executions(id,rule_id,status,error) VALUES(%s,%s,'failed',%s)",(str(uuid.uuid4()),r["id"],str(e)[:500]))
    except Exception:pass

@app.get("/")
def index():return send_from_directory(ROOT/"templates","index.html")
@app.get("/manifest.webmanifest")
def manifest():return send_from_directory(ROOT,"manifest.webmanifest")
@app.get("/sw.js")
def sw():return send_from_directory(ROOT/"static","sw.js")
@app.get("/assets/<path:name>")
def asset(name):return send_from_directory(ROOT/"static",name)
@app.get("/health")
def health():return jsonify({"status":"ok","service":"todo-python","timestamp":now().isoformat()})
@app.get("/ready")
def ready():
    try:fetch_one("SELECT 1");return jsonify({"status":"ready"})
    except:return bad("not_ready",503)

@app.get("/api/v1/auth/providers")
def providers():return jsonify({"oauth":{"google":bool(os.getenv("GOOGLE_CLIENT_ID")),"github":bool(os.getenv("GITHUB_CLIENT_ID")),"oidc":bool(os.getenv("OIDC_ISSUER"))}})
@app.post("/api/v1/auth/register")
@limited("register",10,300)
def register():
    try:
        b=body();email=str(b.get("email","")).strip().lower();pw=str(b.get("password",""));name=str(b.get("displayName","")).strip()
        if "@" not in email or len(email)>320:raise ValueError("Valid email is required")
        if len(pw)<10:raise ValueError("Password must be at least 10 characters")
        if not name or len(name)>120:raise ValueError("Display name is required")
        if fetch_one("SELECT id FROM users WHERE email=%s",(email,)):raise ValueError("Email already registered")
        u=str(uuid.uuid4());execute("INSERT INTO users(id,email,display_name,password_hash) VALUES(%s,%s,%s,%s)",(u,email,name,ph.hash(pw)))
        w=str(uuid.uuid4());execute("INSERT INTO workspaces(id,owner_id,name) VALUES(%s,%s,%s)",(w,u,name+"'s Workspace"));execute("INSERT INTO workspace_members(workspace_id,user_id,role) VALUES(%s,%s,'owner')",(w,u))
        vt=tok("verify");execute("INSERT INTO email_verification_tokens(id,user_id,token_hash,expires_at) VALUES(%s,%s,%s,%s)",(str(uuid.uuid4()),u,sh(vt),now()+timedelta(hours=24)))
        out={"user":{"id":u,"email":email,"displayName":name},"token":session_for(u)}
        if os.getenv("APP_ENV","development")!="production":out["developmentVerificationToken"]=vt
        return jsonify(out),201
    except ValueError as e:return bad(str(e))
    except Exception:return bad("Registration failed",500)

@app.post("/api/v1/auth/login")
@limited("login",15,300)
def login():
    try:
        b=body();r=fetch_one("SELECT * FROM users WHERE email=%s",(str(b.get("email","")).strip().lower(),))
        if not r or not r["password_hash"]:return bad("Invalid credentials",401)
        try:ph.verify(r["password_hash"],str(b.get("password","")))
        except Exception:return bad("Invalid credentials",401)
        if r["mfa_enabled"] and r["mfa_secret"]:
            c=tok("mfa");execute("INSERT INTO mfa_challenges(id,user_id,token_hash,expires_at) VALUES(%s,%s,%s,%s)",(str(uuid.uuid4()),r["id"],sh(c),now()+timedelta(minutes=5)));return jsonify({"mfaRequired":True,"challenge":c})
        return jsonify({"user":user_json(r),"token":session_for(r["id"])})
    except Exception:return bad("Login failed",401)

@app.post("/api/v1/auth/mfa/verify")
@limited("mfa",20,300)
def mfa_verify():
    try:
        b=body();challenge=str(b.get("challenge","")).strip();code=str(b.get("code","")).strip()
        if not challenge or not code:raise ValueError("MFA challenge and code are required")
        r=fetch_one("SELECT c.*,u.* FROM mfa_challenges c JOIN users u ON u.id=c.user_id WHERE c.token_hash=%s AND c.expires_at>%s",(sh(challenge),now()))
        if not r or not r["mfa_secret"] or not pyotp.TOTP(r["mfa_secret"]).verify(code):return bad("Invalid MFA challenge",401)
        execute("DELETE FROM mfa_challenges WHERE token_hash=%s",(sh(challenge),));return jsonify({"user":user_json(r),"token":session_for(r["user_id"])})
    except ValueError as e:return bad(str(e))
    except Exception:return bad("MFA service unavailable",503)
@app.post("/api/v1/auth/logout")
def logout():
    h=request.headers.get("Authorization","")
    if h.startswith("Bearer "):execute("UPDATE sessions SET revoked_at=%s WHERE token_hash=%s",(now(),sh(h[7:].strip())))
    return "",204
@app.get("/api/v1/auth/me")
@require("tasks:read")
def me(u):return jsonify(u)
@app.get("/api/v1/auth/sessions")
@require("tasks:read")
def session_list(u):
    rows=fetch_all("SELECT id,created_at,expires_at,revoked_at FROM sessions WHERE user_id=%s ORDER BY created_at DESC",(u["id"],))
    return jsonify([{"id":r["id"],"createdAt":iso(r["created_at"]),"expiresAt":iso(r["expires_at"]),"revokedAt":iso(r["revoked_at"])} for r in rows])
@app.delete("/api/v1/auth/sessions/<sid>")
@require("tasks:write")
def session_delete(u,sid):
    try:execute("UPDATE sessions SET revoked_at=%s WHERE id=%s AND user_id=%s",(now(),uid(sid),u["id"]));return "",204
    except ValueError as e:return bad(str(e))
@app.post("/api/v1/auth/verify-email")
@require("tasks:write")
def verify_email(u):
    raw=str(body().get("token",""));r=fetch_one("SELECT id FROM email_verification_tokens WHERE user_id=%s AND token_hash=%s AND expires_at>%s",(u["id"],sh(raw),now()))
    if not r:return bad("Invalid or expired verification token")
    execute("UPDATE users SET email_verified=true,updated_at=%s WHERE id=%s",(now(),u["id"]));execute("DELETE FROM email_verification_tokens WHERE user_id=%s",(u["id"],));return jsonify({"verified":True})
@app.post("/api/v1/auth/password-reset/request")
@limited("reset",10,600)
def reset_request():
    try:
        email=str(body().get("email","")).strip().lower();out={"sent":True}
        if "@" not in email or len(email)>320:return jsonify(out)
        r=fetch_one("SELECT id FROM users WHERE email=%s",(email,))
        if r:
            raw=tok("reset");execute("INSERT INTO password_reset_tokens(id,user_id,token_hash,expires_at) VALUES(%s,%s,%s,%s)",(str(uuid.uuid4()),r["id"],sh(raw),now()+timedelta(hours=1)))
            if os.getenv("APP_ENV","development")!="production":out["developmentResetToken"]=raw
        return jsonify(out)
    except ValueError as e:return bad(str(e))
    except Exception:return bad("Password reset service unavailable",503)
@app.post("/api/v1/auth/password-reset")
@limited("reset-apply",10,600)
def reset_apply():
    try:
        b=body();pw=str(b.get("password",""))
        if len(pw)<10:raise ValueError("Password must be at least 10 characters")
        r=fetch_one("SELECT user_id FROM password_reset_tokens WHERE token_hash=%s AND expires_at>%s",(sh(str(b.get("token",""))),now()))
        if not r:return bad("Invalid or expired reset token")
        execute("UPDATE users SET password_hash=%s,updated_at=%s WHERE id=%s",(ph.hash(pw),now(),r["user_id"]));execute("UPDATE sessions SET revoked_at=%s WHERE user_id=%s AND revoked_at IS NULL",(now(),r["user_id"]));execute("DELETE FROM password_reset_tokens WHERE user_id=%s",(r["user_id"],));return jsonify({"reset":True})
    except ValueError as e:return bad(str(e))
@app.post("/api/v1/auth/mfa/setup")
@require("tasks:write")
def mfa_setup(u):
    secret=pyotp.random_base32();execute("UPDATE users SET mfa_secret=%s,updated_at=%s WHERE id=%s",(secret,now(),u["id"]));return jsonify({"secret":secret,"otpauth":pyotp.TOTP(secret).provisioning_uri(u["email"],issuer_name=os.getenv("APP_NAME","To-Do"))})
@app.post("/api/v1/auth/mfa/confirm")
@require("tasks:write")
def mfa_confirm(u):
    code=str(body().get("code",""));r=fetch_one("SELECT mfa_secret FROM users WHERE id=%s",(u["id"],))
    if not r or not r["mfa_secret"] or not pyotp.TOTP(r["mfa_secret"]).verify(code):return bad("Invalid MFA code")
    execute("UPDATE users SET mfa_enabled=true,updated_at=%s WHERE id=%s",(now(),u["id"]));return jsonify({"enabled":True})
@app.post("/api/v1/auth/mfa/disable")
@require("tasks:write")
def mfa_disable(u):execute("UPDATE users SET mfa_enabled=false,mfa_secret=NULL,updated_at=%s WHERE id=%s",(now(),u["id"]));return jsonify({"enabled":False})

@app.get("/api/v1/workspaces")
@require("workspaces:read")
def workspaces(u):
    return jsonify([{"id":r["id"],"ownerId":r["owner_id"],"name":r["name"],"role":r["role"],"createdAt":iso(r["created_at"])} for r in fetch_all("SELECT w.*,wm.role FROM workspaces w JOIN workspace_members wm ON wm.workspace_id=w.id WHERE wm.user_id=%s",(u["id"],))])
@app.post("/api/v1/workspaces")
@require("workspaces:write")
def workspace_create(u):
    name=str(body().get("name","")).strip()
    if not name:return bad("Workspace name is required")
    wid=str(uuid.uuid4());execute("INSERT INTO workspaces(id,owner_id,name) VALUES(%s,%s,%s)",(wid,u["id"],name));execute("INSERT INTO workspace_members(workspace_id,user_id,role) VALUES(%s,%s,'owner')",(wid,u["id"]));return jsonify({"id":wid,"ownerId":u["id"],"name":name,"role":"owner"}),201
@app.get("/api/v1/workspaces/<wid>/members")
@require("workspaces:read")
def workspace_members(u,wid):
    try:
        wid=uid(wid)
        if not fetch_one("SELECT 1 FROM workspace_members WHERE workspace_id=%s AND user_id=%s",(wid,u["id"])):return bad("Workspace not found",404)
        rows=fetch_all("SELECT wm.user_id,wm.role,u.email,u.display_name FROM workspace_members wm JOIN users u ON u.id=wm.user_id WHERE wm.workspace_id=%s",(wid,))
        return jsonify([{"userId":r["user_id"],"email":r["email"],"displayName":r["display_name"],"role":r["role"]} for r in rows])
    except ValueError as e:return bad(str(e))
@app.post("/api/v1/workspaces/<wid>/members")
@require("workspaces:write")
def workspace_member_add(u,wid):
    try:
        wid=uid(wid);caller=fetch_one("SELECT role FROM workspace_members WHERE workspace_id=%s AND user_id=%s",(wid,u["id"]))
        if not caller or WROLE.get(caller["role"],0)<40:return bad("Admin permission required",403)
        b=body();target=fetch_one("SELECT id FROM users WHERE email=%s",(str(b.get("email","")).strip().lower(),))
        if not target:return bad("User not found",404)
        role=str(b.get("role","member"))
        if role not in ("guest","member","admin"):return bad("Invalid role")
        existing=fetch_one("SELECT role FROM workspace_members WHERE workspace_id=%s AND user_id=%s",(wid,target["id"]))
        if existing and existing["role"]=="owner":return bad("Workspace owner role cannot be changed",403)
        execute("INSERT INTO workspace_members(workspace_id,user_id,role) VALUES(%s,%s,%s) ON CONFLICT(workspace_id,user_id) DO UPDATE SET role=EXCLUDED.role",(wid,target["id"],role));return jsonify({"workspaceId":wid,"userId":target["id"],"role":role}),201
    except ValueError as e:return bad(str(e))

@app.get("/api/v1/projects")
@require("projects:read")
def projects(u):
    rows=fetch_all("SELECT DISTINCT p.* FROM projects p LEFT JOIN project_members pm ON pm.project_id=p.id AND pm.user_id=%s LEFT JOIN workspace_members wm ON wm.workspace_id=p.workspace_id AND wm.user_id=%s WHERE p.user_id=%s OR pm.user_id IS NOT NULL OR wm.user_id IS NOT NULL ORDER BY p.favorite DESC,p.position,p.name",(u["id"],u["id"],u["id"]))
    return jsonify([project_json(r) for r in rows])
@app.post("/api/v1/projects")
@require("projects:write")
def project_create(u):
    try:
        b=body();name=str(b.get("name","")).strip()
        if not 1<=len(name)<=200:raise ValueError("Project name must be 1-200 characters")
        wid=uid(b["workspaceId"]) if b.get("workspaceId") else None;parent=uid(b["parentId"]) if b.get("parentId") else None
        if wid and not fetch_one("SELECT 1 FROM workspace_members WHERE workspace_id=%s AND user_id=%s",(wid,u["id"])):return bad("Workspace not found",404)
        if parent and not project_access(u["id"],parent,"manager"):return bad("Parent project not accessible",403)
        pid=str(uuid.uuid4());r=fetch_one("INSERT INTO projects(id,user_id,workspace_id,parent_id,name,description,color,icon,favorite,archived,position) VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *",(pid,u["id"],wid,parent,name,b.get("description"),b.get("color"),b.get("icon"),bool(b.get("favorite",False)),bool(b.get("archived",False)),int(b.get("position",0))));return jsonify(project_json(r)),201
    except ValueError as e:return bad(str(e))
@app.patch("/api/v1/projects/<pid>")
@require("projects:write")
def project_update(u,pid):
    try:
        pid=uid(pid)
        if not project_can_mutate(u["id"],pid):return bad("Project mutation permission denied",403)
        r=fetch_one("SELECT * FROM projects WHERE id=%s",(pid,))
        if not r:return bad("Project not found",404)
        b=body();name=str(b.get("name",r["name"])).strip()
        if not 1<=len(name)<=200:raise ValueError("Project name must be 1-200 characters")
        r=fetch_one("UPDATE projects SET name=%s,description=%s,color=%s,icon=%s,favorite=%s,archived=%s,position=%s,updated_at=%s WHERE id=%s RETURNING *",(name,b.get("description",r["description"]),b.get("color",r["color"]),b.get("icon",r["icon"]),bool(b.get("favorite",r["favorite"])),bool(b.get("archived",r["archived"])),int(b.get("position",r["position"])),now(),pid));return jsonify(project_json(r))
    except ValueError as e:return bad(str(e))
@app.delete("/api/v1/projects/<pid>")
@require("projects:write")
def project_delete(u,pid):
    try:
        pid=uid(pid)
        if not project_can_mutate(u["id"],pid,"manager"):return bad("Project delete permission denied",403)
        execute("DELETE FROM projects WHERE id=%s",(pid,));return "",204
    except ValueError as e:return bad(str(e))

@app.get("/api/v1/projects/<pid>/sections")
@require("projects:read")
def sections(u,pid):
    try:
        pid=uid(pid)
        if not project_access(u["id"],pid):return bad("Project not found",404)
        return jsonify([{"id":r["id"],"projectId":r["project_id"],"name":r["name"],"position":r["position"]} for r in fetch_all("SELECT * FROM sections WHERE project_id=%s ORDER BY position,name",(pid,))])
    except ValueError as e:return bad(str(e))
@app.post("/api/v1/projects/<pid>/sections")
@require("projects:write")
def section_create(u,pid):
    try:
        pid=uid(pid)
        if not project_can_mutate(u["id"],pid):return bad("Section permission denied",403)
        name=str(body().get("name","")).strip()
        if not name:return bad("Section name is required")
        r=fetch_one("INSERT INTO sections(id,project_id,name,position) VALUES(%s,%s,%s,%s) RETURNING *",(str(uuid.uuid4()),pid,name,0));return jsonify({"id":r["id"],"projectId":r["project_id"],"name":r["name"],"position":r["position"]}),201
    except ValueError as e:return bad(str(e))


@app.patch("/api/v1/projects/<pid>/sections/<sid>")
@require("projects:write")
def section_update_nested(u,pid,sid):
    try:
        pid,sid=uid(pid),uid(sid)
        if not project_can_mutate(u["id"],pid): return bad("Section permission denied",403)
        r=fetch_one("SELECT * FROM sections WHERE id=%s AND project_id=%s",(sid,pid))
        if not r:return bad("Section not found",404)
        b=body();name=str(b.get("name",r["name"])).strip()
        if not name:return bad("Section name is required")
        r=fetch_one("UPDATE sections SET name=%s,position=%s,updated_at=%s WHERE id=%s RETURNING *",(name,int(b.get("position",r["position"])),now(),sid))
        return jsonify({"id":r["id"],"projectId":r["project_id"],"name":r["name"],"position":r["position"]})
    except ValueError as e:return bad(str(e))

@app.patch("/api/v1/sections/<sid>")
@require("projects:write")
def section_update(u,sid):
    try:
        sid=uid(sid);r=fetch_one("SELECT project_id FROM sections WHERE id=%s",(sid,))
        if not r:return bad("Section not found",404)
        if not project_can_mutate(u["id"],r["project_id"]):return bad("Section permission denied",403)
        b=body();name=str(b.get("name","")).strip()
        if not 1<=len(name)<=200:raise ValueError("Section name must be 1-200 characters")
        out=fetch_one("UPDATE sections SET name=%s,position=%s,updated_at=%s WHERE id=%s RETURNING *",(name,int(b.get("position",0)),now(),sid))
        return jsonify({"id":out["id"],"projectId":out["project_id"],"name":out["name"],"position":out["position"]})
    except ValueError as e:return bad(str(e))

@app.delete("/api/v1/sections/<sid>")
@require("projects:write")
def section_delete(u,sid):
    try:
        sid=uid(sid);r=fetch_one("SELECT project_id FROM sections WHERE id=%s",(sid,))
        if not r:return bad("Section not found",404)
        if not project_can_mutate(u["id"],r["project_id"]):return bad("Section permission denied",403)
        execute("DELETE FROM sections WHERE id=%s",(sid,));return "",204
    except ValueError as e:return bad(str(e))

@app.get("/api/v1/projects/<pid>/members")
@require("projects:read")
def project_member_list(u,pid):
    try:
        pid=uid(pid)
        if not project_access(u["id"],pid):return bad("Project not found",404)
        rows=fetch_all("SELECT pm.user_id,pm.role,u.email,u.display_name FROM project_members pm JOIN users u ON u.id=pm.user_id WHERE pm.project_id=%s ORDER BY u.display_name",(pid,))
        return jsonify([{"userId":r["user_id"],"role":r["role"],"email":r["email"],"displayName":r["display_name"]} for r in rows])
    except ValueError as e:return bad(str(e))

@app.post("/api/v1/projects/<pid>/members")
@require("projects:write")
def project_member_add(u,pid):
    try:
        pid=uid(pid)
        if not project_can_mutate(u["id"],pid,"manager"):return bad("Manager permission required",403)
        b=body();target=fetch_one("SELECT id FROM users WHERE email=%s",(str(b.get("email","")).strip().lower(),))
        if not target:return bad("User not found",404)
        role=str(b.get("role","viewer"))
        if role not in ("viewer","commenter","editor","manager"):return bad("Invalid role")
        execute("INSERT INTO project_members(project_id,user_id,role) VALUES(%s,%s,%s) ON CONFLICT(project_id,user_id) DO UPDATE SET role=EXCLUDED.role",(pid,target["id"],role))
        return jsonify({"projectId":pid,"userId":target["id"],"role":role}),201
    except ValueError as e:return bad(str(e))

@app.delete("/api/v1/projects/<pid>/members/<member_id>")
@require("projects:write")
def project_member_remove(u,pid,member_id):
    try:
        pid,member_id=uid(pid),uid(member_id)
        if not project_can_mutate(u["id"],pid,"manager"):return bad("Manager permission required",403)
        execute("DELETE FROM project_members WHERE project_id=%s AND user_id=%s",(pid,member_id));return "",204
    except ValueError as e:return bad(str(e))

@app.get("/api/v1/tasks")
@require("tasks:read")
def tasks(u):
    try:
        where=["(t.user_id=%s OR t.assignee_id=%s OR EXISTS(SELECT 1 FROM project_members pm WHERE pm.project_id=t.project_id AND pm.user_id=%s) OR EXISTS(SELECT 1 FROM workspace_members wm WHERE wm.workspace_id=t.workspace_id AND wm.user_id=%s))","t.status<>'deleted'"];params=[u["id"],u["id"],u["id"],u["id"]]
        q=request.args.get("q","").strip()
        if q:where.append("(LOWER(t.title) LIKE LOWER(%s) OR LOWER(COALESCE(t.description,'')) LIKE LOWER(%s))");params += ["%"+q+"%","%"+q+"%"]
        if request.args.get("projectId"):where.append("t.project_id=%s");params.append(uid(request.args["projectId"]))
        if request.args.get("status"):where.append("t.status=%s");params.append(request.args["status"])
        if request.args.get("priority"):
            priority=str(request.args["priority"]).upper()
            if priority not in ("P1","P2","P3","P4"):raise ValueError("Invalid priority")
            where.append("t.priority=%s");params.append(int(priority[1]))
        due=request.args.get("due")
        if due=="today":where.append("t.due_at::date=CURRENT_DATE")
        if due=="overdue":where.append("t.due_at IS NOT NULL AND t.due_at<%s AND t.status<>'completed'");params.append(now())
        if due=="upcoming":where.append("t.due_at>%s");params.append(now())
        rows=fetch_all("SELECT t.* FROM tasks t WHERE "+" AND ".join(where)+" ORDER BY t.position,t.due_at NULLS LAST,t.created_at",tuple(params));return jsonify([task_json(r) for r in rows])
    except ValueError as e:return bad(str(e))
@app.post("/api/v1/tasks")
@require("tasks:write")
def task_create(u):
    try:
        b=body()
        if b.get("quickAdd"):
            p=parse_quick_add(str(b["quickAdd"]));b={**b,"title":p["title"],"priority":p["priority"],"recurrence":p["recurrence"] or b.get("recurrence")};b["dueAt"]=resolve_due(p["due"]).isoformat() if p["due"] else b.get("dueAt")
            if p["project"]:
                x=fetch_one("SELECT id FROM projects WHERE user_id=%s AND LOWER(name)=LOWER(%s)",(u["id"],p["project"]))
                if x:b["projectId"]=x["id"]
        labels=[]
        if b.get("labelIds"):labels=b["labelIds"]
        elif b.get("quickAdd"):labels=[r["id"] for r in fetch_all("SELECT id FROM labels WHERE user_id=%s AND LOWER(name)=ANY(%s)",(u["id"],[x.lower() for x in parse_quick_add(str(b["quickAdd"]))["labels"]]))]
        r=insert_task(u,validate_task(u["id"],b),labels);return jsonify(task_json(r)),201
    except ValueError as e:return bad(str(e))
@app.patch("/api/v1/tasks/<tid>")
@require("tasks:write")
def task_update(u,tid):
    try:
        tid=uid(tid);old=task_access(u["id"],tid,"editor")
        if not old:return bad("Task not found",404)
        t=validate_task(u["id"],body(),old);r=fetch_one("UPDATE tasks SET workspace_id=%s,parent_task_id=%s,project_id=%s,section_id=%s,assignee_id=%s,title=%s,description=%s,priority=%s,start_at=%s,due_at=%s,deadline_at=%s,duration_minutes=%s,timezone=%s,recurrence=%s,position=%s,updated_at=%s WHERE id=%s RETURNING *",(t["workspaceId"],t["parentTaskId"],t["projectId"],t["sectionId"],t["assigneeId"],t["title"],t["description"],t["priority"],t["startAt"],t["dueAt"],t["deadlineAt"],t["durationMinutes"],t["timezone"],t["recurrence"],t["position"],now(),tid));activity(u["id"],"update","task",tid);record_sync(u["id"],tok("op"),"task",tid,{"action":"update","data":task_json(r)});return jsonify(task_json(r))
    except ValueError as e:return bad(str(e))
@app.get("/api/v1/tasks/<tid>")
@require("tasks:read")
def task_get(u,tid):
    try:r=task_access(u["id"],uid(tid));return jsonify(task_json(r)) if r else bad("Task not found",404)
    except ValueError as e:return bad(str(e))
for _status,_route in (("completed","complete"),("active","reopen"),("active","restore")):
    pass
@app.post("/api/v1/tasks/<tid>/complete")
@require("tasks:write")
def complete(u,tid):
    try:r=change_task(u["id"],uid(tid),"completed");return jsonify(task_json(r)) if r else bad("Task not found",404)
    except ValueError as e:return bad(str(e))
@app.post("/api/v1/tasks/<tid>/reopen")
@require("tasks:write")
def reopen(u,tid):
    try:r=change_task(u["id"],uid(tid),"active");return jsonify(task_json(r)) if r else bad("Task not found",404)
    except ValueError as e:return bad(str(e))
@app.post("/api/v1/tasks/<tid>/restore")
@require("tasks:write")
def restore(u,tid):
    try:r=change_task(u["id"],uid(tid),"active");return jsonify(task_json(r)) if r else bad("Task not found",404)
    except ValueError as e:return bad(str(e))
@app.delete("/api/v1/tasks/<tid>")
@require("tasks:write")
def task_delete(u,tid):
    try:r=change_task(u["id"],uid(tid),"deleted");return jsonify(task_json(r)) if r else bad("Task not found",404)
    except ValueError as e:return bad(str(e))

@app.post("/api/v1/tasks/bulk")
@require("tasks:write")
def task_bulk(u):
    try:
        b=body();ids=[uid(x) for x in b.get("taskIds",[])]
        if not 1<=len(ids)<=200:raise ValueError("taskIds must contain 1-200 tasks")
        action=b.get("action");out=[]
        for tid in ids:
            if not task_access(u["id"],tid,"editor"):continue
            if action in ("complete","reopen","delete"):out.append(change_task(u["id"],tid,{"complete":"completed","reopen":"active","delete":"deleted"}[action]))
            elif action=="setPriority":
                p=str(b.get("priority","P4")).upper()
                if p not in ("P1","P2","P3","P4"):raise ValueError("Invalid priority")
                out.append(fetch_one("UPDATE tasks SET priority=%s,updated_at=%s WHERE id=%s RETURNING *",(int(p[1]),now(),tid)))
            elif action=="move":
                pid=uid(b["projectId"]) if b.get("projectId") else None
                sid=uid(b["sectionId"]) if b.get("sectionId") else None
                if pid and not project_access(u["id"],pid,"editor"):raise ValueError("Project not accessible")
                if sid:
                    sec=fetch_one("SELECT project_id FROM sections WHERE id=%s",(sid,))
                    if not sec or (pid and str(sec["project_id"])!=str(pid)):raise ValueError("Section does not belong to project")
                    pid=str(sec["project_id"])
                    if not project_access(u["id"],pid,"editor"):raise ValueError("Section project not accessible")
                out.append(fetch_one("UPDATE tasks SET project_id=%s,section_id=%s,updated_at=%s WHERE id=%s RETURNING *",(pid,sid,now(),tid)))
            else:raise ValueError("Unsupported bulk action")
        return jsonify({"updated":[task_json(x) for x in out if x]})
    except ValueError as e:return bad(str(e))
@app.post("/api/v1/tasks/<tid>/duplicate")
@require("tasks:write")
def duplicate(u,tid):
    try:
        old=task_access(u["id"],uid(tid))
        if not old:return bad("Task not found",404)
        d={"title":old["title"]+" (copy)","description":old["description"],"priority":"P"+str(old["priority"]),"projectId":old["project_id"],"sectionId":old["section_id"],"parentTaskId":old["parent_task_id"],"assigneeId":old["assignee_id"],"workspaceId":old["workspace_id"],"startAt":iso(old["start_at"]),"dueAt":iso(old["due_at"]),"deadlineAt":iso(old["deadline_at"]),"durationMinutes":old["duration_minutes"],"timezone":old["timezone"],"recurrence":old["recurrence"],"position":old["position"]}
        r=insert_task(u,validate_task(u["id"],d));return jsonify(task_json(r)),201
    except ValueError as e:return bad(str(e))
@app.get("/api/v1/tasks/<tid>/permalink")
@require("tasks:read")
def permalink(u,tid):
    try:
        r=task_access(u["id"],uid(tid));return jsonify({"url":request.host_url.rstrip("/")+"/?task="+r["id"]}) if r else bad("Task not found",404)
    except ValueError as e:return bad(str(e))
@app.get("/api/v1/tasks/<tid>/labels")
@require("labels:read")
def task_labels(u,tid):
    try:
        tid=uid(tid)
        if not task_access(u["id"],tid):return bad("Task not found",404)
        return jsonify([label_json(r) for r in fetch_all("SELECT l.* FROM labels l JOIN task_labels tl ON tl.label_id=l.id WHERE tl.task_id=%s ORDER BY l.name",(tid,))])
    except ValueError as e:return bad(str(e))
@app.put("/api/v1/tasks/<tid>/labels")
@require("labels:write")
def task_labels_update(u,tid):
    try:
        tid=uid(tid)
        if not task_access(u["id"],tid,"editor"):return bad("Task not found",404)
        set_labels(u["id"],tid,body().get("labelIds",[]));return jsonify({"updated":True})
    except ValueError as e:return bad(str(e))
@app.get("/api/v1/labels")
@require("labels:read")
def labels(u):return jsonify([label_json(r) for r in fetch_all("SELECT * FROM labels WHERE user_id=%s ORDER BY favorite DESC,name",(u["id"],))])
@app.post("/api/v1/labels")
@require("labels:write")
def label_create(u):
    try:
        b=body();name=str(b.get("name","")).strip()
        if not 1<=len(name)<=100:raise ValueError("Label name must be 1-100 characters")
        return jsonify(label_json(fetch_one("INSERT INTO labels(id,user_id,name,color,description,favorite) VALUES(%s,%s,%s,%s,%s,%s) RETURNING *",(str(uuid.uuid4()),u["id"],name,b.get("color"),b.get("description"),bool(b.get("favorite",False))))),),201
    except ValueError as e:return bad(str(e))
@app.patch("/api/v1/labels/<lid>")
@require("labels:write")
def label_update(u,lid):
    try:
        lid=uid(lid);r=fetch_one("SELECT * FROM labels WHERE id=%s AND user_id=%s",(lid,u["id"]))
        if not r:return bad("Label not found",404)
        b=body();name=str(b.get("name",r["name"])).strip()
        if not 1<=len(name)<=100:raise ValueError("Label name must be 1-100 characters")
        r=fetch_one("UPDATE labels SET name=%s,color=%s,description=%s,favorite=%s,updated_at=%s WHERE id=%s AND user_id=%s RETURNING *",(name,b.get("color",r["color"]),b.get("description",r["description"]),bool(b.get("favorite",r["favorite"])),now(),lid,u["id"]));return jsonify(label_json(r))
    except ValueError as e:return bad(str(e))
@app.delete("/api/v1/labels/<lid>")
@require("labels:write")
def label_delete(u,lid):
    try:execute("DELETE FROM labels WHERE id=%s AND user_id=%s",(uid(lid),u["id"]));return "",204
    except ValueError as e:return bad(str(e))

@app.get("/api/v1/search/tasks")
@require("tasks:read")
def search(u):
    q=request.args.get("q",request.args.get("text","")).strip().lower();rows=tasks.__wrapped__(u).get_json()
    if not q:return jsonify(rows)
    terms=q.split();out=[]
    for r in rows:
        hay=(r["title"]+" "+r["description"]).lower();keep=True
        for term in terms:
            if term.startswith("!"):
                if term[1:] in hay:keep=False
            elif term in ("p1","p2","p3","p4"):
                keep=keep and r["priority"]==term.upper()
            elif term.startswith("@"):
                names={x["name"].lower() for x in fetch_all("SELECT l.name FROM labels l JOIN task_labels tl ON tl.label_id=l.id WHERE tl.task_id=%s",(r["id"],))};keep=keep and term[1:] in names
            elif term not in hay:keep=False
        if keep:out.append(r)
    return jsonify(out)

@app.get("/api/v1/filters")
@require("tasks:read")
def filters(u):return jsonify([{"id":r["id"],"name":r["name"],"query":r["query"],"color":r["color"]} for r in fetch_all("SELECT * FROM saved_filters WHERE user_id=%s ORDER BY name",(u["id"],))])
@app.post("/api/v1/filters")
@require("tasks:write")
def filter_create(u):
    b=body();name=str(b.get("name","")).strip();query=str(b.get("query","")).strip()
    if not name or not query:return bad("Filter name and query are required")
    r=fetch_one("INSERT INTO saved_filters(id,user_id,name,query,color) VALUES(%s,%s,%s,%s,%s) RETURNING *",(str(uuid.uuid4()),u["id"],name,query,b.get("color")));return jsonify({"id":r["id"],"name":r["name"],"query":r["query"],"color":r["color"]}),201

@app.get("/api/v1/tasks/<tid>/dependencies")
@require("tasks:read")
def deps(u,tid):
    try:tid=uid(tid);return jsonify([x["depends_on_task_id"] for x in fetch_all("SELECT depends_on_task_id FROM task_dependencies WHERE task_id=%s",(tid,))]) if task_access(u["id"],tid) else bad("Task not found",404)
    except ValueError as e:return bad(str(e))
@app.put("/api/v1/tasks/<tid>/dependencies")
@require("tasks:write")
def deps_update(u,tid):
    try:
        tid=uid(tid)
        if not task_access(u["id"],tid,"editor"):return bad("Task not found",404)
        execute("DELETE FROM task_dependencies WHERE task_id=%s",(tid,))
        for dep in body().get("dependsOnTaskIds",[]):
            dep=uid(dep)
            if dep!=tid and task_access(u["id"],dep):execute("INSERT INTO task_dependencies(task_id,depends_on_task_id) VALUES(%s,%s) ON CONFLICT DO NOTHING",(tid,dep))
        return jsonify({"updated":True})
    except ValueError as e:return bad(str(e))

@app.get("/api/v1/reminders")
@require("reminders:read")
def reminders(u):
    rows=fetch_all("SELECT * FROM reminders WHERE user_id=%s ORDER BY trigger_at NULLS LAST",(u["id"],));return jsonify([{"id":r["id"],"taskId":r["task_id"],"trigger":r["trigger"],"triggerAt":iso(r["trigger_at"]),"minutesBefore":r["minutes_before"],"locationId":r["location_id"],"recurringRule":r["recurring_rule"],"enabled":r["enabled"]} for r in rows])
@app.post("/api/v1/reminders")
@require("reminders:write")
def reminder_create(u):
    try:
        b=body();tid=uid(b["taskId"])
        if not task_access(u["id"],tid,"editor"):return bad("Task not found",404)
        r=fetch_one("INSERT INTO reminders(id,user_id,task_id,trigger,trigger_at,minutes_before,location_id,recurring_rule,enabled) VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *",(str(uuid.uuid4()),u["id"],tid,str(b.get("trigger","time")),dt(b.get("triggerAt")),b.get("minutesBefore"),b.get("locationId"),b.get("recurringRule"),bool(b.get("enabled",True))));return jsonify({"id":r["id"],"taskId":r["task_id"],"trigger":r["trigger"],"triggerAt":iso(r["trigger_at"]),"minutesBefore":r["minutes_before"],"enabled":r["enabled"]}),201
    except ValueError as e:return bad(str(e))
@app.delete("/api/v1/reminders/<rid>")
@require("reminders:write")
def reminder_delete(u,rid):
    try:execute("DELETE FROM reminders WHERE id=%s AND user_id=%s",(uid(rid),u["id"]));return "",204
    except ValueError as e:return bad(str(e))


@app.patch("/api/v1/comments/<cid>")
@require("comments:write")
def comment_update(u,cid):
    try:
        cid=uid(cid);r=fetch_one("SELECT * FROM comments WHERE id=%s AND user_id=%s",(cid,u["id"]))
        if not r:return bad("Comment not found",404)
        text=str(body().get("body","")).strip()
        if not text:return bad("Comment body is required")
        out=fetch_one("UPDATE comments SET body=%s,updated_at=%s WHERE id=%s RETURNING *",(text,now(),cid))
        return jsonify({"id":out["id"],"taskId":out["task_id"],"userId":out["user_id"],"body":out["body"],"createdAt":iso(out["created_at"]),"updatedAt":iso(out["updated_at"])})
    except ValueError as e:return bad(str(e))

@app.delete("/api/v1/comments/<cid>")
@require("comments:write")
def comment_delete(u,cid):
    try:
        cid=uid(cid)
        if not fetch_one("DELETE FROM comments WHERE id=%s AND user_id=%s RETURNING id",(cid,u["id"])):return bad("Comment not found",404)
        return "",204
    except ValueError as e:return bad(str(e))

@app.get("/api/v1/comments/<tid>")
@require("comments:read")
def comments(u,tid):
    try:
        tid=uid(tid)
        if not task_access(u["id"],tid):return bad("Task not found",404)
        rows=fetch_all("SELECT * FROM comments WHERE task_id=%s ORDER BY created_at",(tid,));return jsonify([{"id":r["id"],"taskId":r["task_id"],"userId":r["user_id"],"body":r["body"],"createdAt":iso(r["created_at"]),"updatedAt":iso(r["updated_at"])} for r in rows])
    except ValueError as e:return bad(str(e))
@app.post("/api/v1/comments/<tid>")
@require("comments:write")
def comment_create(u,tid):
    try:
        tid=uid(tid);txt=str(body().get("body","")).strip()
        if not task_access(u["id"],tid,"commenter"):return bad("Comment permission denied",403)
        if not txt:raise ValueError("Comment body is required")
        r=fetch_one("INSERT INTO comments(id,task_id,user_id,body) VALUES(%s,%s,%s,%s) RETURNING *",(str(uuid.uuid4()),tid,u["id"],txt));activity(u["id"],"comment","task",tid);return jsonify({"id":r["id"],"taskId":r["task_id"],"userId":r["user_id"],"body":r["body"],"createdAt":iso(r["created_at"])}),201
    except ValueError as e:return bad(str(e))

@app.post("/api/v1/attachments/<tid>")
@require("attachments:write")
def attachment_upload(u,tid):
    try:
        tid=uid(tid)
        if not task_access(u["id"],tid,"commenter"):return bad("Attachment permission denied",403)
        f=request.files.get("file")
        if not f or not f.filename:return bad("File is required")
        name=secure_filename(f.filename)
        if not name:return bad("Invalid filename")
        key="%s/%s-%s"%(u["id"],uuid.uuid4().hex,name);path=UPLOAD_ROOT/key;path.parent.mkdir(parents=True,exist_ok=True);f.save(path)
        r=fetch_one("INSERT INTO attachments(id,task_id,user_id,name,storage_key,mime_type,size_bytes) VALUES(%s,%s,%s,%s,%s,%s,%s) RETURNING *",(str(uuid.uuid4()),tid,u["id"],name,key,f.mimetype,path.stat().st_size));return jsonify({"id":r["id"],"taskId":r["task_id"],"name":r["name"],"sizeBytes":r["size_bytes"],"url":"/api/v1/attachments/%s/download"%r["id"]}),201
    except ValueError as e:return bad(str(e))
@app.get("/api/v1/attachments/<aid>/download")
@require("attachments:read")
def attachment_download(u,aid):
    try:
        r=fetch_one("SELECT * FROM attachments WHERE id=%s",(uid(aid),))
        if not r or not task_access(u["id"],r["task_id"]):return bad("Attachment not found",404)
        path=UPLOAD_ROOT/r["storage_key"]
        if not path.exists():return bad("Attachment content missing",404)
        return send_file(path,as_attachment=True,download_name=r["name"])
    except ValueError as e:return bad(str(e))


@app.patch("/api/v1/reminders/<rid>")
@require("reminders:write")
def reminder_update(u,rid):
    try:
        rid=uid(rid);r=fetch_one("SELECT * FROM reminders WHERE id=%s AND user_id=%s",(rid,u["id"]))
        if not r:return bad("Reminder not found",404)
        b=body();out=fetch_one("UPDATE reminders SET trigger=%s,trigger_at=%s,minutes_before=%s,location_id=%s,recurring_rule=%s,enabled=%s WHERE id=%s RETURNING *",(str(b.get("trigger",r["trigger"])),dt(b.get("triggerAt",iso(r["trigger_at"]))),b.get("minutesBefore",r["minutes_before"]),b.get("locationId",r["location_id"]),b.get("recurringRule",r["recurring_rule"]),bool(b.get("enabled",r["enabled"])),rid))
        return jsonify({"id":out["id"],"taskId":out["task_id"],"trigger":out["trigger"],"triggerAt":iso(out["trigger_at"]),"minutesBefore":out["minutes_before"],"enabled":out["enabled"]})
    except ValueError as e:return bad(str(e))

@app.post("/api/v1/reminders/<rid>/snooze")
@require("reminders:write")
def reminder_snooze(u,rid):
    try:
        rid=uid(rid);r=fetch_one("SELECT id FROM reminders WHERE id=%s AND user_id=%s",(rid,u["id"]))
        if not r:return bad("Reminder not found",404)
        minutes=max(1,min(10080,int(body().get("minutes",15))))
        out=fetch_one("UPDATE reminders SET trigger_at=%s,enabled=true WHERE id=%s RETURNING *",(now()+timedelta(minutes=minutes),rid))
        return jsonify({"id":out["id"],"triggerAt":iso(out["trigger_at"])})
    except ValueError as e:return bad(str(e))

@app.get("/api/v1/goals")
@require("goals:read")
def goals(u):return jsonify([{"id":r["id"],"name":r["name"],"target":r["target"],"current":r["current"],"period":r["period"],"projectId":r["project_id"]} for r in fetch_all("SELECT * FROM goals WHERE user_id=%s ORDER BY created_at",(u["id"],))])
@app.post("/api/v1/goals")
@require("goals:write")
def goal_create(u):
    try:
        b=body();name=str(b.get("name","")).strip()
        if not 1<=len(name)<=200:raise ValueError("Goal name must be 1-200 characters")
        pid=uid(b["projectId"]) if b.get("projectId") else None
        if pid and not project_access(u["id"],pid,"viewer"):return bad("Project not accessible",403)
        target=max(1,int(b.get("target",1)));current=max(0,int(b.get("current",0)))
        r=fetch_one("INSERT INTO goals(id,user_id,project_id,name,target,current,period) VALUES(%s,%s,%s,%s,%s,%s,%s) RETURNING *",(str(uuid.uuid4()),u["id"],pid,name,target,current,str(b.get("period","weekly"))))
        return jsonify({"id":r["id"],"name":r["name"],"target":r["target"],"current":r["current"],"period":r["period"],"projectId":r["project_id"]}),201
    except (ValueError,TypeError) as e:return bad(str(e))
@app.patch("/api/v1/goals/<gid>")
@require("goals:write")
def goal_update(u,gid):
    try:
        gid=uid(gid);r=fetch_one("SELECT * FROM goals WHERE id=%s AND user_id=%s",(gid,u["id"]))
        if not r:return bad("Goal not found",404)
        b=body();r=fetch_one("UPDATE goals SET name=%s,target=%s,current=%s,period=%s,updated_at=%s WHERE id=%s RETURNING *",(str(b.get("name",r["name"])).strip(),max(1,int(b.get("target",r["target"]))),max(0,int(b.get("current",r["current"]))),str(b.get("period",r["period"])),now(),gid));return jsonify({"id":r["id"],"name":r["name"],"target":r["target"],"current":r["current"],"period":r["period"],"projectId":r["project_id"]})
    except ValueError as e:return bad(str(e))

@app.get("/api/v1/analytics/overview")
@require("analytics:read")
def analytics(u):
    s=fetch_one("SELECT COUNT(*) FILTER(WHERE status='active') active,COUNT(*) FILTER(WHERE status='completed') completed,COUNT(*) FILTER(WHERE status<>'completed' AND due_at IS NOT NULL AND due_at<%s) overdue,COALESCE(SUM(duration_minutes) FILTER(WHERE status='completed'),0) mins FROM tasks WHERE user_id=%s",(now(),u["id"]))
    trend=fetch_all("SELECT date_trunc('day',completed_at)::date day,COUNT(*) completed FROM tasks WHERE user_id=%s AND status='completed' GROUP BY 1 ORDER BY 1 DESC LIMIT 30",(u["id"],))
    rate=round((s["completed"] or 0)/max(1,(s["completed"] or 0)+(s["active"] or 0))*100,2)
    return jsonify({"active":s["active"],"completed":s["completed"],"overdue":s["overdue"],"minutesCompleted":int(s["mins"] or 0),"completionRate":rate,"trend":[{"day":str(r["day"]),"completed":r["completed"]} for r in trend]})

@app.get("/api/v1/calendar")
@require("tasks:read")
def calendar(u):
    start=dt(request.args.get("start")) or now()-timedelta(days=7);end=dt(request.args.get("end")) or now()+timedelta(days=30)
    rows=fetch_all("SELECT * FROM tasks WHERE user_id=%s AND status<>'deleted' AND ((due_at BETWEEN %s AND %s) OR (start_at BETWEEN %s AND %s)) ORDER BY COALESCE(start_at,due_at)",(u["id"],start,end,start,end));return jsonify([task_json(r) for r in rows])
@app.get("/api/v1/time-blocks")
@require("tasks:read")
def time_blocks(u):return jsonify([{"id":r["id"],"taskId":r["task_id"],"startAt":iso(r["start_at"]),"endAt":iso(r["end_at"]),"notes":r["notes"]} for r in fetch_all("SELECT * FROM time_blocks WHERE user_id=%s ORDER BY start_at",(u["id"],))])
@app.post("/api/v1/time-blocks")
@require("tasks:write")
def time_block_create(u):
    try:
        b=body();start=dt(b.get("startAt"));end=dt(b.get("endAt"))
        if not start or not end or end<=start:return bad("Valid startAt/endAt required")
        task_id=uid(b["taskId"]) if b.get("taskId") else None
        if task_id and not task_access(u["id"],task_id):return bad("Task not found",404)
        if fetch_one("SELECT id FROM time_blocks WHERE user_id=%s AND start_at<%s AND end_at>%s LIMIT 1",(u["id"],end,start)):return bad("Time block conflict",409)
        r=fetch_one("INSERT INTO time_blocks(id,user_id,task_id,start_at,end_at,notes) VALUES(%s,%s,%s,%s,%s,%s) RETURNING *",(str(uuid.uuid4()),u["id"],task_id,start,end,b.get("notes")));return jsonify({"id":r["id"],"taskId":r["task_id"],"startAt":iso(r["start_at"]),"endAt":iso(r["end_at"]),"notes":r["notes"]}),201
    except ValueError as e:return bad(str(e))

@app.get("/api/v1/templates")
@require("templates:read")
def templates(u):return jsonify([{"id":r["id"],"name":r["name"],"description":r["description"],"scope":r["scope"],"visibility":r["visibility"],"version":r["version"],"content":pj(r["content_json"],{})} for r in fetch_all("SELECT * FROM templates WHERE owner_id=%s ORDER BY name",(u["id"],))])
@app.post("/api/v1/templates")
@require("templates:write")
def template_create(u):
    b=body();r=fetch_one("INSERT INTO templates(id,owner_id,name,description,scope,visibility,content_json) VALUES(%s,%s,%s,%s,%s,%s,%s) RETURNING *",(str(uuid.uuid4()),u["id"],str(b.get("name","Template")),b.get("description"),str(b.get("scope","personal")),str(b.get("visibility","private")),j(b.get("content",{}))));return jsonify({"id":r["id"],"name":r["name"],"content":pj(r["content_json"],{})}),201
@app.post("/api/v1/templates/<tid>/apply")
@require("templates:write")
def template_apply(u,tid):
    try:
        r=fetch_one("SELECT * FROM templates WHERE id=%s AND owner_id=%s",(uid(tid),u["id"]))
        if not r:return bad("Template not found",404)
        made=[]
        for item in pj(r["content_json"],{}).get("tasks",[]):made.append(insert_task(u,validate_task(u["id"],item),item.get("labelIds",[])))
        return jsonify({"applied":True,"taskCount":len(made),"tasks":[task_json(x) for x in made]})
    except ValueError as e:return bad(str(e))

@app.get("/api/v1/automations")
@require("automations:read")
def automations(u):return jsonify([{"id":r["id"],"name":r["name"],"trigger":r["trigger"],"conditions":pj(r["conditions"],{}),"actions":pj(r["actions"],[]),"enabled":r["enabled"]} for r in fetch_all("SELECT * FROM automation_rules WHERE owner_id=%s ORDER BY created_at DESC",(u["id"],))])
@app.post("/api/v1/automations")
@require("automations:write")
def automation_create(u):
    b=body();r=fetch_one("INSERT INTO automation_rules(id,owner_id,name,trigger,conditions,actions,enabled) VALUES(%s,%s,%s,%s,%s,%s,%s) RETURNING *",(str(uuid.uuid4()),u["id"],str(b.get("name","Automation")),str(b.get("trigger","task_created")),j(b.get("conditions",{})),j(b.get("actions",[])),bool(b.get("enabled",True))));return jsonify({"id":r["id"],"name":r["name"],"trigger":r["trigger"],"conditions":pj(r["conditions"],{}),"actions":pj(r["actions"],[]),"enabled":r["enabled"]}),201
@app.patch("/api/v1/automations/<aid>")
@require("automations:write")
def automation_update(u,aid):
    try:
        aid=uid(aid);r=fetch_one("SELECT * FROM automation_rules WHERE id=%s AND owner_id=%s",(aid,u["id"]))
        if not r:return bad("Automation not found",404)
        b=body();r=fetch_one("UPDATE automation_rules SET name=%s,trigger=%s,conditions=%s,actions=%s,enabled=%s,updated_at=%s WHERE id=%s RETURNING *",(str(b.get("name",r["name"])),str(b.get("trigger",r["trigger"])),j(b.get("conditions",pj(r["conditions"],{}))),j(b.get("actions",pj(r["actions"],[]))),bool(b.get("enabled",r["enabled"])),now(),aid));return jsonify({"id":r["id"],"name":r["name"],"trigger":r["trigger"],"conditions":pj(r["conditions"],{}),"actions":pj(r["actions"],[]),"enabled":r["enabled"]})
    except ValueError as e:return bad(str(e))


@app.patch("/api/v1/templates/<tid>")
@require("templates:write")
def template_update(u,tid):
    try:
        tid=uid(tid);r=fetch_one("SELECT * FROM templates WHERE id=%s AND owner_id=%s",(tid,u["id"]))
        if not r:return bad("Template not found",404)
        b=body();out=fetch_one("UPDATE templates SET name=%s,description=%s,scope=%s,visibility=%s,version=version+1,content_json=%s,updated_at=%s WHERE id=%s RETURNING *",(str(b.get("name",r["name"])).strip(),b.get("description",r["description"]),str(b.get("scope",r["scope"])),str(b.get("visibility",r["visibility"])),j(b.get("content",pj(r["content_json"],{}))),now(),tid))
        return jsonify({"id":out["id"],"name":out["name"],"version":out["version"],"content":pj(out["content_json"],{})})
    except ValueError as e:return bad(str(e))

@app.delete("/api/v1/templates/<tid>")
@require("templates:write")
def template_delete(u,tid):
    try:
        if not fetch_one("DELETE FROM templates WHERE id=%s AND owner_id=%s RETURNING id",(uid(tid),u["id"])):return bad("Template not found",404)
        return "",204
    except ValueError as e:return bad(str(e))

@app.post("/api/v1/templates/<tid>/duplicate")
@require("templates:write")
def template_duplicate(u,tid):
    try:
        r=fetch_one("SELECT * FROM templates WHERE id=%s AND owner_id=%s",(uid(tid),u["id"]))
        if not r:return bad("Template not found",404)
        out=fetch_one("INSERT INTO templates(id,owner_id,name,description,scope,visibility,content_json) VALUES(%s,%s,%s,%s,%s,%s,%s) RETURNING *",(str(uuid.uuid4()),u["id"],r["name"]+" (copy)",r["description"],r["scope"],"private",r["content_json"]))
        return jsonify({"id":out["id"],"name":out["name"],"content":pj(out["content_json"],{})}),201
    except ValueError as e:return bad(str(e))

@app.get("/api/v1/api-tokens")
@require("tasks:read")
def api_tokens(u):return jsonify([{"id":r["id"],"name":r["name"],"scopes":pj(r["scopes"],[]),"createdAt":iso(r["created_at"]),"revokedAt":iso(r["revoked_at"])} for r in fetch_all("SELECT * FROM api_tokens WHERE owner_id=%s ORDER BY created_at DESC",(u["id"],))])
@app.post("/api/v1/api-tokens")
@require("tasks:write")
def api_token_create(u):
    try:
        b=body();scopes=b.get("scopes",["tasks:read","tasks:write"])
        if not isinstance(scopes,list) or not scopes or any(x not in SCOPES for x in scopes):raise ValueError("Invalid API token scopes")
        raw=tok("api");r=fetch_one("INSERT INTO api_tokens(id,owner_id,name,token_hash,scopes) VALUES(%s,%s,%s,%s,%s) RETURNING *",(str(uuid.uuid4()),u["id"],str(b.get("name","API token"))[:100],sh(raw),j(sorted(set(scopes)))));return jsonify({"id":r["id"],"name":r["name"],"scopes":scopes,"token":raw}),201
    except ValueError as e:return bad(str(e))
@app.delete("/api/v1/api-tokens/<tid>")
@require("tasks:write")
def api_token_delete(u,tid):
    try:execute("UPDATE api_tokens SET revoked_at=%s WHERE id=%s AND owner_id=%s",(now(),uid(tid),u["id"]));return "",204
    except ValueError as e:return bad(str(e))

@app.get("/api/v1/notifications")
@require("tasks:read")
def notifications(u):return jsonify([{"id":r["id"],"title":r["title"],"body":r["body"],"channel":r["channel"],"read":r["read"],"createdAt":iso(r["created_at"])} for r in fetch_all("SELECT * FROM notifications WHERE user_id=%s ORDER BY created_at DESC LIMIT 100",(u["id"],))])
@app.post("/api/v1/notifications/<nid>/read")
@require("tasks:write")
def notification_read(u,nid):
    try:execute("UPDATE notifications SET read=true WHERE id=%s AND user_id=%s",(uid(nid),u["id"]));return jsonify({"read":True})
    except ValueError as e:return bad(str(e))

@app.get("/api/v1/backup/export")
@require("tasks:read")
def backup_export(u):
    result={"version":3,"exportedAt":now().isoformat()}
    ownership={"projects":"user_id","sections":None,"tasks":"user_id","labels":"user_id","comments":"user_id","reminders":"user_id","goals":"user_id","saved_filters":"user_id","templates":"owner_id"}
    for table,owner_col in ownership.items():
        if table=="sections":rows=fetch_all("SELECT s.* FROM sections s JOIN projects p ON p.id=s.project_id WHERE p.user_id=%s",(u["id"],))
        else:rows=fetch_all("SELECT * FROM %s WHERE %s=%%s"%(table,owner_col),(u["id"],))
        for row in rows:
            for k,v in list(row.items()):row[k]=iso(v)
        result[table]=rows
    return jsonify(result)
@app.get("/api/v1/sync/pull")
@require("sync:read")
def sync_pull(u):
    try:
        cursor=max(0,int(request.args.get("cursor","0")))
        rows=fetch_all("SELECT * FROM sync_operations WHERE user_id=%s AND revision>%s ORDER BY revision LIMIT 500",(u["id"],cursor))
        return jsonify({"operations":[{"operationId":r["operation_id"],"revision":r["revision"],"resourceType":r["resource_type"],"resourceId":r["resource_id"],"mutation":pj(r["mutation_json"],{})} for r in rows],"nextCursor":rows[-1]["revision"] if rows else cursor})
    except ValueError as e:return bad(str(e))

@app.post("/api/v1/sync/push")
@require("sync:write")
def sync_push(u):
    try:
        ops=body().get("operations",[])
        if not isinstance(ops,list) or len(ops)>500:raise ValueError("operations must contain 0-500 items")
        results=[]
        for op in ops:
            op_id=str(op.get("operationId","")).strip()
            if not op_id or len(op_id)>200:raise ValueError("operationId is required and must be <=200 characters")
            rid=uid(op.get("resourceId"));kind=str(op.get("resourceType",""));mutation=op.get("mutation") or {}
            if kind!="task" or not isinstance(mutation,dict):raise ValueError("Only task sync operations are supported")
            existing=fetch_one("SELECT revision FROM sync_operations WHERE operation_id=%s AND user_id=%s",(op_id,u["id"]))
            if existing:
                results.append({"operationId":op_id,"status":"accepted","revision":existing["revision"]});continue
            current=task_access(u["id"],rid,"editor");action=mutation.get("action")
            if action=="create" and not current:
                data=validate_task(u["id"],mutation.get("data",{}))
                insert_task(u,data,(mutation.get("data") or {}).get("labelIds",[]),tid=rid)
            elif current and action=="delete":change_task(u["id"],rid,"deleted")
            elif current and action=="complete":change_task(u["id"],rid,"completed")
            elif current and action=="reopen":change_task(u["id"],rid,"active")
            elif current and action=="update":
                data=validate_task(u["id"],mutation.get("data",{}),current)
                execute("UPDATE tasks SET workspace_id=%s,parent_task_id=%s,assignee_id=%s,title=%s,description=%s,priority=%s,project_id=%s,section_id=%s,start_at=%s,due_at=%s,deadline_at=%s,duration_minutes=%s,timezone=%s,recurrence=%s,position=%s,updated_at=%s WHERE id=%s",(data["workspaceId"],data["parentTaskId"],data["assigneeId"],data["title"],data["description"],data["priority"],data["projectId"],data["sectionId"],data["startAt"],data["dueAt"],data["deadlineAt"],data["durationMinutes"],data["timezone"],data["recurrence"],data["position"],now(),rid))
            else:
                results.append({"operationId":op_id,"status":"conflict_or_not_found"});continue
            record_sync(u["id"],op_id,"task",rid,mutation)
            rev=fetch_one("SELECT revision FROM sync_state WHERE user_id=%s",(u["id"],))["revision"]
            results.append({"operationId":op_id,"status":"accepted","revision":rev})
        return jsonify({"results":results})
    except (ValueError,TypeError) as e:return bad(str(e))
@app.post("/api/v1/backup/import")
@require("tasks:write")
def backup_import(u):
    try:
        b=body();projects_map={};count=0
        for p in b.get("projects",[]):
            pid=str(uuid.uuid4());projects_map[str(p.get("id"))]=pid
            execute("INSERT INTO projects(id,user_id,name,description,color,icon,favorite,archived,position) VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s)",(pid,u["id"],str(p.get("name","Imported project"))[:200],p.get("description"),p.get("color"),p.get("icon"),bool(p.get("favorite",False)),bool(p.get("archived",False)),int(p.get("position",0))));count+=1
        for t in b.get("tasks",[]):
            execute("INSERT INTO tasks(id,user_id,project_id,title,description,priority,status,due_at,deadline_at,duration_minutes,recurrence,position) VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",(str(uuid.uuid4()),u["id"],projects_map.get(str(t.get("project_id") or t.get("projectId"))),str(t.get("title","Imported task"))[:500],t.get("description"),int(t.get("priority",4)),str(t.get("status","active")),dt(t.get("due_at") or t.get("dueAt")),dt(t.get("deadline_at") or t.get("deadlineAt")),t.get("duration_minutes") or t.get("durationMinutes"),t.get("recurrence"),str(t.get("position","a0"))));count+=1
        return jsonify({"imported":count})
    except (ValueError,KeyError,TypeError) as e:return bad("Invalid backup: "+str(e))

@app.post("/api/v1/ai/quick-add")
@require("tasks:write")
def ai_quick_add(u):
    b=body();base=os.getenv("AI_BASE_URL","");key=os.getenv("AI_API_KEY","");model=os.getenv("AI_MODEL","")
    if not base or not key or not model:return bad("AI provider is not configured",503)
    prompt=str(b.get("text",""));payload=json.dumps({"model":model,"messages":[{"role":"system","content":"Parse the input into structured task JSON."},{"role":"user","content":prompt}]}).encode()
    req=urlrequest.Request(base.rstrip("/")+"/chat/completions",data=payload,headers={"Content-Type":"application/json","Authorization":"Bearer "+key},method="POST")
    try:
        with urlrequest.urlopen(req,timeout=30) as response:return jsonify({"result":json.loads(response.read().decode())["choices"][0]["message"]["content"]})
    except Exception as e:return bad("AI request failed: %s"%e,503)

@app.get("/api/v1/activity")
@require("tasks:read")
def activity_feed(u):
    rows=fetch_all("SELECT * FROM activity_log WHERE user_id=%s ORDER BY created_at DESC LIMIT 200",(u["id"],));return jsonify([{"id":r["id"],"action":r["action"],"resourceType":r["resource_type"],"resourceId":r["resource_id"],"details":pj(r["details"],{}),"createdAt":iso(r["created_at"])} for r in rows])


@app.post("/api/v1/ai/breakdown")
@require("tasks:write")
def ai_breakdown(u):
    b=body();title=str(b.get("title","")).strip()
    if not title:return bad("title is required")
    base=os.getenv("AI_BASE_URL");key=os.getenv("AI_API_KEY");model=os.getenv("AI_MODEL")
    if not base or not key or not model:return bad("AI provider is not configured",503)
    payload=json.dumps({"model":model,"messages":[{"role":"system","content":"Return 3-7 concrete subtasks as a JSON array."},{"role":"user","content":title}]}).encode()
    try:
        req=urlrequest.Request(base.rstrip("/")+"/chat/completions",data=payload,headers={"Content-Type":"application/json","Authorization":"Bearer "+key},method="POST")
        with urlrequest.urlopen(req,timeout=30) as r:return jsonify({"result":json.loads(r.read().decode())["choices"][0]["message"]["content"]})
    except Exception as e:return bad("AI request failed: %s"%e,503)

@app.post("/api/v1/ai/rewrite")
@require("tasks:write")
def ai_rewrite(u):
    b=body();text=str(b.get("text","")).strip()
    if not text:return bad("text is required")
    base=os.getenv("AI_BASE_URL");key=os.getenv("AI_API_KEY");model=os.getenv("AI_MODEL")
    if not base or not key or not model:return bad("AI provider is not configured",503)
    payload=json.dumps({"model":model,"messages":[{"role":"system","content":"Rewrite task text clearly and concisely."},{"role":"user","content":text}]}).encode()
    try:
        req=urlrequest.Request(base.rstrip("/")+"/chat/completions",data=payload,headers={"Content-Type":"application/json","Authorization":"Bearer "+key},method="POST")
        with urlrequest.urlopen(req,timeout=30) as r:return jsonify({"result":json.loads(r.read().decode())["choices"][0]["message"]["content"]})
    except Exception as e:return bad("AI request failed: %s"%e,503)

@app.get("/api/v1/devices")
@require("tasks:read")
def device_list(u):
    return jsonify([{"id":r["id"],"platform":r["platform"],"name":r["name"],"lastSeenAt":iso(r["last_seen_at"]),"revokedAt":iso(r["revoked_at"])} for r in fetch_all("SELECT * FROM devices WHERE user_id=%s ORDER BY last_seen_at DESC",(u["id"],))])

@app.post("/api/v1/devices")
@require("devices:write")
def device_register(u):
    b=body();r=fetch_one("INSERT INTO devices(id,user_id,platform,name,push_token) VALUES(%s,%s,%s,%s,%s) RETURNING *",(str(uuid.uuid4()),u["id"],str(b.get("platform","web"))[:32],str(b.get("name","browser"))[:120],b.get("pushToken")))
    return jsonify({"id":r["id"],"platform":r["platform"],"name":r["name"],"lastSeenAt":iso(r["last_seen_at"])}),201

@app.errorhandler(413)
def too_large(_):return bad("Uploaded file is too large",413)

if __name__=="__main__":
    print("[To-Do] Starting Python application...",flush=True)
    try:init_db()
    except Exception as e:print("[To-Do] Database startup failed: %s"%e,flush=True);raise SystemExit(1)
    host=os.getenv("HOST","127.0.0.1");port=int(os.getenv("PORT","3000"));print("[To-Do] Open http://%s:%s"%(host,port),flush=True);app.run(host=host,port=port,debug=os.getenv("FLASK_DEBUG","0")=="1")
