/////////////////////////////////////////
///////// Calculation Functions /////////
/////////////////////////////////////////

// Dynamic weight configuration
function getDynamicWeights() {
  // Placeholder for dynamic weight calculation logic
  return {
    value: 0.5,
    quality: 0.3,
    growth: 0.15,
    dividend: 0.05,
    leveragePenalty: -0.2,
    volatilityPenalty: -0.3,
  };
}

function calculateEnhancedValueScore(data) {
  // Get dynamic weights based on market conditions
  const weights = getDynamicWeights();

  // Component calculations
  const components = {
    value: calculateValueScore(data),
    quality: calculateQualityScore(data),
    growth: calculateGrowthScore(data),
    dividend: calculateDividendScore(data),
    leverage: calculateLeveragePenalty(data),
    volatility: calculateVolatility(data),
  };

  // Calculate weighted score
  const totalScore = Math.max(
    0,
    components.value * weights.value +
      components.quality * weights.quality +
      components.growth * weights.growth +
      components.dividend * weights.dividend +
      components.leverage * weights.leveragePenalty +
      components.volatility * weights.volatilityPenalty
  );

  const score = {
    value: components.value,
    quality: components.quality,
    growth: components.growth,
    dividend: components.dividend,
    lowLeverage: 100 - components.leverage,
    lowVol: 100 - components.volatility,
    total: Math.min(100, totalScore || 0),
  };

  for (const [k, v] of Object.entries(score)) {
    score[k + "Score"] = round(v);
  }

  return score;
}

// FACTOR - Value score calculation
function calculateValueScore(data) {
  // Core price ratios - universal across sectors
  const pe = data.priceToEarnings || 0;
  const pb = data.priceToBook || 0;
  const evEbit = data.evToEbit || 0;

  // Raw yields with negative protection
  const earningsYield = pe > 0 ? (1 / pe) * 100 : 0;
  const bookYield = pb > 0 ? (1 / pb) * 100 : 0;
  const ebitYield = evEbit > 0 ? (1 / evEbit) * 100 : 0;

  // Non-linear scaling
  const scaled = {
    earnings: Math.sqrt(earningsYield) * 6,
    book: Math.sqrt(bookYield) * 3.5,
    ebit: Math.sqrt(ebitYield) * 5,
  };

  // Simple average with penalty
  let score = (scaled.earnings + scaled.book + scaled.ebit) / 3;
  const negativeCount = [pe, pb, evEbit].filter((v) => v <= 0).length;
  score *= 1 - negativeCount * 0.15;

  return minMax(score * 2, 20, 100); // Scale to 0-100
}

// FACTOR - Quality score calculation
function calculateQualityScore(data) {
  const segment = (data.segment || "").toLowerCase();

  // Sector detection
  if (segment.includes("banco") || segment.includes("bank")) {
    return calculateBankQuality(data);
  }
  if (segment.includes("seguradoras") || segment.includes("insurance")) {
    return calculateInsuranceQuality(data);
  }
  return calculateUniversalQuality(data);
}

// Quality - Universal (non-financial) companies
function calculateUniversalQuality(data) {
  // Check for negative values in key metrics
  // If more than 1 metric is negative, return 0
  if (
    data.returnOnInvestedCapital < 0 ||
    [data.returnOnEquity, data.returnOnAssets, data.marginEbit].filter(
      (v) => v < 0
    ).length > 1
  ) {
    return 0;
  }

  const MIDPOINTS = { roic: 8, roe: 12, roa: 6, margin: 10 };

  const scores = {
    roic: sigmoidScale(data.returnOnInvestedCapital, MIDPOINTS.roic, 0.175),
    roe: sigmoidScale(data.returnOnEquity, MIDPOINTS.roe, 0.15),
    roa: sigmoidScale(data.returnOnAssets, MIDPOINTS.roa, 0.2),
    margin: sigmoidScale(data.ebitMargin, MIDPOINTS.margin, 0.175),
  };

  // Adjusted weights based on leverage factor
  const leverageFactor = Math.min(1, data.netDebtToEbitda / 4);

  const weights = {
    roic: 0.4,
    roe: 0.25 * (1 - leverageFactor),
    roa: 0.2,
    margin: 0.15,
  };

  return weightedScore(scores, weights);
}

