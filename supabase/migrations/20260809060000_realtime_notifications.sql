-- Subscribe the notifications table to Supabase Realtime so the
-- navbar bell can update live when a new notification is inserted.

alter publication supabase_realtime add table public.notifications;