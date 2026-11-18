"use client";

import { usePathname } from "next/navigation";

export function PathHide({ hideOn, children }: { hideOn: string; children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === hideOn) return null;
  return children;
}
