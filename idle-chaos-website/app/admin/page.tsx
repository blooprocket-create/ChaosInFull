import Link from "next/link";
import { requireAdmin } from "@/src/lib/authz";

export const metadata = { title: "Admin • Chaos In Full" };

const cards: Array<{ href: string; title: string; desc: string }> = [
  { href: "/admin/patch-notes", title: "Patch Notes", desc: "Write and edit game updates." },
  { href: "/admin/items", title: "Items", desc: "Create, edit, and price items." },
  { href: "/admin/enemies", title: "Enemies", desc: "Balance stats and rewards." },
  { href: "/admin/world", title: "World Editor", desc: "Zones, portals, and spawns." },
  { href: "/admin/users", title: "Users", desc: "Administer player accounts." },
];

export default async function AdminIndex() {
  const session = await requireAdmin();
  if (!session) return <div className="mx-auto max-w-4xl p-8">Forbidden</div>;
  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Admin Dashboard</h1>
          <p className="mt-2 text-gray-400">Manage content, data, and accounts.</p>
        </div>
      </div>
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {cards.map(c => (
          <Link key={c.href} href={c.href} className="group rounded-lg border border-white/10 bg-black/30 p-5 hover:bg-black/40 transition-colors">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold group-hover:text-emerald-300">{c.title}</h2>
              <span className="text-xs text-gray-400">Open →</span>
            </div>
            <p className="mt-2 text-sm text-gray-300">{c.desc}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
