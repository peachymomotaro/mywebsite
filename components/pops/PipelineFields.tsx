import { WORKSPACE_KEYS, WORKSPACES } from "@/lib/pops/constants";

export function PipelineFields({
  values,
}: {
  values: { name: string; summary: string; workspace: string | null; instructions: string; expectedEvidence: string };
}) {
  return (
    <>
      <label htmlFor="p-name">Name</label>
      <input id="p-name" name="name" defaultValue={values.name} required maxLength={120} style={{ width: "100%" }} />
      <label htmlFor="p-summary">One-line summary</label>
      <input id="p-summary" name="summary" defaultValue={values.summary} maxLength={400} style={{ width: "100%" }} />
      <label htmlFor="p-ws">Workspace</label>
      <select id="p-ws" name="workspace" defaultValue={values.workspace ?? ""}>
        <option value="">Any workspace</option>
        {WORKSPACE_KEYS.map((key) => <option key={key} value={key}>{WORKSPACES[key].label}</option>)}
      </select>
      <label htmlFor="p-instr">Instructions</label>
      <textarea id="p-instr" name="instructions" defaultValue={values.instructions} required className="pops-code" />
      <label htmlFor="p-evidence">Expected evidence</label>
      <textarea id="p-evidence" name="expectedEvidence" defaultValue={values.expectedEvidence} style={{ minHeight: "4em" }} />
      <label htmlFor="p-note">Change note</label>
      <input id="p-note" name="changeNote" maxLength={300} style={{ width: "100%" }} placeholder="What changed and why" />
    </>
  );
}
