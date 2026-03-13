"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";

interface Portfolio {
  id: string;
  name: string;
  type: "PEA" | "CTO";
  broker: string;
  openDate: string;
  holdings: { id: string; ticker: string; name: string; quantity: number; averagePurchasePrice: number }[];
}

export default function PortfoliosPage() {
  const { status } = useSession();
  const router = useRouter();
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", type: "PEA", broker: "MANUAL", openDate: "" });

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetchPortfolios();
  }, [status]);

  async function fetchPortfolios() {
    const res = await fetch("/api/portfolios");
    setPortfolios(await res.json());
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/portfolios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setShowCreate(false);
    setForm({ name: "", type: "PEA", broker: "MANUAL", openDate: "" });
    fetchPortfolios();
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce portefeuille ?")) return;
    await fetch(`/api/portfolios/${id}`, { method: "DELETE" });
    fetchPortfolios();
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="bg-bg-card border border-border rounded-xl p-6">
              <Skeleton className="h-6 w-32 mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-sora text-2xl font-bold">Portefeuilles</h1>
          <p className="text-text-muted mt-1">Gérez vos comptes PEA et CTO</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>+ Nouveau portefeuille</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {portfolios.map((p) => {
          const totalInvested = p.holdings.reduce((s, h) => s + h.quantity * h.averagePurchasePrice, 0);
          return (
            <Card key={p.id} className="card-hover cursor-pointer" onClick={() => router.push(`/portfolios/${p.id}`)}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={p.type === "PEA" ? "success" : "default"}>{p.type}</Badge>
                    <CardTitle>{p.name}</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                    className="text-text-muted hover:text-accent-red"
                  >
                    Supprimer
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-text-muted">Courtier</p>
                    <p className="font-medium">{p.broker}</p>
                  </div>
                  <div>
                    <p className="text-text-muted">Lignes</p>
                    <p className="font-medium">{p.holdings.length}</p>
                  </div>
                  <div>
                    <p className="text-text-muted">Capital investi</p>
                    <p className="font-numeric font-medium">{formatCurrency(totalInvested)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {portfolios.length === 0 && (
        <div className="text-center py-12">
          <p className="text-text-muted text-lg mb-4">Aucun portefeuille</p>
          <Button onClick={() => setShowCreate(true)}>Créer votre premier portefeuille</Button>
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau portefeuille</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label>Nom</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Mon PEA" className="mt-1" required />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} options={[{ value: "PEA", label: "PEA" }, { value: "CTO", label: "CTO" }]} className="mt-1" />
            </div>
            <div>
              <Label>Courtier</Label>
              <Select value={form.broker} onChange={(e) => setForm({ ...form, broker: e.target.value })} options={[{ value: "FORTUNEO", label: "Fortuneo" }, { value: "BOURSOBANK", label: "Boursobank" }, { value: "DEGIRO", label: "DEGIRO" }, { value: "MANUAL", label: "Manuel" }, { value: "OTHER", label: "Autre" }]} className="mt-1" />
            </div>
            <div>
              <Label>Date d&apos;ouverture</Label>
              <Input type="date" value={form.openDate} onChange={(e) => setForm({ ...form, openDate: e.target.value })} className="mt-1" />
            </div>
            <Button type="submit" className="w-full">Créer</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
