import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getPrismaClient } from "@/lib/reading-river/db";
import { readDigestArticleToken } from "@/lib/reading-river/digest-links";
import { noteDriftOpened } from "@/lib/reading-river/drift-store";
import { getReadingRiverItemUrl } from "@/lib/reading-river/public-url";
import { readingRiverItemEditPath, readingRiverPath } from "@/lib/reading-river/routes";

export const runtime = "nodejs";

const privateHeaders = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow",
};

async function resolveArticle(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const claim = readDigestArticleToken(token);
  if (!claim) return null;
  const item = await getPrismaClient().readingItem.findFirst({
    where: { id: claim.itemId, userId: claim.userId, user: { status: "active" } },
    select: { id: true, sourceUrl: true },
  });
  if (!item) return null;
  let destination = getReadingRiverItemUrl(item.id);
  try {
    const source = new URL(item.sourceUrl?.trim() ?? "");
    if (["http:", "https:"].includes(source.protocol)) destination = source.toString();
  } catch {
    // Articles without a usable source open in Reading River instead.
  }
  return { ...claim, token: token!, destination };
}

function missingArticle() {
  return new Response("This Reading River article link is no longer available.", { status: 404, headers: privateHeaders });
}

/** GETs from email previews and ordinary link scanners never mutate Eddies. */
export async function GET(request: Request) {
  const article = await resolveArticle(request);
  if (!article) return missingArticle();
  const nonce = randomBytes(16).toString("base64");
  // Rebuild the action rather than interpolating an untrusted request URL.
  const action = `/api/reading-river/digest-click?token=${encodeURIComponent(article.token)}`;
  return new Response([
    "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><title>Opening your article · Reading River</title></head><body>",
    "<p>Opening your article…</p>",
    `<form method="post" action="${action}"><noscript><button type="submit">Open article and keep in Eddies</button></noscript></form>`,
    `<script nonce="${nonce}">function openArticle(){document.querySelector('form').submit()}if(document.prerendering){document.addEventListener('prerenderingchange',openArticle,{once:true})}else{openArticle()}</script>`,
    "</body></html>",
  ].join(""), {
    headers: {
      ...privateHeaders,
      "Content-Type": "text/html; charset=utf-8",
      // Chrome also applies form-action to the POST's redirect. Permit the
      // same HTTP(S) schemes accepted by resolveArticle for publisher URLs.
      "Content-Security-Policy": `default-src 'none'; script-src 'nonce-${nonce}'; form-action 'self' http: https:; base-uri 'none'; frame-ancestors 'none'`,
    },
  });
}

/** The link authorizes this one article for its recipient, with no app login. */
export async function POST(request: Request) {
  const article = await resolveArticle(request);
  if (!article) return missingArticle();
  try {
    // Reuses the app's transactional capacity, eligibility and repeat-open rules.
    await noteDriftOpened(article.userId, article.itemId);
    revalidatePath(readingRiverPath());
    revalidatePath(readingRiverItemEditPath(article.itemId));
  } catch {
    // Saving should not prevent the reader from reaching the article. Do not
    // log the request URL: its token is a scoped bearer capability.
    console.error("Failed to keep digest article in Eddies", { userId: article.userId, itemId: article.itemId });
  }
  return new Response(null, { status: 303, headers: { ...privateHeaders, Location: article.destination } });
}
