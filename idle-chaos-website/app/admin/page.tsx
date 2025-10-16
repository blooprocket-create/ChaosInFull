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
    <section className="px-1 py-2 md:px-2 md:py-3">
      <div className="mb-4">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Admin Dashboard</h1>
        <p className="mt-1 muted">Manage content, data, and accounts.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map(c => (
          <Link key={c.href} href={c.href} className="group panel p-5 hover:bg-black/45 transition-colors">
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
