import { patchNotes as staticNotes } from "@/src/data/patchNotes";
import { sql } from "@/src/lib/db";
export const metadata = { title: "News • Veil Keeper", description: "Development dispatches and patch notes.", openGraph: { title: "Veil Keeper News", images: ["/og/news.png"] } };

export default async function NewsPage() {
  // Load patch notes from DB; merge with static notes (dedupe by version)
  let patchNotes = staticNotes;
  try {
    const rows = await (sql`
      select to_char(date, 'YYYY-MM-DD') as date, version, title, highlights, notes
      from "PatchNote"
      order by date desc, version desc
    ` as unknown as Array<{ date: string; version: string; title: string; highlights: unknown; notes?: unknown }>);
    if (Array.isArray(rows) && rows.length) {
      const dbNotes = rows.map(r => ({
        date: r.date,
        version: r.version,
        title: r.title,
        highlights: Array.isArray(r.highlights) ? (r.highlights as string[]) : [],
        notes: Array.isArray(r.notes) ? (r.notes as string[]) : undefined,
      }));
      const seen = new Set(dbNotes.map(n => n.version));
      const rest = staticNotes.filter(n => !seen.has(n.version));
      patchNotes = [...dbNotes, ...rest];
    }
  } catch {}
  const posts = [
    { title: "BIG NEWS: Testing is live", date: "2025-10-16", excerpt: "Public testing has begun. A bug report page is coming soon—expect it to judge your typos and our code equally." },
    { title: "Somewhat Playable Build Deployed", date: "2025-10-14", excerpt: "You can move, mine, craft queues, and pretend this is stable. Expect polite desyncs." },
    { title: "Website MVP is live", date: "2025-10-14", excerpt: "Accounts, login, dashboard stats. UI now judges your AFK duration." },
    { title: "Town zone planning", date: "2025-10-14", excerpt: "Workbench, Anvil, Furnace, Storage modal, Task Board sketch, tutorial NPC script drafts." },
  ];
  return (
    <section className="relative mx-auto max-w-5xl px-4 py-12">
      {/* ambience */}
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-10 bg-[radial-gradient(circle_at_30%_20%,rgba(168,85,247,0.3),transparent_40%),radial-gradient(circle_at_70%_60%,rgba(239,68,68,0.25),transparent_45%)]" />

  <h1 className="text-3xl font-bold glitch" data-text="News">News</h1>
  <p className="mt-2 text-gray-300 max-w-prose text-sm md:text-base">Development dispatches and patch notes. Read what changed instead of reverse engineering the crafting math at 3am. If something breaks, assume it was intentional lore until patched.</p>

      <div className="mt-6 grid sm:grid-cols-2 gap-4">
        {posts.map((p) => (
          <article key={p.title}
                   className="group rounded border border-white/10 bg-black/40 p-4 transition-transform duration-200 hover:-translate-y-1 relative overflow-hidden">
            <div className="absolute -right-6 -top-6 size-24 rounded-full blur-2xl bg-white/5 group-hover:bg-white/10 transition-colors" />
            <div className="text-xs text-gray-400">{p.date}</div>
            <h2 className="text-lg font-semibold blood-underline inline-block">{p.title}</h2>
            <p className="text-gray-300">{p.excerpt}</p>
          </article>
        ))}
      </div>

      <div className="mt-12">
  <h2 className="text-2xl font-semibold glitch" data-text="Patch Notes">Patch Notes</h2>
  <p className="mt-2 text-sm text-gray-400">Descending chronology of feature grafts, balance experiments, and accidental improvements. Highlights first; cryptic details optional.</p>
        <div className="mt-6 space-y-6">
          {patchNotes
            .slice()
            .sort((a, b) => {
              const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
              if (dateDiff !== 0) return dateDiff;
              return b.version.localeCompare(a.version);
            })
            .map((pn) => (
            <div key={pn.version} className="rounded-lg border border-white/10 bg-black/35 p-5 relative overflow-hidden">
              <div className="absolute -right-6 -top-6 size-24 rounded-full blur-2xl bg-violet-500/10" />
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-mono tracking-wide rounded bg-violet-600/20 px-2 py-1 text-violet-300 border border-violet-500/30">v{pn.version}</span>
                <span className="text-xs text-gray-400">{pn.date}</span>
                <span className="text-sm font-semibold text-white/90">{pn.title}</span>
              </div>
              <ul className="mt-3 list-disc pl-5 text-sm text-gray-200 space-y-1">
                {pn.highlights.map((h: string) => <li key={h}>{h}</li>)}
              </ul>
              {pn.notes && (
                <details className="mt-3 text-xs text-gray-300">
                  <summary className="cursor-pointer text-gray-400 hover:text-gray-200">More details</summary>
                  <ul className="mt-2 list-disc pl-5 space-y-1">
                    {pn.notes.map((n: string) => <li key={n}>{n}</li>)}
                  </ul>
                </details>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
