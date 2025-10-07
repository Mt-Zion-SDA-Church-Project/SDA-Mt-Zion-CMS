/*
  Add gallery notification triggers
*/

-- Function to create gallery upload notifications
create or replace function create_gallery_notification()
returns trigger as $$
begin
  -- Notify all members about new gallery upload
  insert into public.notifications (user_id, type, title, message, data)
  select 
    m.user_id,
    'gallery',
    'New Gallery Album: ' || NEW.title,
    'A new photo album "' || NEW.title || '" has been uploaded to the gallery.',
    jsonb_build_object('gallery_id', NEW.id, 'event_id', NEW.event_id)
  from public.members m
  where m.user_id is not null;
  
  return NEW;
end;
$$ language plpgsql;

-- Create trigger for gallery uploads
drop trigger if exists gallery_notification_trigger on public.galleries;
create trigger gallery_notification_trigger
  after insert on public.galleries
  for each row execute function create_gallery_notification();

