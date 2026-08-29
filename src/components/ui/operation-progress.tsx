import { Check, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type OperationProgressProps = {
  title: string;
  stage: string;
  value: number;
  steps: string[];
  className?: string;
};

const OperationProgress = ({ title, stage, value, steps, className }: OperationProgressProps) => {
  const safeValue = Math.max(0, Math.min(100, value));
  const currentStep = Math.min(
    steps.length - 1,
    Math.max(0, Math.floor(Math.max(0, safeValue - 1) / (100 / steps.length)))
  );

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("rounded-md border border-sky-200 bg-sky-50/80 p-4", className)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-semibold text-sky-950">{title}</p>
          <p className="mt-1 text-sm text-sky-800">{stage}</p>
        </div>
        <span className="shrink-0 text-sm font-semibold tabular-nums text-sky-900">
          {safeValue}%
        </span>
      </div>
      <Progress
        value={safeValue}
        aria-label={`${title}: ${stage}`}
        className="mt-3 h-2.5 bg-sky-100"
      />
      <ol className="mt-4 grid gap-2 sm:grid-cols-2">
        {steps.map((step, index) => {
          const isComplete = index < currentStep || safeValue === 100;
          const isCurrent = index === currentStep && safeValue < 100;

          return (
            <li
              key={step}
              className={cn(
                "flex min-w-0 items-center gap-2 text-xs",
                isComplete || isCurrent ? "text-sky-950" : "text-slate-500"
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                  isComplete
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : isCurrent
                      ? "border-sky-600 bg-white text-sky-700"
                      : "border-slate-300 bg-white"
                )}
              >
                {isComplete ? (
                  <Check className="h-3 w-3" />
                ) : isCurrent ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                )}
              </span>
              <span className="break-words">{step}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export { OperationProgress };
