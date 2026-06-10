create table if not exists registration_leads (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  first_name text not null,
  preferred_language text not null default 'es' check (preferred_language in ('es', 'en')),
  phone_number text,
  status text not null default 'started' check (status in ('started', 'completed')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists registration_leads_status_idx on registration_leads (status);
create index if not exists registration_leads_created_at_idx on registration_leads (created_at desc);
