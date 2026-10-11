import { describe, expect, it } from "vitest";
import { calculateCampaignMetrics, createChampionSnapshot } from "./metrics";

describe("calculateCampaignMetrics", () => {
  it("soma metas e produção e limita restante a zero", () => {
    expect(calculateCampaignMetrics(
      [{ negotiatorId: "a", targetCents: 10_000 }, { negotiatorId: "b", targetCents: 5_000 }],
      [{ negotiatorId: "a", realizedCents: 12_000 }, { negotiatorId: "b", realizedCents: 4_000 }],
    )).toEqual({
      targetCents: 15_000,
      realizedCents: 16_000,
      remainingCents: 0,
      percentage: (16_000 / 15_000) * 100,
    });
  });

  it("retorna percentual zero quando a meta é zero", () => {
    expect(calculateCampaignMetrics([{ negotiatorId: "a", targetCents: 0 }], [{ negotiatorId: "a", realizedCents: 500 }])).toEqual({
      targetCents: 0, realizedCents: 500, remainingCents: 0, percentage: 0,
    });
  });

  it("rejeita meta negativa, frações de centavo e IDs duplicados", () => {
    expect(() => calculateCampaignMetrics([{ negotiatorId: "a", targetCents: -1 }], [])).toThrow(RangeError);
    expect(() => calculateCampaignMetrics([{ negotiatorId: "a", targetCents: 1.5 }], [])).toThrow(RangeError);
    expect(() => calculateCampaignMetrics([
      { negotiatorId: "a", targetCents: 100 }, { negotiatorId: "a", targetCents: 200 },
    ], [])).toThrow(TypeError);
  });
});

describe("createChampionSnapshot", () => {
  const base = {
    campaignId: "campaign-1",
    cycleId: "cycle-1",
    announcedAt: "2026-10-11T12:00:00.000Z",
    announcedBy: "admin-1",
    rankingType: "individual" as const,
    ranking: [{
      negotiatorId: "neg-1", displayName: "Pessoa A",
      realizedCents: 125_000, percentage: 125, position: 1,
    }],
  };

  it("faz cópia imutável dos dados do ranking", () => {
    const snapshot = createChampionSnapshot(base);
    base.ranking[0]!.displayName = "Nome alterado depois";
    expect(snapshot.ranking[0]?.displayName).toBe("Pessoa A");
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.ranking)).toBe(true);
    expect(Object.isFrozen(snapshot.ranking[0])).toBe(true);
  });

  it("rejeita posições inválidas e duplicadas", () => {
    expect(() => createChampionSnapshot({
      ...base,
      ranking: [{ ...base.ranking[0]!, position: 0 }],
    })).toThrow(RangeError);
    expect(() => createChampionSnapshot({
      ...base,
      ranking: [
        { ...base.ranking[0]!, negotiatorId: "neg-1", position: 1 },
        { ...base.ranking[0]!, negotiatorId: "neg-2", position: 1 },
      ],
    })).toThrow(/Posição duplicada/);
  });

  it("rejeita data de anúncio inválida", () => {
    expect(() => createChampionSnapshot({
      ...base,
      announcedAt: "não-é-data",
    })).toThrow(/data\/hora válida/);
  });

  it("rejeita produção de negociador fora da campanha", () => {
    expect(() => calculateCampaignMetrics(
      [{ negotiatorId: "incluído", targetCents: 100 }],
      [{ negotiatorId: "fora-da-campanha", realizedCents: 100 }],
    )).toThrow(/sem meta\/inclusão/);
  });
});
