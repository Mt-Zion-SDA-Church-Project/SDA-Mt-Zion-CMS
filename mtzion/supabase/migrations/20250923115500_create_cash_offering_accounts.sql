-- Cash Offering Accountability records
-- Stores one row per service/day capturing category amounts and computed total

create table if not exists public.cash_offering_accounts (
  id uuid primary key default gen_random_uuid(),
  service_date date not null,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),

  trust_fund bigint not null default 0,
  ekitundu_10 bigint not null default 0,
  camp_meeting_offering bigint not null default 0,
  ssabiti_13th bigint not null default 0,
  prime_radio bigint not null default 0,
  hope_channel_tv_uganda bigint not null default 0,
  eddwaliro_kireka bigint not null default 0,
  ebf_development_fund bigint not null default 0,
  ebirabo_ebyawamu bigint not null default 0,
  essomero_lya_ssabbiti bigint not null default 0,
  okwebaza bigint not null default 0,
  okusinza bigint not null default 0,
  ebirabo_ebirala bigint not null default 0,
  okuzimba bigint not null default 0,
  ekyemisana bigint not null default 0,
  social_and_welfare bigint not null default 0,
  camp_meeting_expense bigint not null default 0,
  enjiri bigint not null default 0,

  notes text,

  total bigint not null generated always as (
    trust_fund + ekitundu_10 + camp_meeting_offering + ssabiti_13th + prime_radio +
    hope_channel_tv_uganda + eddwaliro_kireka + ebf_development_fund + ebirabo_ebyawamu +
    essomero_lya_ssabbiti + okwebaza + okusinza + ebirabo_ebirala + okuzimba +
    ekyemisana + social_and_welfare + camp_meeting_expense + enjiri
  ) stored
);

-- Enable RLS with permissive policies for authenticated users (adjust later)
alter table public.cash_offering_accounts enable row level security;

do $$ begin
  create policy "accounts_select_own_or_all" on public.cash_offering_accounts
    for select to authenticated using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "accounts_insert_authenticated" on public.cash_offering_accounts
    for insert to authenticated with check (auth.uid() = created_by or created_by is null);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "accounts_update_creator" on public.cash_offering_accounts
    for update to authenticated using (auth.uid() = created_by) with check (auth.uid() = created_by);
exception when duplicate_object then null; end $$;

grant select, insert, update on public.cash_offering_accounts to authenticated;
grant select on public.cash_offering_accounts to anon;