// Quality - Banks
function calculateBankQuality(data) {
  const MIDPOINTS = { roe: 11, roa: 1.2, netMargin: 10, capital: 10.5 };

  const scores = {
    roe: sigmoidScale(data.returnOnEquity, MIDPOINTS.roe, 0.25),
    roa: sigmoidScale(data.returnOnAssets, MIDPOINTS.roa, 3),
    netMargin: sigmoidScale(data.netMargin, MIDPOINTS.netMargin, 0.5),
    capital: sigmoidScale(data.equityToAssets * 100, MIDPOINTS.capital, 0.2),
  };

  const weights = { roe: 0.35, roa: 0.25, netMargin: 0.2, capital: 0.2 };
  return weightedScore(scores, weights);
}

// Quality - Insurance companies
function calculateInsuranceQuality(data) {
  const rawCashBuffer = (-data.netDebt / data.totalAssets) * 100;
  const cashBuffer = Math.max(-25, Math.min(50, rawCashBuffer));

  const INSURANCE_MIDPOINTS = {
    roic: 25,
    roe: 30,
    roa: 10,
    capital: 25,
    cash: 20,
  };

  const scores = {
    roic: sigmoidScale(
      data.returnOnInvestedCapital,
      INSURANCE_MIDPOINTS.roic,
      0.15
    ),
    roe: sigmoidScale(data.returnOnEquity, INSURANCE_MIDPOINTS.roe, 0.12),
    roa: sigmoidScale(data.returnOnAssets, INSURANCE_MIDPOINTS.roa, 0.2),
    capital: sigmoidScale(
      data.equityToAssets * 100,
      INSURANCE_MIDPOINTS.capital,
      0.18
    ),
    cash: sigmoidScale(cashBuffer, INSURANCE_MIDPOINTS.cash, 0.25),
  };

  const weights = {
    roic: 0.35,
    roe: 0.25,
    roa: 0.15,
    capital: 0.15,
    cash: 0.1,
  };
  return weightedScore(scores, weights);
}

// Quality - Common scoring logic
function weightedScore(scores, weights) {
  let total = 0;
  for (const [key, weight] of Object.entries(weights)) {
    total += scores[key] * weight;
  }
  return clampValue(total, 0, 100) || 0;
}

// FACTOR - Growth score calculation
function calculateGrowthScore(data) {
  const { profitCagr5y, revenueCagr5y } = data;

  // Step 1: Normalize CAGRs to 0–100 scale (prevents unbounded scores)
  const normalize = (value, min = -20, max = 50) => {
    if (!value) value = 0;
    return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  };

  const revenueScore = normalize(revenueCagr5y);
  const profitScore = normalize(profitCagr5y);

  // Step 2: Calculate base score (adjust weights if needed)
  const baseScore = revenueScore * 0.45 + profitScore * 0.55;

  // Step 3: Tiered penalty system
  let penalty = 0;
  const isRevenueNegative = revenueCagr5y < 0;
  const isProfitNegative = profitCagr5y < 0;

  if (isRevenueNegative && isProfitNegative) {
    penalty = 25; // Brutal penalty for dual negatives
  } else if (isRevenueNegative || isProfitNegative) {
    penalty = 10; // Moderate penalty for single negative
  }

  // Step 4: Final score
  const finalScore = Math.max(0, baseScore - penalty);
  return round(finalScore) || 0;
}

// FACTOR - Dividend quality score calculation
function calculateDividendScore(data) {
  const { dividendYield: dy, payoutRatio: payout } = data;
  const yieldScore = Math.min(dy * 1.5, 50); // Max 33% yield scores 50
  const safetyFactor = Math.sqrt((100 - Math.min(payout, 95)) / 100);
  return round(Math.min(100, yieldScore * safetyFactor * 2) || 0);
}

