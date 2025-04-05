const fs = require('node:fs');
const path = require('node:path');
const OUTPUT_FILE = path.resolve(__dirname, 'companies.json');


function calculateIndicator(data) {
  const {
    priceToEarnings: P_L,
    priceToBook: P_VP,
    dividendYield,
    payoutRatio,
    returnOnEquity: ROE,
    returnOnInvestedCapital: ROIC,
    returnOnAssets: ROA,
    grossDebtToEquity: dividaBrutaPatrimonio,
    profitCagr5y: cagrLucros,
    revenueCagr5y: cagrReceitas,
  } = data;

  // 1. Rentabilidade Média
  const rentabilidadeMedia = (ROE + ROIC + ROA) / 3 / 100;

  // 2. Valuation Score
  let valuationScore;
  if (P_L <= 0 || P_VP <= 0) {
    valuationScore = 0; // Evitar distorções
  } else {
    valuationScore = (1 / P_L) + (1 / P_VP);
  }

  // 3. Alavancagem Suavizada
  let alavancagemSuavizada;
  if (!dividaBrutaPatrimonio) {
    alavancagemSuavizada = 1; // Evitar divisão por zero
  } else if (dividaBrutaPatrimonio < 0) {
    alavancagemSuavizada = 0; // Evitar distorções
  } else {
    alavancagemSuavizada = 1 / (1 + dividaBrutaPatrimonio);
  }

  // 4. Crescimento Ajustado
  const crescimento = 1 + ((cagrLucros / 100) + (cagrReceitas / 100)) / 2;

  // 5. Dividendos Ajustados
  const dividendYieldDecimal = dividendYield / 100;
  const payoutDecimal = payoutRatio / 100;
  const dividendosAjustados = 1 + (dividendYieldDecimal * (1 - payoutDecimal));

  // Indicador Final
  let indicador = rentabilidadeMedia * valuationScore * alavancagemSuavizada * crescimento * dividendosAjustados;
  indicador = indicador * 100;

  const result = {
    indicator: indicador,
    rentabilidadeMedia,
    valuationScore,
    alavancagemSuavizada,
    crescimento,
    dividendosAjustados,
  }

  Object.entries(result).forEach(([key, value]) => {
    if (typeof value === 'number' && !isNaN(value)) {
      result[key] = parseFloat(value.toFixed(2));
    } else {
      result[key] = null;
    }
  })

  return result;
}

function main() {
  // 1. Ler arquivo existente (se houver)
  let companiesData = [];

  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      companiesData = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
    } catch (error) {
      console.error('Erro ao ler o arquivo existente:', error);
    }
  }

  const data = companiesData.map(company => {
    const indicatorData = calculateIndicator(company);
    return {
      ticker: company.ticker,
      ...indicatorData
    };
  });

  console.log('-'.repeat(40) + '\n\nRanking:\n\n')

  console.log(data.sort((a, b) => b.indicator - a.indicator))

}

main()