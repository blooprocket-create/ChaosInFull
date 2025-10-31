import type { Metadata } from "next";
import Link from "next/link";
import { Cinzel, Roboto_Mono } from "next/font/google";
import { getSession } from "@/src/lib/auth";
import AudioToggle from "@/src/components/AudioToggle";
import CursorAura from "@/src/components/CursorAura";
import NavAuth from "@/src/components/NavAuth";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import StatusChip from "@/src/components/StatusChip";
import TelemetryInit from "@/src/components/TelemetryInit";

const display = Cinzel({ variable: "--font-display", subsets: ["latin"], weight: ["400","700"] });
const mono = Roboto_Mono({ variable: "--font-mono", subsets: ["latin"], weight: ["400","700"] });

export const metadata: Metadata = {
  title: "Veil Keeper",
  description: "A dark action RPG for the browser",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  return (
    <html lang="en">
      <body className={`${display.variable} ${mono.variable} antialiased bg-black text-gray-200` }>
  <div className="fixed inset-0 -z-10 pointer-events-none bg-sway">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-950/40 via-black to-black" />
          <div className="absolute inset-0 mix-blend-screen opacity-20 bg-[url('/noise.png')]" />
          {/* SVG Fog Overlay + filters */}
          <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
            <filter id="fogFilter">
              <feTurbulence type="fractalNoise" baseFrequency="0.004" numOctaves="3" seed="3" result="noise">
                <animate attributeName="baseFrequency" dur="20s" values="0.004;0.006;0.004" repeatCount="indefinite" />
              </feTurbulence>
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="22" xChannelSelector="R" yChannelSelector="G">
                <animate attributeName="scale" dur="18s" values="18;24;18" repeatCount="indefinite" />
              </feDisplacementMap>
            </filter>
            <defs>
              <linearGradient id="fogGrad" x1="0" x2="1">
                <stop offset="0%" stopColor="rgba(255,255,255,0.12)">
                  <animate attributeName="offset" dur="25s" values="0%;20%;0%" repeatCount="indefinite" />
                </stop>
                <stop offset="100%" stopColor="rgba(255,255,255,0.06)">
                  <animate attributeName="offset" dur="25s" values="100%;80%;100%" repeatCount="indefinite" />
                </stop>
              </linearGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#fogGrad)" filter="url(#fogFilter)" />
          </svg>
          {/* Vignette */}
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_60%,rgba(0,0,0,0.6))]" />
        </div>
  <CursorAura />
  <TelemetryInit />
        <header className="sticky top-0 z-20 backdrop-blur border-b border-white/10 bg-black/50">
          <nav className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
            <Link href="/" className="text-xl font-bold tracking-widest">VEIL KEEPER</Link>
            <div className="flex gap-6 text-sm items-center">
              <Link href="/news" className="hover:text-white nav-underline">News</Link>
              <Link href="/classes" className="hover:text-white nav-underline">Classes</Link>
              <Link href="/world" className="hover:text-white nav-underline">World</Link>
              <Link href="/phaser" className="hover:text-white nav-underline">Play</Link>
              <Link href="/about" className="hover:text-white nav-underline">About</Link>
              <div className="hidden sm:block"><AudioToggle /></div>
              <NavAuth initial={session} />
            </div>
          </nav>
        </header>
  <main className="min-h-[calc(100vh-64px)]">{children}</main>
        <footer className="border-t border-white/10 py-8 text-center text-xs text-gray-400">
          <div className="mx-auto max-w-6xl px-4 flex items-center justify-between gap-3">
            <div title="v0.0.11">© {new Date().getFullYear()} Veil Keeper</div>
            <StatusChip />
          </div>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
