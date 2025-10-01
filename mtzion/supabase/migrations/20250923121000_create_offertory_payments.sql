/*
  Member offertory payments + receipt
*/

create table if not exists public.offertory_payments (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.members(id),
  user_id uuid references auth.users(id) default auth.uid(),
  amount_ugx bigint not null,
  currency text default 'UGX',
  method text not null, -- mtn|airtel|card|paypal
  categories jsonb not null, -- [{key,label,amount}]
  notes text,
  provider_ref text, -- tx reference from gateway
  status text default 'completed', -- completed|failed|pending
  created_at timestamptz default now()
);

alter table public.offertory_payments enable row level security;

-- Members can read their own receipts
drop policy if exists "Members read own offertory payments" on public.offertory_payments;
create policy "Members read own offertory payments" on public.offertory_payments
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.system_users su
      where su.user_id = auth.uid() and su.role in ('admin','super_admin') and su.is_active = true
    )
  );

-- Insert permitted for authenticated (client) after successful payment
drop policy if exists "Authenticated can insert own offertory payment" on public.offertory_payments;
create policy "Authenticated can insert own offertory payment" on public.offertory_payments
  for insert to authenticated
  with check (user_id = auth.uid());


