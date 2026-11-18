import { makeId } from "@/lib/market";

const OWNER_KEY = "postinpulse:owner";

let memoryOwner: string | undefined;

/** Stable anonymous id for this browser. Sent as a header; the server only stores its hash. */
export function ownerToken() {
  try {
    let token = localStorage.getItem(OWNER_KEY);
    if (!token) {
      token = `${makeId()}-${makeId()}`;
      localStorage.setItem(OWNER_KEY, token);
    }
    return token;
  } catch {
    return (memoryOwner ??= `${makeId()}-${makeId()}`);
  }
}

export function ownerHeaders(): Record<string, string> {
  return { "x-owner-token": ownerToken() };
}
