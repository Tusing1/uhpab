
import React from "react";
import { cn } from "@/lib/utils";

interface GlassmorphismCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  blur?: "sm" | "md" | "lg";
  opacity?: "light" | "medium" | "heavy";
  border?: boolean;
  glow?: boolean;
}

const blurValues = {
  sm: "backdrop-blur-sm",
  md: "backdrop-blur-md",
  lg: "backdrop-blur-lg",
};

const opacityValues = {
  light: "bg-white/30 dark:bg-black/30",
  medium: "bg-white/50 dark:bg-black/40",
  heavy: "bg-white/70 dark:bg-black/50",
};

export function GlassmorphismCard({
  children,
  className,
  blur = "md",
  opacity = "medium",
  border = true,
  glow = false,
  ...props
}: GlassmorphismCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl",
        blurValues[blur],
        opacityValues[opacity],
        border && "border border-white/30 dark:border-white/10",
        glow && "shadow-[0_0_15px_rgba(0,0,0,0.07)] dark:shadow-[0_0_15px_rgba(255,255,255,0.05)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
