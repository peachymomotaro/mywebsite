import { conflictExperiment } from "./conflict";

export const TOYBOX_PATH = "/experiments/social-science-toybox";
export const NEWSLETTER_URL = "https://kingcnut.substack.com";

const choiceRange = (length: number, step: number) =>
  Array.from({ length }, (_, index) => index * step);

const dollar = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 3,
  trailingZeroDisplay: "stripIfInteger",
});

export function money(amount: number): string {
  return dollar.format(amount);
}

export const decisionGames = [
  {
    id: "dictator",
    title: "Dictator Game",
    teaser: "You have $5 and the final say. How much do you give away?",
    category: "Economic game",
    intro: "Imagine you’ve been randomly paired with someone you don’t know. You get $5 to divide between you. The other person has no say in the split and receives whatever you choose to give.",
    question: "How much of the $5 do you give to the other person?",
    measure: "Amount given",
    original: { name: "Forsythe et al. (1994)", url: "https://doi.org/10.1006/game.1994.1021" },
  },
  {
    id: "trust-sender",
    title: "Trust Game · Send",
    teaser: "Whatever you send triples. How much will the other player send back?",
    category: "Economic game",
    intro: "You start with $3. You can send some or all of it to another player, or keep it. Whatever you send triples before they receive it. The other player then decides how much to return to you. They can keep it all, return part of it, or send it all back.",
    question: "How much of the $3 do you send?",
    measure: "Amount sent",
    original: { name: "Berg, Dickhaut & McCabe (1995)", url: "https://doi.org/10.1006/game.1995.1027" },
  },
  {
    id: "trust-returner",
    title: "Trust Game · Return",
    teaser: "Someone trusted you with their money. How much of it do you return?",
    category: "Economic game",
    intro: "The first player starts with $3 and decides how much to send to you. The amount triples before it reaches you. Before you know what they’ll send, you choose a percentage to return. If they send nothing, you receive and return nothing.",
    question: "What percentage of what you receive will you return?",
    measure: "Share returned",
    original: { name: "Berg, Dickhaut & McCabe (1995)", url: "https://doi.org/10.1006/game.1995.1027" },
  },
  {
    id: "public-goods",
    title: "Public Goods Game",
    teaser: "Putting money in the pot helps everyone. Keeping it helps you.",
    category: "Economic game",
    intro: "Imagine you’re in a group of four. You each start with $4 and decide how much to put in a shared pot. The total in the pot doubles and is split equally among all four people. You keep any money you didn’t put in, plus your share of the pot.",
    question: "How much of your $4 do you put in the pot?",
    measure: "Amount contributed",
    original: { name: "Ledyard (1995)", url: "https://authors.library.caltech.edu/records/6w2tn-cpt82" },
  },
  {
    id: "prisoners-dilemma",
    title: "Prisoner’s Dilemma",
    teaser: "Pick a colour. What you earn depends on what the other player picks.",
    category: "Economic game",
    intro: "You and another player each choose Orange or Purple without knowing the other player’s choice. Your two choices determine what each of you earns. Here are the four possible outcomes.",
    question: "Which colour do you choose?",
    measure: "Share choosing Orange",
    original: { name: "Rapoport & Chammah (1965)", url: "https://doi.org/10.3998/mpub.20269" },
  },
  {
    id: "power-and-trust",
    title: "Power and Trust",
    teaser: "A potential client asks for a free sample. Do you make one?",
    category: "Social experiment",
    intro: "Imagine you’re a skilled typist who also makes slide decks from handwritten notes. Kevin, a prospective client, needs two PowerPoint presentations. He says some typists offer a free sample and asks if you would make one.",
    question: "Would you make a free sample for Kevin?",
    measure: "Share offering a sample",
    original: { name: "Schilke, Reimann & Cook (2015), Study 3", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4620861/" },
  },
] as const;

export const experiments = [...decisionGames, conflictExperiment] as const;

export type DecisionGame = (typeof decisionGames)[number];
export type DecisionGameId = DecisionGame["id"];
export type Choice = { value: number; label: string };

export const colours = [{ value: 1, label: "Orange" }, { value: 0, label: "Purple" }];
export const offers = [{ value: 1, label: "Offer a free sample" }, { value: 0, label: "Save the time" }];
export const powerRatings = [
  "Completely powerless", "Powerless", "Somewhat powerless", "Neither",
  "Somewhat powerful", "Powerful", "Extremely powerful",
];

export const fixedChoices: Partial<Record<DecisionGameId, Choice[]>> = {
  "trust-sender": choiceRange(7, 0.5).map((value) => ({ value, label: money(value) })),
  "trust-returner": choiceRange(11, 10).map((value) => ({ value, label: `${value}%` })),
  "prisoners-dilemma": colours,
  "power-and-trust": offers,
};

export function responseFromInput(id: DecisionGameId, raw: string): number | null {
  if (raw.trim() === "") return null;

  const value = Number(raw);
  const choices = fixedChoices[id];
  if (choices) return choices.some((choice) => value === choice.value) ? value : null;

  const max = id === "dictator" ? 5 : 4;
  return /^\d*(?:\.\d{1,2})?$/.test(raw) && value >= 0 && value <= max ? value : null;
}

export function dictatorPayoff(given: number): [number, number] {
  return [5 - given, given];
}

export function trustPayoff(sent: number, returnPercent: number): [number, number] {
  const received = 3 * sent;
  const returned = received * returnPercent / 100;
  return [3 - sent + returned, received - returned];
}

export function publicGoodsPayoffs(contributions: [number, number, number, number]): number[] {
  const share = contributions.reduce((sum, amount) => sum + amount, 0) / 2;
  return contributions.map((contribution) => 4 - contribution + share);
}

export function dilemmaPayoff(you: number, partner: number): [number, number] {
  if (you === partner) return you === 1 ? [6, 6] : [4, 4];
  return you === 1 ? [2, 8] : [8, 2];
}
