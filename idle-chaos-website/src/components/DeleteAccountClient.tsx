"use client";

import React, { useEffect, useMemo, useState } from "react";

export default function DeleteAccountClient() {
  const [a, setA] = useState<number>(0);
  const [b, setB] = useState<number>(0);
  const [busy, setBusy] = useState(false);
  const expected = useMemo(() => (a + b).toString(), [a, b]);

  useEffect(() => {
    // Generate on mount
    setA(Math.floor(Math.random() * 9) + 1);
    setB(Math.floor(Math.random() * 9) + 1);
  }, []);

  return (
    <form className="mt-4 grid gap-3" onSubmit={async (e) => {
      e.preventDefault();
      const form = e.currentTarget as HTMLFormElement;
      const fd = new FormData(form);
      const payload = {
        email: String(fd.get("email") || "").trim(),
        username: String(fd.get("username") || "").trim(),
        password: String(fd.get("password") || ""),
        captcha: String(fd.get("captcha") || "").trim(),
        expected,
      };
      if (!payload.email || !payload.username || !payload.password || !payload.captcha) {
        alert("Please fill all fields (email, username, password) and solve the captcha.");
        return;
      }
      setBusy(true);
      try {
        const res = await fetch("/api/account/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Request failed");
        alert("Account deleted. Bye forever.");
        window.location.href = "/";
      } catch (err: unknown) {
        const msg = (err && typeof err === "object" && "message" in err) ? String((err as { message?: unknown }).message) : "Could not delete account";
        alert(msg);
      } finally {
        setBusy(false);
      }
    }}>
  <div className="text-sm text-red-200/90">To delete your account, type your email AND username, your password, and solve the captcha.</div>
  <input name="email" type="email" placeholder="Confirm your email" className="w-full rounded bg-black/40 border border-white/10 px-4 py-3 outline-none focus:border-red-500" />
  <input name="username" placeholder="Confirm your username" className="w-full rounded bg-black/40 border border-white/10 px-4 py-3 outline-none focus:border-red-500" />
      <input name="password" type="password" placeholder="Confirm your password" className="w-full rounded bg-black/40 border border-white/10 px-4 py-3 outline-none focus:border-red-500" />
      <div className="flex items-center gap-2 text-sm">
        <span className="text-red-200">Captcha: What is {a} + {b}?</span>
      </div>
      <input name="captcha" placeholder="Answer" className="w-40 rounded bg-black/40 border border-white/10 px-3 py-2 outline-none focus:border-red-500" />
      <button disabled={busy} className="btn border-red-500/50 hover:border-red-500 text-red-200 disabled:opacity-50">{busy ? "Deleting…" : "Delete my account"}</button>
    </form>
  );
}
