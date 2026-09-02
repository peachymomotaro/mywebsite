export type CelebrityDeadOrAliveEntry = {
  id: string;
  name: string;
  isAlive: boolean;
  birthYear: number;
  deathYear?: number;
  age: number;
  knownFor: string;
  imageSrc: string;
  imageAlt: string;
  imageCredit?: {
    label: string;
    sourceUrl: string;
    license: string;
  };
};

// Starter fixtures only. The game UI is deliberately decoupled from this file so
// the final ~50-person Wikimedia Commons set can be swapped in without touching
// the game logic.
export const celebrityDeadOrAliveEntries: CelebrityDeadOrAliveEntry[] = [
  {
    id: "joan-collins",
    name: "Joan Collins",
    isAlive: true,
    birthYear: 1933,
    age: 93,
    knownFor: "Actor best known for playing Alexis Colby in Dynasty.",
    imageSrc: "/celebrity-dead-or-alive/portrait-placeholder.svg",
    imageAlt: "Temporary portrait placeholder for Joan Collins",
  },
  {
    id: "william-shatner",
    name: "William Shatner",
    isAlive: true,
    birthYear: 1931,
    age: 95,
    knownFor: "Actor best known as Captain James T. Kirk in Star Trek.",
    imageSrc: "/celebrity-dead-or-alive/portrait-placeholder.svg",
    imageAlt: "Temporary portrait placeholder for William Shatner",
  },
  {
    id: "dick-van-dyke",
    name: "Dick Van Dyke",
    isAlive: true,
    birthYear: 1925,
    age: 100,
    knownFor: "Actor and comedian known for The Dick Van Dyke Show and Mary Poppins.",
    imageSrc: "/celebrity-dead-or-alive/portrait-placeholder.svg",
    imageAlt: "Temporary portrait placeholder for Dick Van Dyke",
  },
  {
    id: "bob-newhart",
    name: "Bob Newhart",
    isAlive: false,
    birthYear: 1929,
    deathYear: 2024,
    age: 94,
    knownFor: "Deadpan comedian and star of The Bob Newhart Show and Newhart.",
    imageSrc: "/celebrity-dead-or-alive/portrait-placeholder.svg",
    imageAlt: "Temporary portrait placeholder for Bob Newhart",
  },
  {
    id: "maggie-smith",
    name: "Maggie Smith",
    isAlive: false,
    birthYear: 1934,
    deathYear: 2024,
    age: 89,
    knownFor: "Actor known for a long stage and screen career, including Downton Abbey.",
    imageSrc: "/celebrity-dead-or-alive/portrait-placeholder.svg",
    imageAlt: "Temporary portrait placeholder for Maggie Smith",
  },
  {
    id: "gene-hackman",
    name: "Gene Hackman",
    isAlive: false,
    birthYear: 1930,
    deathYear: 2025,
    age: 95,
    knownFor: "Two-time Oscar-winning actor known for The French Connection and Unforgiven.",
    imageSrc: "/celebrity-dead-or-alive/portrait-placeholder.svg",
    imageAlt: "Temporary portrait placeholder for Gene Hackman",
  },
];
