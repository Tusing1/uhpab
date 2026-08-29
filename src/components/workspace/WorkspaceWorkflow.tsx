import * as React from "react";
import { MoreHorizontal, Upload } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type WorkflowTone = "neutral" | "info" | "success" | "warning" | "danger";
type WorkflowActionVariant = "default" | "outline" | "secondary" | "ghost" | "destructive";

const metricTones: Record<WorkflowTone, string> = {
  neutral: "border-slate-200 bg-slate-50 text-slate-800",
  info: "border-info/20 bg-info-muted text-info-foreground",
  success: "border-success/20 bg-success-muted text-success-foreground",
  warning: "border-warning/20 bg-warning-muted text-warning-foreground",
  danger: "border-destructive/20 bg-rose-50 text-rose-900",
};

const panelTones: Record<WorkflowTone, string> = {
  neutral: "border-slate-200 bg-white/80 text-slate-900",
  info: "border-info/20 bg-info-muted text-info-foreground",
  success: "border-success/25 bg-success-muted text-success-foreground",
  warning: "border-warning/25 bg-warning-muted text-warning-foreground",
  danger: "border-destructive/20 bg-rose-50 text-rose-950",
};

const iconTones: Record<WorkflowTone, string> = {
  neutral: "border-slate-200 bg-white text-slate-700",
  info: "border-info/20 bg-white text-info",
  success: "border-success/25 bg-white text-success",
  warning: "border-warning/25 bg-white text-warning",
  danger: "border-destructive/20 bg-white text-rose-700",
};

interface WorkspaceSectionHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}

const WorkspaceSectionHeader = React.forwardRef<HTMLDivElement, WorkspaceSectionHeaderProps>(
  ({ className, title, description, icon, actions, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between", className)}
      {...props}
    >
      <div className="min-w-0">
        <h2 className="text-xl font-semibold leading-7">{title}</h2>
        {description && <p className="mt-0.5 text-sm leading-6 text-muted-foreground">{description}</p>}
      </div>
      {(icon || actions) && (
        <div className="flex max-w-full flex-wrap items-center gap-2 sm:shrink-0">
          {icon && <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</span>}
          {actions}
        </div>
      )}
    </div>
  )
);
WorkspaceSectionHeader.displayName = "WorkspaceSectionHeader";

interface DocumentUploadFieldProps {
  id: string;
  label: string;
  prompt: string;
  description: string;
  accept: string;
  fileName?: string | null;
  disabled?: boolean;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  className?: string;
}

const DocumentUploadField = ({
  id,
  label,
  prompt,
  description,
  accept,
  fileName,
  disabled,
  onChange,
  className,
}: DocumentUploadFieldProps) => (
  <div className={cn("grid min-w-0 gap-2", className)}>
    <Label htmlFor={id}>{label}</Label>
    <input id={id} type="file" accept={accept} onChange={onChange} disabled={disabled} className="sr-only" />
    <Label
      htmlFor={id}
      className={cn(
        "flex min-h-24 cursor-pointer items-center gap-3 rounded-lg border border-dashed bg-muted/35 p-4 transition-colors hover:border-primary/40 hover:bg-info-muted",
        disabled && "pointer-events-none opacity-50"
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-card text-primary shadow-sm">
        <Upload size={19} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block break-words text-sm font-semibold">{fileName || prompt}</span>
        <span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span>
      </span>
      <span className="hidden shrink-0 text-sm font-medium text-primary sm:block">{fileName ? "Replace" : "Browse"}</span>
    </Label>
  </div>
);

interface WorkspaceMetricProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
  tone?: WorkflowTone;
}

const WorkspaceMetric = React.forwardRef<HTMLDivElement, WorkspaceMetricProps>(
  ({ className, label, value, detail, tone = "neutral", ...props }, ref) => (
    <div ref={ref} className={cn("rounded-lg border p-4", metricTones[tone], className)} {...props}>
      <p className="text-sm opacity-75">{label}</p>
      <p className="mt-1 text-2xl font-bold leading-8">{value}</p>
      {detail && <p className="mt-1 text-xs leading-5 opacity-75">{detail}</p>}
    </div>
  )
);
WorkspaceMetric.displayName = "WorkspaceMetric";

interface WorkspaceEmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  tone?: WorkflowTone;
}

const WorkspaceEmptyState = React.forwardRef<HTMLDivElement, WorkspaceEmptyStateProps>(
  ({ className, icon, title, description, actions, tone = "neutral", ...props }, ref) => (
    <div
      ref={ref}
      className={cn("rounded-lg border p-6 text-center shadow-sm", panelTones[tone], className)}
      {...props}
    >
      {icon && (
        <div className={cn("mx-auto flex h-12 w-12 items-center justify-center rounded-lg border shadow-sm", iconTones[tone])}>
          {icon}
        </div>
      )}
      <p className="mt-4 font-semibold">{title}</p>
      {description && <div className="mx-auto mt-2 max-w-xl text-sm leading-6 opacity-80">{description}</div>}
      {actions && <div className="mt-4 flex flex-col items-center justify-center gap-2 sm:flex-row sm:flex-wrap">{actions}</div>}
    </div>
  )
);
WorkspaceEmptyState.displayName = "WorkspaceEmptyState";

interface WorkspaceStatusNoteProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  tone?: WorkflowTone;
}

