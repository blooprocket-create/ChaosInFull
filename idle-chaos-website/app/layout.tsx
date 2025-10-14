import type { Metadata } from "next";
import Link from "next/link";
import { Cinzel, Roboto_Mono } from "next/font/google";
import { getSession } from "@/src/lib/auth";
import ProfileMenu from "@/src/components/ProfileMenu";
import AudioToggle from "@/src/components/AudioToggle";
import CursorAura from "@/src/components/CursorAura";
import BloodLinkButton from "@/src/components/BloodLinkButton";
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
              {/* CodePen-style goo filter for CSS-driven drops */}
              <filter id="goo">
                <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
                <feColorMatrix in="blur" mode="matrix" values="6 7 0 8 8  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo" />
                <feBlend in="SourceGraphic" in2="goo" />
              </filter>
              {/* Gooey filter for realistic liquid merging */}
              <filter id="gooey">
                <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
                <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo" />
                <feBlend in="SourceGraphic" in2="goo" />
              </filter>
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
        <header className="sticky top-0 z-20 backdrop-blur border-b border-white/10 bg-black/50">
          <nav className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
            <Link href="/" className="text-xl font-bold tracking-widest">CHAOS IN FULL</Link>
            <div className="flex gap-6 text-sm items-center">
              <Link href="/news" className="hover:text-white nav-underline">News</Link>
              <Link href="/classes" className="hover:text-white nav-underline">Classes</Link>
              <Link href="/world" className="hover:text-white nav-underline">World</Link>
              <Link href="/about" className="hover:text-white nav-underline">About</Link>
              <div className="hidden sm:block"><AudioToggle /></div>
              {isAuthed ? (
                <div className="flex items-center gap-4">
                  <div className="hidden sm:block"><BloodLinkButton href="/play">Play Now</BloodLinkButton></div>
                  <div className="sm:hidden"><Link href="/play" className="rounded bg-purple-600 hover:bg-purple-500 px-3 py-1.5 font-semibold">Play</Link></div>
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
