/** Only allow redirects back into POps after login. */
export function safeNextPath(value: unknown) {
  const next = typeof value === "string" ? value : "";
  if (/^\/pops\/oauth\/authorize\?[^#\s\\]{1,8192}$/.test(next)) return next;
  return /^\/pops(\/[A-Za-z0-9/_-]*)?$/.test(next) ? next : "/pops";
}
