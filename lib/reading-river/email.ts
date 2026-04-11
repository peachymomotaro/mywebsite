import { Resend } from "resend";
import {
  getReadingRiverHomeUrl,
  getReadingRiverInviteUrl,
  getReadingRiverItemUrl,
} from "@/lib/reading-river/public-url";

type DailyDigestEmailItem = {
  id: string;
  title: string;
  sourceUrl?: string | null;
  siteName?: string | null;
  estimatedMinutes?: number | null;
  tags?: string[];
};

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("RESEND_API_KEY must be set before sending Reading River emails.");
  }

  return new Resend(apiKey);
}

function getResendFromEmail() {
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();

  if (!fromEmail) {
    throw new Error("RESEND_FROM_EMAIL must be set before sending Reading River emails.");
  }

  return fromEmail;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function sendReadingRiverInviteEmail({
  email,
  token,
}: {
  email: string;
  token: string;
}) {
  const inviteUrl = getReadingRiverInviteUrl(token);
  const resend = getResendClient();
  const { data, error } = await resend.emails.send({
    from: getResendFromEmail(),
    to: email,
    subject: "Your Reading River invite",
    text: `You've been invited to Reading River. Accept your invite here: ${inviteUrl}`,
    html: [
      "<p>You've been invited to Reading River.</p>",
      `<p><a href="${inviteUrl}">Accept your invite</a></p>`,
      "<p>This invite link lets you set your password and create your account.</p>",
    ].join(""),
  });

  if (error) {
    throw new Error(error.message || "Resend did not send the invite email.");
  }

  return data;
}

function getDigestItemUrl(item: DailyDigestEmailItem) {
  return item.sourceUrl ?? getReadingRiverItemUrl(item.id);
}

function renderDigestItemHtml(item: DailyDigestEmailItem) {
  const url = getDigestItemUrl(item);
  const metaParts = [item.siteName, item.estimatedMinutes ? `${item.estimatedMinutes} min` : null].filter(
    Boolean,
  );

  return [
    "<li style=\"margin: 0 0 20px;\">",
    `<p style=\"margin: 0 0 6px; font-size: 16px; line-height: 1.5;\"><a href=\"${escapeHtml(url)}\">${escapeHtml(item.title)}</a></p>`,
    metaParts.length > 0
      ? `<p style=\"margin: 0; color: #667085; font-size: 14px; line-height: 1.5;\">${escapeHtml(metaParts.join(" | "))}</p>`
      : "",
    "</li>",
  ].join("");
}

function renderDigestItemText(item: DailyDigestEmailItem) {
  const url = getDigestItemUrl(item);
  const metaParts = [item.siteName, item.estimatedMinutes ? `${item.estimatedMinutes} min` : null].filter(
    Boolean,
  );

  return [
    item.title,
    metaParts.length > 0 ? metaParts.join(" | ") : null,
    url,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildReadingRiverDailyDigestEmail({
  displayName,
  items,
}: {
  displayName: string;
  items: DailyDigestEmailItem[];
}) {
  const homeUrl = getReadingRiverHomeUrl();
  const recipientName = displayName.trim() || "there";
  const itemHtml = items.length > 0 ? items.map(renderDigestItemHtml).join("") : "<li>No items today.</li>";
  const itemText = items.length > 0 ? items.map(renderDigestItemText).join("\n\n") : "No items today.";

  return {
    subject: "Your Reading River for today",
    html: [
      "<!doctype html>",
      "<html>",
      "<body style=\"margin: 0; padding: 32px; font-family: Arial, sans-serif; color: #111827; background: #f8fafc;\">",
      `<div style=\"max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 20px; padding: 32px;\">`,
      `<p style=\"margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.2em; font-size: 12px; color: #6b7280;\">Reading River</p>`,
      `<h1 style=\"margin: 0 0 16px; font-size: 30px; line-height: 1.1;\">Your Reading River for today</h1>`,
      `<p style=\"margin: 0 0 24px; font-size: 16px; line-height: 1.6;\">Hi ${escapeHtml(recipientName)}, here are your picks for today.</p>`,
      `<ul style=\"list-style: none; padding: 0; margin: 0;\">${itemHtml}</ul>`,
      `<p style=\"margin: 28px 0 0; font-size: 14px; line-height: 1.6;\"><a href=\"${escapeHtml(homeUrl)}\">Open Reading River</a></p>`,
      "</div>",
      "</body>",
      "</html>",
    ].join(""),
    text: [
      "Reading River",
      "Your Reading River for today",
      "",
      `Hi ${recipientName}, here are your picks for today.`,
      "",
      itemText,
      "",
      `Open Reading River: ${homeUrl}`,
    ].join("\n"),
  };
}

export async function sendReadingRiverDailyDigestEmail({
  email,
  displayName,
  items,
}: {
  email: string;
  displayName: string;
  items: DailyDigestEmailItem[];
}) {
  const message = buildReadingRiverDailyDigestEmail({
    displayName,
    items,
  });
  const resend = getResendClient();
  const { data, error } = await resend.emails.send({
    from: getResendFromEmail(),
    to: email,
    subject: message.subject,
    html: message.html,
    text: message.text,
  });

  if (error) {
    throw new Error(error.message || "Resend did not send the daily digest email.");
  }

  return data;
}
