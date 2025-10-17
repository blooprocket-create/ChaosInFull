import { redirect } from "next/navigation";
import { getSession } from "@/src/lib/auth";
import { sql } from "@/src/lib/db";
import LogoutButton from "@/src/components/LogoutButton";
import CharacterDashboardCard, { CharacterSummary } from "@/src/components/CharacterDashboardCard";
import { taglines } from "@/src/data/flavor";

export default async function Dashboard() {
  const session = await getSession();
  if (!session) redirect("/login");
  const users = await (sql`
    select u.id, u.createdat, ps.gold, ps.premiumgold
    from "User" u
    left join "PlayerStat" ps on ps.userid = u.id
    where u.id = ${session.userId}
    limit 1
  ` as unknown as Array<{ id: string; createdat: string; gold: number; premiumgold: number }>);
  const user = users[0];
  if (!user) redirect("/login");
  const charsRaw = await (sql`
    select id, name, class, level,
           mininglevel, woodcuttinglevel, craftinglevel, fishinglevel,
           lastscene, lastseenat
    from "Character"
    where userid = ${session.userId}
    order by createdat asc
  ` as unknown as Array<{
    id: string; name: string; class: string; level: number;
    mininglevel: number; woodcuttinglevel: number; craftinglevel: number; fishinglevel: number;
    lastscene: string; lastseenat: string;
  }>);
  const now = Date.now();
  const characters: CharacterSummary[] = charsRaw.map(c => ({
    id: c.id,
    name: c.name,
    class: c.class,
    level: c.level,
    miningLevel: c.mininglevel,
    woodcuttingLevel: c.woodcuttinglevel,
    craftingLevel: c.craftinglevel,
    fishingLevel: c.fishinglevel,
    lastScene: c.lastscene,
    afkMs: Math.max(0, now - new Date(c.lastseenat).getTime()),
  }));
  return (
    <section className="mx-auto max-w-5xl px-4 py-12">
  <h1 className="text-3xl font-bold">{taglines.dashboardHeader}</h1>
  <p className="mt-2 text-gray-400 text-sm">{taglines.dashboardSubtitle}</p>
      <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[ 
          ["Gold", user.gold ?? 0],
          ["Premium Gold", user.premiumgold ?? 0],
          ["Characters", characters.length],
          ["Member Since", new Date(user.createdat).toLocaleDateString()],
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
