"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs } from "@/components/ui/tabs";

interface EarningsEvent {
  id: string;
  ticker: string;
  companyName: string | null;
  reportDate: string;
  estimatedEPS: number | null;
  actualEPS: number | null;
  reportType: string;
  inPortfolio: boolean;
}

export default function EarningsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [earnings, setEarnings] = useState<EarningsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("upcoming");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    async function fetchData() {
      const res = await fetch("/api/earnings");
      setEarnings(await res.json());
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

  const now = new Date();
  const upcoming = earnings.filter((e) => new Date(e.reportDate) >= now).sort((a, b) => new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime());
  const past = earnings.filter((e) => new Date(e.reportDate) < now).sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime());

  // Group by week/month for calendar view
  const groupByWeek = (events: EarningsEvent[]) => {
    const groups: Record<string, EarningsEvent[]> = {};
    events.forEach((e) => {
      const d = new Date(e.reportDate);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay() + 1);
      const key = weekStart.toISOString().split("T")[0];
      if (!groups[key]) groups[key] = [];
      groups[key].push(e);
    });
    return groups;
  };

  const weekGroups = groupByWeek(upcoming);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-sora text-2xl font-bold">Calendrier des résultats</h1>
        <p className="text-text-muted mt-1">Publications de résultats des entreprises</p>
      </div>

      <Tabs
        tabs={[
          { value: "upcoming", label: "À venir" },
          { value: "past", label: "Historique" },
        ]}
        value={view}
        onChange={setView}
      />

      {view === "upcoming" && (
        <div className="space-y-4">
          {Object.entries(weekGroups).length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-text-muted">Aucun résultat à venir</p>
              </CardContent>
            </Card>
          ) : (
            Object.entries(weekGroups).map(([weekStart, events]) => {
              const startDate = new Date(weekStart);
              const endDate = new Date(startDate);
              endDate.setDate(startDate.getDate() + 6);

              return (
                <Card key={weekStart}>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Semaine du {startDate.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} au{" "}
                      {endDate.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {events.map((e) => (
                        <div
                          key={e.id}
                          className={`flex items-center justify-between rounded-lg p-3 ${
                            e.inPortfolio ? "bg-accent-blue/10 border border-accent-blue/20" : "bg-bg-secondary"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-bg-card border border-border flex items-center justify-center font-mono text-xs font-bold text-accent-blue">
                              {e.ticker.substring(0, 3)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm">{e.companyName || e.ticker}</p>
                                {e.inPortfolio && (
                                  <Badge variant="success">Dans ton portif</Badge>
                                )}
                              </div>
                              <p className="text-xs text-text-muted">
                                {new Date(e.reportDate).toLocaleDateString("fr-FR", {
                                  weekday: "long",
                                  day: "numeric",
                                  month: "long",
                                })}
                                {" — "}
                                <span className="font-mono">{e.ticker}</span>
                                {" — "}
                                {e.reportType === "QUARTERLY" ? "Trimestriel" : "Annuel"}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            {e.estimatedEPS !== null && (
                              <p className="text-sm">
                                <span className="text-text-muted">EPS est. </span>
                                <span className="font-numeric">${e.estimatedEPS?.toFixed(2)}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {view === "past" && (
        <Card>
          <CardHeader>
            <CardTitle>Résultats passés</CardTitle>
          </CardHeader>
          <CardContent>
            {past.length === 0 ? (
              <p className="text-text-muted text-center py-8">Aucun résultat passé</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-text-muted">
                      <th className="text-left py-3 px-2">Date</th>
                      <th className="text-left py-3 px-2">Entreprise</th>
                      <th className="text-left py-3 px-2">Ticker</th>
                      <th className="text-right py-3 px-2">EPS estimé</th>
                      <th className="text-right py-3 px-2">EPS réel</th>
                      <th className="text-right py-3 px-2">Surprise</th>
                    </tr>
                  </thead>
                  <tbody>
                    {past.map((e) => {
                      const surprise = e.actualEPS !== null && e.estimatedEPS !== null
                        ? ((e.actualEPS - e.estimatedEPS) / Math.abs(e.estimatedEPS)) * 100
                        : null;

                      return (
                        <tr key={e.id} className="border-b border-border/50 hover:bg-bg-secondary transition-colors">
                          <td className="py-3 px-2">{new Date(e.reportDate).toLocaleDateString("fr-FR")}</td>
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-2">
                              {e.companyName || e.ticker}
                              {e.inPortfolio && <Badge variant="success">Portif</Badge>}
                            </div>
                          </td>
                          <td className="py-3 px-2 font-mono text-accent-blue">{e.ticker}</td>
                          <td className="py-3 px-2 text-right font-numeric">
                            {e.estimatedEPS !== null ? `$${e.estimatedEPS.toFixed(2)}` : "-"}
                          </td>
                          <td className="py-3 px-2 text-right font-numeric">
                            {e.actualEPS !== null ? `$${e.actualEPS.toFixed(2)}` : "-"}
                          </td>
                          <td className={`py-3 px-2 text-right font-numeric ${
                            surprise !== null ? (surprise >= 0 ? "text-accent-green" : "text-accent-red") : ""
                          }`}>
                            {surprise !== null ? `${surprise >= 0 ? "+" : ""}${surprise.toFixed(1)}%` : "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
