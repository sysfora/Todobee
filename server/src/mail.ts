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

export type MailResult = { kind: "invite" | "assignment"; to: string; ok: boolean; error?: string };

export async function sendInviteEmail(input: {
  invite: Invite;
  workspaceName: string;
  inviterName: string;
  origin?: string;
}): Promise<MailResult> {
  const to = input.invite.email.trim();
  const link = (input.origin || env.appUrl()).replace(/\/+$/, "");
  if (!smtpConfigured()) {
    return { kind: "invite", to, ok: false, error: "SMTP is not configured." };
  }
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
  try {
    await transport().sendMail({
      from: env.smtpFrom(),
      to,
      subject,
      text,
      html,
    });
    return { kind: "invite", to, ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "The mail server rejected the message.";
    return { kind: "invite", to, ok: false, error: message };
  }
}

export async function sendAssignmentEmail(input: {
  to: string;
  name: string;
  taskTitle: string;
  workspaceName: string;
  origin?: string;
}): Promise<MailResult> {
  const to = input.to.trim();
  if (!smtpConfigured()) return { kind: "assignment", to, ok: false, error: "SMTP is not configured." };
  const link = (input.origin || env.appUrl()).replace(/\/+$/, "");
  const workspace = input.workspaceName || "Todobee";
  try {
    await transport().sendMail({
      from: env.smtpFrom(),
      to,
      subject: `You were assigned “${input.taskTitle}”`,
      text: `${input.name}, you were assigned “${input.taskTitle}” in ${workspace}.\n\nOpen Todobee: ${link}`,
      html: `<p>${escapeHtml(input.name)}, you were assigned “${escapeHtml(input.taskTitle)}” in ${escapeHtml(workspace)}.</p><p><a href="${escapeHtml(link)}">Open Todobee</a></p>`,
    });
    return { kind: "assignment", to, ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "The mail server rejected the message.";
    return { kind: "assignment", to, ok: false, error: message };
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
