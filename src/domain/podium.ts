import type { RankingEntry } from "./metrics";

export type PodiumRankingType = "individual" | "squads" | "campaign_teams";

const PODIUM_LIMITS: Readonly<Record<PodiumRankingType, number>> = Object.freeze({
  individual: 10,
  squads: 3,
  campaign_teams: 5,
});

/**
 * Returns the visible podium slice for a ranking category.
 * The caller must supply an already ordered ranking; this function never
 * reveals or determines a champion and does not mutate the source ranking.
 */
export function selectPodiumEntries(
  ranking: readonly RankingEntry[],
  rankingType: PodiumRankingType,
): readonly RankingEntry[] {
  const limit = PODIUM_LIMITS[rankingType];
  if (limit === undefined) {
    throw new TypeError("Tipo de ranking inválido para o pódio.");
  }

  return Object.freeze(ranking.slice(0, limit).map((entry) => Object.freeze({ ...entry })));
}
