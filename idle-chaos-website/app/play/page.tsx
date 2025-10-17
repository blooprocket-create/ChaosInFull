import { redirect } from "next/navigation";
import { getSession } from "@/src/lib/auth";
import GameCanvasClient from "@/src/game/GameCanvasClient";
import CharacterSelect from "@/src/components/CharacterSelect";
import { q } from "@/src/lib/db";
import ChatClient from "@/src/components/ChatClient";
import QuestPanel from "@/src/components/QuestPanel";
import StatusChip from "@/src/components/StatusChip";
import JsonLd from "@/src/components/JsonLd";

export const metadata = { title: "Play • Chaos In Full", description: "Enter the world: Town, Cave, Slime Field, and more.", openGraph: { title: "Play Chaos In Full", images: ["/og/play.png"] } };
export const dynamic = "force-dynamic";
type CharacterLite = { id: string; userId: string; name: string; class: string; level: number; exp?: number; miningExp?: number; miningLevel?: number };


export default async function PlayPage({ searchParams }: { searchParams: Promise<{ ch?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const sp = await searchParams;
  const ch = sp?.ch;
  let character: (CharacterLite & { seenWelcome?: boolean; lastScene?: string; lastSeenAt?: string }) | null = null;
  if (ch) {
    type Row = {
      id: string;
      userId: string;
      name: string;
      class: string;
      level: number;
      exp: number | null;
      miningExp: number | null;
      miningLevel: number | null;
      seenWelcome: boolean | null;
      lastScene: string | null;
      lastSeenAt: string | null;
    };
    const rows = await q<Row>`
      select id,
             userid as "userId",
             name,
             class,
             level,
             exp as "exp",
             miningexp as "miningExp",
             mininglevel as "miningLevel",
             seenwelcome as "seenWelcome",
             lastscene as "lastScene",
             lastseenat as "lastSeenAt"
      from "Character"
      where id = ${ch} and userid = ${session.userId}
      limit 1
    `;
    const r = rows[0];
    if (r) {
      character = {
        id: r.id,
        userId: r.userId,
        name: r.name,
        class: r.class,
        level: r.level,
        exp: r.exp ?? undefined,
        miningExp: r.miningExp ?? undefined,
        miningLevel: r.miningLevel ?? undefined,
        seenWelcome: Boolean(r.seenWelcome ?? false),
        lastScene: r.lastScene ?? undefined,
        lastSeenAt: r.lastSeenAt ?? undefined,
      };
    }
  }
  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <JsonLd data={[{
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "Chaos In Full",
        applicationCategory: "Game",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: 0, priceCurrency: "USD" },
        url: "https://chaos-in-full.vercel.app/play"
      },{
        "@context": "https://schema.org",
        "@type": "VideoGame",
        name: "Chaos In Full",
        gamePlatform: "Web",
        url: "https://chaos-in-full.vercel.app/play"
      }]} />
      {!ch ? (
        <>
          <h1 className="text-3xl font-bold">Character Select</h1>
          <p className="mt-2 text-gray-300">Choose a character to enter the world, or create one.</p>
          <CharacterSelect />
        </>
      ) : (
        <>
          <h1 className="text-3xl font-bold">Play</h1>
          <div className="relative">
            <div className="pointer-events-none absolute right-0 -top-8 hidden sm:block">
              <StatusChip />
            </div>
          </div>
          {!character ? (
            <div className="mt-4 rounded border border-white/10 bg-black/40 p-4">
              <p className="text-red-300">Character not found or not yours.</p>
              <a className="underline" href="/play">Back to Character Select</a>
            </div>
          ) : (
            <>
              <p className="mt-2 text-gray-300">Entering as <span className="text-white/90">{character.name}</span> • {character.class} • Lv {character.level}</p>
              <div className="mt-6">
                <GameCanvasClient
                  character={{ id: character.id, name: character.name, class: character.class, level: character.level }}
                  initialSeenWelcome={Boolean(character.seenWelcome)}
                  initialScene={(character.lastScene as string) || "Town"}
                  offlineSince={character.lastSeenAt ? new Date(character.lastSeenAt).toISOString() : undefined}
                  initialExp={character.exp ?? 0}
                  initialMiningExp={character.miningExp ?? 0}
                  initialMiningLevel={character.miningLevel ?? 1}
                />
              </div>
              <div className="mt-4">
                {/* Decoupled chat panel below the game */}
                <ChatClient characterId={character.id} scene={(character.lastScene as string) || "Town"} />
                <QuestPanel characterId={character.id} />
              </div>
              {/* Combat UI is in-scene (Slime); no under-game panels */}
            </>
          )}
        </>
      )}
    </section>
  );
}
