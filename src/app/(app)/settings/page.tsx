"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface UserData {
  id: string;
  email: string;
  name: string;
  role: string;
  tmi: number | null;
  createdAt: string;
}

export default function SettingsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tmi, setTmi] = useState("30");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    async function fetchUser() {
      const res = await fetch("/api/user");
      const data = await res.json();
      setUser(data);
      setName(data.name || "");
      setEmail(data.email || "");
      setTmi(String(data.tmi || 30));
      setLoading(false);
    }
    fetchUser();
  }, [status]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const body: Record<string, unknown> = { name, email, tmi: parseFloat(tmi) };
    if (password) body.password = password;

    const res = await fetch("/api/user", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setMessage("Paramètres sauvegardés !");
      setPassword("");
    } else {
      setMessage("Erreur lors de la sauvegarde");
    }
    setSaving(false);
  }

  async function handleExportCSV() {
    try {
      const res = await fetch("/api/portfolios");
      const portfolios = await res.json();

      let csv = "Portfolio,Type,Ticker,Nom,Quantité,PRU,Secteur,Zone\n";
      portfolios.forEach((p: any) => {
        p.holdings.forEach((h: any) => {
          csv += `"${p.name}","${p.type}","${h.ticker}","${h.name}",${h.quantity},${h.averagePurchasePrice},"${h.sector || ""}","${h.geographicZone || ""}"\n`;
        });
      });

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `investtrack-export-${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Erreur lors de l'export");
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-sora text-2xl font-bold">Paramètres</h1>
        <p className="text-text-muted mt-1">Gérez votre profil et vos préférences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profil</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <Label>Nom</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Nouveau mot de passe (laisser vide pour ne pas changer)</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="mt-1" />
            </div>

            {message && (
              <p className={`text-sm ${message.includes("Erreur") ? "text-accent-red" : "text-accent-green"}`}>
                {message}
              </p>
            )}

            <Button type="submit" disabled={saving}>
              {saving ? "Sauvegarde..." : "Sauvegarder"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Préférences fiscales</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label>Tranche Marginale d&apos;Imposition (TMI)</Label>
            <Select
              value={tmi}
              onChange={(e) => setTmi(e.target.value)}
              options={[
                { value: "0", label: "0%" },
                { value: "11", label: "11%" },
                { value: "30", label: "30%" },
                { value: "41", label: "41%" },
                { value: "45", label: "45%" },
              ]}
              className="mt-1"
            />
            <p className="text-xs text-text-muted mt-2">
              Utilisé pour le calcul de l&apos;imposition au barème progressif (alternative au PFU 30%)
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Export des données</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleExportCSV}>
              Exporter en CSV
            </Button>
          </div>
          <p className="text-xs text-text-muted mt-3">
            Exportez toutes vos positions dans un fichier CSV.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Informations du compte</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">Rôle</span>
              <span>{user?.role === "STUDENT" ? "Étudiant" : "Enseignant"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Membre depuis</span>
              <span>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString("fr-FR") : "-"}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
