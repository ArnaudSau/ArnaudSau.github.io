const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

interface StockQuote {
  ticker: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  currency: string;
  name: string;
  timestamp: number;
}

interface CachedData<T> {
  data: T;
  timestamp: number;
}

function getCached<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`yf_${key}`);
    if (!raw) return null;
    const cached: CachedData<T> = JSON.parse(raw);
    if (Date.now() - cached.timestamp > CACHE_DURATION) {
      localStorage.removeItem(`yf_${key}`);
      return null;
    }
    return cached.data;
  } catch {
    return null;
  }
}

function setCache<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    const cached: CachedData<T> = { data, timestamp: Date.now() };
    localStorage.setItem(`yf_${key}`, JSON.stringify(cached));
  } catch {
    // localStorage full or unavailable
  }
}

export async function getStockQuote(ticker: string): Promise<StockQuote> {
  const cached = getCached<StockQuote>(`quote_${ticker}`);
  if (cached) return cached;

  try {
    const res = await fetch(`/api/stock?ticker=${encodeURIComponent(ticker)}`);
    if (!res.ok) throw new Error("Failed to fetch stock data");
    const data = await res.json();
    setCache(`quote_${ticker}`, data);
    return data;
  } catch {
    // Return last known data or default
    return {
      ticker,
      price: 0,
      previousClose: 0,
      change: 0,
      changePercent: 0,
      currency: "EUR",
      name: ticker,
      timestamp: Date.now(),
    };
  }
}

export async function getMultipleQuotes(
  tickers: string[]
): Promise<Record<string, StockQuote>> {
  const results: Record<string, StockQuote> = {};
  const uncached: string[] = [];

  for (const ticker of tickers) {
    const cached = getCached<StockQuote>(`quote_${ticker}`);
    if (cached) {
      results[ticker] = cached;
    } else {
      uncached.push(ticker);
    }
  }

  if (uncached.length > 0) {
    const promises = uncached.map((t) => getStockQuote(t));
    const quotes = await Promise.allSettled(promises);
    quotes.forEach((result, i) => {
      if (result.status === "fulfilled") {
        results[uncached[i]] = result.value;
      }
    });
  }

  return results;
}

export async function searchStock(
  query: string
): Promise<{ symbol: string; name: string; exchange: string }[]> {
  try {
    const res = await fetch(
      `/api/stock/search?q=${encodeURIComponent(query)}`
    );
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}
