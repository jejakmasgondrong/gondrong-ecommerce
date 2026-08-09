-- Denormalize the reviewer name onto each review so the product page can
-- show it without exposing the whole profiles table to other users.

alter table public.reviews
  add column if not exists author_name text not null default '';