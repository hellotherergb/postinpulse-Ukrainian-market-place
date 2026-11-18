import { userFromRequest } from "@/lib/server/accounts";
import { json } from "@/lib/server/owner";

function isBailout(err: unknown) {
  return typeof err === "object" && err !== null && "digest" in err;
}

export async function GET(request: Request) {
  try {
    const user = await userFromRequest(request);
    return json({ user });
  } catch (err) {
    if (isBailout(err)) throw err;
    console.error("GET /api/auth/me failed", err);
    return json({ user: null });
  }
}
