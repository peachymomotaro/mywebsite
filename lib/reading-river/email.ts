import { Resend } from "resend";
import { getReadingRiverInviteUrl } from "@/lib/reading-river/public-url";

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("RESEND_API_KEY must be set before sending invite emails.");
  }

  return new Resend(apiKey);
}

function getResendFromEmail() {
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();

  if (!fromEmail) {
    throw new Error("RESEND_FROM_EMAIL must be set before sending invite emails.");
  }

  return fromEmail;
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
