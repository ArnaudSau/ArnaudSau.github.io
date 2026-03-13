import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "InvestTrack — Gestion de Portefeuille",
  description: "Plateforme de gestion de portefeuille boursier PEA & CTO",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark">
      <body className="antialiased min-h-screen bg-background text-text-primary font-dm">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
