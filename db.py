import os
from pathlib import Path
import psycopg
from psycopg.rows import dict_row
from dotenv import load_dotenv

load_dotenv()
ROOT=Path(__file__).resolve().parent

def database_url():
    return os.getenv("DATABASE_URL","postgresql://todo:todo_dev_only@localhost:5432/todo")

def conn():
    return psycopg.connect(database_url(),row_factory=dict_row)

def fetch_one(sql,params=()):
    with conn() as c:
        with c.cursor() as cur:
            cur.execute(sql,params)
            return cur.fetchone()

def fetch_all(sql,params=()):
    with conn() as c:
        with c.cursor() as cur:
            cur.execute(sql,params)
            return cur.fetchall()

def execute(sql,params=()):
    with conn() as c:
        with c.cursor() as cur: cur.execute(sql,params)

def init_db():
    with conn() as c:
        with c.cursor() as cur: cur.execute((ROOT/"schema.sql").read_text(encoding="utf-8"))
