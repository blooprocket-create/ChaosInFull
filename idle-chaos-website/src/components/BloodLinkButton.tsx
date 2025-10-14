"use client";
import Link from "next/link";

type Props = {
  href: string;
  children: React.ReactNode;
  className?: string;
  heartbeat?: boolean;
};

export default function BloodLinkButton({ href, children, className = "", heartbeat = false }: Props) {
  return (
    <Link href={href} className={`btn ${heartbeat ? "heartbeat" : ""} ${className}`}>
      <span className="relative z-10">{children}</span>
    </Link>
  );
}
