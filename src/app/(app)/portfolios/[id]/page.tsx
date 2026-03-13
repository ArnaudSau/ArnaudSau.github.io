"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { parseCSV } from "@/lib/parsers";

interface Holding {
  id: string;
  ticker: string;
  name: string;
  isin: string | null;
  quantity: number;
  averagePurchasePrice: number;
  sector: string | null;
  geographicZone: string | null;
}

interface Transaction {
  id: string;
  type: string;
  ticker: string;
  quantity: number;
  price: number;
  fees: number;
  date: string;
  notes: string | null;
}

interface PortfolioDetail {
  id: string;
  name: string;
  type: "PEA" | "CTO";
  broker: string;
  openDate: string;
  holdings: Holding[];
  transactions: Transaction[];
}

export default function PortfolioDetailPage() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const [portfolio, setPortfolio] = useState<PortfolioDetail | null>(null);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showAddHolding, setShowAddHolding] = useState(false);
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [holdingForm, setHoldingForm] = useState({ ticker: "", name: "", isin: "", quantity: "", averagePurchasePrice: "", sector: "", geographicZone: "" });

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetchData();
  }, [status]);

  async function fetchData() {
    const res = await fetch(`/api/portfolios/${params.id}`);
    if (!res.ok) { router.push("/portfolios"); return; }
    const data = await res.json();
    setPortfolio(data);

    const tickers = [...new Set(data.holdings.map((h: Holding) => h.ticker))];
    const priceMap: Record<string, number> = {};
    await Promise.allSettled(
      tickers.map(async (ticker: string) => {
        const r = await fetch(`/api/stock?ticker=${ticker}`);
        const q = await r.json();
        priceMap[ticker] = q.price;
      })
    );
    setPrices(priceMap);
    setLoading(false);
  }

  async function handleAddHolding(e: React.FormEvent) {
    e.preventDefault();
    await fetch(`/api/portfolios/${params.id}/holdings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...holdingForm,
        quantity: parseFloat(holdingForm.quantity),
        averagePurchasePrice: parseFloat(holdingForm.averagePurchasePrice),
      }),
    });
    setShowAddHolding(false);
    setHoldingForm({ ticker: "", name: "", isin: "", quantity: "", averagePurchasePrice: "", sector: "", geographicZone: "" });
    fetchData();
  }

  async function handleCSVImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const { holdings, errors } = parseCSV(text);
    if (errors.length > 0) { alert(errors.join("\n")); return; }

    for (const h of holdings) {
      await fetch(`/api/portfolios/${params.id}/holdings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(h),
      });
    }
    setShowCSVImport(false);
    fetchData();
  }

  async function handleDeleteHolding(id: string) {
    if (!confirm("Supprimer cette ligne ?")) return;
    await fetch(`/api/holdings/${id}`, { method: "DELETE" });
    fetchData();
  }

  if (loading || !portfolio) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => router.push("/portfolios")}>← Retour</Button>
          <Badge variant={portfolio.type === "PEA" ? "success" : "default"}>{portfolio.type}</Badge>
          <h1 className="font-sora text-2xl font-bold">{portfolio.name}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowCSVImport(true)}>Import CSV</Button>
          <Button onClick={() => setShowAddHolding(true)}>+ Ajouter une ligne</Button>
        </div>
      </div>

      {/* Holdings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Positions ({portfolio.holdings.length})</CardTitle>
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
                  <th className="text-right py-3 px-2">% Portif</th>
                  <th className="text-right py-3 px-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.holdings.map((h) => {
                  const price = prices[h.ticker] || h.averagePurchasePrice;
                  const value = h.quantity * price;
                  const invested = h.quantity * h.averagePurchasePrice;
                  const pv = value - invested;
                  const pvPct = invested > 0 ? (pv / invested) * 100 : 0;
                  const totalPortfValue = portfolio.holdings.reduce(
                    (s, x) => s + x.quantity * (prices[x.ticker] || x.averagePurchasePrice), 0
                  );
                  const weight = totalPortfValue > 0 ? (value / totalPortfValue) * 100 : 0;

                  return (
                    <tr key={h.id} className="border-b border-border/50 hover:bg-bg-secondary transition-colors">
                      <td className="py-3 px-2 font-mono text-accent-blue">{h.ticker}</td>
                      <td className="py-3 px-2 max-w-[200px] truncate">{h.name}</td>
                      <td className="py-3 px-2 text-right font-numeric">{h.quantity}</td>
                      <td className="py-3 px-2 text-right font-numeric">{formatCurrency(h.averagePurchasePrice)}</td>
                      <td className="py-3 px-2 text-right font-numeric">{formatCurrency(price)}</td>
                      <td className="py-3 px-2 text-right font-numeric">{formatCurrency(value)}</td>
                      <td className={`py-3 px-2 text-right font-numeric ${pv >= 0 ? "text-accent-green" : "text-accent-red"}`}>
                        {formatCurrency(pv)} ({formatPercent(pvPct)})
                      </td>
                      <td className="py-3 px-2 text-right font-numeric">{weight.toFixed(1)}%</td>
                      <td className="py-3 px-2 text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteHolding(h.id)} className="text-text-muted hover:text-accent-red">
                          Supprimer
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Transactions récentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-text-muted">
                  <th className="text-left py-3 px-2">Date</th>
                  <th className="text-left py-3 px-2">Type</th>
                  <th className="text-left py-3 px-2">Ticker</th>
                  <th className="text-right py-3 px-2">Qté</th>
                  <th className="text-right py-3 px-2">Prix</th>
                  <th className="text-right py-3 px-2">Frais</th>
                  <th className="text-left py-3 px-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.transactions.slice(0, 20).map((tx) => (
                  <tr key={tx.id} className="border-b border-border/50 hover:bg-bg-secondary transition-colors">
                    <td className="py-3 px-2">{new Date(tx.date).toLocaleDateString("fr-FR")}</td>
                    <td className="py-3 px-2">
                      <Badge variant={tx.type === "BUY" ? "success" : tx.type === "SELL" ? "danger" : "warning"}>
                        {tx.type === "BUY" ? "Achat" : tx.type === "SELL" ? "Vente" : "Dividende"}
                      </Badge>
                    </td>
                    <td className="py-3 px-2 font-mono text-accent-blue">{tx.ticker}</td>
                    <td className="py-3 px-2 text-right font-numeric">{tx.quantity}</td>
                    <td className="py-3 px-2 text-right font-numeric">{formatCurrency(tx.price)}</td>
                    <td className="py-3 px-2 text-right font-numeric">{formatCurrency(tx.fees)}</td>
                    <td className="py-3 px-2 text-text-muted text-xs max-w-[150px] truncate">{tx.notes || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add Holding Dialog */}
      <Dialog open={showAddHolding} onOpenChange={setShowAddHolding}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une ligne</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddHolding} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Ticker</Label>
                <Input value={holdingForm.ticker} onChange={(e) => setHoldingForm({ ...holdingForm, ticker: e.target.value })} placeholder="CW8.PA" required className="mt-1" />
              </div>
              <div>
                <Label>Nom</Label>
                <Input value={holdingForm.name} onChange={(e) => setHoldingForm({ ...holdingForm, name: e.target.value })} placeholder="Amundi MSCI World" required className="mt-1" />
              </div>
            </div>
            <div>
              <Label>ISIN</Label>
              <Input value={holdingForm.isin} onChange={(e) => setHoldingForm({ ...holdingForm, isin: e.target.value })} placeholder="LU1681043599" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Quantité</Label>
                <Input type="number" step="any" value={holdingForm.quantity} onChange={(e) => setHoldingForm({ ...holdingForm, quantity: e.target.value })} required className="mt-1" />
              </div>
              <div>
                <Label>PRU (€)</Label>
                <Input type="number" step="any" value={holdingForm.averagePurchasePrice} onChange={(e) => setHoldingForm({ ...holdingForm, averagePurchasePrice: e.target.value })} required className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Secteur</Label>
                <Input value={holdingForm.sector} onChange={(e) => setHoldingForm({ ...holdingForm, sector: e.target.value })} placeholder="Tech" className="mt-1" />
              </div>
              <div>
                <Label>Zone géographique</Label>
                <Input value={holdingForm.geographicZone} onChange={(e) => setHoldingForm({ ...holdingForm, geographicZone: e.target.value })} placeholder="USA" className="mt-1" />
              </div>
            </div>
            <Button type="submit" className="w-full">Ajouter</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* CSV Import Dialog */}
      <Dialog open={showCSVImport} onOpenChange={setShowCSVImport}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import CSV</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-text-muted">
              Formats supportés : Fortuneo, Boursobank. Le fichier doit contenir les colonnes Libellé, Quantité, et PRU.
            </p>
            <div className="bg-bg-secondary rounded-lg p-4 text-sm text-text-muted space-y-2">
              <p className="font-medium text-text-primary">Comment exporter depuis votre courtier :</p>
              <p><strong>Fortuneo :</strong> Mes Comptes → Portefeuille → Exporter (icône CSV)</p>
              <p><strong>Boursobank :</strong> Bourse → Mon portefeuille → Télécharger</p>
            </div>
            <Input type="file" accept=".csv" onChange={handleCSVImport} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
