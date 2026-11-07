import { TaskIndex } from "@/components/pops/TaskIndex";

export const metadata = { title: "Everything" };

export default async function EverythingPage({ searchParams }: { searchParams: Promise<{ view?: string; tag?: string; error?: string }> }) {
  const { view, tag, error } = await searchParams;
  return (
    <>
      <h1 style={{ marginBottom: 20 }}>Everything</h1>
      <TaskIndex basePath="/pops" view={view} tag={tag} error={error} />
    </>
  );
}
