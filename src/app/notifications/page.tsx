import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications/actions";

export const metadata: Metadata = { title: "Notifications" };

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, type, title, body, read, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Notifications</h1>
        {(notifications?.length ?? 0) > 0 && (
          <form action={markAllNotificationsRead}>
            <button
              type="submit"
              className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-accent"
            >
              Mark all read
            </button>
          </form>
        )}
      </div>

      {notifications?.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-muted-foreground">No notifications yet.</p>
          <Link
            href="/products"
            className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Browse products
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {notifications?.map((n) => (
            <li
              key={n.id}
              className={`flex items-start gap-3 rounded-xl border p-4 ${
                n.read ? "" : "border-primary/40 bg-primary/5"
              }`}
            >
              <form action={markNotificationRead} className="contents">
                <input type="hidden" name="id" value={n.id} />
                <button
                  type="submit"
                  className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full border-0 p-0"
                  aria-label={n.read ? "Read" : "Mark as read"}
                  title={n.read ? "Read" : "Mark as read"}
                >
                  <span
                    className={`block h-2.5 w-2.5 rounded-full ${
                      n.read ? "bg-muted" : "bg-primary"
                    }`}
                  />
                </button>
              </form>
              <div className="flex-1">
                <p className="font-medium">{n.title}</p>
                {n.body && (
                  <p className="text-sm text-muted-foreground">{n.body}</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {timeAgo(n.created_at)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}