import { redirect } from "next/navigation";
import { getSession } from "@/src/lib/auth";
import GameCanvasClient from "@/src/game/GameCanvasClient";
import CharacterSelect from "@/src/components/CharacterSelect";
import { prisma } from "@/src/lib/prisma";

export const metadata = { title: "Play • Chaos In Full" };
export const dynamic = "force-dynamic";
type CharacterLite = { id: string; userId: string; name: string; class: string; level: number };


export default async function PlayPage({ searchParams }: { searchParams: Promise<{ ch?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const sp = await searchParams;
  const ch = sp?.ch;
  let character: (CharacterLite & { seenWelcome?: boolean }) | null = null;
  if (ch) {
    const client = prisma as unknown as {
      character: { findFirst: (args: { where: { id: string; userId: string } }) => Promise<unknown> };
    };
    const found = await client.character.findFirst({ where: { id: ch, userId: session.userId } });
    character = (found as CharacterLite & { seenWelcome?: boolean }) ?? null;
  }
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
          {!character ? (
            <div className="mt-4 rounded border border-white/10 bg-black/40 p-4">
              <p className="text-red-300">Character not found or not yours.</p>
              <a className="underline" href="/play">Back to Character Select</a>
            </div>
          ) : (
            <>
              <p className="mt-2 text-gray-300">Entering as <span className="text-white/90">{character.name}</span> • {character.class} • Lv {character.level}</p>
              <div className="mt-6">
                <GameCanvasClient character={{ id: character.id, name: character.name, class: character.class, level: character.level }} initialSeenWelcome={Boolean(character.seenWelcome)} />
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
