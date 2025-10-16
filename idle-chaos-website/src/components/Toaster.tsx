"use client";
import { useEffect, useState } from "react";

type Toast = { id: number; msg: string; variant?: "success" | "error" | "info" };

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  useEffect(() => {
    let idCounter = 1;
    const api = (msg: string, variant: Toast["variant"] = "info") => {
      const id = idCounter++;
      setToasts((t) => [...t, { id, msg, variant }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2500);
    };
    window.showToast = api;
    return () => { if (window.showToast === api) window.showToast = undefined; };
  }, []);
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map(t => (
        <div key={t.id} className={`rounded px-3 py-2 text-sm shadow-lg ${t.variant === "success" ? "bg-green-600/90" : t.variant === "error" ? "bg-red-600/90" : "bg-gray-700/90"}`}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}
