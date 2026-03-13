"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { signOut } from "next-auth/react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: "📊" },
  { name: "Portefeuilles", href: "/portfolios", icon: "💼" },
  { name: "Analyse", href: "/analytics", icon: "🔍" },
  { name: "Simulateur", href: "/simulator", icon: "📈" },
  { name: "Dividendes", href: "/dividends", icon: "💰" },
  { name: "Résultats", href: "/earnings", icon: "📅" },
  { name: "Paramètres", href: "/settings", icon: "⚙️" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-bg-secondary border-r border-border">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-accent-green flex items-center justify-center font-sora font-bold text-background">
            IT
          </div>
          <span className="font-sora font-semibold text-lg text-text-primary">InvestTrack</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                pathname === item.href || pathname?.startsWith(item.href + "/")
                  ? "bg-accent-blue/10 text-accent-blue"
                  : "text-text-muted hover:text-text-primary hover:bg-bg-card"
              )}
            >
              <span className="text-lg">{item.icon}</span>
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-border">
          <button
            onClick={() => signOut({ callbackUrl: "/auth" })}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-text-muted hover:text-accent-red hover:bg-accent-red/10 transition-all w-full"
          >
            <span className="text-lg">🚪</span>
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-bg-secondary border-t border-border flex justify-around py-2">
        {navigation.slice(0, 5).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1 px-3 py-1 text-xs transition-all",
              pathname === item.href || pathname?.startsWith(item.href + "/")
                ? "text-accent-blue"
                : "text-text-muted"
            )}
          >
            <span className="text-xl">{item.icon}</span>
            <span>{item.name.substring(0, 6)}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
