// test/leveragePenalty.test.js
const { calculateLeveragePenalty } = require("../calculate.js");

describe("Calculate Leverage Penalty", () => {
  const universalTestCases = [
    // Non-banking cases (updated expectations)
    {
      params: {
        netDebtToEquity: 0.3,
        netDebtToEbitda: 1.0,
        netDebtToEbit: 2.0,
        netDebt: -1e8,
        equity: 1e9,
        segment: "Technology",
      },
      label: "safe leverage (all below thresholds + net cash)",
      expected: { exact: -2 },
    },
    {
      params: {
        netDebtToEquity: 0.8,
        netDebtToEbitda: 1.2,
        netDebtToEbit: 1.9,
        netDebt: 5e8,
        equity: 1e9,
        segment: "Manufacturing",
      },
      label: "moderate debt/equity only",
      expected: { min: 2, max: 10 },
    },
    {
      params: {
        netDebtToEquity: 2.5,
        netDebtToEbitda: 3.0,
        netDebtToEbit: 4.0,
        netDebt: 2e9,
        equity: 1e9,
        segment: "Energy",
      },
      label: "extreme leverage (max penalty)",
      expected: { min: 35, max: 40 },
    },
    {
      params: {
        netDebtToEquity: -0.2,
        netDebtToEbitda: 0.5,
        netDebtToEbit: 1.0,
        netDebt: -5e8,
        equity: 1e9,
        segment: "Healthcare",
      },
      label: "net cash position (max bonus)",
      expected: { exact: -10 },
    },
  ];

  // Banking cases
  const bankingTestCases = [
    {
      // 8% equity
      params: {
        netDebtToEquity: null,
        netDebtToEbitda: null,
        netDebtToEbit: null,
        netDebt: 0,
        segment: "Bank",
        equity: 800_000,
        totalAssets: 10_000_000,
      },
      label: "exactly meets Basel III",
      expected: { exact: 0 }, // (0.08 - 0.08) * 1000 = 0
    },
    {
      // 7.5% equity
      params: {
        netDebtToEquity: null,
        netDebtToEbitda: null,
        netDebtToEbit: null,
        netDebt: 0,
        segment: "Bank",
        equity: 750_000,
        totalAssets: 10_000_000,
      },
      label: "slightly undercapitalized",
      expected: { exact: 5 }, // (0.08 - 0.075) * 1000 = 5
    },
    {
      // 10% equity
      params: {
        netDebtToEquity: null,
        netDebtToEbitda: null,
        netDebtToEbit: null,
        netDebt: 0,
        segment: "Bank",
        equity: 1_000_000,
        totalAssets: 10_000_000,
      },
      label: "conservative capitalization",
      expected: { exact: -20 }, // (0.08 - 0.10) * 1000 = -20
    },
    {
      // 20% equity
      params: {
        netDebtToEquity: null,
        netDebtToEbitda: null,
        netDebtToEbit: null,
        netDebt: 0,
        segment: "Bank",
        equity: 2_000_000,
        totalAssets: 10_000_000,
      },
      label: "extremely overcapitalized",
      expected: { exact: -120 }, // (0.08 - 0.20)*1000 = -120 → capped at -20?
      comment: "Should we cap negative penalties? Currently not!",
    },
    {
      // 0.5% equity
      params: {
        netDebtToEquity: null,
        netDebtToEbitda: null,
        netDebtToEbit: null,
        netDebt: 0,
        segment: "Bank",
        equity: 500_000,
        totalAssets: 100_000_000,
      },
      label: "crisis-level capitalization",
      expected: { exact: 25 }, // (0.08 - 0.005)*1000 = 75 → capped at 25
    },
  ];

  const insuranceTestCases = [
    {
      params: {
        netDebtToEquity: null,
        netDebtToEbitda: null,
        netDebtToEbit: null,
        netDebt: 0,
        segment: "Insurance",
        equity: 500_000,
        totalAssets: 100_000_000,
      },
      label: "insurance company test case",
      expected: { exact: 0 }, // Placeholder for insurance logic
    },
  ];

  describe("Non-banking cases", () => executeTest(universalTestCases));
  describe("Banking cases", () => executeTest(bankingTestCases));
  // TODO: Implement insurance leverage penalty
  describe("Insurance cases", () => executeTest(insuranceTestCases));
});

function executeTest(testCases) {
  testCases.forEach(({ params, label, expected }) => {
    const penalty = calculateLeveragePenalty(params);

    test(`${label} → ${penalty}`, () => {
      expect(typeof penalty).toBe("number");

      if (expected.exact !== undefined) {
        expect(penalty).toBe(expected.exact);
      } else if (expected.approx !== undefined) {
        expect(penalty).toBeCloseTo(expected.approx, expected.precision);
      } else {
        expect(penalty).toBeGreaterThanOrEqual(expected.min);
        expect(penalty).toBeLessThanOrEqual(expected.max);
      }

      const segment = params.segment.toLowerCase();
      const specialCases = ["bank", "bancos", "seguradoras", "insurance"];

      if (!specialCases.includes(segment)) {
        expect(penalty).toBeGreaterThanOrEqual(-10);
        expect(penalty).toBeLessThanOrEqual(40);
      }
    });
  });
}
