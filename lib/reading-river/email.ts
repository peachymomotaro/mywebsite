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

type DailyDigestBookRoulettePick = {
  id: string;
  title: string;
  author?: string | null;
  notes?: string | null;
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
  const sourceUrl = item.sourceUrl?.trim();

  return sourceUrl ? sourceUrl : getReadingRiverItemUrl(item.id);
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

function renderBookRouletteHtml(book: DailyDigestBookRoulettePick | null | undefined) {
  if (!book) {
    return "";
  }

  const metaParts = [book.author?.trim() || null].filter(Boolean);
  const notes = book.notes?.trim();

  return [
    `<div style=\"margin: 28px 0 0; padding: 18px 20px; border: 1px solid #e5e7eb; border-radius: 16px; background: #f9fafb;\">`,
    `<p style=\"margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.16em; font-size: 11px; color: #6b7280;\">Book Roulette</p>`,
    `<p style=\"margin: 0 0 6px; font-size: 17px; line-height: 1.45; font-weight: 700;\">${escapeHtml(book.title)}</p>`,
    metaParts.length > 0
      ? `<p style=\"margin: 0; color: #667085; font-size: 14px; line-height: 1.5;\">${escapeHtml(metaParts.join(" | "))}</p>`
      : "",
    notes
      ? `<p style=\"margin: 12px 0 0; color: #374151; font-size: 14px; line-height: 1.6;\">${escapeHtml(notes)}</p>`
      : "",
    "</div>",
  ].join("");
}

function renderBookRouletteText(book: DailyDigestBookRoulettePick | null | undefined) {
  if (!book) {
    return "";
  }

  return [
    "Book Roulette",
    book.title,
    book.author?.trim() || null,
    book.notes?.trim() || null,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildReadingRiverDailyDigestEmail({
  displayName,
  items,
  bookRoulettePick = null,
}: {
  displayName: string;
  items: DailyDigestEmailItem[];
  bookRoulettePick?: DailyDigestBookRoulettePick | null;
}) {
  const homeUrl = getReadingRiverHomeUrl();
  const recipientName = displayName.trim() || "there";
  const itemHtml = items.length > 0 ? items.map(renderDigestItemHtml).join("") : "<li>No items today.</li>";
  const itemText = items.length > 0 ? items.map(renderDigestItemText).join("\n\n") : "No items today.";
  const bookRouletteHtml = renderBookRouletteHtml(bookRoulettePick);
  const bookRouletteText = renderBookRouletteText(bookRoulettePick);

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
      bookRouletteHtml,
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
      bookRouletteText ? `\n${bookRouletteText}` : "",
      "",
      `Open Reading River: ${homeUrl}`,
    ].join("\n"),
  };
}

export async function sendReadingRiverDailyDigestEmail({
  email,
  displayName,
  items,
  bookRoulettePick = null,
}: {
  email: string;
  displayName: string;
  items: DailyDigestEmailItem[];
  bookRoulettePick?: DailyDigestBookRoulettePick | null;
}) {
  const message = buildReadingRiverDailyDigestEmail({
    displayName,
    items,
    bookRoulettePick,
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
