const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("node:fs");
const path = require("node:path");
let tickers = require("./tickers.json");
const mapKey = require("./helpers/mapKey");
const groupBy = require("./helpers/groupBy");

const SCRAP_DIR = path.join(__dirname, "../../", "scraping_content");
const OUTPUT_FILE = path.resolve(
  __dirname,
  "../../",
  "data",
  "scraping-data.json"
);

const SCRAP_ITERATION_TIMEOUT = 1000; // 1 second

///////////////////////
//////// DEBUG ////////
///////////////////////
const DEBUG_MODE = process.argv.includes("--debug"); // Set to true to enable debug mode
if (DEBUG_MODE) {
  console.log("DEBUG MODE ENABLED");
  console.log("Debugging with the first two tickers...");
  tickers = tickers.slice(0, 2);
}

const HEADERS = { "User-Agent": "Mozilla/5.0" };

///////////////////////////////
//////// SCRAPING DATA ////////
///////////////////////////////

async function scrapData(ticker) {
  const data = await scrapInvestidor10(ticker);
  return data;
}

// scrap data from Investidor10
async function scrapInvestidor10(ticker) {
  // try {
  const { companyId, tickerId } = await scrapTickerAndCompanyIdInv10(ticker);
  const [indicators, financial] = await Promise.all([
    await scrapIndicatorsInv10(tickerId, 5),
    await scrapFinancialInv10(companyId, ticker, 10),
  ]);

  const data = {
    ticker,
    indicators,
    financial,
  };

  return data;
}

async function fetchData(url) {
  const response = await axios.get(url, { headers: HEADERS });
  if (!response.data) {
    throw new Error(`Failed to fetch data from ${url}`);
  }
  return response.data;
}

async function scrapTickerAndCompanyIdInv10(ticker) {
  // TODO: Implement cache for tickerId and companyId via file system
  const url = `https://investidor10.com.br/acoes/${ticker}`;
  const responseData = await fetchData(url);

  const companyId = +responseData.match(/companyId = '(\d+)'/)[1];
  const tickerId = +responseData.match(/tickerId = '(\d+)'/)[1];

  if (isNaN(companyId) || isNaN(tickerId)) {
    throw new Error(`Failed to extract companyId or tickerId from ${url}`);
  }

  return {
    companyId,
    tickerId,
  };
}

const handleNumberValue = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    const parsedValue = parseFloat(
      value.trim().replace(/\./g, "").replace(",", ".")
    );
    return isNaN(parsedValue) ? null : +parsedValue.toFixed(4);
  }
  return +value.toFixed(4);
};

async function scrapIndicatorsInv10(tickerId, years = 5) {
  const endpoint = `historico-indicadores/${tickerId}/${years}/?v=2`;
  const url = `https://investidor10.com.br/api/${endpoint}`;
  const responseData = await fetchData(url);
  const indicators = {
    current: {},
    historical: {},
  };

  const indicatorsHistorical = {};
  Object.entries(responseData).forEach(([key, value]) => {
    const current = value.find((item) => {
      return isNaN(+item.year) || item.year.length !== 4;
    });
    if (current) {
      indicators.current[mapKey(key)] = handleNumberValue(current.value);
    }

    indicatorsHistorical[mapKey(key)] = value
      .filter((item) => item !== current)
      .map((item) => ({
        year: parseInt(item.year),
        value: handleNumberValue(item.value),
      }))
      .sort((a, b) => b.year - a.year);
  });

  indicators.historical = groupBy(indicatorsHistorical, "year");

  return indicators;
}

