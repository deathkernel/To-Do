import os
from pathlib import Path
import psycopg
from dotenv import load_dotenv
from psycopg.rows import dict_row

load_dotenv()
ROOT=Path(__file__).resolve().parent

def database_url():
    return os.getenv("DATABASE_URL","postgresql://todo:todo_dev_only@localhost:5432/todo")

def get_conn():
    return psycopg.connect(database_url(),row_factory=dict_row,connect_timeout=int(os.getenv("DB_CONNECT_TIMEOUT","5")))

conn=get_conn

def fetch_one(sql,params=()):
    with get_conn() as c:
        with c.cursor() as cur:
            cur.execute(sql,params)
            return cur.fetchone()

def fetch_all(sql,params=()):
    with get_conn() as c:
        with c.cursor() as cur:
            cur.execute(sql,params)
            return cur.fetchall()

def execute(sql,params=()):
    with get_conn() as c:
        with c.cursor() as cur:
            cur.execute(sql,params)

def init_db():
    print("[To-Do] Connecting to PostgreSQL...",flush=True)
    with get_conn() as c:
        print("[To-Do] PostgreSQL connected.",flush=True)
        with c.cursor() as cur:
            print("[To-Do] Initializing database schema...",flush=True)
            cur.execute((ROOT/"schema.sql").read_text(encoding="utf-8"))
    print("[To-Do] Database schema ready.",flush=True)
