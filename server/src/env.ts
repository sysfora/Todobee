import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function load(file: string) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

load(path.resolve(__dirname, "../../.env"));
load(path.resolve(__dirname, "../.env"));
load(path.resolve(".env"));
load(path.resolve("../.env"));

export const env = {
  appUrl: () => (process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, ""),
  port: () => Number(process.env.PORT || 4000),
  pbUrl: () => (process.env.PB_URL || "").replace(/\/+$/, ""),
  pbEmail: () => process.env.PB_ADMIN_EMAIL || "",
  pbPassword: () => process.env.PB_ADMIN_PASSWORD || "",
  appSecret: () => process.env.APP_SECRET || "",
  googleClientId: () => process.env.GOOGLE_CLIENT_ID || "",
  googleClientSecret: () => process.env.GOOGLE_CLIENT_SECRET || "",
  driveSyncIntervalMs: () => {
    const parsed = Number(process.env.DRIVE_SYNC_INTERVAL_MS || 60_000);
    if (!Number.isFinite(parsed)) return 60_000;
    return Math.max(10_000, Math.round(parsed));
  },
  stripeKey: () => process.env.STRIPE_SECRET_KEY || "",
  stripeWebhookSecret: () => process.env.STRIPE_WEBHOOK_SECRET || "",
  smtpHost: () => process.env.SMTP_HOST || "",
  smtpPort: () => {
    const parsed = Number(process.env.SMTP_PORT || 587);
    return Number.isFinite(parsed) ? parsed : 587;
  },
  smtpSecure: () => {
    const flag = (process.env.SMTP_SECURE || "").toLowerCase();
    if (flag === "true" || flag === "1") return true;
    if (flag === "false" || flag === "0") return false;
    return Number(process.env.SMTP_PORT || 587) === 465;
  },
  smtpUser: () => process.env.SMTP_USER || "",
  smtpPassword: () => process.env.SMTP_PASSWORD || "",
  smtpFrom: () => process.env.SMTP_FROM || "",
};

export const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/drive.file",
];
