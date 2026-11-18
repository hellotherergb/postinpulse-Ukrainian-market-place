"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/market/logo";
import { useAuth } from "@/lib/auth";

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/feed";
  return value;
}

function LoginForm() {
  const { register, login } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [mode, setMode] = useState<"login" | "register">(params.get("mode") === "register" ? "register" : "login");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      if (mode === "register") await register({ name, phone, password });
      else await login({ phone, password });
      router.push(next);
      router.refresh();
    } catch (err) {
      setPending(false);
      setError(err instanceof Error ? err.message : "Щось пішло не так");
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10">
      <Logo stacked className="mb-8" />
      <h1 className="text-3xl font-extrabold tracking-tight">
        {mode === "login" ? "З поверненням" : "Створіть акаунт"}
      </h1>
      <p className="mt-2 text-muted-foreground">
        {mode === "login"
          ? "Увійдіть, щоб стрічка памʼятала, що вам до смаку, і щоб ваші оголошення були під рукою."
          : "Номер телефону — це ваш логін. Пароль зберігається лише у зашифрованому вигляді."}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-1 rounded-lg bg-secondary p-1">
        {(
          [
            ["login", "Увійти"],
            ["register", "Реєстрація"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={mode === id}
            onClick={() => {
              setMode(id);
              setError("");
            }}
            className={`rounded-md py-2 text-sm font-medium ${mode === id ? "bg-background shadow-sm" : "text-muted-foreground"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        {mode === "register" && (
          <div className="space-y-1.5">
            <Label htmlFor="name">Імʼя</Label>
            <Input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Марія" />
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="phone">Телефон</Label>
          <Input
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+380 67 123 45 67"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Пароль</Label>
          <Input
            id="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === "register" ? "Щонайменше 6 символів" : "Ваш пароль"}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={pending} className="h-11 w-full text-base">
          {pending ? "Зачекайте…" : mode === "login" ? "Увійти" : "Зареєструватися"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/feed" className="hover:text-foreground">
          Гортати стрічку без акаунта
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="mx-auto h-80 max-w-md animate-pulse px-4 py-16" />}>
      <LoginForm />
    </Suspense>
  );
}
