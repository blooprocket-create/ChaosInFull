export const metadata = { title: "About • Chaos In Full" };
export default function AboutPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">About</h1>
      <p className="mt-4 text-gray-300">
        Chaos In Full is a solo passion project: a darkly humorous 2D platformer idle RPG inspired by MapleStory, IdleOn, and RuneScape. The goal is a cozy, cursed world that plays smoothly in a browser and can later ship to stores.
      </p>
      <p className="mt-3 text-gray-300">
        Website is built with Next.js, Tailwind, and Prisma. The game will begin with a web client and expand over time.
      </p>
    </section>
  );
}
