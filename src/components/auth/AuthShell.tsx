import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, GraduationCap, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AuthShellProps {
  eyebrow: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  backTo?: string;
  backLabel?: string;
  contentClassName?: string;
  sideTitle?: string;
  sideDescription?: string;
  sideItems?: string[];
}

const defaultSideItems = [
  "UHPAB-aligned proposal and report workflow",
  "Marking-guide review before submission",
  "Writing improvement and originality checks",
];

export function AuthShell({
  eyebrow,
  title,
  description,
  icon,
  children,
  footer,
  backTo = "/",
  backLabel = "Back to home",
  contentClassName,
  sideTitle = "Research support that feels organized",
  sideDescription = "Students, supervisors, and school admins get one calm workspace for research writing, review, and follow-up.",
  sideItems = defaultSideItems,
}: AuthShellProps) {
  return (
    <div className="study-surface min-h-screen px-4 py-5 text-foreground sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-6xl flex-col">
        <header className="flex items-center justify-between gap-4">
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground shadow-sm">
              UR
            </span>
            <span className="min-w-0">
              <span className="block font-bold leading-tight text-primary">UHPAB Research Assistant</span>
              <span className="hidden text-xs text-muted-foreground sm:block">Academic writing workspace</span>
            </span>
          </Link>
          {backTo && (
            <Button variant="outline" size="sm" className="gap-2 bg-card" asChild>
              <Link to={backTo}>
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">{backLabel}</span>
                <span className="sm:hidden">Back</span>
              </Link>
            </Button>
          )}
        </header>

        <main className="grid flex-1 items-center gap-8 py-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(22rem,0.72fr)]">
          <section className="hidden min-w-0 lg:block">
            <div className="max-w-xl">
              <span className="soft-marker border-info/20 bg-info-muted text-info-foreground">
                <GraduationCap className="h-4 w-4" />
                Built for nursing research
              </span>
              <h1 className="mt-4 text-4xl font-bold leading-tight">{sideTitle}</h1>
              <p className="mt-3 text-base leading-7 text-muted-foreground">{sideDescription}</p>
              <div className="mt-6 grid gap-3">
                {sideItems.map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-lg border bg-card p-4 shadow-sm">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-success-muted text-success">
                      <CheckCircle2 className="h-4 w-4" />
                    </span>
                    <p className="text-sm leading-6 text-muted-foreground">{item}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-lg border bg-card p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-info-muted text-info">
                    <ShieldCheck className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-semibold">Local-first review tools</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      Draft reviews and exports are designed for student/admin review without clutter.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className={cn("mx-auto w-full max-w-md rounded-lg border bg-card p-5 shadow-sm sm:p-6", contentClassName)}>
            <div className="mb-5 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg border bg-info-muted text-info shadow-sm">
                {icon || <GraduationCap className="h-6 w-6" />}
              </div>
              <span className="soft-marker border-slate-200 bg-slate-50 text-slate-700">{eyebrow}</span>
              <h2 className="mt-3 text-2xl font-bold leading-tight">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
            </div>
            {children}
            {footer && <div className="mt-5 border-t pt-5">{footer}</div>}
          </section>
        </main>

        <footer className="pb-2 text-center text-xs text-muted-foreground">
          Copyright {new Date().getFullYear()} UHPAB Research Assistant. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
