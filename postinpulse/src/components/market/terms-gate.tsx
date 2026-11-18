"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { TERMS_VERSION } from "@/lib/terms";
import { Logo } from "./logo";
import { TermsText } from "./terms-text";

const KEY = "postinpulse:terms";
const listeners = new Set<() => void>();

function readAccepted() {
  try {
    return localStorage.getItem(KEY) === TERMS_VERSION;
  } catch {
    return false;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function TermsGate() {
  const pathname = usePathname();
  // null until hydrated, so the server render never flashes the gate.
  const accepted = useSyncExternalStore(subscribe, readAccepted, () => null);
  const [memoryAccepted, setMemoryAccepted] = useState(false);
  const open = accepted === false && !memoryAccepted && pathname !== "/terms";

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  function accept() {
    try {
      localStorage.setItem(KEY, TERMS_VERSION);
    } catch {
      // Private mode: accept for this visit only.
    }
    setMemoryAccepted(true);
    listeners.forEach((l) => l());
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-title"
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-6"
    >
      <div className="flex max-h-[100dvh] w-full max-w-2xl flex-col overflow-hidden bg-background shadow-2xl sm:max-h-[90dvh] sm:rounded-2xl">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-4">
          <div className="min-w-0">
            <h2 id="terms-title" className="text-lg font-bold tracking-tight">
              Terms and Conditions
            </h2>
            <p className="text-sm text-muted-foreground">Please read and accept to continue.</p>
          </div>
          <Logo compact className="pointer-events-none shrink-0" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
          <TermsText />
        </div>
        <div className="shrink-0 space-y-2 border-t bg-secondary/40 px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button onClick={accept} className="h-11 w-full text-base">
            I agree to the Terms and Conditions
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            You can read them again any time at{" "}
            <Link href="/terms" className="underline">
              postinpulse.com/terms
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
