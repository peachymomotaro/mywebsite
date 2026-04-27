export type ReadingRiverChangelogEntry = {
  slug: string;
  date: string;
  title: string;
  items: string[];
};

export const readingRiverChangelogEntries: ReadingRiverChangelogEntry[] = [
  {
    slug: "book-roulette-and-priority-tuning",
    date: "27 April 2026",
    title: "Book Roulette and priority tuning",
    items: [
      "Made the priority option slightly less deterministic so you're not just staring at the same thing you haven't read day after day.",
      "Changed manual items to books, and took them out of the priority queue. Now books show up in book roulette, at the bottom of the front page. You can also receive your daily book roulette by email, if you'd like to be reminded about books you wanted to read.",
      "The Firefox extension should now estimate reading time of an article for you if you're on the correct page, but this will take about a day to update."
    ],
  },
  {
    slug: "The River Flows",
    date: "18 April 2026",
    title: "The River Flows",
    items: [
      "I added the Changelog, so you can now see what's been changed!",
      "Added more options for when you can receive emails with your reading, which can be found in Preferences. You can choose from every other day, which will email you Mondays, Wednesdays, Fridays and Sundays, or once a week, once a month, or once every season (every three months). [H/T Grace]",
      "Some fixes which should make it nicer to browse on mobile. For instance, some of the buttons have been moved to the left instead of being on the right. The only one I haven't moved is the 'Manual Item', because I am thinking of making this a books only feature. While it's being developed, the app is designed for desktop, so weird things may happen on mobile. If they get too weird, let me know and I'll fix them. [H/T Grace & Andrew]",
      "The Reading River should now prevent you from adding duplicate articles.",
      "Tags should autofill as you're typing them. I'll add some code to make this look nicer in future, but for now the autofill feature is in. [H/T Andrew]",
      "I fixed a CSS alignment issue on the front page that was annoying me."
    ],
  },
];
