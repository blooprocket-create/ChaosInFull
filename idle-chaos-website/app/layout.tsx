import type { Metadata } from "next";
import Link from "next/link";
import { Cinzel, Roboto_Mono } from "next/font/google";
import { getSession } from "@/src/lib/auth";
import ProfileMenu from "@/src/components/ProfileMenu";
import CursorAura from "@/src/components/CursorAura";
import "./globals.css";

const display = Cinzel({ variable: "--font-display", subsets: ["latin"], weight: ["400","700"] });
const mono = Roboto_Mono({ variable: "--font-mono", subsets: ["latin"], weight: ["400","700"] });

export const metadata: Metadata = {
  title: "Chaos In Full",
  description: "A darkly humorous idle RPG",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  const isAuthed = !!session;
  return (
    <html lang="en">
      <body className={`${display.variable} ${mono.variable} antialiased bg-black text-gray-200` }>
        <div className="fixed inset-0 -z-10 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-950/40 via-black to-black" />
          <div className="absolute inset-0 mix-blend-screen opacity-20 bg-[url('/noise.png')]" />
          {/* SVG Fog Overlay */}
          <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
            <filter id="fogFilter">
              <feTurbulence type="fractalNoise" baseFrequency="0.006" numOctaves="3" seed="3" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="18" xChannelSelector="R" yChannelSelector="G" />
            </filter>
            <rect width="100%" height="100%" fill="url(#fogGrad)" filter="url(#fogFilter)" />
            <defs>
              <linearGradient id="fogGrad" x1="0" x2="1">
                <stop offset="0%" stopColor="rgba(255,255,255,0.12)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.06)" />
              </linearGradient>
            </defs>
          </svg>
          {/* Vignette */}
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_60%,rgba(0,0,0,0.6))]" />
        </div>
        <CursorAura />
        <header className="sticky top-0 z-20 backdrop-blur border-b border-white/10 bg-black/50">
          <nav className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
            <Link href="/" className="text-xl font-bold tracking-widest">CHAOS IN FULL</Link>
            <div className="flex gap-6 text-sm items-center">
              <Link href="/news" className="hover:text-white">News</Link>
              <Link href="/classes" className="hover:text-white">Classes</Link>
              <Link href="/world" className="hover:text-white">World</Link>
              <Link href="/about" className="hover:text-white">About</Link>
              {isAuthed ? (
                <div className="flex items-center gap-4">
                  <Link href="/play" className="rounded bg-purple-600 hover:bg-purple-500 px-3 py-1.5 font-semibold">Play Now</Link>
                  <ProfileMenu displayName={session!.email || "C"} />
                </div>
              ) : (
                <>
                  <Link href="/login" className="hover:text-white">Login</Link>
                  <Link href="/signup" className="rounded border border-white/20 hover:border-white/40 px-3 py-1.5">Sign Up</Link>
                </>
              )}
            </div>
          </nav>
        </header>
        <main className="min-h-[calc(100vh-64px)]">{children}</main>
        <footer className="border-t border-white/10 py-8 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} Chaos In Full
        </footer>
      </body>
    </html>
  );
}
