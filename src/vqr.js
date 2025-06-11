const fs = require("node:fs");
const path = require("node:path");

const BASE_DIR = path.join(__dirname, "../", "data");

const INPUT_FILE = path.resolve(BASE_DIR, "companies.json");
const OUTPUT_JSON_FILE = path.resolve(BASE_DIR, "vqr.json");

// Valuation-to-Quality Ratio
function calculateVQR(company) {
  const {
    ticker,
    priceToEbit: EV_EBIT,
    returnOnInvestedCapital: ROIC,
    priceToEarnings: PE,
    returnOnEquity: ROE,
    priceToBook: PB,
  } = company;

  let VQR = "N/A",
    PE_ROE = "N/A";
  if (EV_EBIT > 0 && ROIC > 0) {
    VQR = +((EV_EBIT * 100) / ROIC).toFixed(2);
  }

  if (PE > 0 && ROE > 0) {
    PE_ROE = +((PE * 100) / ROE).toFixed(2);
  }

  return { ticker, PB, EV_EBIT, PE, ROIC, ROE, VQR, PE_ROE };
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

  const calculated = companiesData.map((company) => calculateVQR(company));
  // const invalidVQR = calculated.filter((item) => item.VQR === "N/A");
  const validVQR = calculated.filter((item) => item.VQR > 0);

  const data = [
    ...validVQR.sort((a, b) => a.VQR - b.VQR),
    // ...invalidVQR,
  ].filter(
    (item) =>
      // item.ROIC > 8 &&
      item.PB > 0 &&
      item.PE_ROE > 0
  );

  const showLength = 20;
  console.table(data);
  console.log(`Showing ${showLength} of ${data.length}\n`);

  try {
    fs.writeFileSync(OUTPUT_JSON_FILE, JSON.stringify(data.map((x, i) => ({ ...x, i })), null, 2), "utf8");
    console.log(`JSON file saved to ${OUTPUT_JSON_FILE}\n`);
  } catch (error) {
    console.error("Erro ao salvar arquivo JSON:", error);
  }

  // try {
  //   const csvData = data.map(formatForCSV);
  //   fs.writeFileSync(OUTPUT_CSV_FILE, jsonToCSV(csvData), "utf8");
  //   console.log(`CSV file saved to ${OUTPUT_CSV_FILE}`);
  // } catch (error) {
  //   console.error("Erro ao salvar arquivo CSV:", error);
  // }


}

main();
