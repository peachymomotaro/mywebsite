import sitemap from "@/app/sitemap";

describe("sitemap", () => {
  it("lists only canonical HTTPS URLs for petercurry.org", () => {
    const entries = sitemap();

    expect(entries.length).toBeGreaterThan(0);
    expect(entries.map((entry) => entry.url)).toContain("https://petercurry.org/");

    for (const entry of entries) {
      expect(entry.url).toMatch(/^https:\/\/petercurry\.org\//);
      expect(entry.url).not.toMatch(/^http:\/\//);
    }
  });
});
