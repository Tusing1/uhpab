import React from "react";
import { Link } from "react-router-dom";

import { cn } from "@/lib/utils";

interface BrandLogoProps {
  to?: string;
  title?: string;
  subtitle?: string;
  compact?: boolean;
  className?: string;
  markClassName?: string;
  textClassName?: string;
}

export function BrandLogo({
  to = "/",
  title = "UHPAB Study",
  subtitle,
  compact = false,
  className,
  markClassName,
  textClassName,
}: BrandLogoProps) {
  const content = (
    <>
      <img
        src="/uhpab-logo.svg"
        alt=""
        className={cn("h-10 w-10 shrink-0 rounded-lg shadow-sm", markClassName)}
      />
      {!compact && (
        <span className={cn("min-w-0", textClassName)}>
          <span className="block truncate font-bold leading-tight text-primary">{title}</span>
          {subtitle && <span className="hidden truncate text-xs text-muted-foreground sm:block">{subtitle}</span>}
        </span>
      )}
    </>
  );

  return (
    <Link to={to} className={cn("flex min-w-0 items-center gap-2", className)} title={title}>
      {content}
    </Link>
  );
}
