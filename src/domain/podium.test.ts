import { describe, expect, it } from "vitest";
import type { RankingEntry } from "./metrics";
import { selectPodiumEntries } from "./podium";

function entries(count: number): RankingEntry[] {
  return Array.from({ length: count }, (_, index) => ({
    negotiatorId: `person-${index + 1}`,
    displayName: `Pessoa ${index + 1}`,
    realizedCents: (count - index) * 100,
    percentage: count - index,
    position: index + 1,
  }));
}

describe("selectPodiumEntries", () => {
  it.each([
    ["individual", 10],
    ["squads", 3],
    ["campaign_teams", 5],
  ] as const)("limits %s podium to %i entries", (type, limit) => {
    expect(selectPodiumEntries(entries(12), type)).toHaveLength(limit);
  });

  it("returns fewer entries when the ranking has fewer candidates", () => {
    expect(selectPodiumEntries(entries(2), "campaign_teams")).toEqual(entries(2));
  });

  it("does not mutate the ranking and freezes the result", () => {
    const ranking = entries(4);
    const originalFirst = ranking[0];

    const podium = selectPodiumEntries(ranking, "individual");

    expect(ranking[0]).toBe(originalFirst);
    expect(Object.isFrozen(podium)).toBe(true);
    expect(Object.isFrozen(podium[0])).toBe(true);
    expect(podium).not.toBe(ranking);
  });
});
