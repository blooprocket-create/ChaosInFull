import { ReactNode } from "react";
import { Toaster } from "@/src/components/Toaster";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
