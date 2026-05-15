create table if not exists jobs (
  job_id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists jobs_payload_gin_idx on jobs using gin (payload);
