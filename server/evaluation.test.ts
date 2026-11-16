// @vitest-environment node
import { describe, it, expect } from "vitest";
import { aiQuestions, evaluateNaturalLanguage } from "./evaluation";
describe("Phase 6.5 Vietnamese evaluation with honest channel attribution", () => {
  it("executes forty-plus questions and reports every fallback failure separately from tool contracts", async () => {
    const report = await evaluateNaturalLanguage();
    expect(report.questions).toBeGreaterThanOrEqual(40);
    expect(new Set(aiQuestions.map((q) => q.id)).size).toBe(aiQuestions.length);
    expect(report.rows).toHaveLength(aiQuestions.length);
    expect(report.fallback.passed + report.fallback.failed).toBe(
      report.questions,
    );
    expect(report.stateUnchanged).toBe(true);
    expect(
      report.rows.every((r) => r.liveToolSelection === "not_measured"),
    ).toBe(true);
    expect(
      report.rows.filter((r) => r.toolContract && !r.toolContract.passed),
    ).toEqual([]);
    // Challenge paraphrases remain measured failures, not silently rewritten expectations.
    expect(
      report.rows
        .filter((r) => !r.fallbackPassed)
        .every((r) => r.failures.length > 0),
    ).toBe(true);
    expect(
      report.rows.filter((r) => !r.fallbackPassed).map((r) => r.id),
    ).toEqual(["NL30", "NL32", "NL48"]);
  });
});
