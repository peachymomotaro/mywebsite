import { Resend } from "resend";
import { getDigestArticleUrl } from "@/lib/reading-river/digest-links";
import {
  getReadingRiverHomeUrl,
  getReadingRiverInviteUrl,
  getReadingRiverItemUrl,
  getReadingRiverPasswordResetUrl,
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

export function buildReadingRiverPasswordResetEmail({
  displayName,
  token,
}: {
  displayName: string;
  token: string;
}) {
  const resetUrl = getReadingRiverPasswordResetUrl(token);
  const recipientName = displayName.trim() || "there";

  return {
    subject: "Reset your Reading River password",
    html: [
      "<!doctype html>",
      "<html>",
      "<body style=\"margin: 0; padding: 32px; font-family: Arial, sans-serif; color: #111827; background: #f8fafc;\">",
      `<div style=\"max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 20px; padding: 32px;\">`,
      `<p style=\"margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.2em; font-size: 12px; color: #6b7280;\">Reading River</p>`,
      `<h1 style=\"margin: 0 0 16px; font-size: 28px; line-height: 1.1;\">Reset your password</h1>`,
      `<p style=\"margin: 0 0 20px; font-size: 16px; line-height: 1.6;\">Hi ${escapeHtml(recipientName)}, use this link to set a new Reading River password.</p>`,
      `<p style=\"margin: 0 0 20px; font-size: 16px; line-height: 1.6;\"><a href=\"${escapeHtml(resetUrl)}\">Reset your password</a></p>`,
      `<p style=\"margin: 0; color: #667085; font-size: 14px; line-height: 1.6;\">This link expires in one hour. If you did not request it, you can ignore this email.</p>`,
      "</div>",
      "</body>",
      "</html>",
    ].join(""),
    text: [
      "Reading River",
      "Reset your password",
      "",
      `Hi ${recipientName}, use this link to set a new Reading River password:`,
      resetUrl,
      "",
      "This link expires in one hour. If you did not request it, you can ignore this email.",
    ].join("\n"),
  };
}

export async function sendReadingRiverPasswordResetEmail({
  email,
  displayName,
  token,
}: {
  email: string;
  displayName: string;
  token: string;
}) {
  const message = buildReadingRiverPasswordResetEmail({
    displayName,
    token,
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
    throw new Error(error.message || "Resend did not send the password reset email.");
  }

  return data;
}

function getDigestItemUrl(item: DailyDigestEmailItem, userId?: string) {
  if (userId) return getDigestArticleUrl(userId, item.id);
  const sourceUrl = item.sourceUrl?.trim();

  return sourceUrl ? sourceUrl : getReadingRiverItemUrl(item.id);
}

/**
 * Water paintings in the river world's style, with a branch arching over
 * the article label. One heads each day's email, in turn.
 * They live outside /reading-river so mail apps can load them without signing in.
 */
export const DIGEST_STILLS = [
  "constable",
  "hiroshige",
  "cuyp",
  "monet",
  "repin",
  "seurat",
  "courbet",
  "grenouillere",
  "waterhouse",
  "vangogh",
  "turner",
  "cole",
] as const;

function getLondonDayNumber(now: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => Number(parts.find((entry) => entry.type === type)?.value);

  return Math.floor(Date.UTC(part("year"), part("month") - 1, part("day")) / 86_400_000);
}

export function getDigestStillUrl(now: Date) {
  const still = DIGEST_STILLS[getLondonDayNumber(now) % DIGEST_STILLS.length];

  return new URL(`/email/reading-river/${still}.jpg`, getReadingRiverHomeUrl()).toString();
}

const INK = "#3a2b1c";
const MUTED = "#7a6650";
const PAPER = "#f8f1e2";
const SERIF = "Georgia, 'Times New Roman', serif";

/**
 * The day's still with the link laid over it, under the branch: the article's
 * title (and where it's from, how long it takes) on a cream label. The still is
 * a background, with the VML fallback Outlook needs, so the link is live text
 * and still reads if images are blocked.
 */
/** Long titles are cut at a word, so the label never buries the picture. */
function shortTitle(title: string, limit = 72) {
  const clean = title.trim().replace(/\s+/g, " ");
  if (clean.length <= limit) return clean;
  const cut = clean.slice(0, limit + 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > limit * 0.6 ? cut.slice(0, lastSpace) : clean.slice(0, limit)).replace(/[\s,;:.\-–—]+$/, "")}…`;
}

function renderStillWithLinkHtml({ stillUrl, url, title, meta }: { stillUrl: string; url: string; title: string; meta: string | null }) {
  const still = escapeHtml(stillUrl);
  const href = escapeHtml(url);
  const label = [
    `<a href="${href}" class="rr-label" style="display: inline-block; max-width: 440px; padding: 12px 26px 13px; border-radius: 28px; background: rgba(248,241,226,0.96); background-color: #f8f1e2; color: ${INK}; text-decoration: none; box-shadow: 0 6px 22px rgba(24,16,8,0.35);">`,
    `<span class="rr-title" style="display: block; font-family: ${SERIF}; font-size: 21px; line-height: 1.3; font-style: italic; color: ${INK};">${escapeHtml(shortTitle(title))}</span>`,
    meta ? `<span class="rr-meta" style="display: block; margin-top: 3px; font-family: ${SERIF}; font-size: 13px; letter-spacing: 0.04em; color: ${MUTED};">${escapeHtml(meta)}</span>` : "",
    "</a>",
  ].join("");

  return [
    `<tr><td class="rr-still" background="${still}" bgcolor="#6f7d5a" height="420" valign="bottom" align="center" style="height: 420px; padding: 0; background-color: #6f7d5a; background-image: url('${still}'); background-size: cover; background-position: center; text-align: center;">`,
    `<!--[if gte mso 9]><v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:640px;height:420px;"><v:fill type="frame" src="${still}" color="#6f7d5a" /><v:textbox inset="0,0,0,0"><![endif]-->`,
    `<table role="presentation" class="rr-still-content" width="100%" height="420" cellpadding="0" cellspacing="0" border="0" style="height: 420px; border-collapse: collapse;"><tr><td class="rr-label-wrap" valign="bottom" align="center" style="padding: 0 24px 28px;">`,
    label,
    "</td></tr></table>",
    "<!--[if gte mso 9]></v:textbox></v:rect><![endif]-->",
    "</td></tr>",
  ].join("");
}

