import { notFound } from "next/navigation";
import { TaskIndex } from "@/components/pops/TaskIndex";
import { isWorkspace, WORKSPACES } from "@/lib/pops/constants";

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

  return (
    <>
      <h1>{meta.label}</h1>
      <p className="pops-lede">{meta.purpose}</p>
      <TaskIndex basePath={meta.path} workspace={workspace} view={view} tag={tag} error={error} />
    </>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  return { title: isWorkspace(workspace) ? WORKSPACES[workspace].label : "Not found" };
}
