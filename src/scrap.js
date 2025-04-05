const axios = require("axios");
const cheerio = require("cheerio");

const fs = require("node:fs");
const path = require("node:path");

///////////////////////
//////// DEBUG ////////
///////////////////////
const DEBUG_MODE = false; // Set to true to enable debug mode


const SCRAP_DIR = path.join(__dirname, "../", "scraping_content");

const WEBSITES = {
  INVESTIDOR_10: {
    url: (ticker) => `https://investidor10.com.br/acoes/${ticker}`,
    outputFile: (ticker) => path.resolve(SCRAP_DIR, `inv10_${ticker}.txt`),
  },
  MAIS_RETORNO: {
    url: (ticker) => `https://maisretorno.com/acoes//${ticker}`,
    outputFile: (ticker) => path.resolve(SCRAP_DIR, `maisret_${ticker}.txt`),
  },
};
const OUTPUT_FILE = path.resolve(__dirname, "../", "data", "companies.json");

let tickers = [
  "VALE3",
  "BBAS3",
  "EZTC3",
  "ITUB3",
  "B3SA3",
  "CMIG3",
  "CPFE3",
  "VULC3",
  "SLCE3",
  "RDOR3",
  "SUZB3",
  "WEGE3",
  "BBDC3",
  "EGIE3",
  "CSNA3",
  "LREN3",
  "FLRY3",
  "UGPA3",
  "KLBN3",
  "KEPL3",
  "CAML3",
  "SMTO3",
  "CSAN3",
  "GGBR3",
  "SBSP3",
  "MDIA3",
  "ROMI3",
  "DXCO3",
  "ABEV3",
  "RADL3",
  "BEEF3",
  "AZZA3",
  "ABCB4",
  "PSSA3",
  "AGRO3",
  "ALOS3",
  "ALPA4",
  "ALUP11",
  "AMER3",
  "AMOB3",
  "ANIM3",
  "ARML3",
  "ASAI3",
  "AURE3",
  "AZEV4",
  "AZTE3",
  "AZUL4",
  "BBDC4",
  "BBSE3",
  "BHIA3",
  "BLAU3",
  "BMOB3",
  "BPAC11",
  "BPAN4",
  "BRAP4",
  "BRAV3",
  "BRBI11",
  "BRFS3",
  "BRKM5",
  "BRSR6",
  "CASH3",
  "CBAV3",
  "CCRO3",
  "CEAB3",
  "CIEL3",
  "CLSA3",
  "CMIG4",
  "COGN3",
  "CRFB3",
  "CSMG3",
  "CURY3",
  "CVCB3",
  "CYRE3",
  "DASA3",
  "DIRR3",
  "ECOR3",
  "ELET3",
  "ETER3",
  "ELET6",
  "EMBR3",
  "ENEV3",
  "ENGI11",
  "EQTL3",
  "EVEN3",
  "FESA4",
  "FRAS3",
  "GFSA3",
  "GGBR4",
  "GGPS3",
  "GOAU4",
  "GOLL4",
  "GRND3",
  "GUAR3",
  "HAPV3",
  "HBSA3",
  "HYPE3",
  "IGTI11",
  "INTB3",
  "IRBR3",
  "ITSA4",
  "ITUB4",
  "JALL3",
  "JBSS3",
  "JHSF3",
  "JSLG3",
  "KLBN11",
  "LAVV3",
  "LEVE3",
  "LJQQ3",
  "LOGG3",
  "LWSA3",
  "MDNE3",
  "MGLU3",
  "MILS3",
  "MLAS3",
  "MOVI3",
  "MRFG3",
  "MRVE3",
  "MTRE3",
  "MULT3",
  "MYPK3",
  "NTCO3",
  "ODPV3",
  "ONCO3",
  "OPCT3",
  "ORVR3",
  "PCAR3",
  "PETR3",
  "PETR4",
  "PETZ3",
  "PGMN3",
  "PLPL3",
  "PNVL3",
  "POMO4",
  "PORT3",
  "POSI3",
  "PRIO3",
  "PRNR3",
  "QUAL3",
  "RAIL3",
  "RAIZ4",
  "RANI3",
  "RAPT4",
  "RCSL4",
  "RECV3",
  "RENT3",
  "SANB11",
  "SAPR11",
  "SBFG3",
  "SEER3",
  "SIMH3",
  "SMFT3",
  "SOJA3",
  "SRNA3",
  "STBP3",
  "SYNE3",
  "TAEE11",
  "TASA4",
  "TEND3",
  "TGMA3",
  "TIMS3",
  "TOTS3",
  "ISAE3",
  "TTEN3",
  "TUPY3",
  "UNIP6",
  "USIM3",
  "USIM5",
  "VAMO3",
  "VBBR3",
  "VIVA3",
  "VIVT3",
  "VLID3",
  "VVEO3",
  "YDUQ3",
  "ZAMP3",
  "RSUL4",
];

