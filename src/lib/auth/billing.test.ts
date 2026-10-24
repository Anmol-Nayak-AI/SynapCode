import { describe, expect, it } from "vitest";
import { evaluateAnalysisAccess } from "./billing";

describe("billing access", () => {
  it("allows paid organizations regardless of usage", () => {
    expect(evaluateAnalysisAccess(true, { repositories: 10, analysesThisMonth: 50, repositoryExists: false })).toEqual({ allowed: true });
  });

  it("keeps a Free organization inside one repository", () => {
    expect(evaluateAnalysisAccess(false, { repositories: 1, analysesThisMonth: 0, repositoryExists: false })).toMatchObject({ allowed: false, upgradeUrl: "/pricing?from=console" });
    expect(evaluateAnalysisAccess(false, { repositories: 1, analysesThisMonth: 0, repositoryExists: true })).toEqual({ allowed: true });
  });

  it("enforces the monthly Free analysis allowance", () => {
    expect(evaluateAnalysisAccess(false, { repositories: 1, analysesThisMonth: 3, repositoryExists: true })).toMatchObject({ allowed: false, upgradeUrl: "/pricing?from=console" });
  });
});
