import { env, GOOGLE_SCOPES } from "./env.js";
import { decrypt } from "./session.js";
import { pb, type PbUser } from "./pb.js";

const tokens = new Map<string, { access: string; exp: number }>();

export function googleRedirectUri(origin = env.appUrl()) {
  return `${origin.replace(/\/+$/, "")}/api/auth/google/callback`;
}

export function googleAuthUrl(state: string, origin = env.appUrl(), consent = false) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", env.googleClientId());
  url.searchParams.set("redirect_uri", googleRedirectUri(origin));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GOOGLE_SCOPES.join(" "));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("include_granted_scopes", "true");
  // Consent only when we still need a Drive refresh token. Granted users skip the permission screens.
  if (consent) url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeCode(code: string, origin = env.appUrl()) {
  const body = new URLSearchParams({
    code,
    client_id: env.googleClientId(),
    client_secret: env.googleClientSecret(),
    redirect_uri: googleRedirectUri(origin),
    grant_type: "authorization_code",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !json.access_token) {
    throw new Error(json.error_description || json.error || "Google token exchange failed.");
  }
  return json;
}

export async function googleProfile(accessToken: string) {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  const json = (await res.json()) as {
    sub?: string;
    email?: string;
    name?: string;
    picture?: string;
  };
  if (!res.ok || !json.sub || !json.email) throw new Error("Google didn't return an email address.");
  return { sub: json.sub, email: json.email, name: json.name || json.email, picture: json.picture || "" };
}

export async function accessTokenFor(user: PbUser) {
  const cached = tokens.get(user.id);
  if (cached && cached.exp > Date.now() + 30_000) return cached.access;
  if (!user.refreshToken) return "";
  let refresh = "";
  try {
    refresh = decrypt(user.refreshToken);
  } catch {
    return "";
  }
  const body = new URLSearchParams({
    client_id: env.googleClientId(),
    client_secret: env.googleClientSecret(),
    refresh_token: refresh,
    grant_type: "refresh_token",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!res.ok || !json.access_token) return "";
  tokens.set(user.id, { access: json.access_token, exp: Date.now() + (json.expires_in ?? 3600) * 1000 });
  return json.access_token;
}

export function rememberAccess(userId: string, access: string, expiresIn = 3600) {
  tokens.set(userId, { access, exp: Date.now() + expiresIn * 1000 });
}

export async function ownerToken(ownerId: string) {
  const owner = await pb().collection("users").getOne<PbUser>(ownerId);
  return accessTokenFor(owner);
}
