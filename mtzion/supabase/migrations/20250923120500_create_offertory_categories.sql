/*
  Offertory categories managed by admins, readable by members
*/

create table if not exists public.offertory_categories (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  label text not null,
  is_active boolean default true,
  created_at timestamptz default now(),
  created_by uuid references auth.users(id) default auth.uid()
);

alter table public.offertory_categories enable row level security;

-- Members/admins can view categories
drop policy if exists "Authenticated can view offertory categories" on public.offertory_categories;
create policy "Authenticated can view offertory categories" on public.offertory_categories
  for select to authenticated using (true);

-- Admins manage categories
drop policy if exists "Admins manage offertory categories" on public.offertory_categories;
create policy "Admins manage offertory categories" on public.offertory_categories
  for all to authenticated
  using (
    exists (
      select 1 from public.system_users su
      where su.user_id = auth.uid()
        and su.role in ('admin','super_admin')
        and su.is_active = true
    )
  )
  with check (
    exists (
      select 1 from public.system_users su
      where su.user_id = auth.uid()
        and su.role in ('admin','super_admin')
        and su.is_active = true
    )
  );


