import os,time,uuid
from datetime import datetime,timezone,timedelta
from db import execute,fetch_all,fetch_one,init_db

def now():return datetime.now(timezone.utc)

def next_trigger(value,rule):
    if not rule:return None
    text=str(rule).strip().lower()
    step=None
    if text in ("daily","every day"):step=timedelta(days=1)
    elif text in ("weekly","every week"):step=timedelta(weeks=1)
    elif text in ("monthly","every month"):step=timedelta(days=30)
    if not step:return None
    nxt=value+step;current=now()
    while nxt<=current:nxt+=step
    return nxt

def run_reminders():
    rows=fetch_all("""SELECT r.*,t.title FROM reminders r JOIN tasks t ON t.id=r.task_id
                      WHERE r.enabled=true AND r.trigger_at IS NOT NULL AND r.trigger_at<=%s
                      AND (r.last_triggered_at IS NULL OR r.last_triggered_at<r.trigger_at) LIMIT 100""",(now(),))
    for r in rows:
        execute("INSERT INTO notifications(id,user_id,task_id,title,body,channel) VALUES(%s,%s,%s,%s,%s,'in_app')",(str(uuid.uuid4()),r["user_id"],r["task_id"],"Reminder: "+r["title"],"Your task reminder is due."))
        nxt=next_trigger(r["trigger_at"],r["recurring_rule"])
        if nxt:execute("UPDATE reminders SET trigger_at=%s,last_triggered_at=%s WHERE id=%s",(nxt,now(),r["id"]))
        else:execute("UPDATE reminders SET last_triggered_at=%s WHERE id=%s",(now(),r["id"]))

def run_overdue():
    rows=fetch_all("SELECT id,user_id,title FROM tasks WHERE status='active' AND due_at IS NOT NULL AND due_at<%s LIMIT 100",(now(),))
    for r in rows:
        if not fetch_one("SELECT id FROM notifications WHERE user_id=%s AND task_id=%s AND title=%s AND created_at::date=CURRENT_DATE LIMIT 1",(r["user_id"],r["id"],"Overdue: "+r["title"])):
            execute("INSERT INTO notifications(id,user_id,task_id,title,body,channel) VALUES(%s,%s,%s,%s,%s,'in_app')",(str(uuid.uuid4()),r["user_id"],r["id"],"Overdue: "+r["title"],"This task is past its planned due time."))

def main():
    init_db();print("[To-Do Worker] Running",flush=True)
    while True:
        try:
            run_reminders();run_overdue()
        except Exception as exc:
            print("[To-Do Worker] Error:",exc,flush=True)
        time.sleep(max(1,int(os.getenv("WORKER_INTERVAL","15"))))

if __name__=="__main__":main()