/**
 * Pure domain functions. Monetary values are integer cents to avoid
 * binary floating-point rounding in calculations.
 */
export interface NegotiatorTarget {
  readonly negotiatorId: string;
  readonly targetCents: number;
}

export interface ProductionValue {
  readonly negotiatorId: string;
  readonly realizedCents: number;
}

export interface CampaignMetrics {
  readonly targetCents: number;
  readonly realizedCents: number;
  readonly remainingCents: number;
  readonly percentage: number;
}

function assertNonNegativeSafeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${label} deve ser um inteiro seguro maior ou igual a zero.`);
  }
}

export function calculateCampaignMetrics(
  targets: readonly NegotiatorTarget[],
  production: readonly ProductionValue[],
): CampaignMetrics {
  const targetIds = new Set<string>();
  let targetCents = 0;

  for (const item of targets) {
    if (!item.negotiatorId.trim()) throw new TypeError("negotiatorId não pode ser vazio.");
    if (targetIds.has(item.negotiatorId)) {
      throw new TypeError(`Meta duplicada para negociador: ${item.negotiatorId}`);
    }
    targetIds.add(item.negotiatorId);
    assertNonNegativeSafeInteger(item.targetCents, "targetCents");
    targetCents += item.targetCents;
    assertNonNegativeSafeInteger(targetCents, "soma das metas");
  }

  const productionIds = new Set<string>();
  let realizedCents = 0;
  for (const item of production) {
    if (!item.negotiatorId.trim()) throw new TypeError("negotiatorId não pode ser vazio.");
    if (productionIds.has(item.negotiatorId)) {
      throw new TypeError(`Produção agregada duplicada para negociador: ${item.negotiatorId}`);
    }
    productionIds.add(item.negotiatorId);
    assertNonNegativeSafeInteger(item.realizedCents, "realizedCents");
    realizedCents += item.realizedCents;
    assertNonNegativeSafeInteger(realizedCents, "soma da produção");
  }

  const percentage = targetCents === 0 ? 0 : (realizedCents / targetCents) * 100;
  return Object.freeze({
    targetCents,
    realizedCents,
    remainingCents: Math.max(0, targetCents - realizedCents),
    percentage,
  });
}

export interface RankingEntry {
  readonly negotiatorId: string;
  readonly displayName: string;
  readonly realizedCents: number;
  readonly percentage: number;
  readonly position: number;
}

export interface ChampionSnapshot {
  readonly campaignId: string;
  readonly cycleId: string;
  readonly announcedAt: string;
  readonly announcedBy: string;
  readonly rankingType: "individual" | "squads" | "campaign_teams";
  readonly ranking: readonly RankingEntry[];
}

/**
 * Build a detached, immutable snapshot from a ranking supplied by the caller.
 * Authorization and persistence must be enforced by the server/database.
 */
export function createChampionSnapshot(input: {
  campaignId: string;
  cycleId: string;
  announcedAt: string;
  announcedBy: string;
  rankingType: ChampionSnapshot["rankingType"];
  ranking: readonly RankingEntry[];
}): ChampionSnapshot {
  for (const [label, value] of Object.entries({
    campaignId: input.campaignId,
    cycleId: input.cycleId,
    announcedAt: input.announcedAt,
    announcedBy: input.announcedBy,
  })) {
    if (!value.trim()) throw new TypeError(`${label} não pode ser vazio.`);
  }

  const ranking = input.ranking.map((entry) => {
    if (!Number.isSafeInteger(entry.position) || entry.position < 1) {
      throw new RangeError("A posição do ranking deve ser um inteiro positivo.");
    }
    assertNonNegativeSafeInteger(entry.realizedCents, "realizedCents");
    if (!Number.isFinite(entry.percentage) || entry.percentage < 0) {
      throw new RangeError("percentage deve ser finito e não negativo.");
    }
    if (!entry.negotiatorId.trim() || !entry.displayName.trim()) {
      throw new TypeError("Cada entrada do ranking precisa de identificador e nome.");
    }
    return Object.freeze({ ...entry });
  });

  return Object.freeze({
    campaignId: input.campaignId,
    cycleId: input.cycleId,
    announcedAt: input.announcedAt,
    announcedBy: input.announcedBy,
    rankingType: input.rankingType,
    ranking: Object.freeze(ranking),
  });
}
