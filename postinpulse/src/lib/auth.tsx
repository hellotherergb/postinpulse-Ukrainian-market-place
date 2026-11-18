"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { ownerHeaders } from "@/lib/owner-token";

export interface AuthUser {
  id: string;
  name: string;
  phone: string;
  admin?: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  ready: boolean;
  register: (input: { name: string; phone: string; password: string }) => Promise<void>;
  login: (input: { phone: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function postAuth(path: string, body?: unknown) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...ownerHeaders() },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { user?: AuthUser; error?: string };
  if (!res.ok) throw new Error(data.error || "Щось пішло не так. Спробуйте ще раз.");
  return data;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data: { user?: AuthUser | null }) => {
        if (active) setUser(data.user ?? null);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      ready,
      async register(input) {
        const data = await postAuth("/api/auth/register", input);
        setUser(data.user ?? null);
      },
      async login(input) {
        const data = await postAuth("/api/auth/login", input);
        setUser(data.user ?? null);
      },
      async logout() {
        await postAuth("/api/auth/logout");
        setUser(null);
      },
    }),
    [user, ready],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
