import type { RankingEntry } from "./metrics";

export interface RankingCandidate {
  readonly negotiatorId: string;
  readonly displayName: string;
  readonly targetCents: number;
  readonly realizedCents: number;
}

function assertNonNegativeSafeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${label} deve ser um inteiro seguro maior ou igual a zero.`);
  }
}

/**
 * Produces a deterministic ranking by target attainment.
 * Ties are broken by realized production, then display name and stable ID.
 * This is a pure function: it does not mutate the caller's data.
 */
export function buildIndividualRanking(
  candidates: readonly RankingCandidate[],
): readonly RankingEntry[] {
  const ids = new Set<string>();

  const normalized = candidates.map((candidate) => {
    const negotiatorId = candidate.negotiatorId.trim();
    const displayName = candidate.displayName.trim();

    if (!negotiatorId || !displayName) {
      throw new TypeError("Cada candidato precisa de identificador e nome.");
    }
    if (ids.has(negotiatorId)) {
      throw new TypeError(`Negociador duplicado no ranking: ${negotiatorId}`);
    }
    ids.add(negotiatorId);

    assertNonNegativeSafeInteger(candidate.targetCents, "targetCents");
    assertNonNegativeSafeInteger(candidate.realizedCents, "realizedCents");

    return {
      negotiatorId,
      displayName,
      realizedCents: candidate.realizedCents,
      percentage: candidate.targetCents === 0
        ? 0
        : (candidate.realizedCents / candidate.targetCents) * 100,
    };
  });

  normalized.sort((a, b) =>
    b.percentage - a.percentage
    || b.realizedCents - a.realizedCents
    || a.displayName.localeCompare(b.displayName, "pt-BR")
    || a.negotiatorId.localeCompare(b.negotiatorId),
  );

  return Object.freeze(normalized.map((entry, index) =>
    Object.freeze({ ...entry, position: index + 1 }),
  ));
}
