import Link from "next/link";
import { notFound } from "next/navigation";
import { TagInput } from "@/components/reading-river/tag-input";
import { saveReadingItemEditAction } from "./actions";
import { requireCurrentUser } from "@/lib/reading-river/current-user";
import { getPrismaClient } from "@/lib/reading-river/db";
import { getKnownTagNames } from "@/lib/reading-river/known-tags";
import { readingRiverPath } from "@/lib/reading-river/routes";

const PRIORITY_OPTIONS = Array.from({ length: 11 }, (_, value) => String(value));

export const dynamic = "force-dynamic";

type ReadingRiverEditItemPageProps = {
  params:
    | Promise<{
        id: string;
      }>
    | {
        id: string;
      };
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

function getErrorMessage(error: string | null) {
  switch (error) {
    case "invalid_input":
      return "Add a title, reading time, priority setting, and a valid URL before saving.";
    case "duplicate_url":
      return "That link is already in your stream.";
    case "save_failed":
      return "Couldn't save that item. Try again.";
    default:
      return null;
  }
}

export default async function ReadingRiverEditItemPage({
  params,
  searchParams,
}: ReadingRiverEditItemPageProps) {
  const { id } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const error =
    typeof resolvedSearchParams.error === "string" ? resolvedSearchParams.error : null;
  const currentUser = await requireCurrentUser();
  const knownTagNames = await getKnownTagNames();
  const prisma = getPrismaClient();
  const item = await prisma.readingItem.findUnique({
    where: {
      userId_id: {
        userId: currentUser.id,
        id,
      },
    },
    select: {
      id: true,
      title: true,
      sourceType: true,
      sourceUrl: true,
      estimatedMinutes: true,
      priorityScore: true,
      tags: {
        select: {
          tag: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (!item) {
    notFound();
  }

  return (
    <main className="river-page">
      <section className="max-w-4xl space-y-4">
        <p className="river-section-label">Item</p>
        <h1 className="river-home-title">Edit item</h1>
        <p className="editorial-page-intro">
          Adjust the details that shape how this piece shows up in the river.
        </p>
      </section>

      <section className="editorial-panel intake-panel">
        {getErrorMessage(error) ? (
          <div aria-live="polite" className="intake-feedback intake-feedback-error">
            <p className="intake-feedback-message">{getErrorMessage(error)}</p>
          </div>
        ) : null}

        <form action={saveReadingItemEditAction} className="editorial-form">
          <input name="id" type="hidden" value={item.id} />
          <input name="sourceType" type="hidden" value={item.sourceType} />

          <label className="grid gap-2 text-sm">
            <span>Title</span>
            <input
              name="title"
              type="text"
              required
              defaultValue={item.title}
              className="intake-input"
            />
          </label>

          {item.sourceType === "url" ? (
            <label className="grid gap-2 text-sm">
              <span>Source URL</span>
              <input
                name="sourceUrl"
                type="url"
                required
                defaultValue={item.sourceUrl ?? ""}
                className="intake-input"
              />
            </label>
          ) : null}

          <div className="grid gap-8 sm:grid-cols-2">
            <label className="grid gap-2 text-sm">
              <span>Estimated minutes</span>
              <input
                name="estimatedMinutes"
                type="number"
                min="1"
                required
                defaultValue={item.estimatedMinutes ?? undefined}
                className="intake-input"
              />
            </label>

            <div className="grid gap-2 text-sm">
              <label htmlFor="edit-item-priority-score">Priority</label>
              <select
                id="edit-item-priority-score"
                name="priorityScore"
                required
                defaultValue={item.priorityScore === null ? "none" : String(item.priorityScore)}
                aria-describedby="edit-item-priority-help edit-item-priority-scale"
                className="intake-input"
              >
                <option value="none">No priority (stream only)</option>
                {PRIORITY_OPTIONS.map((priorityValue) => (
                  <option key={priorityValue} value={priorityValue}>
                    {priorityValue}
                  </option>
                ))}
              </select>
              <p id="edit-item-priority-help" className="intake-helper-text">
                No priority items stay in the stream and never appear in the left column.
              </p>
              <p id="edit-item-priority-scale" className="intake-helper-text">
                0–10, where 10 is highest priority.
              </p>
            </div>
          </div>

          <TagInput
            knownTagNames={knownTagNames}
            defaultValue={item.tags.map(({ tag }) => tag.name).join(", ")}
            placeholder="focus, essays"
          />

          <div className="intake-submit-row">
            <button className="intake-submit-button" type="submit">
              Save changes
            </button>
            <Link href={readingRiverPath()} className="river-primary-action river-primary-action-muted">
              Cancel
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}
