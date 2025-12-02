create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.leaders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  job_title text,
  years_experience integer,
  past_companies text,
  image_url text
);

create trigger set_updated_at_leaders
  before update on public.leaders
  for each row
  execute function public.set_updated_at();