async function scrapFinancialInv10(companyId, ticker, years = 10) {
  const endpoints = [
    // `balancos/ativospassivos/chart/${companyId}/${years * 365}`,
    `balancos/balancopatrimonial/chart/${companyId}/true`,
    `balancos/balancoresultados/chart/${companyId}/${years}/yearly`,
    `dividendos/chart/${ticker}/${years * 365}/ano`,
  ];
  // const [assetsLiabilities, book, results] = await Promise.all(
  const [book, results, dividends] = await Promise.all(
    endpoints.map((endpoint) =>
      fetchData(`https://investidor10.com.br/api/${endpoint}`)
    )
  );

  let financial = {};

  // Dividends per share
  financial.dividends = dividends.map((item) => ({
    year: item.created_at,
    dividendsPerShare: item.price,
  }));

  // Book
  let historicalBook = {};
  const bookIndex = book.shift();
  const bookYears = bookIndex
    .map((cell, index) => ({ value: parseInt(cell.toString().trim()), index }))
    .filter((item) => !isNaN(item.value));

  book.forEach((row) => {
    const indicatorName = row[0].split(" - ")[0].trim();
    historicalBook[mapKey(indicatorName)] = row
      .filter(
        (value, i) =>
          Array.isArray(value) && bookYears.some((x) => x.index === i)
      )
      .map(([_, value]) => handleNumberValue(value))
      .map((value, index) => ({
        year: bookYears[index].value,
        value,
      }))
      .sort((a, b) => b.year - a.year);
  });
  financial.book = groupBy(historicalBook, "year");

  // Results
  const historicalResults = {};
  const resultsIndex = results.shift();
  const resultsYears = resultsIndex
    .map((cell, index) => ({ value: parseInt(cell.toString().trim()), index }))
    .filter((item) => !isNaN(item.value));

  results
    .filter((row) => row[0].includes("$"))
    .forEach((row) => {
      const indicatorName = row[0].split(" - ")[0].trim();
      historicalResults[mapKey(indicatorName)] = row
        .filter(
          (value, i) =>
            Array.isArray(value) && resultsYears.some((x) => x.index === i)
        )
        .map(([_, value]) => {
          let val = value.replace("$", "").replace("R", "");
          return handleNumberValue(val);
        })
        .map((value, index) => ({
          year: resultsYears[index].value,
          value,
        }))
        .sort((a, b) => b.year - a.year);
    });
  financial.results = groupBy(historicalResults, "year");

  const findByYear = (array, year) => {
    return array.find((item) => item.year === year);
  };

  const yearsArr = financial.results.map(({ year }) => year);
  return yearsArr.map((year) => {
    return {
      year,
      ...(findByYear(financial.dividends, year) || {}),
      ...(findByYear(financial.book, year) || {}),
      ...(findByYear(financial.results, year) || {}),
    };
  });
}

////////////////////////////////
//////// MERGE AND SAVE ////////
////////////////////////////////

async function normalizeData(data) {
  return data;
}

async function mergeAndSaveCompanies(data) {
  let existing = [];

  // 1. Ler arquivo existente (se houver)
  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      const content = fs.readFileSync(OUTPUT_FILE, "utf-8");
      existing = JSON.parse(content);
    } catch {
      console.warn(
        "⚠️ Erro ao ler ou parsear o arquivo existente. Reiniciando..."
      );
    }
  }

  // 2. Mapear empresas existentes por ticker
  const map = new Map(existing.map((item) => [item.ticker, item]));

  // 3. Atualizar ou adicionar novas empresas
  for (const item of data) {
    map.set(item.ticker, item);
  }

  // 4. Salvar no arquivo sobrescrevendo
  const merged = Array.from(map.values());
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(merged, null, 2), "utf-8");
  console.log(`✅ ${data.length} empresas atualizadas em ${OUTPUT_FILE}`);
}

async function main() {
  const companiesData = [];

  for (let i = 0; i < tickers.length; i++) {
    const ticker = tickers[i];
    console.log(`[${i + 1}/${tickers.length}] Fetching data for ${ticker}...`);

    const scrapingData = await scrapData(ticker);

    const data = {
      ticker,
      ...scrapingData,
    };

    const normalizedData = await normalizeData(data);
    companiesData.push(normalizedData);
    await new Promise((resolve) =>
      setTimeout(resolve, SCRAP_ITERATION_TIMEOUT)
    );
  }

  await mergeAndSaveCompanies(companiesData);
}

main();
