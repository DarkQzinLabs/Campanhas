import { describe, expect, it } from "vitest";
import { buildIndividualRanking } from "./ranking";

describe("buildIndividualRanking", () => {
  it("ordena por percentual, produção e desempates estáveis", () => {
    const input = [
      { negotiatorId: "b", displayName: "Bruna", targetCents: 10_000, realizedCents: 12_000 },
      { negotiatorId: "a", displayName: "Ana", targetCents: 10_000, realizedCents: 12_000 },
      { negotiatorId: "c", displayName: "Caio", targetCents: 10_000, realizedCents: 15_000 },
    ];

    expect(buildIndividualRanking(input)).toEqual([
      { negotiatorId: "c", displayName: "Caio", realizedCents: 15_000, percentage: 150, position: 1 },
      { negotiatorId: "a", displayName: "Ana", realizedCents: 12_000, percentage: 120, position: 2 },
      { negotiatorId: "b", displayName: "Bruna", realizedCents: 12_000, percentage: 120, position: 3 },
    ]);
  });

  it("não altera a lista recebida e congela resultado e entradas", () => {
    const input = [
      { negotiatorId: " neg-1 ", displayName: " Pessoa A ", targetCents: 100, realizedCents: 50 },
    ];

    const ranking = buildIndividualRanking(input);

    expect(input[0]?.displayName).toBe(" Pessoa A ");
    expect(ranking[0]?.displayName).toBe("Pessoa A");
    expect(Object.isFrozen(ranking)).toBe(true);
    expect(Object.isFrozen(ranking[0])).toBe(true);
  });

  it("atribui zero por cento quando a meta é zero e usa produção no desempate", () => {
    expect(buildIndividualRanking([
      { negotiatorId: "a", displayName: "Ana", targetCents: 0, realizedCents: 10 },
      { negotiatorId: "b", displayName: "Bia", targetCents: 0, realizedCents: 20 },
    ]).map(({ negotiatorId, percentage, position }) => ({ negotiatorId, percentage, position }))).toEqual([
      { negotiatorId: "b", percentage: 0, position: 1 },
      { negotiatorId: "a", percentage: 0, position: 2 },
    ]);
  });

  it("rejeita identificadores duplicados, nomes vazios e valores inválidos", () => {
    expect(() => buildIndividualRanking([
      { negotiatorId: "a", displayName: "Ana", targetCents: 100, realizedCents: 20 },
      { negotiatorId: " a ", displayName: "Outra Ana", targetCents: 100, realizedCents: 30 },
    ])).toThrow(/Negociador duplicado/);

    expect(() => buildIndividualRanking([
      { negotiatorId: "a", displayName: " ", targetCents: 100, realizedCents: 20 },
    ])).toThrow(/identificador e nome/);

    expect(() => buildIndividualRanking([
      { negotiatorId: "a", displayName: "Ana", targetCents: Number.MAX_SAFE_INTEGER + 1, realizedCents: 20 },
    ])).toThrow(RangeError);
  });
});
