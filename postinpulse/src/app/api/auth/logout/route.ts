import { clearSessionCookie, logoutAccount, readCookie, SESSION_COOKIE } from "@/lib/server/accounts";
import { json } from "@/lib/server/owner";

export async function POST(request: Request) {
  try {
    await logoutAccount(readCookie(request, SESSION_COOKIE));
  } catch (err) {
    console.error("POST /api/auth/logout failed", err);
  }
  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Set-Cookie": clearSessionCookie(),
    },
  });
}

export const GET = () => json({ error: "Метод не підтримується" }, { status: 405 });
