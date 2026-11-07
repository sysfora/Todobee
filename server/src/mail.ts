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

export type MailResult = { kind: "invite" | "assignment" | "support"; to: string; ok: boolean; error?: string };

export async function sendSupportEmail(input: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<MailResult> {
  // Private inbox. Public pages and docs use contact@sysfora.com only.
  const to = "sysforagroup@gmail.com";
  if (!smtpConfigured()) {
    return { kind: "support", to, ok: false, error: "SMTP is not configured on this server." };
  }
  const senderName = input.name.trim();
  const senderEmail = input.email.trim();
  const subjectLine = `[Todobee Support] ${input.subject.trim() || "New Support Request"} - ${senderName}`;
  const text = [
    `New support ticket submitted via Todobee website:`,
    "",
    `From: ${senderName} (${senderEmail})`,
    `Subject: ${input.subject.trim()}`,
    "",
    `Message:`,
    input.message.trim(),
    "",
    `---`,
    `Sent from Todobee Support Form`,
  ].join("\n");

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #eaeaea; border-radius: 12px; background: #ffffff;">
      <div style="border-bottom: 2px solid #f5b400; padding-bottom: 16px; margin-bottom: 20px;">
        <h2 style="color: #111; margin: 0; font-size: 20px;">New Support Request</h2>
        <p style="color: #666; margin: 4px 0 0; font-size: 14px;">Submitted via Todobee Website</p>
      </div>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr>
          <td style="padding: 8px 0; color: #666; font-size: 14px; width: 80px;"><strong>From:</strong></td>
          <td style="padding: 8px 0; color: #111; font-size: 14px;">${escapeHtml(senderName)} &lt;<a href="mailto:${escapeHtml(senderEmail)}" style="color: #1a73e8; text-decoration: none;">${escapeHtml(senderEmail)}</a>&gt;</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666; font-size: 14px; width: 80px;"><strong>Subject:</strong></td>
          <td style="padding: 8px 0; color: #111; font-size: 14px;">${escapeHtml(input.subject.trim())}</td>
        </tr>
      </table>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
        <h3 style="margin: 0 0 10px; font-size: 14px; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Message</h3>
        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #1e293b; white-space: pre-wrap;">${escapeHtml(input.message.trim())}</p>
      </div>
      <p style="font-size: 12px; color: #94a3b8; margin: 0; text-align: center;">You can reply directly to this email to contact the user.</p>
    </div>
  `;

  try {
    await transport().sendMail({
      from: env.smtpFrom(),
      to,
      replyTo: senderEmail,
      subject: subjectLine,
      text,
      html,
    });
    return { kind: "support", to, ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "The mail server rejected the message.";
    return { kind: "support", to, ok: false, error: message.split(to).join("support") };
  }
}

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
