export interface TeamProductionCandidate {
  readonly negotiatorId: string;
  readonly teamId: string;
  readonly teamName: string;
  readonly targetCents: number;
  readonly realizedCents: number;
}

export interface TeamRankingEntry {
  readonly teamId: string;
  readonly teamName: string;
  readonly targetCents: number;
  readonly realizedCents: number;
  readonly percentage: number;
  readonly position: number;
}

function assertAmount(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${label} deve ser um inteiro seguro maior ou igual a zero.`);
  }
}

/**
 * Consolidates negotiator targets and production by team and ranks teams
 * by target attainment, then realized production, localized name, and ID.
 * Each candidate represents one negotiator's contribution to exactly one team.
 */
export function buildTeamRanking(
  candidates: readonly TeamProductionCandidate[],
): readonly TeamRankingEntry[] {
  const negotiatorIds = new Set<string>();
  const teams = new Map<string, {
    teamName: string;
    targetCents: number;
    realizedCents: number;
  }>();

  for (const candidate of candidates) {
    const negotiatorId = candidate.negotiatorId.trim();
    const teamId = candidate.teamId.trim();
    const teamName = candidate.teamName.trim();

    if (!negotiatorId || !teamId || !teamName) {
      throw new TypeError("Cada contribuição precisa de negociador, equipe e nome válidos.");
    }
    if (negotiatorIds.has(negotiatorId)) {
      throw new TypeError(`Negociador duplicado na consolidação: ${negotiatorId}`);
    }
    negotiatorIds.add(negotiatorId);
    assertAmount(candidate.targetCents, "targetCents");
    assertAmount(candidate.realizedCents, "realizedCents");

    const current = teams.get(teamId);
    if (current && current.teamName !== teamName) {
      throw new TypeError(`A equipe ${teamId} possui nomes inconsistentes.`);
    }

    const targetCents = (current?.targetCents ?? 0) + candidate.targetCents;
    const realizedCents = (current?.realizedCents ?? 0) + candidate.realizedCents;
    assertAmount(targetCents, "soma das metas da equipe");
    assertAmount(realizedCents, "soma da produção da equipe");

    teams.set(teamId, { teamName, targetCents, realizedCents });
  }

  const ranking = [...teams.entries()].map(([teamId, team]) => ({
    teamId,
    teamName: team.teamName,
    targetCents: team.targetCents,
    realizedCents: team.realizedCents,
    percentage: team.targetCents === 0
      ? 0
      : (team.realizedCents / team.targetCents) * 100,
  }));

  ranking.sort((a, b) =>
    b.percentage - a.percentage
    || b.realizedCents - a.realizedCents
    || a.teamName.localeCompare(b.teamName, "pt-BR")
    || a.teamId.localeCompare(b.teamId),
  );

  return Object.freeze(ranking.map((team, index) =>
    Object.freeze({ ...team, position: index + 1 }),
  ));
}
