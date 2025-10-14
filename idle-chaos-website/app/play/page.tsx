import { redirect } from "next/navigation";
import { getSession } from "@/src/lib/auth";
import GameCanvas from "@/src/game/GameCanvas";
import CharacterSelect from "@/src/components/CharacterSelect";

export const metadata = { title: "Play • Chaos In Full" };
export default async function PlayPage({ searchParams }: { searchParams?: { ch?: string } }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const ch = searchParams?.ch;
  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      {!ch ? (
        <>
          <h1 className="text-3xl font-bold">Character Select</h1>
          <p className="mt-2 text-gray-300">Choose a character to enter the world, or create one.</p>
          <CharacterSelect />
        </>
      ) : (
        <>
          <h1 className="text-3xl font-bold">Play</h1>
          <p className="mt-2 text-gray-300">Character ID: <span className="text-white/90">{ch}</span></p>
          <div className="mt-6">
            <GameCanvas />
          </div>
        </>
      )}
    </section>
  );
}
