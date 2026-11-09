import { describe, expect, it, vi } from "vitest";
import { nearbyArticleTree, plantArticleTrees, TREE_SPACING } from "@/components/reading-river/glade-forest";
import { getForestArticles } from "@/lib/reading-river/forest";

const db = vi.hoisted(() => ({ readEvent: { findMany: vi.fn() } }));
vi.mock("@/lib/reading-river/db", () => ({ getPrismaClient: () => db }));

const articles = (count: number) => Array.from({ length: count }, (_, index) => ({
  id: `article-${index}`, title: `Article ${index}`, sourceUrl: null, siteName: null,
  readAt: new Date(2026, 0, 1, 0, index).toISOString(),
}));
const environment = {
  centre: { x: 0, z: -8 },
  existing: [{ x: 35, z: 25, s: 2 }],
  canPlant: (x: number, z: number) => Math.abs(x) > 12 && Math.hypot(x + 40, z + 20) > 18,
};

describe("article forest", () => {
  it("reveals an article only when you walk close to its tree, then hides it as you leave", () => {
    const trees = [{ x: 30, z: 10, s: 1.5, article: articles(1)[0] }];
    expect(nearbyArticleTree(trees, { x: 30, z: 18 }, null)).toBeNull();
    expect(nearbyArticleTree(trees, { x: 30, z: 16 }, null)).toBe(trees[0]);
    expect(nearbyArticleTree(trees, { x: 30, z: 18 }, "article-0")).toBe(trees[0]);
    expect(nearbyArticleTree(trees, { x: 30, z: 20 }, "article-0")).toBeNull();
    expect(nearbyArticleTree([], { x: 30, z: 10 }, "article-0")).toBeNull();
  });

  it("reveals the article belonging to the tree you approached", () => {
    const trees = articles(2).map((article, index) => ({ x: 30 + index * 20, z: 10, s: 1.5, article }));
    expect(nearbyArticleTree(trees, { x: 50, z: 14 }, "article-0")?.article.id).toBe("article-1");
    expect(nearbyArticleTree(trees, { x: 30, z: 14 }, "article-1")?.article.id).toBe("article-0");
  });

  it("plants exactly one tree per article and keeps earlier trees fixed as reading grows", () => {
    const first = plantArticleTrees(articles(12), environment);
    expect(first).toHaveLength(12);
    expect(plantArticleTrees(articles(30), environment).slice(0, 12)).toEqual(first);
    expect(plantArticleTrees([...articles(12), articles(1)[0]], environment)).toEqual(first);
    expect(plantArticleTrees(articles(12).reverse(), environment)).toEqual(first);
  });

  it("leaves generous gaps, avoids scenery and expands rather than crowding a large forest", () => {
    const forest = plantArticleTrees(articles(600), environment);
    expect(forest).toHaveLength(600);
    forest.forEach((tree, index) => {
      expect(environment.canPlant(tree.x, tree.z)).toBe(true);
      for (const other of [...environment.existing, ...forest.slice(0, index)]) {
        expect(Math.hypot(tree.x - other.x, tree.z - other.z)).toBeGreaterThanOrEqual(TREE_SPACING);
      }
    });
    expect(Math.max(...forest.map((tree) => Math.hypot(tree.x, tree.z + 8)))).toBeGreaterThan(165);
  });

  it("restores finished articles from this reader's saved reading events", async () => {
    db.readEvent.findMany.mockResolvedValueOnce([{
      readAt: new Date("2026-11-08T12:00:00Z"),
      readingItem: { id: "article-1", title: "An essay", sourceUrl: "https://example.com", siteName: "Example" },
    }]);
    expect(await getForestArticles("reader-1")).toEqual([{
      id: "article-1", title: "An essay", sourceUrl: "https://example.com", siteName: "Example",
      readAt: "2026-11-08T12:00:00.000Z",
    }]);
    expect(db.readEvent.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: "reader-1", readingItem: { sourceType: { notIn: ["manual", "book_chapter"] } } },
      orderBy: [{ readAt: "asc" }, { readingItemId: "asc" }],
    }));
  });
});
