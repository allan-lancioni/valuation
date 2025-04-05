const fs = require("node:fs");
const path = require("node:path");
const { calculateEnhancedValueScore } = require("./calculate")

const BASE_DIR = path.join(__dirname, "../", "data");

const INPUT_FILE = path.resolve(BASE_DIR, "companies.json");
const OUTPUT_JSON_FILE = path.resolve(BASE_DIR, "data.json");
const OUTPUT_CSV_FILE = path.resolve(BASE_DIR, "data.csv");

/////////////////////////////////////////
/// CSV and JSON conversion functions ///
/////////////////////////////////////////

function jsonToCSV(jsonArray) {
  if (!Array.isArray(jsonArray) || jsonArray.length === 0) {
    throw new Error("Input must be a non-empty array of objects");
  }

  const headers = Object.keys(jsonArray[0]);
  const escapeValue = (val) => {
    const str = val === null || val === undefined ? '' : String(val);
    return `"${str.replace(/"/g, '""')}"`;
  };

  const humanFriendlyHeaders = headers.map((key) => columnLabelMap[key] || key);

  const csvRows = [
    humanFriendlyHeaders.join(','),
    ...jsonArray.map(row => headers.map(field => escapeValue(row[field])).join(','))
  ];

  return csvRows.join('\n');
}

function formatForCSV(obj) {
  const formatted = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      formatted[key] = '';
    } else if (key.toLowerCase().includes('date')) {
      formatted[key] = new Date(value).toISOString().split('T')[0];
    } else if (key.match(/(margin|return|yield|ratio)$/i)) {
      formatted[key] = (Number(value) * 100).toFixed(2) + '%';
    } else if (typeof value === 'number') {
      formatted[key] = value.toFixed(2);
    } else {
      formatted[key] = String(value);
    }
  }
  return formatted;
}

const columnLabelMap = {
  ticker: "Ticker",
  fetchDate: "Data",
  quotation: "Preço",
  companyName: "Empresa",
  cnpj: "CNPJ",
  sector: "Setor",
  segment: "Segmento",
  listingSegment: "Listagem",
  marketValue: "V. Mercado",
  firmValue: "V. Firma",
  equity: "PL",
  totalAssets: "Ativos",
  currentAssets: "Ativos Circ.",
  cashAvailable: "Caixa",
  totalShares: "Ações",
  priceToEarnings: "P/L",
  priceToSales: "P/Vendas",
  priceToBook: "P/VP",
  dividendYield: "DY",
  payoutRatio: "Payout",
  netMargin: "M. Líquida",
  grossMargin: "M. Bruta",
  ebitMargin: "M. EBIT",
  ebitdaMargin: "M. EBITDA",
  returnOnEquity: "ROE",
  returnOnAssets: "ROA",
  returnOnInvestedCapital: "ROIC",
  return1m: "Ret 1M",
  return3m: "Ret 3M",
  return1y: "Ret 1A",
  return2y: "Ret 2A",
  return5y: "Ret 5A",
  return10y: "Ret 10A",
  valueScore: "DVS Valor",
  qualityScore: "DVS Qualid.",
  growthScore: "DVS Cresc.",
  dividendScore: "DVS Divid.",
  lowLeverageScore: "DVS Baixa Alav.",
  lowVolScore: "DVS Baixa Vol.",
  totalScore: "DVS Total",
  yearListed: "Ano List.",
  employees: "Func.",
  yearFounded: "Ano Fund.",
  evToEbit: "EV/EBIT",
  priceToEbit: "P/EBIT",
  priceToAssets: "P/Ativos",
  priceToWorkingCapital: "P/Cap. Giro",
  priceToCurrentAssets: "P/At. Circ.",
  bookValuePerShare: "VPA",
  earningsPerShare: "LPA",
  assetTurnover: "Giro Ativos",
  equityToAssets: "PL/Ativos",
  liabilitiesToAssets: "Pass/Ativos",
  currentRatio: "Liq. Corr.",
  revenueCagr5y: "CAGR Rec.",
  profitCagr5y: "CAGR Lucro",
  freeFloat: "Free Float",
  tagAlong: "Tag Along",
  avgDailyLiquidity: "Liq. Média"
};

