"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs } from "@/components/ui/tabs";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { calculateYieldOnCost, calculateDividendProjection } from "@/lib/calculations";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ReferenceLine,
} from "recharts";

interface DividendEvent {
  id: string;
  ticker: string;
  exDate: string;
  paymentDate: string;
  amountPerShare: number;
  frequency: string;
  holdingId: string | null;
}

interface DividendTransaction {
  id: string;
  ticker: string;
  quantity: number;
  price: number;
  date: string;
  notes: string | null;
}

interface Holding {
  id: string;
  ticker: string;
  name: string;
  quantity: number;
  averagePurchasePrice: number;
}

export default function DividendsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [events, setEvents] = useState<DividendEvent[]>([]);
  const [transactions, setTransactions] = useState<DividendTransaction[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("calendar");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [monthlyGoal, setMonthlyGoal] = useState(100);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    async function fetchData() {
      const res = await fetch("/api/dividends");
      const data = await res.json();
      setEvents(data.events || []);
      setTransactions(data.transactions || []);
      setHoldings(data.holdings || []);
      setLoading(false);
    }
    fetchData();
  }, [status]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Calendar data
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(selectedYear, selectedMonth, 1).getDay();
  const adjustedFirstDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Monday start

  const monthEvents = events.filter((e) => {
    const d = new Date(e.paymentDate);
    return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
  });

  const dayEvents: Record<number, DividendEvent[]> = {};
  monthEvents.forEach((e) => {
    const day = new Date(e.paymentDate).getDate();
    if (!dayEvents[day]) dayEvents[day] = [];
    dayEvents[day].push(e);
  });

  // Monthly bar chart data
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const monthTx = transactions.filter((tx) => {
      const d = new Date(tx.date);
      return d.getMonth() === i && d.getFullYear() === selectedYear;
    });
    const monthEv = events.filter((e) => {
      const d = new Date(e.paymentDate);
      return d.getMonth() === i && d.getFullYear() === selectedYear;
    });
    const txTotal = monthTx.reduce((s, tx) => s + tx.quantity * tx.price, 0);
    const evTotal = monthEv.reduce((s, e) => {
      const holding = holdings.find((h) => h.id === e.holdingId || h.ticker === e.ticker);
      return s + e.amountPerShare * (holding?.quantity || 0);
    }, 0);
    return {
      month: ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"][i],
      received: txTotal,
      projected: evTotal,
    };
  });

  // Upcoming dividends
  const now = new Date();
  const upcoming = events
    .filter((e) => new Date(e.exDate) >= now)
    .sort((a, b) => new Date(a.exDate).getTime() - new Date(b.exDate).getTime())
    .slice(0, 10);

  // Yield on Cost
  const yocData = holdings
    .map((h) => {
      const divEvents = events.filter((e) => e.ticker === h.ticker);
      const annualDiv = divEvents.reduce((s, e) => {
        const freq = e.frequency === "QUARTERLY" ? 4 : e.frequency === "MONTHLY" ? 12 : e.frequency === "SEMI_ANNUAL" ? 2 : 1;
        return s + e.amountPerShare * freq;
      }, 0) / Math.max(divEvents.length, 1);
      const yoc = calculateYieldOnCost(annualDiv, h.averagePurchasePrice);
      return { ...h, annualDiv, yoc };
    })
    .filter((h) => h.yoc > 0)
    .sort((a, b) => b.yoc - a.yoc);

  // Projection
  const totalAnnualDiv = yocData.reduce((s, h) => s + h.annualDiv * h.quantity, 0);
  const avgYield = holdings.length > 0
    ? yocData.reduce((s, h) => s + h.yoc, 0) / Math.max(yocData.length, 1)
    : 3;
  const projection = calculateDividendProjection(totalAnnualDiv, 5, 10, true, avgYield);

  const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
  const dayNames = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-bg-card border border-border rounded-lg p-3 shadow-xl">
          <p className="text-text-primary font-medium mb-1">{label}</p>
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
        <h1 className="font-sora text-2xl font-bold">Dividendes</h1>
        <p className="text-text-muted mt-1">Calendrier et suivi de vos revenus passifs</p>
      </div>

      <Tabs
        tabs={[
          { value: "calendar", label: "Calendrier" },
          { value: "monthly", label: "Mensuel" },
          { value: "projection", label: "Projection" },
          { value: "yoc", label: "Yield on Cost" },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "calendar" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{monthNames[selectedMonth]} {selectedYear}</CardTitle>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(selectedYear - 1); }
                    else setSelectedMonth(selectedMonth - 1);
                  }}
                  className="px-3 py-1 rounded bg-bg-secondary text-text-muted hover:text-text-primary transition-colors"
                >
                  ←
                </button>
                <button
                  onClick={() => {
                    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(selectedYear + 1); }
                    else setSelectedMonth(selectedMonth + 1);
                  }}
                  className="px-3 py-1 rounded bg-bg-secondary text-text-muted hover:text-text-primary transition-colors"
                >
                  →
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1">
              {dayNames.map((d) => (
                <div key={d} className="text-center text-xs text-text-muted py-2 font-medium">
                  {d}
                </div>
              ))}
              {Array.from({ length: adjustedFirstDay }, (_, i) => (
                <div key={`empty-${i}`} className="h-20" />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const evts = dayEvents[day] || [];
                return (
                  <div
                    key={day}
                    className={`h-20 rounded-lg border p-1 text-xs ${
                      evts.length > 0
                        ? "border-accent-green/30 bg-accent-green/5"
                        : "border-border/50"
                    }`}
                  >
                    <span className="text-text-muted">{day}</span>
                    {evts.map((e, j) => {
                      const holding = holdings.find((h) => h.ticker === e.ticker);
                      const total = e.amountPerShare * (holding?.quantity || 0);
                      return (
                        <div key={j} className="mt-0.5 text-accent-green truncate" title={`${e.ticker}: ${formatCurrency(total)}`}>
                          {e.ticker}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "monthly" && (
        <Card>
          <CardHeader>
            <CardTitle>Dividendes mensuels — {selectedYear}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="month" tick={{ fill: "#94A3B8", fontSize: 12 }} />
                <YAxis tick={{ fill: "#94A3B8", fontSize: 12 }} tickFormatter={(v) => `${v}€`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ color: "#94A3B8" }} />
                <ReferenceLine y={monthlyGoal} stroke="#FF4757" strokeDasharray="5 5" label={{ value: `Objectif: ${monthlyGoal}€`, fill: "#FF4757", fontSize: 12 }} />
                <Bar dataKey="received" name="Reçu" fill="#00C896" radius={[4, 4, 0, 0]} />
                <Bar dataKey="projected" name="Projeté" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {tab === "projection" && (
        <Card>
          <CardHeader>
            <CardTitle>Projection des dividendes sur 10 ans</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={projection}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="year" tick={{ fill: "#94A3B8", fontSize: 12 }} tickFormatter={(v) => `${new Date().getFullYear() + v}`} />
                <YAxis tick={{ fill: "#94A3B8", fontSize: 12 }} tickFormatter={(v) => `${v}€`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ color: "#94A3B8" }} />
                <Line type="monotone" dataKey="withDrip" name="Avec réinvestissement (DRIP)" stroke="#00C896" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="withoutDrip" name="Sans réinvestissement" stroke="#94A3B8" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {tab === "yoc" && (
        <Card>
          <CardHeader>
            <CardTitle>Yield on Cost (Rendement sur prix de revient)</CardTitle>
          </CardHeader>
          <CardContent>
            {yocData.length === 0 ? (
              <p className="text-text-muted text-center py-8">Aucun dividende détecté dans votre portefeuille.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-text-muted">
                      <th className="text-left py-3 px-2">Ticker</th>
                      <th className="text-left py-3 px-2">Nom</th>
                      <th className="text-right py-3 px-2">PRU</th>
                      <th className="text-right py-3 px-2">Div/action/an</th>
                      <th className="text-right py-3 px-2">YoC</th>
                      <th className="text-right py-3 px-2">Revenu annuel</th>
                    </tr>
                  </thead>
                  <tbody>
                    {yocData.map((h) => (
                      <tr key={h.id} className="border-b border-border/50 hover:bg-bg-secondary transition-colors">
                        <td className="py-3 px-2 font-mono text-accent-blue">{h.ticker}</td>
                        <td className="py-3 px-2">{h.name}</td>
                        <td className="py-3 px-2 text-right font-numeric">{formatCurrency(h.averagePurchasePrice)}</td>
                        <td className="py-3 px-2 text-right font-numeric">{formatCurrency(h.annualDiv)}</td>
                        <td className="py-3 px-2 text-right font-numeric text-accent-green">{h.yoc.toFixed(2)}%</td>
                        <td className="py-3 px-2 text-right font-numeric">{formatCurrency(h.annualDiv * h.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Upcoming Dividends */}
      <Card>
        <CardHeader>
          <CardTitle>Prochains dividendes</CardTitle>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <p className="text-text-muted text-center py-6">Aucun dividende à venir</p>
          ) : (
            <div className="space-y-2">
              {upcoming.map((e) => {
                const holding = holdings.find((h) => h.ticker === e.ticker);
                const totalAmount = e.amountPerShare * (holding?.quantity || 0);
                return (
                  <div key={e.id} className="flex items-center justify-between bg-bg-secondary rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-accent-blue text-sm">{e.ticker}</span>
                      <div>
                        <p className="text-xs text-text-muted">Ex-div: {new Date(e.exDate).toLocaleDateString("fr-FR")}</p>
                        <p className="text-xs text-text-muted">Paiement: {new Date(e.paymentDate).toLocaleDateString("fr-FR")}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-numeric text-sm">{formatCurrency(e.amountPerShare)}/action</p>
                      <p className="font-numeric text-sm text-accent-green">{formatCurrency(totalAmount)} total</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
