import { redirect } from "next/navigation";
import { getSession } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import LogoutButton from "@/src/components/LogoutButton";

export default async function Dashboard() {
  const session = await getSession();
  if (!session) redirect("/login");
  const user = await prisma.user.findUnique({ where: { id: session.userId }, include: { stats: true } });
  if (!user) redirect("/login");
  const s = user.stats!;
  return (
    <section className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-3xl font-bold">Welcome, {user.username}</h1>
      <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          ["Level", s.level],
          ["Class", s.class],
          ["EXP", s.exp],
          ["Gold", s.gold],
          ["HP", s.hp],
          ["MP", s.mp],
          ["STR", s.strength],
          ["AGI", s.agility],
          ["INT", s.intellect],
          ["LUK", s.luck],
        ].map(([k, v]) => (
          <div key={String(k)} className="rounded border border-white/10 bg-black/40 p-4">
            <div className="text-xs uppercase text-gray-400">{k}</div>
            <div className="text-xl font-semibold">{String(v)}</div>
          </div>
        ))}
      </div>
      <div className="mt-8">
        <LogoutButton className="rounded bg-red-600 hover:bg-red-500 px-4 py-2" />
      </div>
    </section>
  );
}
