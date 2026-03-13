"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { calculateProjection, calculateRequiredMonthlyInvestment } from "@/lib/calculations";
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
} from "recharts";

export default function SimulatorPage() {
  const { status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentValue, setCurrentValue] = useState(0);
  const [monthlyContrib, setMonthlyContrib] = useState(300);
  const [annualReturn, setAnnualReturn] = useState(8);
  const [years, setYears] = useState(20);

  // Reverse calculator
  const [targetAmount, setTargetAmount] = useState(100000);
  const [targetYears, setTargetYears] = useState(15);
  const [targetReturn, setTargetReturn] = useState(8);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    async function fetchValue() {
      try {
        const res = await fetch("/api/portfolios");
        const portfolios = await res.json();
        const tickers = [...new Set(portfolios.flatMap((p: any) => p.holdings.map((h: any) => h.ticker)))];
        const prices: Record<string, number> = {};
        await Promise.allSettled(
          tickers.map(async (t: string) => {
            const r = await fetch(`/api/stock?ticker=${t}`);
            const q = await r.json();
            prices[t] = q.price;
          })
        );
        const total = portfolios.reduce((sum: number, p: any) =>
          sum + p.holdings.reduce((s: number, h: any) => s + h.quantity * (prices[h.ticker] || h.averagePurchasePrice), 0), 0
        );
        setCurrentValue(Math.round(total));
      } catch {}
      setLoading(false);
    }
    fetchValue();
  }, [status]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Projections for 3 scenarios
  const pessimistic = calculateProjection(currentValue, monthlyContrib, 5, years);
  const realistic = calculateProjection(currentValue, monthlyContrib, annualReturn, years);
  const optimistic = calculateProjection(currentValue, monthlyContrib, 12, years);

  const chartData = realistic.map((r, i) => ({
    year: `${new Date().getFullYear() + r.year}`,
    "Pessimiste (5%)": pessimistic[i]?.total || 0,
    "Réaliste": r.total,
    "Optimiste (12%)": optimistic[i]?.total || 0,
    "Capital investi": r.invested,
  }));

  const requiredMonthly = calculateRequiredMonthlyInvestment(
    targetAmount,
    currentValue,
    targetReturn,
    targetYears
  );

  // Find milestone years
  const find100k = realistic.find((r) => r.total >= 100000);
  const find500k = realistic.find((r) => r.total >= 500000);
  const find1M = realistic.find((r) => r.total >= 1000000);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-bg-card border border-border rounded-lg p-4 shadow-xl">
          <p className="text-text-primary font-medium mb-2">{label}</p>
          {payload.map((entry: any, i: number) => (
            <p key={i} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: <span className="font-numeric">{formatCurrency(entry.value)}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-sora text-2xl font-bold">Simulateur de projection</h1>
        <p className="text-text-muted mt-1">Visualisez la croissance de votre patrimoine</p>
      </div>

      {/* Parameters */}
      <Card>
        <CardHeader>
          <CardTitle>Paramètres de simulation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <Label>Patrimoine actuel</Label>
              <Input
                type="number"
                value={currentValue}
                onChange={(e) => setCurrentValue(Number(e.target.value))}
                className="mt-1 font-numeric"
              />
            </div>
            <div>
              <Label>Apport mensuel (€)</Label>
              <Input
                type="number"
                value={monthlyContrib}
                onChange={(e) => setMonthlyContrib(Number(e.target.value))}
                className="mt-1 font-numeric"
              />
            </div>
            <div>
              <Label>Rendement annuel : {annualReturn}%</Label>
              <Slider min={0} max={20} step={0.5} value={annualReturn} onChange={setAnnualReturn} className="mt-3" />
            </div>
            <div>
              <Label>Durée : {years} ans</Label>
              <Slider min={1} max={40} value={years} onChange={setYears} className="mt-3" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Projection Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Projection multi-scénarios</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
              <XAxis dataKey="year" tick={{ fill: "#94A3B8", fontSize: 12 }} />
              <YAxis tick={{ fill: "#94A3B8", fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k€`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ color: "#94A3B8" }} />
              <Area type="monotone" dataKey="Capital investi" stroke="#94A3B8" fill="#94A3B8" fillOpacity={0.1} strokeDasharray="5 5" />
              <Area type="monotone" dataKey="Pessimiste (5%)" stroke="#FF4757" fill="#FF4757" fillOpacity={0.05} />
              <Area type="monotone" dataKey="Réaliste" stroke="#00C896" fill="#00C896" fillOpacity={0.1} />
              <Area type="monotone" dataKey="Optimiste (12%)" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.05} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Milestones */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "100 000 €", data: find100k },
          { label: "500 000 €", data: find500k },
          { label: "1 000 000 €", data: find1M },
        ].map((milestone) => (
          <Card key={milestone.label}>
            <CardContent className="pt-6 text-center">
              <p className="text-text-muted text-sm">Objectif {milestone.label}</p>
              {milestone.data ? (
                <>
                  <p className="text-2xl font-sora font-bold text-accent-green mt-2">
                    {new Date().getFullYear() + milestone.data.year}
                  </p>
                  <p className="text-xs text-text-muted mt-1">dans {milestone.data.year} ans</p>
                </>
              ) : (
                <p className="text-lg text-text-muted mt-2">Au-delà de {years} ans</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Reverse Calculator */}
      <Card>
        <CardHeader>
          <CardTitle>Calculateur d&apos;objectif inverse</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-text-muted text-sm mb-4">
            Combien investir par mois pour atteindre votre objectif ?
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <Label>Objectif (€)</Label>
              <Input
                type="number"
                value={targetAmount}
                onChange={(e) => setTargetAmount(Number(e.target.value))}
                className="mt-1 font-numeric"
              />
            </div>
            <div>
              <Label>Dans combien d&apos;années : {targetYears} ans</Label>
              <Slider min={1} max={40} value={targetYears} onChange={setTargetYears} className="mt-3" />
            </div>
            <div>
              <Label>Rendement estimé : {targetReturn}%</Label>
              <Slider min={0} max={20} step={0.5} value={targetReturn} onChange={setTargetReturn} className="mt-3" />
            </div>
          </div>
          <div className="bg-bg-secondary rounded-xl p-6 text-center">
            <p className="text-text-muted text-sm">Investissement mensuel requis</p>
            <p className="text-4xl font-sora font-bold text-accent-green mt-2 font-numeric">
              {formatCurrency(requiredMonthly)}
            </p>
            <p className="text-text-muted text-xs mt-2">
              /mois pendant {targetYears} ans à {targetReturn}% pour atteindre {formatCurrency(targetAmount)}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
