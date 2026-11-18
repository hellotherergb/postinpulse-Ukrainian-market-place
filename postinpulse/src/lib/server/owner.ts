import "server-only";

import { userFromRequest, type PublicUser } from "./accounts";
import { hashOwner } from "./store";

export const OWNER_HEADER = "x-owner-token";

export function ownerHashFrom(request: Request) {
  const token = request.headers.get(OWNER_HEADER);
  return token && token.length >= 16 && token.length <= 128 ? hashOwner(token) : null;
}

export async function viewer(request: Request): Promise<{ user: PublicUser | null; key: string | null }> {
  const user = await userFromRequest(request);
  if (user) return { user, key: hashOwner(`user:${user.id}`) };
  return { user: null, key: ownerHashFrom(request) };
}

export const json = (body: unknown, init?: ResponseInit) =>
  Response.json(body, { ...init, headers: { "Cache-Control": "no-store", ...init?.headers } });
