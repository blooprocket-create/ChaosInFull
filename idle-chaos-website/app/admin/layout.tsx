import Link from "next/link";
import { requireAdmin } from "@/src/lib/authz";
import { Toaster } from "@/src/components/Toaster";

export const metadata = { title: "Admin • Chaos In Full" };

const nav = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/patch-notes", label: "Patch Notes" },
  { href: "/admin/items", label: "Items" },
  { href: "/admin/enemies", label: "Enemies" },
  { href: "/admin/world", label: "World" },
  { href: "/admin/users", label: "Users" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  if (!session) return <div className="mx-auto max-w-4xl p-8">Forbidden</div>;
  return (
    <div className="admin-container">
      <header className="sticky top-0 z-30 -mx-4 md:-mx-6 px-4 md:px-6 py-3 backdrop-blur bg-black/40 border-b border-white/10">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div className="text-sm font-semibold tracking-wide text-gray-200">Chaos In Full • Admin</div>
          <nav className="flex items-center gap-3 text-sm">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="nav-underline text-gray-300 hover:text-emerald-300">
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 md:px-6 py-6">
        {children}
      </main>
      <Toaster />
    </div>
  );
}
