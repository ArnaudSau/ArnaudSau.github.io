"use client";

import { cn } from "@/lib/utils";

interface DiversificationScoreProps {
  score: number;
  label?: string;
  size?: "sm" | "lg";
}

export function DiversificationScore({ score, label = "Score de diversification", size = "lg" }: DiversificationScoreProps) {
  const getColor = () => {
    if (score >= 70) return "text-accent-green";
    if (score >= 40) return "text-yellow-400";
    return "text-accent-red";
  };

  const getBadge = () => {
    if (score >= 70) return { text: "Excellent", variant: "bg-accent-green/20 text-accent-green" };
    if (score >= 40) return { text: "Modéré", variant: "bg-yellow-500/20 text-yellow-400" };
    return { text: "Faible", variant: "bg-accent-red/20 text-accent-red" };
  };

  const badge = getBadge();
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className={cn("relative", size === "lg" ? "w-32 h-32" : "w-20 h-20")}>
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="#1E293B" strokeWidth="8" />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={score >= 70 ? "#00C896" : score >= 40 ? "#EAB308" : "#FF4757"}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn("font-sora font-bold font-numeric", getColor(), size === "lg" ? "text-2xl" : "text-lg")}>
            {score}
          </span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm text-text-muted">{label}</p>
        <span className={cn("inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium", badge.variant)}>
          {badge.text}
        </span>
      </div>
    </div>
  );
}