const preferredOrder = [
  // Basic Company Information
  "ticker",
  // "fetchDate",
  // "companyName",
  // "cnpj",
  // "sector",
  // "segment",
  // "listingSegment",
  // "yearFounded",
  // "yearListed",
  // "employees",

  // Financial Metrics & Valuation
  // "quotation",
  // "marketValue",
  // "firmValue",
  // "equity",
  // "totalAssets",
  // "currentAssets",
  // "cashAvailable",
  // "totalShares",

  // Valuation Ratios
  // "priceToEarnings",
  // "priceToSales",
  // "priceToBook",
  // "evToEbit",
  // "priceToEbit",
  // "priceToAssets",
  // "priceToWorkingCapital",
  // "priceToCurrentAssets",

  // // Dividend Metrics
  // "dividendYield",
  // "payoutRatio",

  // // Margins
  // "netMargin",
  // "grossMargin",
  // "ebitMargin",
  // "ebitdaMargin",

  // Profitability Ratios
  // "returnOnEquity",
  // "returnOnAssets",
  // "returnOnInvestedCapital",

  // DVS Scores
  "valueScore",
  "qualityScore",
  "growthScore",
  "dividendScore",
  "lowLeverageScore",
  "lowVolScore",
  "totalScore",

  // Historical Returns
  // "return1m",
  // "return3m",
  // "return1y",
  "return2y",
  "return5y",
  "return10y",

  // Per-Share Metrics
  // "bookValuePerShare",
  // "earningsPerShare",

  // // Turnover & Leverage Ratios
  // "assetTurnover",
  // "equityToAssets",
  // "liabilitiesToAssets",

  // // Liquidity Ratios
  // "currentRatio",

  // // Growth Metrics
  // "revenueCagr5y",
  // "profitCagr5y",

  // // Shareholder & Liquidity Info
  // "freeFloat",
  // "tagAlong",
  // "avgDailyLiquidity"
];

function sortColumns(obj) {
  const sorted = {};
  // Add all keys from preferredOrder, defaulting to null if missing
  preferredOrder.forEach((key) => {
    sorted[key] = obj.hasOwnProperty(key) ? obj[key] : null;
  });
  // Add remaining keys from obj not in preferredOrder, preserving their original order
  // Object.keys(obj).forEach((key) => {
  //   if (!preferredOrder.includes(key)) {
  //     sorted[key] = obj[key];
  //   }
  // });

  return sorted;
}


function main() {
  let companiesData = [];

  if (fs.existsSync(INPUT_FILE)) {
    try {
      companiesData = JSON.parse(fs.readFileSync(INPUT_FILE, "utf8"));
    } catch (error) {
      console.error("Erro ao ler o arquivo existente:", error);
      return;
    }
  }

  const data = companiesData.map((company) => {
    const indicatorData = calculateEnhancedValueScore(company);
    const enriched = { ...company, ...indicatorData };
    return sortColumns(enriched);
  });

  data.sort((a, b) => b.totalScore - a.totalScore)

  try {
    fs.writeFileSync(OUTPUT_JSON_FILE, JSON.stringify(data, null, 2), "utf8");
    console.log(`JSON file saved to ${OUTPUT_JSON_FILE}`);
  } catch (error) {
    console.error("Erro ao salvar arquivo JSON:", error);
  }

  try {
    const csvData = data.map(formatForCSV);
    fs.writeFileSync(OUTPUT_CSV_FILE, jsonToCSV(csvData), "utf8");
    console.log(`CSV file saved to ${OUTPUT_CSV_FILE}`);
  } catch (error) {
    console.error("Erro ao salvar arquivo CSV:", error);
  }

  const showLength = 20
  console.table(data)
  console.log(`Showing ${showLength} of ${data.length}\n` )
}

main();


module.exports = {
  jsonToCSV,
  formatForCSV,
  sortColumns,
  columnLabelMap,
  preferredOrder,
};