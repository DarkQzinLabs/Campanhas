import { describe, expect, it } from "vitest";
import { buildTeamRanking, type TeamProductionCandidate } from "./team-ranking";

const candidates: TeamProductionCandidate[] = [
  { negotiatorId: "n-1", teamId: "ilha-b", teamName: "Ilha B", targetCents: 10_000, realizedCents: 12_000 },
  { negotiatorId: "n-2", teamId: "ilha-a", teamName: "Ilha A", targetCents: 20_000, realizedCents: 24_000 },
  { negotiatorId: "n-3", teamId: "ilha-b", teamName: "Ilha B", targetCents: 5_000, realizedCents: 9_000 },
  { negotiatorId: "n-4", teamId: "ilha-c", teamName: "Ilha C", targetCents: 10_000, realizedCents: 10_000 },
];

describe("buildTeamRanking", () => {
  it("consolida metas e produção e ordena por percentual de atingimento", () => {
    expect(buildTeamRanking(candidates)).toEqual([
      { teamId: "ilha-b", teamName: "Ilha B", targetCents: 15_000, realizedCents: 21_000, percentage: 140, position: 1 },
      { teamId: "ilha-a", teamName: "Ilha A", targetCents: 20_000, realizedCents: 24_000, percentage: 120, position: 2 },
      { teamId: "ilha-c", teamName: "Ilha C", targetCents: 10_000, realizedCents: 10_000, percentage: 100, position: 3 },
    ]);
  });

  it("usa produção, nome e ID para desempates determinísticos", () => {
    const result = buildTeamRanking([
      { negotiatorId: "n-b", teamId: "b", teamName: "Beta", targetCents: 100, realizedCents: 120 },
      { negotiatorId: "n-a", teamId: "a", teamName: "Alfa", targetCents: 100, realizedCents: 120 },
      { negotiatorId: "n-c", teamId: "c", teamName: "Gama", targetCents: 100, realizedCents: 130 },
    ]);
    expect(result.map(({ teamId }) => teamId)).toEqual(["c", "a", "b"]);
  });

  it("atribui zero por cento quando a meta consolidada é zero", () => {
    expect(buildTeamRanking([
      { negotiatorId: "n-1", teamId: "a", teamName: "Alfa", targetCents: 0, realizedCents: 50 },
      { negotiatorId: "n-2", teamId: "b", teamName: "Beta", targetCents: 0, realizedCents: 100 },
    ]).map(({ teamId, percentage }) => ({ teamId, percentage }))).toEqual([
      { teamId: "b", percentage: 0 },
      { teamId: "a", percentage: 0 },
    ]);
  });

  it("não altera os dados de entrada e congela o resultado", () => {
    const input = [...candidates];
    const ranking = buildTeamRanking(input);
    expect(input).toEqual(candidates);
    expect(Object.isFrozen(ranking)).toBe(true);
    expect(Object.isFrozen(ranking[0])).toBe(true);
  });

  it("rejeita IDs duplicados, nomes inconsistentes e valores inválidos", () => {
    expect(() => buildTeamRanking([
      { negotiatorId: "n-1", teamId: "a", teamName: "Alfa", targetCents: 100, realizedCents: 20 },
      { negotiatorId: " n-1 ", teamId: "b", teamName: "Beta", targetCents: 100, realizedCents: 30 },
    ])).toThrow(/Negociador duplicado/);

    expect(() => buildTeamRanking([
      { negotiatorId: "n-1", teamId: "a", teamName: "Alfa", targetCents: 100, realizedCents: 20 },
      { negotiatorId: "n-2", teamId: "a", teamName: "Outra Alfa", targetCents: 100, realizedCents: 30 },
    ])).toThrow(/nomes inconsistentes/);

    expect(() => buildTeamRanking([
      { negotiatorId: "n-1", teamId: "a", teamName: "Alfa", targetCents: Number.MAX_SAFE_INTEGER, realizedCents: 20 },
      { negotiatorId: "n-2", teamId: "a", teamName: "Alfa", targetCents: 1, realizedCents: 30 },
    ])).toThrow(RangeError);
  });
});
