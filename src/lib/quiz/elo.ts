export const STARTING_ELO = 1000;
export const K_FACTOR = 24;
export const MIN_ELO = 0;

/** Difficulty 1 through 5 maps to a question rating, same scale as the player rating. */
export function difficultyRating(difficulty: number): number {
  const clamped = Math.min(5, Math.max(1, Math.round(difficulty)));
  return 600 + clamped * 200;
}

export type EloResult = {
  expected: number;
  delta: number;
  rating: number;
};

/**
 * One question is scored as a head to head against a virtual opponent whose rating is
 * the question's difficulty. A lucky run of easy questions barely moves the rating, and
 * nailing a hard one moves it a lot.
 */
export function scoreAnswer(
  playerRating: number,
  difficulty: number,
  correct: boolean,
): EloResult {
  const questionRating = difficultyRating(difficulty);
  const expected = 1 / (1 + 10 ** ((questionRating - playerRating) / 400));
  const result = correct ? 1 : 0;
  const delta = K_FACTOR * (result - expected);
  const rating = Math.max(MIN_ELO, Math.round(playerRating + delta));

  return { expected, delta, rating };
}

export const TIERS = [
  { name: "Curious", min: 0 },
  { name: "Prompt", min: 1000 },
  { name: "Fine-Tuner", min: 1200 },
  { name: "Aligned", min: 1400 },
  { name: "Reasoner", min: 1600 },
  { name: "Post-Singularity", min: 1800 },
] as const;

export function tierFor(rating: number): string {
  let name: string = TIERS[0]!.name;
  for (const tier of TIERS) {
    if (rating >= tier.min) name = tier.name;
  }
  return name;
}
