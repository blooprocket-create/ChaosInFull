import { redirect } from "next/navigation";
import { getSession } from "@/src/lib/auth";

export const metadata = { title: "Play • Chaos In Full" };
export default async function PlayPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-bold">Play (Coming Soon)</h1>
      <p className="mt-2 text-gray-300">The web game client will live here. For now, visit your <a className="underline" href="/dashboard">Dashboard</a>.</p>
      <div className="mt-6 aspect-[16/9] rounded-xl border border-white/10 bg-black/40 grid place-items-center text-gray-500">
        Game canvas placeholder
      </div>
    </section>
  );
}
