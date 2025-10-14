"use client";
import Link from "next/link";
import { useRef } from "react";

type Props = {
  href: string;
  children: React.ReactNode;
  className?: string;
  heartbeat?: boolean;
};

export default function BloodLinkButton({ href, children, className = "", heartbeat = false }: Props) {
  const ref = useRef<HTMLAnchorElement>(null);

  return (
    <Link
      ref={ref}
      href={href}
      
      className={`btn-blood ${heartbeat ? "heartbeat" : ""} ${className}`}
    >
      <span className="relative z-10">{children}</span>
      {/* CodePen-style drops under button, filtered with #goo in layout */}
      <span className="drops" aria-hidden>
        <span className="drop" />
        <span className="drop" />
        <span className="drop" />
        <span className="drop" />
        <span className="drop" />
      </span>
    </Link>
  );
}
