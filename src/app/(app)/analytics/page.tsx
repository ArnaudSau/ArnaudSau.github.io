"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DiversificationScore } from "@/components/ui/diversification-score";
import { formatCurrency } from "@/lib/utils";
import {
  calculateGeoDiversificationScore,
  calculateSectorDiversificationScore,
  calculateGlobalDiversificationScore,
  type HoldingWithPrice,
} from "@/lib/calculations";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const GEO_COLORS = ["#3B82F6", "#00C896", "#FF4757", "#EAB308", "#8B5CF6", "#EC4899"];
const SECTOR_COLORS = ["#3B82F6", "#00C896", "#FF4757", "#EAB308", "#8B5CF6", "#EC4899", "#F97316", "#06B6D4", "#84CC16", "#6366F1"];

interface PortfolioData {
  id: string;
  name: string;
  type: "PEA" | "CTO";
  holdings: {
    ticker: string;
    name: string;
    quantity: number;
    averagePurchasePrice: number;
    sector: string | null;
    geographicZone: string | null;
  }[];
}

export default function AnalyticsPage() {
  const { status } = useSession();
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
      const res = await fetch("/api/portfolios");
      const data = await res.json();
      setPortfolios(data);
      const tickers = [...new Set(data.flatMap((p: PortfolioData) => p.holdings.map((h) => h.ticker)))];
      const priceMap: Record<string, number> = {};
      await Promise.allSettled(
        tickers.map(async (t: string) => {
          const r = await fetch(`/api/stock?ticker=${t}`);
          const q = await r.json();
          priceMap[t] = q.price;
        })
      );
      setPrices(priceMap);
      setLoading(false);
    }
    fetchData();
  }, [status]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-64" />)}
        </div>
      </div>
    );
  }

  const allHoldings: HoldingWithPrice[] = portfolios.flatMap((p) =>
    p.holdings.map((h) => ({
      ...h,
      currentPrice: prices[h.ticker] || h.averagePurchasePrice,
    }))
  );

  const geoResult = calculateGeoDiversificationScore(allHoldings);
  const sectorResult = calculateSectorDiversificationScore(allHoldings);
  const globalScore = calculateGlobalDiversificationScore(geoResult.score, sectorResult.score);

  const geoData = Object.entries(geoResult.distribution).map(([name, value]) => ({
    name,
    value: Math.round(value * 10000) / 100,
  }));

  const sectorData = Object.entries(sectorResult.distribution).map(([name, value]) => ({
    name,
    value: Math.round(value * 10000) / 100,
  }));

  // PEA vs CTO data
  const peaValue = portfolios
    .filter((p) => p.type === "PEA")
    .flatMap((p) => p.holdings)
    .reduce((s, h) => s + h.quantity * (prices[h.ticker] || h.averagePurchasePrice), 0);
  const ctoValue = portfolios
    .filter((p) => p.type === "CTO")
    .flatMap((p) => p.holdings)
    .reduce((s, h) => s + h.quantity * (prices[h.ticker] || h.averagePurchasePrice), 0);

  const accountData = [
    { name: "PEA", value: peaValue },
    { name: "CTO", value: ctoValue },
  ];

  // Generate recommendation
  const getRecommendation = () => {
    const recs: string[] = [];
    const maxGeoZone = Object.entries(geoResult.distribution).sort((a, b) => b[1] - a[1])[0];
    if (maxGeoZone && maxGeoZone[1] > 0.5) {
      recs.push(`Ton portefeuille est concentré sur ${maxGeoZone[0]} (${(maxGeoZone[1] * 100).toFixed(0)}%). Envisage de diversifier.`);
    }
    if (!geoResult.distribution["Émergents"]) {
      recs.push("Ajoute une exposition aux marchés émergents (ex: PAEEM.PA).");
    }
    const maxSector = Object.entries(sectorResult.distribution).sort((a, b) => b[1] - a[1])[0];
    if (maxSector && maxSector[1] > 0.4) {
      recs.push(`Le secteur ${maxSector[0]} représente ${(maxSector[1] * 100).toFixed(0)}% du portefeuille.`);
    }
    if (recs.length === 0) recs.push("Bonne diversification ! Continue à rééquilibrer régulièrement.");
    return recs;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-bg-card border border-border rounded-lg p-3 shadow-xl">
          <p className="text-text-primary font-medium">{payload[0].name}</p>
          <p className="font-numeric text-accent-blue">{payload[0].value}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-sora text-2xl font-bold">Analyse de diversification</h1>
        <p className="text-text-muted mt-1">Évaluez la répartition de votre portefeuille</p>
      </div>

      {/* Score Global */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="flex items-center justify-center py-8">
          <DiversificationScore score={globalScore} label="Score Global" />
        </Card>
        <Card className="flex items-center justify-center py-8">
          <DiversificationScore score={geoResult.score} label="Géographique" size="sm" />
        </Card>
        <Card className="flex items-center justify-center py-8">
          <DiversificationScore score={sectorResult.score} label="Sectoriel" size="sm" />
        </Card>
      </div>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Recommandations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {getRecommendation().map((rec, i) => (
              <div key={i} className="flex items-start gap-3 bg-bg-secondary rounded-lg p-3">
                <span className="text-accent-blue mt-0.5">&#9432;</span>
                <p className="text-sm text-text-primary">{rec}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Répartition géographique</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={geoData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, value }) => `${name} ${value}%`}>
                  {geoData.map((_, i) => (
                    <Cell key={i} fill={GEO_COLORS[i % GEO_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Répartition sectorielle</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={sectorData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} label={({ name, value }) => `${name} ${value}%`}>
                  {sectorData.map((_, i) => (
                    <Cell key={i} fill={SECTOR_COLORS[i % SECTOR_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* PEA vs CTO */}
      <Card>
        <CardHeader>
          <CardTitle>Répartition PEA vs CTO</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={accountData} layout="vertical">
              <XAxis type="number" tick={{ fill: "#94A3B8", fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k€`} />
              <YAxis type="category" dataKey="name" tick={{ fill: "#F1F5F9", fontSize: 14 }} width={60} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ background: "#1A2235", border: "1px solid #1E293B", borderRadius: "8px" }} />
              <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                {accountData.map((entry, i) => (
                  <Cell key={i} fill={i === 0 ? "#00C896" : "#3B82F6"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
