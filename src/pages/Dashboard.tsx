import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Archive,
  ArrowRight,
  BookOpen,
  Calendar,
  FileSearch,
  FileText,
  GraduationCap,
  History,
  MessageSquareText,
  PenLine,
  Plus,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  Wand2,
} from "lucide-react";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { WorkspacePage, WorkspacePageHeader } from "@/components/workspace/WorkspacePage";
import { useAuth } from "@/contexts/AuthContext";
import { useProjects } from "@/contexts/ProjectContext";
import { listAnalysisRecords, type StoredAnalysisRecord } from "@/lib/documentAnalysisStore";
import {
  listToolResultRecords,
  type StoredToolResultRecord,
} from "@/lib/toolResultStore";
import type { Project } from "@/types";
import { cn } from "@/lib/utils";

type ReviewActivityItem = {
  id: string;
  title: string;
  description: string;
  meta: string;
  updatedAt: string;
  toolLabel: string;
  route: string;
  routeState?: Record<string, string>;
  icon: React.ReactNode;
  badgeClassName: string;
};

type DashboardActivityItem = ReviewActivityItem & {
  actionLabel: string;
  progress?: number;
};

type QuickAction = {
  title: string;
  description: string;
  buttonLabel: string;
  route: string;
  icon: React.ReactNode;
  tone: "info" | "success" | "warning" | "neutral";
  badge?: string;
};

const actionToneClasses: Record<QuickAction["tone"], { panel: string; icon: string; badge: string }> = {
  info: {
    panel: "border-slate-200 bg-card hover:border-primary/30 hover:bg-primary/5",
    icon: "bg-primary/10 text-primary",
    badge: "border-slate-200 bg-muted/60 text-muted-foreground",
  },
  success: {
    panel: "border-slate-200 bg-card hover:border-primary/30 hover:bg-primary/5",
    icon: "bg-primary/10 text-primary",
    badge: "border-slate-200 bg-muted/60 text-muted-foreground",
  },
  warning: {
    panel: "border-slate-200 bg-card hover:border-primary/30 hover:bg-primary/5",
    icon: "bg-primary/10 text-primary",
    badge: "border-slate-200 bg-muted/60 text-muted-foreground",
  },
  neutral: {
    panel: "border-slate-200 bg-card hover:border-primary/30 hover:bg-primary/5",
    icon: "bg-primary/10 text-primary",
    badge: "border-slate-200 bg-muted/60 text-muted-foreground",
  },
};

const formatReviewDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recent";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const getReadableDocumentType = (value?: string) => {
  if (!value) return "Document";
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const getAverageProgress = (project?: Project) => {
  if (!project) return 0;
  const values = Object.values(project.progress || {}).filter(
    (value): value is number => typeof value === "number"
  );

  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const countSources = (project: Project) =>
  Array.isArray(project.chapters?._sourcesLibrary) ? project.chapters._sourcesLibrary.length : 0;

const countReferences = (project: Project) =>
  Array.isArray(project.chapters?.references?.items) ? project.chapters.references.items.length : 0;

const countTablesFigures = (project: Project) =>
  Array.isArray(project.chapters?._tableFigureRegister)
    ? project.chapters._tableFigureRegister.length
    : 0;

const Dashboard = () => {
  const { user, isPremium, isSchoolAdmin } = useAuth();
  const { projects, isLoading } = useProjects();
  const navigate = useNavigate();
  const userId = user?.id || "guest";
  const premium = isPremium();
  const schoolAdmin = isSchoolAdmin();
  const [analysisHistory, setAnalysisHistory] = useState<StoredAnalysisRecord[]>([]);
  const [improvementHistory, setImprovementHistory] = useState<
    StoredToolResultRecord<"content-improvement">[]
  >([]);
  const [originalityHistory, setOriginalityHistory] = useState<
    StoredToolResultRecord<"plagiarism-checker">[]
  >([]);
  const [humanReviewHistory, setHumanReviewHistory] = useState<
    StoredToolResultRecord<"humanizer">[]
  >([]);
  const [reviewHistoryLoading, setReviewHistoryLoading] = useState(true);

  const recentProjects = useMemo(
    () =>
      [...projects]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 3),
    [projects]
  );

  const activeProject = recentProjects[0];
  const activeProjectProgress = Math.round(getAverageProgress(activeProject));
  const totalSources = projects.reduce((sum, project) => sum + countSources(project), 0);
  const totalReferences = projects.reduce((sum, project) => sum + countReferences(project), 0);
  const totalTablesFigures = projects.reduce((sum, project) => sum + countTablesFigures(project), 0);
  const planName = schoolAdmin ? "School" : premium ? "Premium" : "Free";
  const accessLabel = premium || schoolAdmin ? "Full access" : "Starter access";

  const quickActions = useMemo<QuickAction[]>(
    () => [
      {
        title: "Improve writing",
        description: "Clean weak paragraphs while preserving the student's meaning and evidence.",
        buttonLabel: "Open editor",
        route: "/content-improvement",
        icon: <MessageSquareText size={20} />,
        tone: "success",
        badge: "Corrections",
      },
      {
        title: "Human review",
        description: "Review robotic phrasing, filler, repetition, and artificial writing patterns.",
        buttonLabel: "Review wording",
        route: "/humanizer",
        icon: <Wand2 size={20} />,
        tone: "warning",
        badge: "Deep mode",
      },
      {
        title: "Originality check",
        description: "Separate common research wording from passages that need citation attention.",
        buttonLabel: "Check originality",
        route: "/plagiarism-checker",
        icon: <ShieldCheck size={20} />,
        tone: "neutral",
        badge: "Similarity",
      },
      ...(schoolAdmin
        ? [
            {
              title: "School workspace",
              description: "Monitor student work, assignments, and submitted research progress.",
              buttonLabel: "Open school view",
              route: "/school-dashboard",
              icon: <GraduationCap size={20} />,
              tone: "info" as const,
              badge: "School",
            },
          ]
        : []),
    ],
    [schoolAdmin]
  );

  const reviewActivity = useMemo<ReviewActivityItem[]>(() => {
    const analysisItems: ReviewActivityItem[] = analysisHistory.map((record) => {
      const rubric = record.result.rubricScore;
      const awarded = rubric
        ? `${rubric.awarded}/${rubric.total} marks`
        : `${record.result.matchedGuidelines}/${record.result.totalGuidelines} checks`;

      return {
        id: `analysis-${record.id}`,
        title: record.fileName,
        description: `${getReadableDocumentType(record.documentType)} marking guide review`,
        meta: `${awarded} - ${record.analysisRuns} ${record.analysisRuns === 1 ? "run" : "runs"}`,
        updatedAt: record.updatedAt,
        toolLabel: "Document Analysis",
        route: "/document-analysis",
        routeState: { documentAnalysisRecordId: record.id },
        icon: <SearchCheck className="h-4 w-4" />,
        badgeClassName: "border-sky-200 bg-sky-50 text-sky-800",
      };
    });

    const improvementItems: ReviewActivityItem[] = improvementHistory.map((record) => {
      const changeCount = record.result.changes.length;
      const issueCount = record.result.issues.length;

      return {
        id: `improvement-${record.id}`,
        title: record.issueLabel || record.fileName || "Saved improvement",
        description: record.section || record.inputPreview || "Improved academic wording",
        meta: `${changeCount} ${changeCount === 1 ? "change" : "changes"} - ${issueCount} ${
          issueCount === 1 ? "issue" : "issues"
        }`,
        updatedAt: record.updatedAt,
        toolLabel: "Content Improvement",
        route: "/content-improvement",
        routeState: { toolResultRecordId: record.id },
        icon: <PenLine className="h-4 w-4" />,
        badgeClassName: "border-emerald-200 bg-emerald-50 text-emerald-800",
      };
    });

    const originalityItems: ReviewActivityItem[] = originalityHistory.map((record) => ({
      id: `originality-${record.id}`,
      title: record.fileName || record.issueLabel || "Saved originality check",
      description: `${record.result.originalityScore}% original-looking - ${
        record.result.uncommonFlagCount
      } ${record.result.uncommonFlagCount === 1 ? "passage" : "passages"} to review`,
      meta: `${record.result.similarityScore}% review attention after common wording filter`,
      updatedAt: record.updatedAt,
      toolLabel: "Originality Check",
      route: "/plagiarism-checker",
      routeState: { toolResultRecordId: record.id },
      icon: <ShieldCheck className="h-4 w-4" />,
      badgeClassName: "border-amber-200 bg-amber-50 text-amber-800",
    }));

    const humanReviewItems: ReviewActivityItem[] = humanReviewHistory.map((record) => ({
      id: `humanizer-${record.id}`,
      title: record.issueLabel || record.fileName || "Human review",
      description: `${record.result.readinessScore}/100 readiness - ${
        record.result.signals.length
      } ${record.result.signals.length === 1 ? "signal" : "signals"} reviewed`,
      meta: `${record.result.changes.length} cleanup ${
        record.result.changes.length === 1 ? "change" : "changes"
      } - ${record.runs} ${record.runs === 1 ? "run" : "runs"}`,
      updatedAt: record.updatedAt,
      toolLabel: "Human Review",
      route: "/humanizer",
      routeState: { toolResultRecordId: record.id },
      icon: <Wand2 className="h-4 w-4" />,
      badgeClassName: "border-violet-200 bg-violet-50 text-violet-800",
    }));

    return [...analysisItems, ...improvementItems, ...humanReviewItems, ...originalityItems]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 6);
  }, [analysisHistory, improvementHistory, humanReviewHistory, originalityHistory]);

  const dashboardActivity = useMemo<DashboardActivityItem[]>(() => {
    const projectItems: DashboardActivityItem[] = recentProjects.map((project) => {
      const progress = Math.round(getAverageProgress(project));
      const sourceCount = countSources(project);
      const referenceCount = countReferences(project);

      return {
        id: `project-${project.id}`,
        title: project.title,
        description: `${getReadableDocumentType(project.type)} workspace - ${progress}% complete`,
        meta: `${sourceCount} ${sourceCount === 1 ? "source" : "sources"} - ${referenceCount} ${
          referenceCount === 1 ? "reference" : "references"
        } - ${formatReviewDate(project.updatedAt)}`,
        updatedAt: project.updatedAt,
        toolLabel: "Project",
        route: `/projects/${project.id}`,
        icon: <FileText className="h-4 w-4" />,
        badgeClassName: "border-primary/20 bg-primary/5 text-primary",
        actionLabel: "Open",
        progress,
      };
    });

    const reviewItems: DashboardActivityItem[] = reviewActivity.map((item) => ({
      ...item,
      actionLabel: "Resume",
    }));

    return [...projectItems, ...reviewItems]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 8);
  }, [recentProjects, reviewActivity]);

  useEffect(() => {
    let cancelled = false;

    const loadReviewHistory = async () => {
      setReviewHistoryLoading(true);
      try {
        const [analyses, improvements, humanReviews, originalityChecks] = await Promise.all([
          listAnalysisRecords(userId, 6),
          listToolResultRecords(userId, "content-improvement", 6),
          listToolResultRecords(userId, "humanizer", 6),
          listToolResultRecords(userId, "plagiarism-checker", 6),
        ]);

        if (cancelled) return;
        setAnalysisHistory(analyses);
        setImprovementHistory(improvements);
        setHumanReviewHistory(humanReviews);
        setOriginalityHistory(originalityChecks);
      } catch (error) {
        console.warn("Unable to load saved review history.", error);
        if (!cancelled) {
          setAnalysisHistory([]);
          setImprovementHistory([]);
          setHumanReviewHistory([]);
          setOriginalityHistory([]);
        }
      } finally {
        if (!cancelled) setReviewHistoryLoading(false);
      }
    };

    void loadReviewHistory();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const openDashboardActivity = (item: DashboardActivityItem) => {
    navigate(item.route, item.routeState ? { state: item.routeState } : undefined);
  };

  const firstName = user?.name?.split(" ")[0] || "Researcher";

  return (
    <DashboardLayout>
      <WorkspacePage width="wide" className="grid gap-6">
        <WorkspacePageHeader
          eyebrow="Command center"
          tone="info"
          icon={<Calendar size={14} />}
          title={`Welcome, ${firstName}`}
          description="Choose the next useful action for your research work: write, correct, check marks, or verify originality."
          actions={
            <>
              <Button className="gap-2" onClick={() => navigate("/projects/new")}>
                <Plus size={16} />
                Create project
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => navigate("/document-analysis")}>
                <FileSearch size={16} />
                Check document
              </Button>
            </>
          }
          aside={
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Workspace status</p>
                  <p className="mt-1 text-2xl font-bold">{accessLabel}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{planName} plan overview</p>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Sparkles size={18} />
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg border bg-card p-3">
                  <p className="text-xs font-medium text-muted-foreground">Research projects</p>
                  <p className="mt-1 text-xl font-bold">{projects.length}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {projects.length === 1 ? "1 active workspace" : `${projects.length} active workspaces`}
                  </p>
                </div>
                <div className="rounded-lg border bg-card p-3">
                  <p className="text-xs font-medium text-muted-foreground">Saved reviews</p>
                  <p className="mt-1 text-xl font-bold">{reviewActivity.length}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Recent checks in archive</p>
                </div>
                <div className="rounded-lg border bg-card p-3">
                  <p className="text-xs font-medium text-muted-foreground">Sources / references</p>
                  <p className="mt-1 text-xl font-bold">{totalSources}/{totalReferences}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Saved / listed</p>
                </div>
                <div className="rounded-lg border bg-card p-3">
                  <p className="text-xs font-medium text-muted-foreground">Tables and charts</p>
                  <p className="mt-1 text-xl font-bold">{totalTablesFigures}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Report result items</p>
                </div>
              </div>
            </div>
          }
        />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {quickActions.map((action) => {
            const tone = actionToneClasses[action.tone];
            return (
              <button
                key={action.title}
                type="button"
                className={cn(
                  "group min-h-48 rounded-lg border p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
                  tone.panel
                )}
                onClick={() => navigate(action.route)}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className={cn("flex h-11 w-11 items-center justify-center rounded-lg", tone.icon)}>
                    {action.icon}
                  </span>
                  {action.badge && (
                    <Badge variant="outline" className={cn("shrink-0", tone.badge)}>
                      {action.badge}
                    </Badge>
                  )}
                </div>
                <h2 className="mt-5 text-lg font-semibold leading-6">{action.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{action.description}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                  {action.buttonLabel}
                  <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                </span>
              </button>
            );
          })}
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <FileText className="h-5 w-5 text-primary" />
                {activeProject ? "Continue your project" : "Start a project"}
              </CardTitle>
              <CardDescription>
                {activeProject
                  ? "Your most recently updated research file is ready to continue."
                  : "Create a proposal or report workspace before building sections."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Loading projects...
                </div>
              ) : activeProject ? (
                <>
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <Badge variant="outline" className="capitalize">
                          {activeProject.type}
                        </Badge>
                        <h3 className="mt-3 line-clamp-2 text-lg font-semibold">{activeProject.title}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Last updated {new Date(activeProject.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="rounded-lg bg-card px-3 py-2 text-right shadow-sm">
                        <p className="text-xs text-muted-foreground">Progress</p>
                        <p className="text-xl font-bold">{activeProjectProgress}%</p>
                      </div>
                    </div>
                    <Progress value={activeProjectProgress} className="mt-4 h-2" />
                    <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
                      <div className="rounded-md bg-card p-3">
                        <p className="text-muted-foreground">Sources</p>
                        <p className="font-semibold">{countSources(activeProject)}</p>
                      </div>
                      <div className="rounded-md bg-card p-3">
                        <p className="text-muted-foreground">References</p>
                        <p className="font-semibold">{countReferences(activeProject)}</p>
                      </div>
                      <div className="rounded-md bg-card p-3">
                        <p className="text-muted-foreground">Tables/charts</p>
                        <p className="font-semibold">{countTablesFigures(activeProject)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button className="gap-2" onClick={() => navigate(`/projects/${activeProject.id}/edit`)}>
                      <PenLine size={16} />
                      Continue writing
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => navigate(`/projects/${activeProject.id}`)}
                    >
                      <BookOpen size={16} />
                      Open workspace
                    </Button>
                  </div>
                </>
              ) : (
                <div className="rounded-lg border border-dashed p-6 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Plus size={20} />
                  </div>
                  <h3 className="mt-4 font-semibold">No projects yet</h3>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                    Start with a proposal or report workspace, then connect sources, sections, and checks.
                  </p>
                  <Button className="mt-4 gap-2" onClick={() => navigate("/projects/new")}>
                    <Plus size={16} />
                    Create first project
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <History className="h-5 w-5 text-primary" />
                    Recent activity
                  </CardTitle>
                  <CardDescription>
                    Resume projects and saved review work from one timeline.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate("/projects")}>
                    <FileText size={15} />
                    Projects
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate("/projects?view=archive")}>
                    <Archive size={15} />
                    Archive
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading || reviewHistoryLoading ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Loading recent activity...
                </div>
              ) : dashboardActivity.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6">
                  <h3 className="font-semibold">No recent activity yet</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Create a project or run a document review. Your work will appear here for quick return.
                  </p>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <Button variant="outline" className="gap-2" onClick={() => navigate("/projects/new")}>
                      <Plus size={16} />
                      Create project
                    </Button>
                    <Button variant="outline" className="gap-2" onClick={() => navigate("/document-analysis")}>
                      <FileSearch size={16} />
                      Check document
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  {dashboardActivity.map((item, index) => (
                    <div key={item.id}>
                      <div className="flex flex-col gap-3 rounded-lg p-3 transition-colors hover:bg-accent/45 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="mt-0.5 rounded-md bg-primary/10 p-2 text-primary">{item.icon}</div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="max-w-full truncate text-sm font-semibold">{item.title}</h3>
                              <Badge variant="outline" className={item.badgeClassName}>
                                {item.toolLabel}
                              </Badge>
                            </div>
                            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
                            {typeof item.progress === "number" && (
                              <Progress value={item.progress} className="mt-2 h-1.5 max-w-xs" />
                            )}
                            <p className="mt-1 text-xs text-muted-foreground">{item.meta}</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0 gap-2 sm:self-center"
                          onClick={() => openDashboardActivity(item)}
                        >
                          {item.actionLabel}
                          <ArrowRight size={14} />
                        </Button>
                      </div>
                      {index < dashboardActivity.length - 1 && <Separator />}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

      </WorkspacePage>
    </DashboardLayout>
  );
};

export default Dashboard;
