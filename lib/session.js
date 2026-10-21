import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const fallbackSecret = randomBytes(32).toString("hex");
const secret = () => process.env.SESSION_SECRET || process.env.DEEPGRAM_API_KEY || fallbackSecret;
const sign = (payload) => createHmac("sha256", secret()).update(payload).digest("base64url");

export function issueSession() {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + 60 * 60_000 })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function hasValidSession(header) {
  const [payload, received] = (header?.startsWith("Bearer ") ? header.slice(7) : "").split(".");
  const expected = payload && sign(payload);
  if (!expected || !received || received.length !== expected.length || !timingSafeEqual(Buffer.from(received), Buffer.from(expected))) return false;
  try { return JSON.parse(Buffer.from(payload, "base64url").toString()).exp > Date.now(); } catch { return false; }
}
