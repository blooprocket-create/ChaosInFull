export const metadata = { title: "News • Chaos In Full" };
export default function NewsPage() {
  const posts = [
    { title: "Website MVP is live", date: "2025-10-14", excerpt: "Create accounts, sign in, and view stats. Game client coming soon." },
    { title: "Town zone planning", date: "2025-10-15", excerpt: "Workbench, Anvil, Furnace, Storage, Task Board, and tutorial NPC flows." },
  ];
  return (
    <section className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-3xl font-bold">News</h1>
      <div className="mt-6 space-y-4">
        {posts.map((p) => (
          <article key={p.title} className="rounded border border-white/10 bg-black/40 p-4">
            <div className="text-xs text-gray-400">{p.date}</div>
            <h2 className="text-xl font-semibold">{p.title}</h2>
            <p className="text-gray-300">{p.excerpt}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
