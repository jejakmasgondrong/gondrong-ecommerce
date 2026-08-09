import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { approveSeller, rejectSeller } from "@/lib/admin/actions";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") redirect("/");

  const { error } = await searchParams;

  const { data: sellers } = await supabase
    .from("seller_profiles")
    .select("user_id, store_name, description, status, created_at")
    .order("created_at", { ascending: false });

  const pending = sellers?.filter((s) => s.status === "pending") ?? [];
  const others = sellers?.filter((s) => s.status !== "pending") ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-bold">Admin</h1>

      {error === "failed" && (
        <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Something went wrong. Please try again.
        </p>
      )}

      <section className="mb-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            Pending sellers{" "}
            {pending.length > 0 && (
              <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-sm font-medium text-primary">
                {pending.length}
              </span>
            )}
          </h2>
        </div>

        {pending.length === 0 ? (
          <p className="text-muted-foreground">
            No pending seller applications.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {pending.map((s) => (
              <div key={s.user_id} className="rounded-xl border p-5">
                <p className="text-lg font-semibold">{s.store_name}</p>
                <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
                  {s.description || "No description"}
                </p>
                <div className="mt-4 flex gap-2">
                  <form
                    action={
                      approveSeller as unknown as (
                        fd: FormData
                      ) => Promise<void>
                    }
                  >
                    <input type="hidden" name="user_id" value={s.user_id} />
                    <button
                      type="submit"
                      className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                    >
                      Approve
                    </button>
                  </form>
                  <form
                    action={
                      rejectSeller as unknown as (fd: FormData) => Promise<void>
                    }
                  >
                    <input type="hidden" name="user_id" value={s.user_id} />
                    <button
                      type="submit"
                      className="rounded-md border px-4 py-2 text-sm font-medium text-destructive hover:bg-accent"
                    >
                      Reject
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {others.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-semibold">All sellers</h2>
          <div className="overflow-hidden rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="px-4 py-2 font-medium">Store</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Applied</th>
                </tr>
              </thead>
              <tbody>
                {others.map((s) => (
                  <tr key={s.user_id} className="border-t">
                    <td className="px-4 py-2">{s.store_name}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs capitalize ${
                          s.status === "active"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : "bg-destructive/10 text-destructive"
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {new Date(s.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}