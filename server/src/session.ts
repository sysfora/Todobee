import { createCipheriv, createDecipheriv, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { env } from "./env.js";

function secret() {
  const value = env.appSecret();
  if (value.length < 16) throw new Error("APP_SECRET must be at least 16 characters.");
  return value;
}

function sign(body: string) {
  return createHmac("sha256", secret()).update(body).digest("base64url");
}

export function sealJson(payload: Record<string, unknown>, ttlSeconds: number) {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + ttlSeconds * 1000 })).toString(
    "base64url",
  );
  return `${body}.${sign(body)}`;
}

export function openJson<T>(token: string | undefined): T | null {
  if (!token) return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const expected = sign(body);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T & { exp: number };
  if (!data.exp || data.exp < Date.now()) return null;
  return data;
}

const key = () => scryptSync(secret(), "todobee-drive", 32);

export function encrypt(plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), enc]).toString("base64url");
}

export function decrypt(payload: string) {
  const buf = Buffer.from(payload, "base64url");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

export function sessionCookie(token: string, secure = env.appUrl().startsWith("https://")) {
  const flag = secure ? "; Secure" : "";
  return `tb_session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}${flag}`;
}

export function clearSessionCookie() {
  return "tb_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax";
}

export function readCookie(header: string | undefined, name: string) {
  if (!header) return "";
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return "";
}
