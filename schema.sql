CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users(id uuid PRIMARY KEY,email varchar(320) UNIQUE NOT NULL,display_name varchar(120) NOT NULL,password_hash text,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),email_verified boolean NOT NULL DEFAULT false,mfa_secret text,mfa_enabled boolean NOT NULL DEFAULT false);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_secret text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS sessions(id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,token_hash text UNIQUE NOT NULL,expires_at timestamptz NOT NULL,revoked_at timestamptz,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
CREATE TABLE IF NOT EXISTS password_reset_tokens(id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,token_hash text UNIQUE NOT NULL,expires_at timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS email_verification_tokens(id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,token_hash text UNIQUE NOT NULL,expires_at timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS mfa_challenges(id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,token_hash text UNIQUE NOT NULL,expires_at timestamptz NOT NULL);

CREATE TABLE IF NOT EXISTS workspaces(id uuid PRIMARY KEY,owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,name varchar(200) NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS workspace_members(workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,role varchar(32) NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(workspace_id,user_id));

CREATE TABLE IF NOT EXISTS projects(id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,parent_id uuid,workspace_id uuid REFERENCES workspaces(id) ON DELETE SET NULL,name varchar(200) NOT NULL,description text,color varchar(32),icon varchar(64),favorite boolean NOT NULL DEFAULT false,archived boolean NOT NULL DEFAULT false,position integer NOT NULL DEFAULT 0,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE projects ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES workspaces(id) ON DELETE SET NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS parent_id uuid;
CREATE INDEX IF NOT EXISTS projects_user_idx ON projects(user_id);
CREATE INDEX IF NOT EXISTS projects_workspace_idx ON projects(workspace_id);
CREATE TABLE IF NOT EXISTS project_members(project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,role varchar(32) NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(project_id,user_id));

CREATE TABLE IF NOT EXISTS sections(id uuid PRIMARY KEY,project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,name varchar(200) NOT NULL,position integer NOT NULL DEFAULT 0,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS tasks(id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,workspace_id uuid REFERENCES workspaces(id) ON DELETE SET NULL,parent_task_id uuid,project_id uuid REFERENCES projects(id) ON DELETE SET NULL,section_id uuid REFERENCES sections(id) ON DELETE SET NULL,assignee_id uuid REFERENCES users(id) ON DELETE SET NULL,title varchar(500) NOT NULL,description text,priority integer NOT NULL DEFAULT 4,status varchar(20) NOT NULL DEFAULT 'active',start_at timestamptz,due_at timestamptz,deadline_at timestamptz,duration_minutes integer,timezone varchar(64) DEFAULT 'UTC',recurrence text,position varchar(100) NOT NULL DEFAULT 'a0',completed_at timestamptz,deleted_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES workspaces(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assignee_id uuid REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_at timestamptz;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS timezone varchar(64) DEFAULT 'UTC';
CREATE INDEX IF NOT EXISTS tasks_user_idx ON tasks(user_id);
CREATE INDEX IF NOT EXISTS tasks_project_idx ON tasks(project_id);
CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks(status);
CREATE INDEX IF NOT EXISTS tasks_due_idx ON tasks(due_at);

CREATE TABLE IF NOT EXISTS labels(id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,name varchar(100) NOT NULL,color varchar(32),description text,favorite boolean NOT NULL DEFAULT false,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS task_labels(task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,label_id uuid NOT NULL REFERENCES labels(id) ON DELETE CASCADE,PRIMARY KEY(task_id,label_id));
CREATE TABLE IF NOT EXISTS task_dependencies(task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,depends_on_task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(task_id,depends_on_task_id));
CREATE TABLE IF NOT EXISTS saved_filters(id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,name varchar(200) NOT NULL,query text NOT NULL,color varchar(32),created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS reminders(id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,trigger varchar(32) NOT NULL,trigger_at timestamptz,minutes_before integer,location_id varchar(200),recurring_rule text,enabled boolean NOT NULL DEFAULT true,last_triggered_at timestamptz,created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS last_triggered_at timestamptz;

CREATE TABLE IF NOT EXISTS comments(id uuid PRIMARY KEY,task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,body text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS attachments(id uuid PRIMARY KEY,task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,name varchar(255) NOT NULL,storage_key text NOT NULL UNIQUE,mime_type varchar(120),size_bytes bigint,created_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS goals(id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,project_id uuid REFERENCES projects(id) ON DELETE SET NULL,name varchar(200) NOT NULL,target integer NOT NULL,current integer NOT NULL DEFAULT 0,period varchar(32) NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE goals ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES projects(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS automation_rules(id uuid PRIMARY KEY,owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,name varchar(200) NOT NULL,trigger text NOT NULL,conditions text NOT NULL,actions text NOT NULL,enabled boolean NOT NULL DEFAULT true,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS automation_executions(id uuid PRIMARY KEY,rule_id uuid NOT NULL REFERENCES automation_rules(id) ON DELETE CASCADE,status varchar(32) NOT NULL,error text,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS templates(id uuid PRIMARY KEY,owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,name varchar(200) NOT NULL,description text,scope varchar(32) NOT NULL,visibility varchar(32) NOT NULL,version integer NOT NULL DEFAULT 1,content_json text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS devices(id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,platform varchar(32) NOT NULL,name varchar(120),push_token text,last_seen_at timestamptz NOT NULL DEFAULT now(),revoked_at timestamptz);
CREATE TABLE IF NOT EXISTS time_blocks(id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,start_at timestamptz NOT NULL,end_at timestamptz NOT NULL,notes text,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS activity_log(id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,action varchar(64) NOT NULL,resource_type varchar(64) NOT NULL,resource_id uuid,details text NOT NULL DEFAULT '{}',created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS notifications(id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,title varchar(200) NOT NULL,body text NOT NULL,channel varchar(32) NOT NULL DEFAULT 'in_app',read boolean NOT NULL DEFAULT false,created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES tasks(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS notifications_task_idx ON notifications(task_id);
CREATE TABLE IF NOT EXISTS sync_state(user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,revision integer NOT NULL DEFAULT 0,updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS sync_operations(operation_id varchar(200) PRIMARY KEY,user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,revision integer NOT NULL,resource_type varchar(64) NOT NULL,resource_id uuid NOT NULL,mutation_json text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(user_id,revision));
CREATE TABLE IF NOT EXISTS api_tokens(id uuid PRIMARY KEY,owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,name varchar(100) NOT NULL,token_hash text UNIQUE NOT NULL,scopes text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),revoked_at timestamptz);
