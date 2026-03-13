"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface MetricCardProps {
  label: string;
  value: string;
  delta?: string;
  deltaType?: "positive" | "negative" | "neutral";
  icon?: React.ReactNode;
  className?: string;
}

export function MetricCard({ label, value, delta, deltaType = "neutral", icon, className }: MetricCardProps) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    setAnimated(true);
  }, []);

  return (
    <div
      className={cn(
        "bg-bg-card border border-border rounded-xl p-5 card-hover",
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm text-text-muted">{label}</p>
        {icon && <div className="text-text-muted">{icon}</div>}
      </div>
      <div className={cn("transition-all duration-500", animated ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2")}>
        <p className="text-2xl font-sora font-bold font-numeric text-text-primary">{value}</p>
        {delta && (
          <p
            className={cn("text-sm font-numeric mt-1", {
              "text-accent-green": deltaType === "positive",
              "text-accent-red": deltaType === "negative",
              "text-text-muted": deltaType === "neutral",
            })}
          >
            {delta}
          </p>
        )}
      </div>
    </div>
  );
}
