const { calculateQualityScore } = require("../calculate.js");
const data = require("../../data/companies.json");


describe("Quality Score Calculation", () => {
  // Universal (non-financial) companies
  describe("Universal Companies", () => {
    const testCases = [
      {
        label: "High Quality Industrial",
        data: {
          segment: "Manufacturing",
          returnOnInvestedCapital: 18,
          returnOnEquity: 20,
          returnOnAssets: 12,
          ebitMargin: 15,
          netDebtToEbitda: 1.2
        },
        expected: { min: 75, max: 85 }
      },
      {
        label: "Low Quality Cyclical",
        data: {
          segment: "Automotive",
          returnOnInvestedCapital: 4,
          returnOnEquity: 6,
          returnOnAssets: 2,
          ebitMargin: 5,
          netDebtToEbitda: 4.5
        },
        expected: { min: 10, max: 20 }
      },
      {
        label: "Highly Leveraged Retailer",
        data: {
          segment: "Retail",
          returnOnInvestedCapital: 9,
          returnOnEquity: 25,  // High ROE from leverage
          returnOnAssets: 3,
          ebitMargin: 8,
          netDebtToEbitda: 5.8
        },
        expected: { min: 25, max: 30 }  // Should be penalized for leverage
      },
      {
        label: "Negative ROA/ROE/Margin",
        data: {
          "ticker": "AZUL4",
          "fetchDate": "2025-03-29T15:24:10.972Z",
          "quotation": 3.44,
          "companyName": "AZUL",
          "cnpj": "09.305.994/0001-29",
          "yearListed": 2017,
          "employees": 11766,
          "yearFounded": 2008,
          "priceToEarnings": -0.48,
          "priceToSales": 0.22,
          "priceToBook": -0.14,
          "dividendYield": 0,
          "payoutRatio": 0,
          "netMargin": -46.87,
          "grossMargin": 26.71,
          "ebitMargin": 17.36,
          "ebitdaMargin": 30.5,
          "evToEbitda": 6.11,
          "evToEbit": 10.72,
          "priceToEbitda": 0.73,
          "priceToEbit": 1.28,
          "priceToAssets": 0.17,
          "priceToWorkingCapital": -0.28,
          "priceToCurrentAssets": -0.21,
          "bookValuePerShare": -24.06,
          "earningsPerShare": -7.24,
          "assetTurnover": 0.74,
          "returnOnEquity": -30.07,
          "returnOnInvestedCapital": 55.41,
          "returnOnAssets": -34.83,
          "netDebtToEquity": -1.16,
          "netDebtToEbitda": 5.91,
          "netDebtToEbit": 10.38,
          "grossDebtToEquity": -1.2,
          "equityToAssets": -1.16,
          "liabilitiesToAssets": 2.16,
          "currentRatio": 0.27,
          "revenueCagr5y": 27.73,
          "marketValue": 1154525000,
          "firmValue": 36357203000,
          "equity": -30435270000,
          "totalShares": 1264712000,
          "totalAssets": 26274943000,
          "currentAssets": 5658020000,
          "grossDebt": 36484585000,
          "netDebt": 35202678000,
          "cashAvailable": 1281907000,
          "listingSegment": "Nível 2",
          "freeFloat": 50.56,
          "tagAlong": 100,
          "avgDailyLiquidity": 33436000,
          "sector": "Bens Industriais",
          "segment": "Transporte Aéreo",
          "return1m": -8.99,
          "return3m": 2.38,
          "return1y": -73.62,
          "return2y": -70.4,
          "return5y": -81.98,
          "return10y": 0
        },
        expected: { min: 0, max: 10 }  // Should be hardly penalized
      },
      {
        label: "Conflicting Profitability",
        data: {
          segment: "Steel",
          returnOnInvestedCapital: -15,
          returnOnEquity: 80,  // High from debt
          returnOnAssets: -8,
          ebitMargin: -12,
          netDebtToEbitda: 4.2
        },
        expected: { exact: 0 }
      },
      {
        label: "Leverage-Driven ROE",
        data: {
          segment: "Real Estate",
          returnOnInvestedCapital: -5,
          returnOnEquity: 150,  // From high leverage
          returnOnAssets: 2,
          ebitMargin: 8,
          netDebtToEbitda: 5.8
        },
        expected: { min: 0, max: 15 }
      }
    ];

    executeQualityTests(testCases);
  });

  // Banking sector
  describe("Banks", () => {
    const testCases = [
      {
        label: "Well-Capitalized Bank",
        data: {
          segment: "Bank",
          returnOnEquity: 14,
          returnOnAssets: 1.4,
          netMargin: 12,
          equityToAssets: 0.09  // 9% equity/assets
        },
        expected: { min: 60, max: 70 }
      },
      {
        label: "Undercapitalized Bank",
        data: {
          segment: "Bank",
          returnOnEquity: 18,  // High but risky
          returnOnAssets: 1.1,
          netMargin: 8,
          equityToAssets: 0.04  // 4% equity/assets
        },
        expected: { min: 40, max: 55 }
      },
      {
        label: "Negative Margin Bank",
        data: {
          segment: "Bank",
          returnOnEquity: -5,
          returnOnAssets: -0.3,
          netMargin: -4,
          equityToAssets: 0.12
        },
        expected: { min: 0, max: 15 }
      },      

    ];

    executeQualityTests(testCases);
  });

  // Insurance sector
  describe("Insurance Companies", () => {
    const testCases = [
      {
        label: "High-Performance Insurer",
        data: {
          segment: "Insurance",
          returnOnInvestedCapital: 25,
          returnOnEquity: 30,
          returnOnAssets: 15,
          equityToAssets: 0.35,
          netDebt: -2e9,
          totalAssets: 10e9  // 20% cash buffer
        },
        expected: { min: 50, max: 60 }
      },
      {
        label: "Struggling Insurer",
        data: {
          segment: "Insurance",
          returnOnInvestedCapital: 6,
          returnOnEquity: 8,
          returnOnAssets: 2,
          equityToAssets: 0.15,
          netDebt: 1e9,  // Positive debt
          totalAssets: 5e9
        },
        expected: { min: 5, max: 15 }
      },
      {
        label: "Extreme ROE Insurer",
        data: {
          segment: "Insurance",
          returnOnInvestedCapital: 120,  // Accounting anomaly
          returnOnEquity: 150,
          returnOnAssets: 80,
          equityToAssets: 0.5,
          netDebt: -5e9,
          totalAssets: 10e9
        },
        expected: { min: 99, max: 100 }  // Capped by sigmoid
      },
    ];

    executeQualityTests(testCases);
  });

  // Edge cases
  describe("Edge Cases", () => {
    const testCases = [
      {
        label: "Negative ROIC/ROE",
        data: {
          segment: "Technology",
          returnOnInvestedCapital: -5,
          returnOnEquity: -8,
          returnOnAssets: -3,
          ebitMargin: -2,
          netDebtToEbitda: 2.0
        },
        expected: { min: 0, max: 10 }
      },
      {
        label: "Zero Values",
        data: {
          segment: "Healthcare",
          returnOnInvestedCapital: 0,
          returnOnEquity: 0,
          returnOnAssets: 0,
          ebitMargin: 0,
          netDebtToEbitda: 0
        },
        expected: { min: 0, max: 15 } 
      },
      {
        label: "Missing Segment Data",
        data: {
          returnOnInvestedCapital: 12,
          returnOnEquity: 15,
          returnOnAssets: 8,
          ebitMargin: 10,
          netDebtToEbitda: 1.5
        },
        expected: { min: 45, max: 60 }  // Should default to universal
      }
    ];

    executeQualityTests(testCases);
  });
});

function expectedToLabel(expected) {
  if (expected.exact !== undefined) {
    return `exact: ${expected.exact}`;
  }
  if (expected.min !== undefined && expected.max !== undefined) {
    return `min: ${expected.min}, max: ${expected.max}`;
  }
  return JSON.stringify(expected);
}

function executeQualityTests(testCases) {
  testCases.forEach(({ label, data, expected }) => {
    const score = calculateQualityScore(data);

    test(`${label} (${expectedToLabel(expected)}) → ${score}`, () => {
      
      expect(typeof score).toBe("number");
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);

      if (expected.exact !== undefined) {
        expect(score).toBe(expected.exact);
      } else {
        expect(score).toBeGreaterThanOrEqual(expected.min);
        expect(score).toBeLessThanOrEqual(expected.max);
      }

      // Sector-specific logical checks
      if (data.segment?.toLowerCase().includes("bank")) {
        // Banks should heavily weight ROA and capital
        expect(data.returnOnAssets).toBeDefined();
        expect(data.equityToAssets).toBeDefined();
      }

      if (data.segment?.toLowerCase().includes("insurance")) {
        // Insurers should consider cash buffer
        expect(data.netDebt).toBeDefined();
        expect(data.totalAssets).toBeDefined();
      }
    });
  });
}