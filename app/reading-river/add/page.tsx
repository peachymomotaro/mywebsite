import { AddItemTabs } from "@/components/reading-river/add-item-tabs";
import { ManualItemForm } from "@/components/reading-river/manual-item-form";
import { UrlIntakeForm } from "@/components/reading-river/url-intake-form";

export default function AddPage() {
  return (
    <main className="river-page">
      <section className="max-w-4xl space-y-4">
        <h1 className="river-home-title">Add to stream</h1>
        <p className="editorial-page-intro">
          Save a link or jot down something to read. Both forms add straight into the same stream.
        </p>
      </section>

      <AddItemTabs articleContent={<UrlIntakeForm />} manualContent={<ManualItemForm />} />
    </main>
  );
}
