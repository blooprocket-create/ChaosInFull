"use client";
import React, { useState } from "react";

export default function PartyClient({ characterId, zone }: { characterId: string; zone: string }) {
  const [partyId, setPartyId] = useState("");
  const [created, setCreated] = useState("");

  const create = async () => {
    const res = await fetch("/api/party/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ zone, characterId }) });
    if (res.ok) { const data = await res.json(); setCreated(data.partyId); setPartyId(data.partyId); }
  };
  const join = async () => {
    if (!partyId) return;
    await fetch("/api/party/join", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ zone, partyId, characterId }) });
  };

  return (
    <div className="rounded-md border border-white/10 bg-black/40 p-2 text-xs text-gray-200">
      <div className="mb-2 flex items-center gap-2">
        <button className="btn px-2 py-1" onClick={create}>Create Party</button>
        <input className="rounded bg-black/50 px-2 py-1" placeholder="Party ID" value={partyId} onChange={e => setPartyId(e.target.value)} />
        <button className="btn px-2 py-1" onClick={join}>Join Party</button>
        {created ? <span className="text-[10px] text-gray-400">Created: {created}</span> : null}
      </div>
      <div className="text-[10px] text-gray-400">Party members share mobs and rewards in their party phase.</div>
    </div>
  );
}
