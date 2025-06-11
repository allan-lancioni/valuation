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
    case "Ativo Total":
      return "totalAssets";
    case "Ativo Circulante":
      return "currentAssets";
    case "Ativo Não Circulante":
      return "nonCurrentAssets";
    case "Passivo Total":
      return "totalLiabilities";
    case "Passivo Circulante":
      return "currentLiabilities";
    case "Passivo Não Circulante":
      return "nonCurrentLiabilities";
    case "Patrimônio Líquido Consolidado":
      return "netWorth";
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

    case "Lucro Líquido":
      return "netIncome";
    case "Lucro Bruto":
      return "grossProfit";
    case "Custos":
      return "costs";
    case "Imposto":
      return "taxes";
    

    case "Receita Líquida":
      return "netRevenue";
    

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

module.exports = mapKey;