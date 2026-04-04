import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "..", "..");

describe("runtime config", () => {
  it("pins the deployed Node.js major version to match the repo toolchain", () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"),
    ) as {
      engines?: {
        node?: string;
      };
    };
    const nvmrc = fs.readFileSync(path.join(repoRoot, ".nvmrc"), "utf8").trim();

    expect(nvmrc).toBe("22");
    expect(packageJson.engines?.node).toBe("22.x");
  });
});
