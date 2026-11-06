import { TaskIndex } from "@/components/pops/TaskIndex";

export const metadata = { title: "Everything" };

export default async function EverythingPage({ searchParams }: { searchParams: Promise<{ view?: string; tag?: string; error?: string }> }) {
  const { view, tag, error } = await searchParams;
  return (
    <>
      <div className="pops-pagehead">
        <h1>Everything</h1>
      </div>
      <p className="pops-lede">All tasks across the four workspaces. Agents do the work; you decide what is done.</p>
      <TaskIndex basePath="/pops" view={view} tag={tag} error={error} />
    </>
  );
}
