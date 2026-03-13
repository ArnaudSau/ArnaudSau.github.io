"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { MetricCard } from "@/components/ui/metric-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { calculatePortfolioTotals, calculatePEATax, calculateCTOTax, type HoldingWithPrice } from "@/lib/calculations";

interface PortfolioData {
  id: string;
  name: string;
  type: "PEA" | "CTO";
  broker: string;
  openDate: string;
  holdings: {
    id: string;
    ticker: string;
    name: string;
    quantity: number;
    averagePurchasePrice: number;
    sector: string | null;
    geographicZone: string | null;
  }[];
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [portfolios, setPortfolios] = useState<PortfolioData[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;

    async function fetchData() {
      try {
        const res = await fetch("/api/portfolios");
        const data = await res.json();
        setPortfolios(data);

        // Fetch prices for all tickers
        const tickers = [...new Set(data.flatMap((p: PortfolioData) => p.holdings.map((h) => h.ticker)))];
        const priceMap: Record<string, number> = {};

        await Promise.allSettled(
          tickers.map(async (ticker: string) => {
            const res = await fetch(`/api/stock?ticker=${ticker}`);
            const quote = await res.json();
            priceMap[ticker] = quote.price;
          })
        );

        setPrices(priceMap);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    }

    fetchData();
  }, [status]);

  if (status === "loading" || loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-bg-card border border-border rounded-xl p-5">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Calculate totals
  const allHoldings: HoldingWithPrice[] = portfolios.flatMap((p) =>
    p.holdings.map((h) => ({
      ...h,
      currentPrice: prices[h.ticker] || h.averagePurchasePrice,
    }))
  );

  const totals = calculatePortfolioTotals(allHoldings);

  // Calculate tax estimation
  let totalTaxEstimation = 0;
  portfolios.forEach((p) => {
    const holdings = p.holdings.map((h) => ({
      ...h,
      currentPrice: prices[h.ticker] || h.averagePurchasePrice,
    }));
    const pTotals = calculatePortfolioTotals(holdings);
    if (pTotals.totalPlusValue > 0) {
      if (p.type === "PEA") {
        const openYears = (Date.now() - new Date(p.openDate).getTime()) / (365.25 * 24 * 3600 * 1000);
        totalTaxEstimation += calculatePEATax(pTotals.totalPlusValue, openYears);
      } else {
        totalTaxEstimation += calculateCTOTax(pTotals.totalPlusValue);
      }
    }
  });

  const netValue = totals.totalCurrentValue - Math.max(0, totalTaxEstimation);
  const totalLines = allHoldings.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-sora text-2xl font-bold">Dashboard</h1>
        <p className="text-text-muted mt-1">
          Bienvenue, {session?.user?.name || "Investisseur"}
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Valeur totale (brut)"
          value={formatCurrency(totals.totalCurrentValue)}
          delta={`Net: ${formatCurrency(netValue)}`}
          deltaType="neutral"
        />
        <MetricCard
          label="Plus-values latentes"
          value={formatCurrency(totals.totalPlusValue)}
          delta={formatPercent(totals.totalPlusValuePercent)}
          deltaType={totals.totalPlusValue >= 0 ? "positive" : "negative"}
        />
        <MetricCard
          label="Capital investi"
          value={formatCurrency(totals.totalInvested)}
        />
        <MetricCard
          label="Lignes en portefeuille"
          value={String(totalLines)}
          delta={`${portfolios.length} compte(s)`}
          deltaType="neutral"
        />
      </div>

      {/* Fiscalité Widget */}
      <Card>
        <CardHeader>
          <CardTitle>Fiscalité PEA vs CTO</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {portfolios.map((p) => {
              const holdings = p.holdings.map((h) => ({
                ...h,
                currentPrice: prices[h.ticker] || h.averagePurchasePrice,
              }));
              const pTotals = calculatePortfolioTotals(holdings);
              const openDate = new Date(p.openDate);
              const openYears = (Date.now() - openDate.getTime()) / (365.25 * 24 * 3600 * 1000);

              let taxRate = "";
              let taxAmount = 0;
              if (p.type === "PEA") {
                if (openYears >= 5) {
                  taxRate = "17.2% (PS uniquement)";
                  taxAmount = pTotals.totalPlusValue > 0 ? pTotals.totalPlusValue * 0.172 : 0;
                } else {
                  taxRate = `30% (flat tax) — ${(5 - openYears).toFixed(1)} ans restants`;
                  taxAmount = pTotals.totalPlusValue > 0 ? pTotals.totalPlusValue * 0.3 : 0;
                }
              } else {
                taxRate = "30% (PFU)";
                taxAmount = pTotals.totalPlusValue > 0 ? pTotals.totalPlusValue * 0.3 : 0;
              }

              return (
                <div key={p.id} className="bg-bg-secondary rounded-lg p-4 border border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant={p.type === "PEA" ? "success" : "default"}>{p.type}</Badge>
                    <span className="font-medium text-sm">{p.name}</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-text-muted">Valeur</span>
                      <span className="font-numeric">{formatCurrency(pTotals.totalCurrentValue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Plus-value</span>
                      <span className={`font-numeric ${pTotals.totalPlusValue >= 0 ? "text-accent-green" : "text-accent-red"}`}>
                        {formatCurrency(pTotals.totalPlusValue)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Imposition</span>
                      <span className="text-xs text-text-muted">{taxRate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Impôt estimé</span>
                      <span className="font-numeric text-accent-red">{formatCurrency(taxAmount)}</span>
                    </div>
                    {p.type === "PEA" && (
                      <div className="flex justify-between">
                        <span className="text-text-muted">Ouvert depuis</span>
                        <span className="text-xs">{openYears.toFixed(1)} ans</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Portfolio Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Aperçu des positions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-text-muted">
                  <th className="text-left py-3 px-2">Ticker</th>
                  <th className="text-left py-3 px-2">Nom</th>
                  <th className="text-right py-3 px-2">Qté</th>
                  <th className="text-right py-3 px-2">PRU</th>
                  <th className="text-right py-3 px-2">Cours</th>
                  <th className="text-right py-3 px-2">Valeur</th>
                  <th className="text-right py-3 px-2">+/- Value</th>
                </tr>
              </thead>
              <tbody>
                {allHoldings.map((h, i) => {
                  const currentVal = h.quantity * h.currentPrice;
                  const invested = h.quantity * h.averagePurchasePrice;
                  const pv = currentVal - invested;
                  const pvPct = invested > 0 ? (pv / invested) * 100 : 0;

                  return (
                    <tr key={i} className="border-b border-border/50 hover:bg-bg-secondary transition-colors">
                      <td className="py-3 px-2 font-mono text-accent-blue">{h.ticker}</td>
                      <td className="py-3 px-2">{h.name}</td>
                      <td className="py-3 px-2 text-right font-numeric">{h.quantity}</td>
                      <td className="py-3 px-2 text-right font-numeric">{formatCurrency(h.averagePurchasePrice)}</td>
                      <td className="py-3 px-2 text-right font-numeric">{formatCurrency(h.currentPrice)}</td>
                      <td className="py-3 px-2 text-right font-numeric">{formatCurrency(currentVal)}</td>
                      <td className={`py-3 px-2 text-right font-numeric ${pv >= 0 ? "text-accent-green" : "text-accent-red"}`}>
                        {formatCurrency(pv)} ({formatPercent(pvPct)})
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
