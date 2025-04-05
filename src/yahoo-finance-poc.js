const yahooFinance = require("yahoo-finance2").default;

const symbol = "ITUB3.SA";

async function main() {
  let result;

  try {
    result = await yahooFinance.quoteSummary(symbol, { modules: [
      "defaultKeyStatistics",
      "financialData",
      "price",
      "summaryDetail",
      "summaryProfile",
      "calendarEvents",
      "balanceSheetHistory",
      "cashflowStatementHistory",
      "incomeStatementHistory",
      "insiderHolders",
      "insiderTransactions",
      "institutionOwnership"
    ]});
    console.log(JSON.stringify(result, null, 2))
  } catch (error) {
    if (error instanceof yahooFinance.errors.FailedYahooValidationError) {
      // See the validation docs for examples of how to handle this
      // error.result will be a partially validated / coerced result.
    } else if (error instanceof yahooFinance.errors.HTTPError) {
      // Probably you just want to log and skip these
      // console.warn(
      //   `Skipping yf.quote("${symbol}"): [${error.name}] ${error.message}`
      // );
      return;
    } else {
      // Same here
      // console.warn(
      //   `Skipping yf.quote("${symbol}"): [${error.name}] ${error.message}`
      // );
      return;
    }
  }
}

main();