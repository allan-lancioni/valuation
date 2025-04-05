// test/valueScore.test.js
const { calculateValueScore } = require("../calculate");

describe("Calculate Value Score", () => {
  const testCases = [
    // Basic scenarios
    {
      label: "All positive metrics",
      data: { priceToEarnings: 10, priceToBook: 1, evToEbit: 5 },
      expected: 39.14,
    },
    {
      label: "High value metrics",
      data: { priceToEarnings: 5, priceToBook: 0.5, evToEbit: 4 },
      expected: 51.82,
    },

    // Penalty scenarios
    {
      label: "One negative metric (PE)",
      data: { priceToEarnings: -5, priceToBook: 2, evToEbit: 4 },
      expected: 21.36,
    },
    {
      label: "Two negative metrics",
      data: { priceToEarnings: -8, priceToBook: -1, evToEbit: 10 },
      expected: 5.9,
    },
    {
      label: "All negative metrics",
      data: { priceToEarnings: -15, priceToBook: -2, evToEbit: -8 },
      expected: 0,
    },

    // Edge cases
    {
      label: "Zero PE",
      data: { priceToEarnings: 0, priceToBook: 1, evToEbit: 5 },
      expected: 24.3,
    },
    {
      label: "Extreme PB value",
      data: { priceToEarnings: 20, priceToBook: 0.1, evToEbit: 15 },
      expected: 67.04,
    },
    {
      label: "Negative EBIT",
      data: { priceToEarnings: 8, priceToBook: 1.2, evToEbit: -4 },
      expected: 22.94,
    },

    // Clamping tests
    {
      label: "Perfect score potential",
      data: { priceToEarnings: 5, priceToBook: 0.25, evToEbit: 2 },
      expected: 67.1,
    },
    {
      label: "Negative score potential",
      data: { priceToEarnings: -40, priceToBook: -2, evToEbit: -10 },
      expected: 0,
    },
    {
      label: "Deep value outlier",
      data: { priceToEarnings: 0.1, priceToBook: 0.2, evToEbit: 2 },
      expected: 100,
    },
  ];

  testCases.forEach(({ label, data, expected }) => {
    const score = calculateValueScore(data);

    test(`${label} → ${score} (expected ~${expected})`, () => {
      // Type check
      expect(typeof score).toBe("number");

      // Range validation
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);

      // Precision check (2 decimal places)
      expect(score).toBeCloseTo(expected, 1);
    });
  });
});
