import * as React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "danger" | "warning";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        {
          "bg-accent-blue/20 text-accent-blue": variant === "default",
          "bg-accent-green/20 text-accent-green": variant === "success",
          "bg-accent-red/20 text-accent-red": variant === "danger",
          "bg-yellow-500/20 text-yellow-400": variant === "warning",
        },
        className
      )}
      {...props}
    />
  );
}
