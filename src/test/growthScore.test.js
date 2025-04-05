// test/growthScore.test.js
const { calculateGrowthScore } = require("../calculate");

describe("Calculate Growth Score", () => {
  const testCases = [
    // Basic growth scenarios
    {
      label: "Healthy balanced growth",
      data: { profitCagr5y: 10.03, revenueCagr5y: 8.07 },
      expected: 42
    },
    {
      label: "High profit growth",
      data: { profitCagr5y: 25, revenueCagr5y: 15 },
      expected: 58
    },

    // Single negative scenarios
    {
      label: "Negative profit growth",
      data: { profitCagr5y: -5, revenueCagr5y: 12 },
      expected: 22
    },
    {
      label: "Negative revenue growth",
      data: { profitCagr5y: 8, revenueCagr5y: -2 },
      expected: 23.5
    },

    // Double negative scenarios
    {
      label: "Moderate dual negatives",
      data: { profitCagr5y: -5, revenueCagr5y: -3 },
      expected: 0
    },
    {
      label: "Severe dual negatives",
      data: { profitCagr5y: -15, revenueCagr5y: -10 },
      expected: 0
    },

    // Edge cases
    {
      label: "Zero growth",
      data: { profitCagr5y: 0, revenueCagr5y: 0 },
      expected: 29
    },
    {
      label: "Extreme profit growth",
      data: { profitCagr5y: 200, revenueCagr5y: 80 },
      expected: 100
    },
    {
      label: "Negative profit boundary",
      data: { profitCagr5y: -19, revenueCagr5y: 20 },
      expected: 16.5
    },

    // Mixed performance
    {
      label: "Strong profit, weak revenue",
      data: { profitCagr5y: 25, revenueCagr5y: -2 },
      expected: 37
    },
    {
      label: "Weak profit, strong revenue",
      data: { profitCagr5y: 2, revenueCagr5y: 20 },
      expected: 43
    },

    // Clamping tests
    {
      label: "Perfect score potential",
      data: { profitCagr5y: 50, revenueCagr5y: 50 },
      expected: 100
    },
    {
      label: "Negative score potential",
      data: { profitCagr5y: -30, revenueCagr5y: -25 },
      expected: 0
    }
  ];

  function getLabel(scenario, score) {
    const { label, data, expected } = scenario;
    const p = data.profitCagr5y;
    const r = data.revenueCagr5y;
    return `${label} (p: ${p}, r: ${r}) → ${score} (expected ${expected})`
  } 

  testCases.forEach((scenario) => {
    const score = calculateGrowthScore(scenario.data);

    test(getLabel(scenario, score), () => {
      // Type and range checks
      expect(typeof score).toBe("number");
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
      
      // Score comparison with rounding tolerance
      expect(score).toBeCloseTo(scenario.expected, 0);
    });
  });
});