import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatIDR } from "@/lib/format";
import {
  approveSeller,
  rejectSeller,
  toggleProductStatus,
  setUserRole,
  createCategory,
  deleteCategory,
} from "@/lib/admin/actions";
import AdminDeleteProductButton from "@/components/admin-delete-product-button";

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

  const [{ data: sellers }, { data: products }, { data: users }, { data: categories }] =
    await Promise.all([
      supabase
        .from("seller_profiles")
        .select("user_id, store_name, description, status, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("products")
        .select("id, seller_id, name, price_cents, stock, status, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("id, full_name, email, role, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("categories")
        .select("id, name, slug")
        .order("name", { ascending: true }),
    ]);

  const pending = sellers?.filter((s) => s.status === "pending") ?? [];
  const others = sellers?.filter((s) => s.status !== "pending") ?? [];

  const storeName = new Map(
    (sellers ?? []).map((s) => [s.user_id, s.store_name])
  );

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
        <section className="mb-10">
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

      <section className="mb-10">
        <h2 className="mb-4 text-xl font-semibold">Products ({products?.length ?? 0})</h2>
        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="px-4 py-2 font-medium">Product</th>
                <th className="px-4 py-2 font-medium">Store</th>
                <th className="px-4 py-2 font-medium">Price</th>
                <th className="px-4 py-2 font-medium">Stock</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(products ?? []).map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="max-w-[220px] px-4 py-2">
                    <span className="block truncate">{p.name}</span>
                  </td>
                  <td className="px-4 py-2">
                    {storeName.get(p.seller_id) || "—"}
                  </td>
                  <td className="px-4 py-2">{formatIDR(p.price_cents)}</td>
                  <td className="px-4 py-2">{p.stock}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs capitalize ${
                        p.status === "active"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2">
                      <form action={toggleProductStatus as unknown as (fd: FormData) => Promise<void>}>
                        <input type="hidden" name="id" value={p.id} />
                        <button
                          type="submit"
                          className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent"
                        >
                          {p.status === "active" ? "Deactivate" : "Activate"}
                        </button>
                      </form>
                      <AdminDeleteProductButton productId={p.id} name={p.name} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-xl font-semibold">Users ({users?.length ?? 0})</h2>
        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Role</th>
              </tr>
            </thead>
            <tbody>
              {(users ?? []).map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="px-4 py-2">{u.full_name || "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-2">
                    <form
                      action={setUserRole as unknown as (fd: FormData) => Promise<void>}
                      className="flex items-center gap-2"
                    >
                      <input type="hidden" name="user_id" value={u.id} />
                      <select
                        name="role"
                        defaultValue={u.role}
                        className="rounded-md border bg-background px-2 py-1 text-sm"
                      >
                        <option value="buyer">buyer</option>
                        <option value="seller">seller</option>
                        <option value="admin">admin</option>
                      </select>
                      <button
                        type="submit"
                        className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent"
                      >
                        Set
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-xl font-semibold">Categories ({categories?.length ?? 0})</h2>
        <form
          action={createCategory as unknown as (fd: FormData) => Promise<void>}
          className="mb-4 flex max-w-md gap-2"
        >
          <input
            name="name"
            required
            placeholder="New category name"
            className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Add
          </button>
        </form>
        <div className="flex flex-wrap gap-2">
          {(categories ?? []).map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm"
            >
              {c.name}
              <form action={deleteCategory as unknown as (fd: FormData) => Promise<void>}>
                <input type="hidden" name="id" value={c.id} />
                <button
                  type="submit"
                  aria-label={`Delete category ${c.name}`}
                  className="text-muted-foreground hover:text-destructive"
                >
                  ×
                </button>
              </form>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}