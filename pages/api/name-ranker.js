import { getPrismaClient } from "../../lib/reading-river/db";

const NAMES = [
  "Floating World",
  "Lightburst",
  "Invisible Worlds",
  "Lucid Dot",
  "Sequence Lab",
  "Elastic Horizon",
];

const EXPECTED_PAIR_COUNT = (NAMES.length * (NAMES.length - 1)) / 2;
const MAX_VOTERS = 3;

export default async function handler(req, res) {
  if (req.method === "GET") {
    return sendStatus(res);
  }

  if (req.method === "POST") {
    return saveBallot(req, res);
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: "Method not allowed." });
}

async function sendStatus(res) {
  const prisma = getPrismaClient();

  const submissions = await prisma.nameRankingSubmission.findMany({
    orderBy: { createdAt: "asc" },
  });

  return res.status(200).json(buildStatus(submissions));
}

async function saveBallot(req, res) {
  const prisma = getPrismaClient();

  const voterName =
    typeof req.body?.voterName === "string" ? req.body.voterName.trim() : "";
  const comparisons = req.body?.comparisons;

  if (!voterName || voterName.length > 50) {
    return res
      .status(400)
      .json({ error: "Enter a name or initials (maximum 50 characters)." });
  }

  const validationError = validateComparisons(comparisons);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const voterKey = normalizeVoterName(voterName);

  const existing = await prisma.nameRankingSubmission.findUnique({
    where: { voterKey },
  });

  if (!existing) {
    const existingCount = await prisma.nameRankingSubmission.count();

    if (existingCount >= MAX_VOTERS) {
      return res.status(409).json({
        error: "All three voting slots have already been used.",
      });
    }
  }

  await prisma.nameRankingSubmission.upsert({
    where: { voterKey },
    create: {
      voterKey,
      voterName,
      comparisons,
    },
    update: {
      voterName,
      comparisons,
    },
  });

  const submissions = await prisma.nameRankingSubmission.findMany({
    orderBy: { createdAt: "asc" },
  });

  return res.status(200).json(buildStatus(submissions));
}

function normalizeVoterName(value) {
  return value.trim().toLocaleLowerCase("en-GB").replace(/\s+/g, " ");
}

function validateComparisons(comparisons) {
  if (!Array.isArray(comparisons) || comparisons.length !== EXPECTED_PAIR_COUNT) {
    return `A complete ballot must contain exactly ${EXPECTED_PAIR_COUNT} comparisons.`;
  }

  const seenPairs = new Set();

  for (const comparison of comparisons) {
    if (
      !Array.isArray(comparison) ||
      comparison.length !== 2 ||
      !Number.isInteger(comparison[0]) ||
      !Number.isInteger(comparison[1])
    ) {
      return "Each comparison must contain a winner and loser.";
    }

    const [winner, loser] = comparison;

    if (
      winner < 0 ||
      loser < 0 ||
      winner >= NAMES.length ||
      loser >= NAMES.length ||
      winner === loser
    ) {
      return "A comparison contains an invalid business name.";
    }

    const key = winner < loser ? `${winner}:${loser}` : `${loser}:${winner}`;

    if (seenPairs.has(key)) {
      return "The ballot contains a repeated matchup.";
    }

    seenPairs.add(key);
  }

  if (seenPairs.size !== EXPECTED_PAIR_COUNT) {
    return "The ballot does not cover every possible matchup exactly once.";
  }

  return null;
}

function buildStatus(submissions) {
  const ready = submissions.length >= MAX_VOTERS;

  return {
    count: Math.min(submissions.length, MAX_VOTERS),
    ready,
    result: ready ? calculateKemeny(submissions.slice(0, MAX_VOTERS)) : null,
  };
}

function calculateKemeny(submissions) {
  const pairwiseVotes = Array.from({ length: NAMES.length }, () =>
    Array(NAMES.length).fill(0)
  );

  for (const submission of submissions) {
    const comparisons = submission.comparisons;

    for (const [winner, loser] of comparisons) {
      pairwiseVotes[winner][loser] += 1;
    }
  }

  const rankings = permutations([...NAMES.keys()]);
  let bestScore = -1;
  const optimal = [];

  for (const ranking of rankings) {
    const score = scoreRanking(ranking, pairwiseVotes);

    if (score > bestScore) {
      bestScore = score;
      optimal.length = 0;
      optimal.push(ranking);
    } else if (score === bestScore) {
      optimal.push(ranking);
    }
  }

  const totalDecisions = submissions.length * EXPECTED_PAIR_COUNT;

  return {
    bestScore,
    totalDecisions,
    agreementPercent: Number(
      ((100 * bestScore) / totalDecisions).toFixed(1)
    ),
    optimalRankings: optimal.map((ranking) =>
      ranking.map((index) => NAMES[index])
    ),
    headToHead: buildHeadToHead(pairwiseVotes),
  };
}

function scoreRanking(ranking, pairwiseVotes) {
  let score = 0;

  for (let earlier = 0; earlier < ranking.length; earlier += 1) {
    for (let later = earlier + 1; later < ranking.length; later += 1) {
      const higher = ranking[earlier];
      const lower = ranking[later];
      score += pairwiseVotes[higher][lower];
    }
  }

  return score;
}

function buildHeadToHead(pairwiseVotes) {
  const rows = [];

  for (let i = 0; i < NAMES.length; i += 1) {
    for (let j = i + 1; j < NAMES.length; j += 1) {
      rows.push({
        a: NAMES[i],
        b: NAMES[j],
        aVotes: pairwiseVotes[i][j],
        bVotes: pairwiseVotes[j][i],
      });
    }
  }

  return rows;
}

function permutations(items) {
  if (items.length <= 1) return [items];

  const result = [];

  for (let i = 0; i < items.length; i += 1) {
    const rest = [...items.slice(0, i), ...items.slice(i + 1)];

    for (const tail of permutations(rest)) {
      result.push([items[i], ...tail]);
    }
  }

  return result;
}
