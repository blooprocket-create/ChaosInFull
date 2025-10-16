"use client";
import React, { useEffect, useState } from "react";

export default function SplitStackModal({ open, title, max, onClose, onConfirm }: { open: boolean; title: string; max: number; onClose: () => void; onConfirm: (qty: number) => void; }) {
  const [qty, setQty] = useState(1);
  useEffect(() => { if (open) setQty(Math.min(1, Math.max(1, max))); }, [open, max]);
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70">
      <div className="w-[min(360px,92vw)] rounded-lg border border-white/10 bg-black/85 p-5 text-gray-200 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button className="btn px-3 py-1" onClick={onClose}>Close</button>
        </div>
        <div className="mt-3 text-sm">Amount (max {max})</div>
        <div className="mt-2 flex items-center gap-2">
          <button className="btn px-2" onClick={() => setQty((q) => Math.max(1, q - 10))}>-10</button>
          <button className="btn px-2" onClick={() => setQty((q) => Math.max(1, q - 1))}>-</button>
          <input className="w-20 rounded bg-black/40 border border-white/10 px-2 py-1 text-center" value={qty}
                 onChange={(e) => setQty(Math.max(1, Math.min(max, parseInt(e.target.value || "1", 10) || 1)))} />
          <button className="btn px-2" onClick={() => setQty((q) => Math.min(max, q + 1))}>+</button>
          <button className="btn px-2" onClick={() => setQty((q) => Math.min(max, q + 10))}>+10</button>
          <button className="btn px-2" onClick={() => setQty(max)}>Max</button>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn px-3 py-1" onClick={onClose}>Cancel</button>
          <button className="btn px-3 py-1" onClick={() => onConfirm(qty)} disabled={max < 1}>Confirm</button>
        </div>
      </div>
    </div>
  );
}
