# Debugging Notes — GondrongShop

Common issues encountered during development and their verified fixes.

## 1. Auth redirect loop on login

**Symptom:** `/login` redirects back to `/login` endlessly after signing in.

**Root cause:** The server action used a raw `createClient()` that did not write the auth session cookies into the current request, so `getUser()` never resolved to a logged-in user.

**Fix:** Use the SSG part of client-side `supabase.auth.signInWithPassword()` so the session cookie is set by Supabase SSR, or ensure the server `createClient()` is the SSR variant (`@supabase/ssr`). See `src/store of truth: src/lib/supabase/server.ts`.

## 2. Black text on buttons after shadcn-style theming

**Symptom:** Button text is black on near-black buttons in production.

**Root cause:** The page `<html>` was missing the `dark` class, so CSS variables resolved to light-theme values while the visuals used the dark theme.

**Fix:** Add `dark` class to `<html>` (see `src/app/layout.tsx`).

## 3. Photos not uploading (storage)

**Symptom:** Product photo upload fails or images don't appear.

**Common causes & fixes:**

- **Bucket policies** — make sure the bucket `product-images` has a public read policy and the path-prefixed auth policy (owner uploads under `{user_id}/{uuid}.webp`).
- **File size** — the uploader resizes to WebP ≤1200px and enforces a 30MB input cap; very large inputs error on purpose.
- **Missing folder ownership** — Supabase Storage requires the path owner and policy prefix to match the authenticated user.

## 4. Realtime notifications not arriving

**Symptom:** Notification bell doesn't update after an order event.

**Root cause:** The `notifications` table is not published to the `supabase_realtime` publication.

**Fix:**

```sql
alter publication supabase_realtime add table public.notifications;
```

## 5. Place order RPC permission error

**Symptom:** Checkout fails with a permission denied on the `place_order` function.

**Root cause:** The RPC function runs with `security definer` but the caller's role is not allowed, or the function wasn't granted.

**Fix:** Create the function with `security definer` and grant `execute to authenticated`:

```sql
grant execute on function public.place_order to authenticated;
```

## 6. Reviews can't see author names

**Symptom:** Review list shows blank author names.

**Root cause:** `profiles` RLS only allows reading your own profile, so a join to `profiles(full_name)` returns empty for other users.

**Fix:** Denormalize the author name into `reviews.author_name` at submit time instead of joining `profiles`.

## 7. "Requested entity too large" on upload

**Symptom:** Image upload fails with a 413.

**Cause:** Supabase storage has a max size; browser resizing to WebP keeps images well under the limit, so this usually means the HTTP request body limit was hit (e.g. very large input image).

**Fix:** Keep source images reasonable; the uploader already resizes and compresses before sending.

---

Keep this file updated: whenever a new issue is debugged, add the symptom / root cause / fix above.