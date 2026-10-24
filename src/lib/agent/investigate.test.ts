import { describe, expect, it } from "vitest";
import { demoSnapshot } from "@/lib/demo-data";
import { investigateLocally, validateEvidence } from "@/lib/agent/investigate";

describe("repository investigator", () => {
  it("returns only evidence found in the immutable snapshot", () => {
    const result = investigateLocally("What depends on the API client?", demoSnapshot);
    expect(result.evidence.length).toBeGreaterThan(0);
    expect(result.status).toBe("verified");
    expect(validateEvidence(demoSnapshot, result.evidence)).toEqual({ valid: true, invalid: [] });
  });

  it("refuses to substitute a different module for an unknown path", () => {
    const result = investigateLocally("What is the change impact of src/services/page.tsx?", demoSnapshot);
    expect(result.status).toBe("insufficient_evidence");
    expect(result.evidence).toEqual([]);
    expect(result.answer).toContain("src/services/page.tsx");
    expect(result.answer).not.toContain("src/services/api.ts");
  });

  it("does not invent a module for an unsupported generic question", () => {
    const result = investigateLocally("Will this be safe to release?", demoSnapshot);
    expect(result.status).toBe("insufficient_evidence");
    expect(result.evidence).toEqual([]);
  });

  it("does not match short module labels inside ordinary words", () => {
    const result = investigateLocally("What happens if this application is released?", demoSnapshot);
    expect(result.status).toBe("insufficient_evidence");
    expect(result.evidence).toEqual([]);
  });

  it("matches a multi-word module label at word boundaries", () => {
    const result = investigateLocally("What depends on the API Client?", demoSnapshot);
    expect(result.status).toBe("verified");
    expect(result.evidence[0]).toBe("src/services/api.ts");
  });

  it("answers cycle questions directly from snapshot evidence", () => {
    const result = investigateLocally("Are there circular dependencies?", demoSnapshot);
    expect(result.status).toBe("verified");
    expect(result.answer).toContain("No circular dependency chains");
  });

  it("discloses when ingestion coverage is truncated", () => {
    const result = investigateLocally("What depends on the API client?", { ...demoSnapshot, truncated: true });
    expect(result.answer).toContain("snapshot was truncated");
  });

  it("rejects hallucinated evidence paths", () => {
    expect(validateEvidence(demoSnapshot, ["src/not-real.ts"])).toEqual({ valid: false, invalid: ["src/not-real.ts"] });
  });
});