function renderDigestItemText(item: DailyDigestEmailItem, userId?: string) {
  const url = getDigestItemUrl(item, userId);
  const metaParts = [item.siteName, item.estimatedMinutes ? `${item.estimatedMinutes} min` : null].filter(
    Boolean,
  );

  return [
    item.title,
    metaParts.length > 0 ? metaParts.join(" · ") : null,
    url,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * The daily email: a painted view of the river, and over it, under an arching
 * branch, a link to the one piece the river has for today.
 */
export function buildReadingRiverDailyDigestEmail({
  userId,
  displayName,
  items,
  now = new Date(),
}: {
  // Omitted only for unpersonalized previews. Sent emails always include it.
  userId?: string;
  displayName: string;
  items: DailyDigestEmailItem[];
  now?: Date;
}) {
  const homeUrl = getReadingRiverHomeUrl();
  const recipientName = displayName.trim() || "there";
  const item = items[0] ?? null;
  const meta = item
    ? [item.siteName, item.estimatedMinutes ? `${item.estimatedMinutes} min` : null].filter(Boolean).join(" · ") || null
    : null;
  const stillHtml = renderStillWithLinkHtml({
    stillUrl: getDigestStillUrl(now),
    url: item ? getDigestItemUrl(item, userId) : homeUrl,
    title: item ? item.title : "Walk down to the river",
    meta,
  });
  const itemText = item ? renderDigestItemText(item, userId) : "The river is quiet today.";

  return {
    subject: "Your Reading River for today",
    html: [
      "<!doctype html>",
      `<html xmlns:v="urn:schemas-microsoft-com:vml">`,
      "<head>",
      `<meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Your Reading River for today</title>`,
      // On a phone the picture is narrower, so it needs less height to show the same scene.
      `<style>@media (max-width: 660px) { .rr-still, .rr-still-content { height: 300px !important; } .rr-label-wrap { padding: 0 16px 22px !important; } .rr-label { padding: 10px 16px !important; } .rr-title { font-size: 18px !important; line-height: 1.3 !important; } .rr-meta { font-size: 12px !important; line-height: 1.3 !important; } }</style>`,
      "</head>",
      `<body style="margin: 0; padding: 16px 10px; font-family: ${SERIF}; background: #ebe1cb;">`,
      // The preview line mail apps show beside the subject.
      `<div style="display: none; max-height: 0; overflow: hidden;">${escapeHtml(item ? `${item.title}${meta ? ` · ${meta}` : ""}` : "The river is quiet today.")}</div>`,
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;"><tr><td align="center">`,
      `<table role="presentation" class="rr-card" width="640" cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: 640px; border-collapse: separate; background: ${PAPER}; border-radius: 18px; overflow: hidden;">`,
      stillHtml,
      `<tr><td align="center" style="padding: 14px 20px 16px; text-align: center;"><a href="${escapeHtml(homeUrl)}" style="display: inline-block; padding: 11px 18px; border: 1px solid #c5b69a; border-radius: 6px; background-color: #f1e7d2; font-family: ${SERIF}; font-size: 14px; line-height: 20px; mso-padding-alt: 11px 18px; color: #65513a; text-decoration: none;">Step into the river</a></td></tr>`,
      "</table>",
      "</td></tr></table>",
      "</body>",
      "</html>",
    ].join(""),
    text: [
      "Reading River",
      "",
      `Good morning, ${recipientName}. Today on the river:`,
      "",
      itemText,
      "",
      `Step into the river: ${homeUrl}`,
    ].join("\n"),
  };
}

export async function sendReadingRiverDailyDigestEmail({
  userId,
  email,
  displayName,
  items,
}: {
  userId: string;
  email: string;
  displayName: string;
  items: DailyDigestEmailItem[];
}) {
  const message = buildReadingRiverDailyDigestEmail({
    userId,
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
