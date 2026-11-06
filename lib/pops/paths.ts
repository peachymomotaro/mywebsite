/** Only allow redirects back into POps after login. */
export function safeNextPath(value: unknown) {
  const next = typeof value === "string" ? value : "";
  return /^\/pops(\/[A-Za-z0-9/_-]*)?$/.test(next) ? next : "/pops";
}
