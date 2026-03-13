import { NextResponse } from "next/server";

// Simple in-memory cache for stock quotes
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 15 * 60 * 1000;

// Demo prices for when Yahoo Finance API is unavailable
const DEMO_PRICES: Record<string, { price: number; previousClose: number; name: string; currency: string }> = {
  "CW8.PA": { price: 425.30, previousClose: 423.10, name: "Amundi MSCI World UCITS ETF", currency: "EUR" },
  "EWLD.PA": { price: 28.45, previousClose: 28.20, name: "Lyxor MSCI World UCITS ETF", currency: "EUR" },
  "PAEEM.PA": { price: 20.85, previousClose: 21.10, name: "Amundi PEA MSCI Emerging Markets", currency: "EUR" },
  "MC.PA": { price: 735.20, previousClose: 728.50, name: "LVMH Moët Hennessy", currency: "EUR" },
  "TTE.PA": { price: 62.45, previousClose: 61.80, name: "TotalEnergies SE", currency: "EUR" },
  "AAPL": { price: 178.50, previousClose: 176.20, name: "Apple Inc.", currency: "USD" },
  "MSFT": { price: 415.80, previousClose: 412.30, name: "Microsoft Corporation", currency: "USD" },
  "SP500.PA": { price: 32.15, previousClose: 31.90, name: "Lyxor S&P 500 UCITS ETF", currency: "EUR" },
  "WPEA.PA": { price: 5.85, previousClose: 5.80, name: "iShares MSCI World Swap PEA", currency: "EUR" },
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ticker = searchParams.get("ticker");

  if (!ticker) {
    return NextResponse.json({ error: "Ticker requis" }, { status: 400 });
  }

  // Check cache
  const cached = cache.get(ticker);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  try {
    // Try Yahoo Finance API
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=5d`,
      {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (res.ok) {
      const json = await res.json();
      const result = json.chart?.result?.[0];
      if (result) {
        const meta = result.meta;
        const quote = {
          ticker,
          price: meta.regularMarketPrice,
          previousClose: meta.chartPreviousClose || meta.previousClose,
          change: meta.regularMarketPrice - (meta.chartPreviousClose || meta.previousClose),
          changePercent: ((meta.regularMarketPrice - (meta.chartPreviousClose || meta.previousClose)) / (meta.chartPreviousClose || meta.previousClose)) * 100,
          currency: meta.currency,
          name: meta.shortName || meta.symbol,
          timestamp: Date.now(),
        };
        cache.set(ticker, { data: quote, timestamp: Date.now() });
        return NextResponse.json(quote);
      }
    }
  } catch {
    // Fallback to demo prices
  }

  // Use demo prices as fallback
  const demo = DEMO_PRICES[ticker];
  if (demo) {
    const quote = {
      ticker,
      price: demo.price,
      previousClose: demo.previousClose,
      change: demo.price - demo.previousClose,
      changePercent: ((demo.price - demo.previousClose) / demo.previousClose) * 100,
      currency: demo.currency,
      name: demo.name,
      timestamp: Date.now(),
    };
    cache.set(ticker, { data: quote, timestamp: Date.now() });
    return NextResponse.json(quote);
  }

  return NextResponse.json({
    ticker,
    price: 0,
    previousClose: 0,
    change: 0,
    changePercent: 0,
    currency: "EUR",
    name: ticker,
    timestamp: Date.now(),
  });
}
