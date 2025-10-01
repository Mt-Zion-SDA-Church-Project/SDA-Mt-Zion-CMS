/*
  Universal notifications system for members
*/

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  type text not null, -- 'event', 'birthday', 'receipt', 'announcement', 'system'
  title text not null,
  message text,
  data jsonb, -- extra data like event_id, receipt_id, etc
  is_read boolean default false,
  created_at timestamptz default now()
);

alter table public.notifications enable row level security;

-- Users can read their own notifications
drop policy if exists "Users read own notifications" on public.notifications;
create policy "Users read own notifications" on public.notifications
  for select to authenticated
  using (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
drop policy if exists "Users update own notifications" on public.notifications;
create policy "Users update own notifications" on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- System can insert notifications (via triggers/functions)
drop policy if exists "System can insert notifications" on public.notifications;
create policy "System can insert notifications" on public.notifications
  for insert to authenticated
  with check (true);

-- Function to create event notifications
create or replace function create_event_notification()
returns trigger as $$
begin
  insert into public.notifications (user_id, type, title, message, data)
  select 
    m.user_id,
    'event',
    'New Event: ' || NEW.title,
    'A new event "' || NEW.title || '" has been scheduled for ' || NEW.event_date::date,
    jsonb_build_object('event_id', NEW.id, 'event_date', NEW.event_date)
  from public.members m
  where m.user_id is not null;
  
  return NEW;
end;
$$ language plpgsql;

-- Function to create birthday notifications (for upcoming birthdays)
create or replace function create_birthday_notification()
returns trigger as $$
begin
  -- Only create notification if birthday is within next 7 days
  if extract(doy from NEW.date_of_birth) between extract(doy from current_date) and extract(doy from current_date + interval '7 days') then
    insert into public.notifications (user_id, type, title, message, data)
    select 
      m.user_id,
      'birthday',
      'Upcoming Birthday: ' || NEW.first_name || ' ' || NEW.last_name,
      NEW.first_name || ' ' || NEW.last_name || '''s birthday is coming up!',
      jsonb_build_object('member_id', NEW.id, 'birthday', NEW.date_of_birth)
    from public.members m
    where m.user_id is not null and m.id != NEW.id;
  end if;
  
  return NEW;
end;
$$ language plpgsql;

-- Function to create receipt notifications
create or replace function create_receipt_notification()
returns trigger as $$
begin
  insert into public.notifications (user_id, type, title, message, data)
  values (
    NEW.user_id,
    'receipt',
    'Offertory Receipt Generated',
    'Your offertory payment of USh ' || NEW.amount_ugx || ' has been processed.',
    jsonb_build_object('receipt_id', NEW.id, 'amount', NEW.amount_ugx)
  );
  
  return NEW;
end;
$$ language plpgsql;

-- Create triggers
drop trigger if exists event_notification_trigger on public.events;
create trigger event_notification_trigger
  after insert on public.events
  for each row execute function create_event_notification();

drop trigger if exists birthday_notification_trigger on public.members;
create trigger birthday_notification_trigger
  after insert or update on public.members
  for each row execute function create_birthday_notification();

drop trigger if exists receipt_notification_trigger on public.offertory_payments;
create trigger receipt_notification_trigger
  after insert on public.offertory_payments
  for each row execute function create_receipt_notification();