const WorkspaceStatusNote = React.forwardRef<HTMLDivElement, WorkspaceStatusNoteProps>(
  ({ className, icon, title, description, actions, tone = "neutral", ...props }, ref) => (
    <div
      ref={ref}
      className={cn("rounded-lg border p-4 shadow-sm", panelTones[tone], className)}
      {...props}
    >
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          {icon && (
            <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-md border shadow-sm", iconTones[tone])}>
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <p className="font-semibold">{title}</p>
            {description && <div className="mt-1 text-sm leading-6 opacity-80">{description}</div>}
          </div>
        </div>
        {actions && <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">{actions}</div>}
      </div>
    </div>
  )
);
WorkspaceStatusNote.displayName = "WorkspaceStatusNote";

interface SavedWorkCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  meta?: React.ReactNode;
  status?: React.ReactNode;
  summary?: React.ReactNode;
  actions?: React.ReactNode;
}

const SavedWorkCard = React.forwardRef<HTMLDivElement, SavedWorkCardProps>(
  ({ className, title, meta, status, summary, actions, children, ...props }, ref) => (
    <div ref={ref} className={cn("min-w-0 rounded-lg border bg-card p-4 shadow-sm", className)} {...props}>
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="break-words font-semibold leading-6">{title}</h3>
          {meta && <div className="mt-1 text-xs leading-5 text-muted-foreground">{meta}</div>}
        </div>
        {status && <div className="shrink-0">{status}</div>}
      </div>
      {summary && <div className="mt-3 text-sm leading-6 text-muted-foreground">{summary}</div>}
      {children}
      {actions && <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">{actions}</div>}
    </div>
  )
);
SavedWorkCard.displayName = "SavedWorkCard";

interface WorkspaceDockAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: WorkflowActionVariant;
  disabled?: boolean;
}

interface WorkspaceActionDockProps {
  title: string;
  description: string;
  primaryAction: WorkspaceDockAction;
  secondaryActions?: WorkspaceDockAction[];
  width?: "standard" | "wide";
}

const WorkspaceActionDock = ({
  title,
  description,
  primaryAction,
  secondaryActions = [],
  width = "standard",
}: WorkspaceActionDockProps) => (
  <div
    className={cn(
      "fixed bottom-3 left-3 right-3 z-30 rounded-lg border bg-card/95 p-3 shadow-xl backdrop-blur",
      "sm:left-auto sm:right-6 sm:max-w-[calc(100vw-3rem)] lg:right-8",
      width === "wide" ? "sm:w-[56rem]" : "sm:w-[40rem]"
    )}
  >
    <div className="flex min-w-0 items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold sm:text-base">{title}</p>
        <p className="hidden truncate text-sm text-muted-foreground sm:block">{description}</p>
      </div>

      <div className="hidden shrink-0 items-center gap-2 sm:flex">
        {secondaryActions.map((action) => (
          <Button
            key={action.label}
            type="button"
            variant={action.variant || "outline"}
            className="gap-2"
            onClick={action.onClick}
            disabled={action.disabled}
          >
            {action.icon}
            {action.label}
          </Button>
        ))}
        <Button
          type="button"
          variant={primaryAction.variant || "default"}
          className="gap-2"
          onClick={primaryAction.onClick}
          disabled={primaryAction.disabled}
        >
          {primaryAction.icon}
          {primaryAction.label}
        </Button>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:hidden">
        <Button
          type="button"
          variant={primaryAction.variant || "default"}
          className="max-w-[13rem] gap-2"
          onClick={primaryAction.onClick}
          disabled={primaryAction.disabled}
        >
          {primaryAction.icon}
          <span className="truncate">{primaryAction.label}</span>
        </Button>
        {secondaryActions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="icon" aria-label="More report actions">
                <MoreHorizontal size={18} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-56">
              <DropdownMenuLabel>More actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {secondaryActions.map((action) => (
                <DropdownMenuItem key={action.label} disabled={action.disabled} onSelect={action.onClick}>
                  {action.icon}
                  <span>{action.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  </div>
);

const WorkspaceCountBadge = ({ count, label = "recent" }: { count: number; label?: string }) => (
  <Badge variant="outline" className="bg-info-muted text-info-foreground">
    {count} {label}
  </Badge>
);

export {
  DocumentUploadField,
  SavedWorkCard,
  WorkspaceActionDock,
  WorkspaceCountBadge,
  WorkspaceEmptyState,
  WorkspaceMetric,
  WorkspaceSectionHeader,
  WorkspaceStatusNote,
};
export type { WorkflowTone, WorkspaceDockAction };