// FACTOR - Progressive leverage penalty calculation
function calculateLeveragePenalty(data) {
  const segment = (data.segment || "").toLowerCase(); // Normalize segment to lowercase

  let leverageScore;

  switch (segment) {
    case "bank":
    case "banking":
    case "bancos":
      leverageScore = handleBankingLeverage(data);
      break;
    case "seguradoras":
    case "insurance":
      // Insurance companies have different leverage metrics
      leverageScore = 0; // TODO: Implement specific logic for insurance companies
      break;
    default:
      leverageScore = handleUniversalLeveragePenalty(data);
      break;
  }

  // Normalization 0 - 100
  return round((leverageScore + 10) * 2);
}

// Leverage - Universal leverage penalty calculation
function handleUniversalLeveragePenalty({
  netDebtToEquity,
  netDebtToEbitda,
  netDebtToEbit,
  netDebt,
  equity,
}) {
  // Core debt ratios (universal thresholds)
  const debtEquity = Math.max(0, netDebtToEquity - 0.5); // Start penalty >0.5
  const debtEBITDA = Math.max(0, netDebtToEbitda - 1.5); // >1.5x
  const debtEBIT = Math.max(0, netDebtToEbit - 2.0); // >2.0x

  // Non-linear composite score
  const debtScore = Math.sqrt(
    debtEquity ** 1.5 + debtEBITDA ** 1.3 + debtEBIT ** 1.2
  );

  // Cash reserve bonus (universal good)
  const cashBonus = netDebt < 0 ? Math.max(-10, (netDebt / equity) * -20) : 0;

  // Penalty calculation
  let penalty = Math.min(40, 10 * debtScore ** 1.4);
  penalty = Math.max(-10, penalty - cashBonus);

  return round(penalty); // Round to 2 decimal places
}

// Leverage - Banking leverage penalty calculation
function handleBankingLeverage({ equity, totalAssets }) {
  const basicTier1RatioProxy = equity / totalAssets;

  const leveragePenalty = Math.min(
    25,
    (0.08 - basicTier1RatioProxy) * 1000 // 8% Basel III minimum
  );

  return round(Math.max(-10, leveragePenalty));
}


// FACTOR - Progressive Volatility penalty calculation
function calculateVolatility({ volatility12M, volatilityTotal }) {
  const vol = volatility12M || volatilityTotal;

  if (!vol || vol <= 0) return 0; // proteção

  // Parâmetros ajustáveis
  const minVol = 15; // vol em % considerada "muito estável"
  const maxVol = 65; // vol em % onde a penalização deve ser máxima

  // Log scale invertida
  const score = minMax(vol, minVol, maxVol);

  return round(Math.min(100, Math.max(0, score)));
}

////////////////////////////////
/////////// HELPERS ////////////
////////////////////////////////

// Helper: Sigmoid scaling (0-100)
// Scales a value using a sigmoid function centered around a midpoint
// with a specified steepness. The value is clamped between min and max.
function sigmoidScale(value, midpoint, steepness = 0.3) {
  const range = Math.abs(midpoint) * 2 || 1;
  const min = midpoint - range;
  const max = midpoint + range;
  const cappedValue = Math.max(min, Math.min(max, value));
  // const cappedValue = Math.min(midpoint * 4, Math.max(-midpoint * 2, value));
  const exponent = -steepness * (cappedValue - midpoint);
  return 100 / (1 + Math.exp(exponent));
}

// Helper: Clamping function
// Clamps a value between min and max, rounding to 2 decimal places
function clampValue(value, min, max) {
  return Math.min(max, Math.max(min, Math.round(value * 100) / 100));
}

// Helper: Rounding function
// Rounds a number to 2 decimal places
function round(value, precision = 2) {
  const factor = Math.pow(10, precision);
  const roundedValue = Math.round(value * factor) / factor;
  return +roundedValue.toFixed(2);
}

// Log scale invertida
function minMax(value, min, max) {
  // Clamp para evitar valores fora da faixa
  const clampedValue = clampValue(value, min, max);
  return 100 * (Math.log(clampedValue / min) / Math.log(max / min));
}

// Exporting functions for external use
module.exports = {
  calculateEnhancedValueScore,
  calculateValueScore,
  calculateGrowthScore,
  calculateQualityScore,
  calculateDividendScore,
  calculateLeveragePenalty,
};