if (DEBUG_MODE) {
  tickers = tickers.slice(0, 2);
}

const HEADERS = { "User-Agent": "Mozilla/5.0" };

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
          .find("div")
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

function normalizeData(raw, fieldsToKeepAsString) {
  const toNumber = (value) => {
    if (typeof value !== "string") return value;
    const cleaned = value
      .replace(/[R$\s%]/g, "")
      .replace(/\./g, "")
      .replace(",", ".");
    const parsed = parseFloat(cleaned);
    if (parsed.trim() === "-") {
      return null;
    }
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

function mapKey(originalKey = "") {
  if (originalKey.startsWith("DIVIDEND YIELD")) {
    return "dividendYield";
  }

  switch (originalKey) {
    // Indicators
    case "P/L":
      return "priceToEarnings";
    case "P/RECEITA (PSR)":
      return "priceToSales";
    case "P/VP":
      return "priceToBook";
    case "PAYOUT":
      return "payoutRatio";
    case "MARGEM LÍQUIDA":
      return "netMargin";
    case "MARGEM BRUTA":
      return "grossMargin";
    case "MARGEM EBIT":
      return "ebitMargin";
    case "MARGEM EBITDA":
      return "ebitdaMargin";
    case "EV/EBITDA":
      return "evToEbitda";
    case "EV/EBIT":
      return "evToEbit";
    case "P/EBITDA":
      return "priceToEbitda";
    case "P/EBIT":
      return "priceToEbit";
    case "P/ATIVO":
      return "priceToAssets";
    case "P/CAP.GIRO":
      return "priceToWorkingCapital";
    case "P/ATIVO CIRC LIQ":
      return "priceToCurrentAssets";
    case "VPA":
      return "bookValuePerShare";
    case "LPA":
      return "earningsPerShare";
    case "GIRO ATIVOS":
      return "assetTurnover";
    case "ROE":
      return "returnOnEquity";
    case "ROIC":
      return "returnOnInvestedCapital";
    case "ROA":
      return "returnOnAssets";
    case "DÍVIDA LÍQUIDA / PATRIMÔNIO":
      return "netDebtToEquity";
    case "DÍVIDA LÍQUIDA / EBITDA":
      return "netDebtToEbitda";
    case "DÍVIDA LÍQUIDA / EBIT":
      return "netDebtToEbit";
    case "DÍVIDA BRUTA / PATRIMÔNIO":
      return "grossDebtToEquity";
    case "PATRIMÔNIO / ATIVOS":
      return "equityToAssets";
    case "PASSIVOS / ATIVOS":
      return "liabilitiesToAssets";
    case "LIQUIDEZ CORRENTE":
      return "currentRatio";
    case "CAGR RECEITAS 5 ANOS":
      return "revenueCagr5y";
    case "CAGR LUCROS 5 ANOS":
      return "profitCagr5y";

    // Company
    case "Valor de mercado":
      return "marketValue";
    case "Valor de firma":
      return "firmValue";
    case "Patrimônio Líquido":
      return "equity";
    case "Nº total de papeis":
      return "totalShares";
    case "Ativos":
      return "totalAssets";
    case "Ativo Circulante":
      return "currentAssets";
    case "Dívida Bruta":
      return "grossDebt";
    case "Dívida Líquida":
      return "netDebt";
    case "Disponibilidade":
      return "cashAvailable";
    case "Segmento de Listagem":
      return "listingSegment";
    case "Free Float":
      return "freeFloat";
    case "Tag Along":
      return "tagAlong";
    case "Liquidez Média Diária":
      return "avgDailyLiquidity";
    case "Setor":
      return "sector";
    case "Segmento":
      return "segment";

    case "Nome da Empresa":
      return "companyName";
    case "CNPJ":
      return "cnpj";
    case "Ano de estreia na bolsa":
      return "yearListed";
    case "Número de funcionários":
      return "employees";
    case "Ano de fundação":
      return "yearFounded";

    case "1 Mês":
      return "return1m";
    case "3 Meses":
      return "return3m";
    case "1 Ano":
      return "return1y";
    case "2 Anos":
      return "return2y";
    case "5 Anos":
      return "return5y";
    case "10 Anos":
      return "return10y";

    // Volatility
    case "Volatilidade total":
      return "volatilityTotal";
    case "Volatilidade 12M":
      return "volatility12M";
    case "Sharpe total":
      return "sharpeTotal";
    case "Sharpe 12M":
      return "sharpe12M";

    default:
      return originalKey
        .toLowerCase()
        .replace(/[^\w]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ""));
  }
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
  const fieldsToKeepAsString = [
    "ticker",
    "segment",
    "listingSegment",
    "sector",
    "companyName",
    "cnpj",
  ];
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

    const normalizedData = normalizeData(data, fieldsToKeepAsString);
    companiesData.push(normalizedData);
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  console.log(companiesData);
  mergeAndSaveCompanies(companiesData);
}

main();
