import Link from "next/link";
import { requireAdmin } from "@/src/lib/authz";

export const metadata = { title: "Admin • Chaos In Full" };

export default async function AdminIndex() {
  const session = await requireAdmin();
  if (!session) return <div className="mx-auto max-w-4xl p-8">Forbidden</div>;
  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      <p className="mt-2 text-gray-400">Manage content and accounts.</p>
      <ul className="mt-6 space-y-3">
        <li><Link className="text-emerald-300 hover:underline" href="/admin/patch-notes">Patch Notes</Link></li>
        <li><Link className="text-emerald-300 hover:underline" href="/admin/items">Items</Link></li>
        <li><Link className="text-emerald-300 hover:underline" href="/admin/enemies">Enemies</Link></li>
  <li><Link className="text-emerald-300 hover:underline" href="/admin/world">World Editor</Link></li>
        <li><Link className="text-emerald-300 hover:underline" href="/admin/users">Users</Link></li>
      </ul>
    </section>
  );
}
