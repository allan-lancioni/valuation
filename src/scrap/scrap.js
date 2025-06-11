const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("node:fs");
const path = require("node:path");
let tickers = require("./tickers.json");
const mapKey = require("./helpers/mapKey")

const SCRAP_DIR = path.join(__dirname, "../../", "scraping_content");
const OUTPUT_FILE = path.resolve(__dirname, "../../", "data", "companies.json");

///////////////////////
//////// DEBUG ////////
///////////////////////
const DEBUG_MODE = process.argv.includes('--debug'); // Set to true to enable debug mode
if (DEBUG_MODE) {
  console.log("DEBUG MODE ENABLED");
  console.log("Debugging with the first two tickers...");
  tickers = tickers.slice(0, 2);
}

const HEADERS = { "User-Agent": "Mozilla/5.0" };
const WEBSITES = {
  INVESTIDOR_10: {
    url: (ticker) => `https://investidor10.com.br/acoes/${ticker}`,
    outputFile: (ticker) => path.resolve(SCRAP_DIR, `inv10_${ticker}.txt`),
  },
  MAIS_RETORNO: {
    url: (ticker) => `https://maisretorno.com/acoes/${ticker}`,
    outputFile: (ticker) => path.resolve(SCRAP_DIR, `maisret_${ticker}.txt`),
  },
};

async function fetchFinData(ticker) {
  try {
    const $ = cheerio.load(
      await getWebsiteContent(ticker, WEBSITES.INVESTIDOR_10)
    );

    const data = {
      ticker: ticker.toUpperCase(),
    };

    data.quotation = $("#cards-ticker")
      .find(".cotacao")
      .find(".value")
      .text()
      .trim();

    $("#data_about")
      .find(".basic_info")
      .first()
      .find("tr")
      .each((_, el) => {
        const [name, value] = $(el)
          .find("td")
          .map((_, el) => $(el).text().trim());
        if (name && value) {
          data[name.replace(":", "")] = value;
        }
      });

    $("#table-indicators")
      .find(".cell")
      .each((_, el) => {
        const name = $(el)
          .find("span")
          .first()
          .clone()
          .children()
          .remove()
          .end()
          .text()
          .trim();
        const value = $(el).find(".value span").first().text().trim();
        if (name && value) {
          data[name] = value;
        }
      });

    $("#table-indicators-company")
      .find(".cell")
      .each((_, el) => {
        const name = $(el).find(".title").first().text().trim();
        if (name) {
          data[name] =
            $(el).find(".detail-value").first().text().trim() ||
            $(el).find(".value").first().text().trim();
        }
      });

    $(".return-bar")
      .find(".result-period")
      .each((i, el) => {
        if (i > 5) return;
        const [value, name] = $(el)
          .children()
          .map((_, c) => $(c).text().trim());
        data[name] = value;
      });

    return data;
  } catch (error) {
    console.error(error);
    return {
      Ticker: ticker.toUpperCase(),
      Error: error.message,
    };
  }
}

async function fetchVolData(ticker) {
  try {
    const $ = cheerio.load(
      await getWebsiteContent(ticker, WEBSITES.MAIS_RETORNO)
    );

    const data = { ticker: ticker.toUpperCase() };

    $("#asset-stats")
      .find("li")
      .each((_, el) => {
        const [name, value] = $(el)
          .first()
          .children()
          .map((_, el) => $(el).text().trim());
        if (name.toLowerCase().includes("rentabilidade")) {
          return;
        }
        data[name] = value;
      });

    return data;
  } catch (error) {
    console.error(error);
    return {
      Ticker: ticker.toUpperCase(),
      Error: error.message,
    };
  }
}

async function getWebsiteContent(ticker, website) {
  const requestWebsiteContent = async () => {
    const response = await axios.get(website.url(ticker), { headers: HEADERS });
    console.log(`📥 ${ticker} - ${response.status} ${response.statusText}`);
    return response.data;
  };

  let websiteContent;
  if (DEBUG_MODE) {
    const path = website.outputFile(ticker);
    if (!fs.existsSync(path)) {
      websiteContent = await requestWebsiteContent(ticker);
      fs.writeFileSync(path, websiteContent, "utf-8");
    }
    websiteContent = fs.readFileSync(path, "utf-8");
  } else {
    websiteContent = await requestWebsiteContent(ticker, website);
  }
  return websiteContent;
}

const fieldsToKeepAsString = [
  "ticker",
  "segment",
  "listingSegment",
  "sector",
  "companyName",
  "cnpj",
];

function normalizeData(raw) {
  const toNumber = (value) => {
    if (typeof value !== "string") return value;
    const cleaned = value
      .replace(/[R$\s%]/g, "")
      .replace(/\./g, "")
      .replace(",", ".");
    if (!cleaned || cleaned.trim() === "-") {
      return null;
    }
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? value : parsed;
  };

  const normalizeObject = (obj) => {
    return Object.fromEntries(
      Object.entries(obj).map(([key, val]) => {
        const mappedKey = mapKey(key);
        return [
          mappedKey,
          fieldsToKeepAsString.includes(mappedKey) ? val : toNumber(val),
        ];
      })
    );
  };

  return {
    ticker: raw.ticker,
    fetchDate: new Date().toISOString(),
    ...normalizeObject(raw),
  };
}

function mergeAndSaveCompanies(companies) {
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
  const map = new Map(existing.map((company) => [company.ticker, company]));

  // 3. Atualizar ou adicionar novas empresas
  for (const company of companies) {
    map.set(company.ticker, company);
  }

  // 4. Salvar no arquivo sobrescrevendo
  const merged = Array.from(map.values());
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(merged, null, 2), "utf-8");
  console.log(`✅ ${companies.length} empresas atualizadas em ${OUTPUT_FILE}`);
}

async function main() {

  const companiesData = [];

  for (let i = 0; i < tickers.length; i++) {
    const ticker = tickers[i];
    console.log(`[${i + 1}/${tickers.length}] Fetching data for ${ticker}...`);

    const [finData, volData] = await Promise.all([
      fetchFinData(ticker),
      fetchVolData(ticker),
    ]);

    const data = {
      ticker,
      ...finData,
      ...volData,
    };

    const normalizedData = normalizeData(data);
    companiesData.push(normalizedData);
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  mergeAndSaveCompanies(companiesData);
}

main();
