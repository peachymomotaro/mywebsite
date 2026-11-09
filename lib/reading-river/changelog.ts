export type ReadingRiverChangelogItem =
  | string
  | {
      text: string;
      linkText: string;
      href: string;
      suffix?: string;
    };

export type ReadingRiverChangelogEntry = {
  slug: string;
  date: string;
  title: string;
  items: ReadingRiverChangelogItem[];
};

export const readingRiverChangelogEntries: ReadingRiverChangelogEntry[] = [
  {
    slug: "vltava-on-the-river",
    date: "9 November 2026",
    title: "Vltava on the river",
    items: [
      "The river now plays Bedřich Smetana’s Vltava (The Moldau), from Má vlast, performed by the Musopen Symphony Orchestra.",
    ],
  },
  {
    slug: "a-tree-for-every-article",
    date: "8 November 2026",
    title: "A tree for every article",
    items: [
      "Finishing an article now plants a tree in your world. Trees spread out with generous gaps, and your already-finished articles have trees too.",
      "Article trees have golden leaves and a little paper tag. Walk up to one to rediscover the article you finished. As you read more, the forest grows into new ground instead of becoming crowded.",
    ],
  },
  {
    slug: "a-river-you-can-walk-through",
    date: "6 November 2026",
    title: "A river you can walk through",
    items: [
      "Reading River is now a moving oil painting. Walk along the bank, cross the footbridge, or turn the view to explore the landscape and its wildlife.",
      "Articles drift past in large folded-paper boats. Walk close to a boat to see its title, then choose something to read. Opening a piece carries it into the eddies, which hold up to five reads.",
      "Finishing an article plants a golden tree. Its title now appears over the tree when you walk up to it, so you can revisit what you have read.",
      "The guide now describes the river as it works today. Priority rotation has been removed from Preferences, and the soundtrack’s quiet opening is easier to hear.",
    ],
  },
  {
    slug: "Google Chrome Extension",
    date: "21st May 2026",
    title: "Excited to Announce the Google Chrome Extension!",
    items: [
      {
        text: "There's a new Google Chrome extension, which can be found ",
        linkText: "here",
        href: "https://chromewebstore.google.com/detail/reading-river/gclbpodffcebdmecehkolmejiopfjhnl",
        suffix: ".",
      },
      "Book Roulette now lets you cycle through your books if you don't want to read the first one it suggests. Just click the 'Next Book' button to see the next one in your river.",
    ],
  },
  {
    slug: "fiches-and-password-reset",
    date: "9th May 2026",
    title: "Fiches and Password Reset",
    items: [
      "Added fiches to the background! Now you have aquatic companions in the river.",
      "You can now reset your password to the Reading River if you forget it.",
      "Book Roulette now lets you remove books. If you click on the book in the book roulette, there is now a remove book button, which takes it out of the river permanently."
    ],
  },
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
