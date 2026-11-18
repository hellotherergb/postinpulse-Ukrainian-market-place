import { loginAccount, mergeViewer, sessionCookie } from "@/lib/server/accounts";
import { json, ownerHashFrom } from "@/lib/server/owner";
import { hashOwner } from "@/lib/server/store";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Некоректні дані" }, { status: 400 });
  }
  const phone = body && typeof body === "object" && "phone" in body ? String(body.phone ?? "") : "";
  const password = body && typeof body === "object" && "password" in body ? String(body.password ?? "") : "";

  try {
    const result = await loginAccount(phone, password);
    if (!result.ok) return json({ error: result.error }, { status: 401 });
    const anon = ownerHashFrom(request);
    if (anon) await mergeViewer(anon, hashOwner(`user:${result.user.id}`));
    return new Response(JSON.stringify({ user: result.user }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "Set-Cookie": sessionCookie(result.token),
      },
    });
  } catch (err) {
    console.error("POST /api/auth/login failed", err);
    return json({ error: "Не вдалося увійти" }, { status: 500 });
  }
}
