import Link from "next/link";
import { notFound } from "next/navigation";
import { TaskIndex } from "@/components/pops/TaskIndex";
import { isWorkspace, WORKSPACES } from "@/lib/pops/constants";
import { listPipelines } from "@/lib/pops/library";

export default async function WorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ view?: string; tag?: string; error?: string }>;
}) {
  const { workspace } = await params;
  if (!isWorkspace(workspace)) notFound();
  const { view, tag, error } = await searchParams;
  const meta = WORKSPACES[workspace];
  const pipelines = (await listPipelines()).filter((p) => p.workspace === workspace);

  return (
    <>
      <div className="pops-pagehead">
        <h1>{meta.label}</h1>
      </div>
      <p className="pops-lede">{meta.purpose}</p>
      <p className="pops-small pops-muted">
        Pipelines:{" "}
        {pipelines.map((p, i) => (
          <span key={p.slug}>
            {i ? " · " : ""}
            <Link href={`/pops/pipelines/${p.slug}`}>{p.name}</Link>
          </span>
        ))}
      </p>
      <TaskIndex basePath={meta.path} workspace={workspace} view={view} tag={tag} error={error} />
    </>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  return { title: isWorkspace(workspace) ? WORKSPACES[workspace].label : "Not found" };
}
