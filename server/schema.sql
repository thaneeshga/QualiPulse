create table if not exists users(
 id uuid primary key default gen_random_uuid(), email text not null, name text not null, role text not null default 'manager' check(role in('admin','manager','viewer')),
 password_hash text not null, active boolean not null default true, failed_attempts int not null default 0, locked_until timestamptz, last_login timestamptz, created_at timestamptz not null default now());
create unique index if not exists users_email_uq on users(lower(email));
create table if not exists password_resets(id uuid primary key default gen_random_uuid(), user_id uuid not null references users(id) on delete cascade, token_hash text not null unique, expires_at timestamptz not null, used_at timestamptz, created_at timestamptz not null default now());
create table if not exists products(id serial primary key, code text not null unique, name text not null);
create table if not exists shifts(id serial primary key, name text not null unique);
create table if not exists production_lines(id serial primary key, name text not null unique);
create table if not exists teams(id serial primary key, name text not null unique);
create table if not exists operators(id serial primary key, operator_code text not null unique);
create table if not exists defect_reasons(id serial primary key, name text not null unique);
create table if not exists datasets(id uuid primary key default gen_random_uuid(), user_id uuid not null references users(id), filename text not null, row_count int not null, quality jsonb not null default '{}', active boolean not null default true, uploaded_at timestamptz not null default now());
create table if not exists production_records(
 id bigserial primary key, dataset_id uuid not null references datasets(id) on delete cascade, source_row int, record_date date not null,
 product_id int not null references products(id), shift_id int references shifts(id), line_id int references production_lines(id), team_id int references teams(id), operator_id int references operators(id),
 production_qty numeric not null check(production_qty>=0), defect_qty numeric not null check(defect_qty>=0), rework_qty numeric, downtime_hours numeric, unit_cost numeric, selling_price numeric, is_duplicate boolean not null default false,
 check(defect_qty<=production_qty));
create index if not exists pr_dataset_date on production_records(dataset_id,record_date);
create index if not exists pr_product on production_records(dataset_id,product_id);
create table if not exists defect_records(id bigserial primary key, production_record_id bigint not null references production_records(id) on delete cascade, reason_id int not null references defect_reasons(id), quantity numeric not null check(quantity>=0));
create index if not exists dr_record on defect_records(production_record_id);
create table if not exists ai_insights(id bigserial primary key, dataset_id uuid not null references datasets(id) on delete cascade, finding text not null, severity text not null, kind text not null, evidence text not null, impact text not null, action text not null, source text not null default 'rules', created_at timestamptz not null default now());
create table if not exists alerts(id bigserial primary key, dataset_id uuid not null references datasets(id) on delete cascade, alert_key text not null, type text not null, severity text not null, title text not null, evidence text not null, created_at timestamptz not null default now(), unique(dataset_id,alert_key));
create table if not exists actions(id uuid primary key default gen_random_uuid(), user_id uuid not null references users(id), alert_key text, title text not null, priority text not null check(priority in('Critical','High','Medium','Low')), reason text not null default '', recommendation text not null default '', status text not null default 'Open' check(status in('Open','Investigating','Action Taken','Resolved')), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists improvement_records(id uuid primary key default gen_random_uuid(), user_id uuid not null references users(id), problem text not null, action text not null, product_id int references products(id), action_date date not null, window_days int not null check(window_days in(7,14,30)), created_at timestamptz not null default now());
alter table production_records add column if not exists missing_fields text[] not null default '{}';
create index if not exists datasets_active on datasets(active,uploaded_at desc);
-- Lock every table to the server only. On Supabase this stops the public REST API (anon and authenticated keys) from reading anything, including password hashes.
do $$ declare t text; begin
 for t in select tablename from pg_tables where schemaname='public' loop execute format('alter table public.%I enable row level security',t); end loop;
 if exists(select 1 from pg_roles where rolname='anon') then revoke all on all tables in schema public from anon; revoke all on all sequences in schema public from anon; end if;
 if exists(select 1 from pg_roles where rolname='authenticated') then revoke all on all tables in schema public from authenticated; revoke all on all sequences in schema public from authenticated; end if;
end $$;
