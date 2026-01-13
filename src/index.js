require("dotenv").config();
const axios = require("axios");

const API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
const BASE_URL = "https://www.alphavantage.co/query";

// ETF symbols to analyze (popular ETFs)
const ETF_SYMBOLS = ["SPY", "QQQ", "VTI"];

// Calculate CAGR: ((Ending Value / Beginning Value) ^ (1 / years)) - 1
function calculateCAGR(startPrice, endPrice, years) {
  return (Math.pow(endPrice / startPrice, 1 / years) - 1) * 100;
}

// Calculate volatility (simple standard deviation of returns)
function calculateVolatility(prices) {
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }

  const mean = returns.reduce((a, b) => a + b) / returns.length;
  const variance =
    returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) /
    returns.length;
  return Math.sqrt(variance) * 100;
}

// Fetch ETF data from Alpha Vantage
async function fetchETFData(symbol) {
  try {
    const response = await axios.get(BASE_URL, {
      params: {
        function: "TIME_SERIES_MONTHLY",
        symbol: symbol,
        apikey: API_KEY,
      },
    });

    return response.data;
  } catch (error) {
    console.error(`Error fetching data for ${symbol}:`, error.message);
    return null;
  }
}

// Analyze ETF performance
async function analyzeETF(symbol) {
  console.log(`\nAnalyzing ${symbol}...`);

  const data = await fetchETFData(symbol);

  if (!data || !data["Monthly Time Series"]) {
    console.log(`❌ No data available for ${symbol}`);
    return null;
  }

  const timeSeries = data["Monthly Time Series"];
  const dates = Object.keys(timeSeries).sort();

  if (dates.length < 12) {
    console.log(`❌ Insufficient data for ${symbol}`);
    return null;
  }

  // Get prices (using closing prices)
  const prices = dates.map((date) => parseFloat(timeSeries[date]["4. close"]));
  const startPrice = prices[0];
  const endPrice = prices[prices.length - 1];
  const years = dates.length / 12;

  // Calculate metrics
  const cagr = calculateCAGR(startPrice, endPrice, years);
  const volatility = calculateVolatility(prices);
  const sharpeRatio = cagr / volatility; // Simplified Sharpe ratio

  return {
    symbol,
    startPrice: startPrice.toFixed(2),
    endPrice: endPrice.toFixed(2),
    cagr: cagr.toFixed(2),
    volatility: volatility.toFixed(2),
    sharpeRatio: sharpeRatio.toFixed(2),
    dataPoints: dates.length,
  };
}

// Main function
async function main() {
  console.log("🚀 ETF Analyzer - Fintech API Challenge\n");
  console.log("Analyzing ETFs:", ETF_SYMBOLS.join(", "));

  const results = [];

  // Analyze each ETF (with delay to respect API rate limits)
  for (const symbol of ETF_SYMBOLS) {
    const result = await analyzeETF(symbol);
    if (result) {
      results.push(result);
    }
    // Wait 12 seconds between requests (Alpha Vantage free tier: 5 requests/min)
    if (ETF_SYMBOLS.indexOf(symbol) < ETF_SYMBOLS.length - 1) {
      console.log("⏳ Waiting 12s for API rate limit...");
      await new Promise((resolve) => setTimeout(resolve, 12000));
    }
  }

  // Sort by Sharpe ratio (best risk-adjusted returns)
  results.sort((a, b) => b.sharpeRatio - a.sharpeRatio);

  // Display results
  console.log("\n📊 Results (sorted by Sharpe Ratio):\n");
  console.table(results);

  console.log("\n✅ Analysis complete!");
}

// Run the analyzer
main().catch(console.error);
