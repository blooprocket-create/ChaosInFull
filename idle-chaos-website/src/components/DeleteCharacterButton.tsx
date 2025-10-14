"use client";
import { useState } from "react";

export default function DeleteCharacterButton({ id, name, onDeleted }: { id: string; name: string; onDeleted?: () => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const canDelete = text.trim() === name;

  const handleDelete = async () => {
    setError(null);
    try {
      const res = await fetch(`/api/account/characters/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to delete");
      }
      setOpen(false);
      onDeleted?.();
      // fallback refresh
      if (!onDeleted) location.reload();
    } catch (e: any) {
      setError(e?.message || "Failed to delete");
    }
  };

  return (
    <>
      <button className="btn inline-flex items-center px-3 py-1 bg-red-700 hover:bg-red-600" onClick={() => setOpen(true)}>
        Delete
      </button>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70">
          <div className="w-[min(520px,92vw)] rounded-lg border border-white/10 bg-black/80 p-5 text-gray-200 shadow-xl">
            <h3 className="text-lg font-semibold text-white">Delete Character</h3>
            <p className="mt-2 text-sm text-gray-300">
              This will permanently delete <span className="font-semibold text-white/90">{name}</span>. Type the character name to confirm.
            </p>
            <input
              className="mt-4 w-full rounded border border-white/10 bg-black/60 px-3 py-2 outline-none focus:ring-2 focus:ring-purple-600"
              placeholder="Type character name"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            {error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn px-4 py-2" onClick={() => setOpen(false)}>Cancel</button>
              <button
                className={`btn px-4 py-2 ${canDelete ? "bg-red-700 hover:bg-red-600" : "opacity-50 cursor-not-allowed"}`}
                disabled={!canDelete}
                onClick={handleDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
