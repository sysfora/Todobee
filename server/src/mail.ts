import nodemailer from "nodemailer";
import { env } from "./env.js";
import type { Invite } from "./demo/types.js";

export function smtpConfigured() {
  return Boolean(env.smtpHost() && env.smtpFrom());
}

function transport() {
  const user = env.smtpUser();
  return nodemailer.createTransport({
    host: env.smtpHost(),
    port: env.smtpPort(),
    secure: env.smtpSecure(),
    auth: user ? { user, pass: env.smtpPassword() } : undefined,
  });
}

function expiryLabel(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "30 days";
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export async function sendInviteEmail(input: {
  invite: Invite;
  workspaceName: string;
  inviterName: string;
}) {
  const to = input.invite.email.trim();
  if (!smtpConfigured()) {
    console.warn(`SMTP is not configured. The invite for ${to} was saved and not emailed.`);
    return false;
  }
  const link = env.appUrl();
  const expires = expiryLabel(input.invite.expiresAt);
  const workspace = input.workspaceName || "a Todobee workspace";
  const subject = `${input.inviterName} invited you to ${workspace}`;
  const text = [
    `${input.inviterName} invited you to join ${workspace} on Todobee as ${input.invite.role}.`,
    "",
    `Sign in with Google at ${link} using ${to}.`,
    `This invite expires on ${expires}.`,
  ].join("\n");
  const html = `<p>${escapeHtml(input.inviterName)} invited you to join ${escapeHtml(workspace)} on Todobee as ${escapeHtml(input.invite.role)}.</p><p><a href="${escapeHtml(link)}">Sign in with Google</a> using ${escapeHtml(to)}.</p><p>This invite expires on ${escapeHtml(expires)}.</p>`;
  await transport().sendMail({
    from: env.smtpFrom(),
    to,
    subject,
    text,
    html,
  });
  return true;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
