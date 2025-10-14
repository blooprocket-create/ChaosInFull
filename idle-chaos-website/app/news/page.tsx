export const metadata = { title: "News • Chaos In Full" };

export default function NewsPage() {
  const posts = [
    { title: "Website MVP is live", date: "2025-10-14", excerpt: "Create accounts, sign in, and view stats. Game client coming soon." },
    { title: "Town zone planning", date: "2025-10-15", excerpt: "Workbench, Anvil, Furnace, Storage, Task Board, and tutorial NPC flows." },
  ];
  return (
    <section className="relative mx-auto max-w-5xl px-4 py-12">
      {/* ambience */}
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-10 bg-[radial-gradient(circle_at_30%_20%,rgba(168,85,247,0.3),transparent_40%),radial-gradient(circle_at_70%_60%,rgba(239,68,68,0.25),transparent_45%)]" />

      <h1 className="text-3xl font-bold glitch" data-text="News">News</h1>
      {/* Ticker removed per feedback */}

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
    </section>
  );
}
