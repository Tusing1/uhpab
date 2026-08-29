import * as React from "react";

import { cn } from "@/lib/utils";

type WorkspacePageWidth = "standard" | "wide";
type WorkspaceDockPadding = "none" | "standard" | "expanded";
type WorkspaceHeaderTone = "neutral" | "info" | "success" | "warning" | "danger";

const pageWidths: Record<WorkspacePageWidth, string> = {
  standard: "max-w-6xl",
  wide: "max-w-7xl",
};

const dockPadding: Record<WorkspaceDockPadding, string> = {
  none: "pb-8 lg:pb-10",
  standard: "pb-24 sm:pb-28",
  expanded: "pb-24 sm:pb-28",
};

const toneClasses: Record<WorkspaceHeaderTone, string> = {
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
  info: "border-sky-200 bg-sky-50 text-sky-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-rose-200 bg-rose-50 text-rose-800",
};

interface WorkspacePageProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: WorkspacePageWidth;
  dockPadding?: WorkspaceDockPadding;
}

const WorkspacePage = React.forwardRef<HTMLDivElement, WorkspacePageProps>(
  ({ className, width = "standard", dockPadding: dock = "none", ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "container pt-5 sm:pt-6 lg:pt-8",
        pageWidths[width],
        dockPadding[dock],
        className
      )}
      {...props}
    />
  )
);
WorkspacePage.displayName = "WorkspacePage";

interface WorkspacePageHeaderProps extends React.HTMLAttributes<HTMLElement> {
  eyebrow: string;
  title: string;
  description: string;
  tone?: WorkspaceHeaderTone;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  aside?: React.ReactNode;
}

const WorkspacePageHeader = React.forwardRef<HTMLElement, WorkspacePageHeaderProps>(
  (
    {
      className,
      eyebrow,
      title,
      description,
      tone = "neutral",
      icon,
      actions,
      aside,
      children,
      ...props
    },
    ref
  ) => (
    <section ref={ref} className={cn("border-b pb-6", className)} {...props}>
      <div
        className={cn(
          "grid min-w-0 gap-6",
          aside && "lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.72fr)] lg:items-start"
        )}
      >
        <div className="min-w-0 max-w-3xl">
          <span className={cn("soft-marker gap-2", toneClasses[tone])}>
            {icon}
            {eyebrow}
          </span>
          <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">{title}</h1>
          <p className="mt-2 max-w-3xl text-base leading-7 text-muted-foreground">{description}</p>
          {children}
          {actions && <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">{actions}</div>}
        </div>
        {aside && <div className="min-w-0 max-w-full rounded-lg border bg-card p-5 shadow-sm">{aside}</div>}
      </div>
    </section>
  )
);
WorkspacePageHeader.displayName = "WorkspacePageHeader";

export { WorkspacePage, WorkspacePageHeader };
export type { WorkspaceDockPadding, WorkspaceHeaderTone, WorkspacePageWidth };
