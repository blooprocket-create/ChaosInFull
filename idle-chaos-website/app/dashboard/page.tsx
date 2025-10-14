import { redirect } from "next/navigation";
import { getSession } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import LogoutButton from "@/src/components/LogoutButton";
import CharacterDashboardCard, { CharacterSummary } from "@/src/components/CharacterDashboardCard";
import { taglines } from "@/src/data/flavor";

export default async function Dashboard() {
  const session = await getSession();
  if (!session) redirect("/login");
  const user = await prisma.user.findUnique({ where: { id: session.userId }, include: { stats: true } });
  if (!user) redirect("/login");
  // Fetch characters via direct prisma (defensive cast) including skill levels & scene fields
  const charsRaw = await (prisma as unknown as { character: { findMany: (args: { where: { userId: string }; orderBy: { createdAt: "asc" | "desc" } }) => Promise<Array<{ id: string; name: string; class: string; level: number; miningLevel: number; woodcuttingLevel: number; craftingLevel: number; fishingLevel: number; lastScene: string; lastSeenAt: Date }> > } }).character.findMany({ where: { userId: session.userId }, orderBy: { createdAt: "asc" } });
  const now = Date.now();
  const characters: CharacterSummary[] = charsRaw.map(c => ({ ...c, afkMs: Math.max(0, now - new Date(c.lastSeenAt).getTime()) }));
  const s = user.stats!;
  return (
    <section className="mx-auto max-w-5xl px-4 py-12">
  <h1 className="text-3xl font-bold">{taglines.dashboardHeader}</h1>
  <p className="mt-2 text-gray-400 text-sm">{taglines.dashboardSubtitle}</p>
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
          <p className="mt-2 text-gray-400">{taglines.charactersEmpty}</p>
        ) : (
          <ul className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {characters.map((c) => (
              <li key={c.id}>
                <CharacterDashboardCard c={c} />
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
