// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { supersedePendingProposals } from "@/lib/pops/library";

function stubProposals(rows: { id: string; status: string; kind: string; pipelineId: string | null }[]) {
  const findMany = vi.fn(async ({ where }: { where: { id: { in: string[] }; status: string; kind: string } }) =>
    rows.filter((row) => where.id.in.includes(row.id) && row.status === where.status && row.kind === where.kind));
  const updateMany = vi.fn(async ({ where }: { where: { id: { in: string[] } } }) =>
    ({ count: rows.filter((row) => where.id.in.includes(row.id) && row.status === "pending").length }));
  return { popsProposal: { findMany, updateMany } };
}

describe("explicit proposal supersession", () => {
  it("retires only pending suggestions for the same pipeline and links to their replacement", async () => {
    const tx = stubProposals([{ id: "old", status: "pending", kind: "pipeline_change", pipelineId: "pipeline1" }]);
    await supersedePendingProposals(tx as never, ["old"], { id: "pipeline1", kind: "pipeline_change" }, "replacement", new Date("2026-11-18"));
    expect(tx.popsProposal.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "superseded", supersededById: "replacement" }),
    }));
  });

  it("does not let an agent hide suggestions for a different pipeline", async () => {
    const tx = stubProposals([{ id: "old", status: "pending", kind: "pipeline_change", pipelineId: "other" }]);
    await expect(supersedePendingProposals(tx as never, ["old"], { id: "pipeline1", kind: "pipeline_change" }, "replacement", new Date())).rejects.toThrow("same pipeline");
    expect(tx.popsProposal.updateMany).not.toHaveBeenCalled();
  });

  it("never replaces an already reviewed suggestion", async () => {
    const tx = stubProposals([{ id: "old", status: "accepted", kind: "pipeline_change", pipelineId: "pipeline1" }]);
    await expect(supersedePendingProposals(tx as never, ["old"], { id: "pipeline1", kind: "pipeline_change" }, "replacement", new Date())).rejects.toThrow("pending proposals");
    expect(tx.popsProposal.updateMany).not.toHaveBeenCalled();
  });
});
