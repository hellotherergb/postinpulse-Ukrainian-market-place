import { mergeViewer, registerAccount, sessionCookie, validateNewAccount } from "@/lib/server/accounts";
import { json, ownerHashFrom } from "@/lib/server/owner";
import { hashOwner } from "@/lib/server/store";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Некоректні дані" }, { status: 400 });
  }
  if (!body || typeof body !== "object") return json({ error: "Некоректні дані" }, { status: 400 });

  const parsed = validateNewAccount(body as { name?: unknown; phone?: unknown; password?: unknown });
  if (!parsed.ok) return json({ error: parsed.error }, { status: 400 });

  try {
    const result = await registerAccount(parsed);
    if (!result.ok) return json({ error: result.error }, { status: 409 });
    const anon = ownerHashFrom(request);
    if (anon) await mergeViewer(anon, hashOwner(`user:${result.user.id}`));
    return new Response(JSON.stringify({ user: result.user }), {
      status: 201,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "Set-Cookie": sessionCookie(result.token),
      },
    });
  } catch (err) {
    console.error("POST /api/auth/register failed", err);
    return json({ error: "Не вдалося створити акаунт" }, { status: 500 });
  }
}
