import { redirect } from "next/navigation";
import { getSession } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import LogoutButton from "@/src/components/LogoutButton";
import DeleteCharacterButton from "@/src/components/DeleteCharacterButton";

export default async function Dashboard() {
  const session = await getSession();
  if (!session) redirect("/login");
  const client = prisma as unknown as {
    character: { findMany: (args: { where: { userId: string }; orderBy?: { createdAt: "asc" | "desc" } }) => Promise<unknown[]> };
  };
  const [user, chars] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.userId }, include: { stats: true } }),
    client.character.findMany({ where: { userId: session.userId }, orderBy: { createdAt: "asc" } }),
  ]);
  if (!user) redirect("/login");
  const s = user.stats!;
  type CharLite = { id: string; name: string; class: string; level: number; gender?: string; hat?: string };
  const characters = (chars as unknown as CharLite[]) ?? [];
  return (
    <section className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-3xl font-bold">Welcome, {user.username}</h1>
      <p className="mt-2 text-gray-400 text-sm">Gold and Premium Gold are shared across your account.</p>
      <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[ 
          ["Gold", s.gold],
          ["Premium Gold", (s as unknown as { premiumGold?: number }).premiumGold ?? 0],
          ["Characters", characters.length],
          ["Member Since", user.createdAt.toLocaleDateString?.() ?? new Date(user.createdAt).toLocaleDateString()],
        ].map(([k, v]) => (
          <div key={String(k)} className="rounded border border-white/10 bg-black/40 p-4">
            <div className="text-xs uppercase text-gray-400">{k}</div>
            <div className="text-xl font-semibold">{String(v)}</div>
          </div>
        ))}
      </div>
      <div className="mt-10">
        <h2 className="text-2xl font-semibold">Your Characters</h2>
        {characters.length === 0 ? (
          <p className="mt-2 text-gray-400">No characters yet. Create one on the <a className="underline" href="/play">Play</a> page.</p>
        ) : (
          <ul className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {characters.map((c: CharLite) => (
              <li key={c.id} className="rounded border border-white/10 bg-black/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-white/90">{c.name}</div>
                    <div className="text-sm text-gray-400">{c.class} • Lv {c.level}</div>
                  </div>
                  <div className="flex gap-2">
                    <a href={`/play?ch=${c.id}`} className="btn inline-flex items-center px-3 py-1">Play</a>
                    <DeleteCharacterButton id={c.id} name={c.name} />
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-400">Gender: {String((c as { gender?: string }).gender)} • Hat: {String((c as { hat?: string }).hat)}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="mt-8">
        <LogoutButton className="rounded bg-red-600 hover:bg-red-500 px-4 py-2" />
      </div>
    </section>
  );
}
