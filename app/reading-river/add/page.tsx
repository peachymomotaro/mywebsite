import { AddItemTabs } from "@/components/reading-river/add-item-tabs";
import { ManualItemForm } from "@/components/reading-river/manual-item-form";
import { UrlIntakeForm } from "@/components/reading-river/url-intake-form";
import { measureReadingRiverTiming } from "@/lib/reading-river/timing";

export default async function AddPage() {
  return measureReadingRiverTiming("page.reading-river-add.render", async () => (
    <main className="river-page">
      <section className="max-w-4xl space-y-4">
        <h1 className="river-home-title">Add to stream</h1>
        <p className="editorial-page-intro">
          Save a link or jot down something to read. Links fetch details first so you can review
          them before they enter the stream.
        </p>
      </section>

      <AddItemTabs articleContent={<UrlIntakeForm />} manualContent={<ManualItemForm />} />
    </main>
  ));
}
