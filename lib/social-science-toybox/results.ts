export const PARK_PAPER = "https://arxiv.org/abs/2411.10109v4";
export const PARK_AGGREGATES = "https://osf.io/hfgeb/";

export type Benchmark = {
  value: number;
  n: number;
};

export type Comparison = {
  human: Benchmark | null;
  ai: Benchmark | null;
};

// Public archive analysis/out/task_metrics.json → econ_games.opus55_composite.per_item.
// Means use only pairs with both answers in range. The Orange share is expressed as a percentage.
const economicGames = {
  dictator: { human: 2.151, ai: 2.034, n: 1052 },
  "trust-sender": { human: 2.045, ai: 1.559, n: 1052 },
  "trust-returner": { human: 46.635, ai: 45.01, n: 1052 },
  "public-goods": { human: 2.956, ai: 2.256, n: 1050 },
  "prisoners-dilemma": { human: 63.6, ai: 69.8, n: 1052 },
};

export function gameComparison(game: keyof typeof economicGames): Comparison {
  const { human, ai, n } = economicGames[game];
  return { human: { value: human, n }, ai: { value: ai, n } };
}

// Public archive analysis/out/camerer_study_level.json → study 38, Wave 1 / Opus 5.5 composite.
export const powerConditions = [
  {
    label: "Low bargaining power",
    work: "You rely on typing jobs to pay your bills. Demand has been unpredictable, and many other typists nearby offer similar services. Getting this job would help, but a free sample takes time you could spend on paid work.",
    human: { count: 401, n: 513 },
    ai: { count: 476, n: 513 },
  },
  {
    label: "High bargaining power",
    work: "You take typing jobs for extra spending money. Your work is in demand, few other typists can match its quality, and you regularly get offers. You can choose which projects to take.",
    human: { count: 341, n: 539 },
    ai: { count: 170, n: 539 },
  },
] as const;

export type PowerCondition = (typeof powerConditions)[number];

export function assignPowerCondition(random = Math.random): PowerCondition {
  return powerConditions[random() < 0.5 ? 0 : 1];
}

export function powerComparison(condition: PowerCondition): Comparison {
  const { human, ai } = condition;
  return {
    human: { value: 100 * human.count / human.n, n: human.n },
    ai: { value: 100 * ai.count / ai.n, n: ai.n },
  };
}
