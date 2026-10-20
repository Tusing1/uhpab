import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Archive, BookOpen, Check, FileSearch, FileText, HelpCircle, Lightbulb, PenLine, Plus } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { WorkspacePage } from '@/components/workspace/WorkspacePage';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/contexts/ProjectContext';
import { listAnalysisRecords, type StoredAnalysisRecord } from '@/lib/documentAnalysisStore';
import type { Project } from '@/types';

const projectProgress = (project: Project) => {
  const values = Object.values(project.progress || {}).filter((value): value is number =>
    typeof value === 'number' && Number.isFinite(value));
  return values.length ? Math.max(0, Math.min(100, Math.round(values.reduce((sum, value) => sum + value, 0) / values.length))) : 0;
};

const dateLabel = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Recently' : new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'short', timeZone: 'Africa/Kampala',
  }).format(date);
};

const Dashboard = () => {
  const { user } = useAuth();
  const { projects, isLoading } = useProjects();
  const navigate = useNavigate();
  const [checks, setChecks] = useState<StoredAnalysisRecord[]>([]);
  const [checksLoading, setChecksLoading] = useState(true);
  const [checksError, setChecksError] = useState(false);
  const [historyAttempt, setHistoryAttempt] = useState(0);
  const sortedProjects = useMemo(() => [...projects].sort((a, b) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()), [projects]);
  const activeProject = sortedProjects.find((project) => projectProgress(project) < 100) || sortedProjects[0];
  const hasTopic = Boolean(user?.researchTopic?.trim());
  const completed = activeProject && projectProgress(activeProject) === 100;

  useEffect(() => {
    let cancelled = false;
    setChecks([]);
    setChecksLoading(true);
    setChecksError(false);
    if (!user?.id) {
      setChecksLoading(false);
      return;
    }
    listAnalysisRecords(user.id, 4)
      .then((records) => { if (!cancelled) setChecks(records); })
      .catch(() => { if (!cancelled) setChecksError(true); })
      .finally(() => { if (!cancelled) setChecksLoading(false); });
    return () => { cancelled = true; };
  }, [user?.id, historyAttempt]);

  const nextAction = activeProject
    ? { label: completed ? 'Open my project' : 'Continue writing', route: `/projects/${activeProject.id}${completed ? '' : '/edit'}` }
    : hasTopic
      ? { label: 'Start my proposal', route: '/projects/new?type=proposal' }
      : { label: 'Find my research topic', route: '/research-topic-generator' };

  const openNextAction = () => navigate(nextAction.route, !activeProject && hasTopic
    ? { state: { prefillTitle: user?.researchTopic } } : undefined);
  const currentStage = activeProject ? completed ? 2 : 1 : hasTopic ? 1 : 0;
  const journey = [
    { title: activeProject || hasTopic ? 'Your topic' : 'Find your topic', detail: activeProject || hasTopic ? 'Topic saved' : 'Start with an idea', route: activeProject ? `/projects/${activeProject.id}` : hasTopic ? '/projects/new?type=proposal' : '/research-topic-generator' },
    { title: 'Write your research', detail: activeProject ? `${activeProject.type === 'report' ? 'Report' : 'Proposal'} workspace` : 'Build your proposal', route: activeProject ? `/projects/${activeProject.id}/edit` : '/projects/new?type=proposal' },
    { title: 'Check and revise', detail: 'Before submission', route: '/document-analysis' },
  ];

  return (
    <DashboardLayout>
      <WorkspacePage className="research-dashboard space-y-7 sm:space-y-8">
        <header className="research-arrive flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase text-muted-foreground">Your research workspace</p>
            <h1 className="text-2xl font-semibold sm:text-3xl">My research</h1>
            <p className="mt-2 text-sm text-muted-foreground">A clear path from your first idea to your final submission.</p>
          </div>
          <Button variant="ghost" size="sm" asChild className="gap-2">
            <Link to="/getting-started"><HelpCircle size={16} />Start here</Link>
          </Button>
        </header>

        <nav aria-label="Your research journey" className="research-arrive research-arrive-later">
          <ol className="research-journey grid grid-cols-3 gap-2 sm:gap-5">
            {journey.map((step, index) => (
              <li key={step.title} aria-current={!isLoading && currentStage === index ? 'step' : undefined} className="min-w-0">
                <Link to={step.route} state={index < 2 && !activeProject && hasTopic ? { prefillTitle: user?.researchTopic } : undefined} className="journey-step group block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" data-stage={isLoading ? 'future' : index < currentStage ? 'done' : index === currentStage ? 'current' : 'future'}>
                  <div className="journey-track flex items-center gap-2 pb-2.5">
                    <span className="journey-number flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold sm:h-8 sm:w-8">
                      {!isLoading && index < currentStage ? <Check size={15} aria-label="Completed step" /> : `0${index + 1}`}
                    </span>
                    <span className="journey-line h-px flex-1" aria-hidden="true" />
                  </div>
                  <span className="block text-xs font-semibold leading-5 group-hover:text-primary sm:text-sm">{step.title}</span>
                  <span className="mt-0.5 hidden text-xs text-muted-foreground sm:block">{step.detail}</span>
                </Link>
              </li>
            ))}
          </ol>
        </nav>

        <section aria-labelledby="next-step-heading" className="research-next-step research-arrive research-arrive-later relative border-y px-4 py-6 sm:px-6 sm:py-7">
          {isLoading ? (
            <div role="status" className="min-h-40 animate-pulse motion-reduce:animate-none">
              <p className="text-sm text-muted-foreground">Loading your research...</p>
            </div>
          ) : (
            <div className="grid min-h-44 gap-5 sm:grid-cols-[minmax(0,1fr)_150px] sm:items-center lg:grid-cols-[minmax(0,1fr)_190px]">
              <div className="min-w-0">
                <p className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase text-teal-800 dark:text-teal-200">
                  {activeProject ? <PenLine size={15} /> : <Lightbulb size={15} />}
                  {activeProject ? completed ? 'Your latest project' : 'Continue your research' : 'Your next step'}
                </p>
                <h2 id="next-step-heading" className="max-w-2xl break-words text-xl font-semibold leading-snug sm:text-2xl">
                  {activeProject ? activeProject.title : hasTopic ? 'Your topic is ready. Start your proposal.' : 'A good research project starts with a topic.'}
                </h2>
                {activeProject ? (
                  <div className="mt-4 max-w-md">
                    <div className="mb-2 flex justify-between gap-3 text-xs text-muted-foreground">
                      <span className="capitalize">{activeProject.type} - Updated {dateLabel(activeProject.updatedAt)}</span>
                      <span>{projectProgress(activeProject)}% complete</span>
                    </div>
                    <Progress value={projectProgress(activeProject)} className="research-progress h-1.5" aria-label="Project progress" />
                  </div>
                ) : (
                  <p className="mt-3 max-w-lg break-words text-sm leading-6 text-muted-foreground">
                    {hasTopic ? user?.researchTopic : 'Choose a health issue, who you want to study and where the study will take place.'}
                  </p>
                )}
                <div className="mt-5 flex flex-col items-stretch gap-1 sm:items-start">
                <Button onClick={openNextAction} className="research-primary min-h-11 gap-2 shadow-sm">
                  {activeProject ? <PenLine size={17} /> : hasTopic ? <Plus size={17} /> : <Lightbulb size={17} />}
                  {nextAction.label}<ArrowRight size={16} />
                </Button>
                {!activeProject && !hasTopic && (
                  <Button variant="ghost" size="sm" asChild><Link to="/projects/new?type=proposal">I already have a topic</Link></Button>
                )}
                </div>
              </div>
              <div className="pointer-events-none hidden justify-self-end sm:block" aria-hidden="true">
                {activeProject ? (
                  <div className="research-paper relative flex aspect-[210/270] w-32 flex-col border bg-white p-4 text-center text-zinc-800 shadow-md lg:w-36">
                    <span className="mb-4 text-[9px] font-semibold uppercase text-teal-700">Research {activeProject.type}</span>
                    <span className="line-clamp-6 break-words font-serif text-xs font-bold uppercase leading-5">{activeProject.title}</span>
                    <span className="mt-auto pt-3 font-serif text-[10px]">UHPAB</span>
                  </div>
                ) : <img src="/research-notebook.webp" alt="" width={1536} height={1024} className="h-auto w-40 object-contain lg:w-52" decoding="async" />}
              </div>
            </div>
          )}
        </section>

        <section aria-label="Research tasks" className="research-arrive research-arrive-last grid gap-3 sm:grid-cols-2">
          <Link to="/document-analysis" className="research-task group flex min-w-0 items-start gap-3 rounded-lg border bg-card p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"><FileSearch size={21} /></span>
            <div className="min-w-0 flex-1"><h2 className="font-semibold">Check my document</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Upload an existing proposal or report for practice marking and corrections.</p></div>
            <ArrowRight size={16} className="mt-1 shrink-0 text-muted-foreground group-hover:text-primary" />
          </Link>
          <Link to="/guidelines" className="research-task group flex min-w-0 items-start gap-3 rounded-lg border bg-card p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"><BookOpen size={21} /></span>
            <div className="min-w-0 flex-1"><h2 className="font-semibold">Read the UHPAB guidelines</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Find the required sections, order and document formatting.</p></div>
            <ArrowRight size={16} className="mt-1 shrink-0 text-muted-foreground group-hover:text-primary" />
          </Link>
        </section>

        <div className="research-arrive research-arrive-last grid min-w-0 gap-8 lg:grid-cols-2 lg:gap-10">
        <section aria-labelledby="projects-heading" className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 id="projects-heading" className="flex items-center gap-2 text-base font-semibold"><span className="h-4 w-1 rounded-full bg-teal-600" aria-hidden="true" />Recent projects</h2>
            <Button variant="ghost" size="sm" asChild className="gap-2"><Link to="/projects">All projects<ArrowRight size={15} /></Link></Button>
          </div>
          {isLoading ? <p role="status" className="py-4 text-sm text-muted-foreground">Loading projects...</p> : sortedProjects.length ? (
            <ul className="divide-y border-y">
              {sortedProjects.slice(0, 3).map((project) => (
                <li key={project.id}>
                  <Link to={`/projects/${project.id}`} className="flex min-h-20 items-center gap-3 rounded-sm py-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <FileText size={19} className="shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1"><h3 className="line-clamp-2 break-words text-sm font-medium">{project.title}</h3><p className="mt-1 text-xs capitalize text-muted-foreground">{project.type} - {projectProgress(project)}% complete - {dateLabel(project.updatedAt)}</p></div>
                    <ArrowRight size={16} className="shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : <div className="research-empty border-y py-7"><FileText size={25} className="mb-3 text-muted-foreground/60" aria-hidden="true" /><p className="mb-1 text-sm font-medium">Room for your next idea</p><p className="max-w-xs text-sm leading-6 text-muted-foreground">Your projects will appear here once you start a proposal or report.</p></div>}
          {sortedProjects.length > 0 && <Button variant="outline" size="sm" asChild className="mt-4 gap-2"><Link to="/projects/new"><Plus size={15} />New project</Link></Button>}
        </section>

        <section aria-labelledby="checks-heading" className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 id="checks-heading" className="flex items-center gap-2 text-base font-semibold"><span className="h-4 w-1 rounded-full bg-amber-500" aria-hidden="true" />Saved document checks</h2>
            <Button variant="ghost" size="sm" asChild className="gap-2"><Link to="/projects?view=archive"><Archive size={15} />All saved reviews</Link></Button>
          </div>
          {checksLoading ? <p role="status" className="py-4 text-sm text-muted-foreground">Loading saved checks...</p> : checksError ? (
            <div role="alert" className="flex flex-wrap items-center gap-3 border-y py-4 text-sm"><span>Saved checks could not be loaded.</span><Button variant="outline" size="sm" onClick={() => setHistoryAttempt((value) => value + 1)}>Retry</Button></div>
          ) : checks.length ? (
            <ul className="divide-y border-y">
              {checks.map((check) => (
                <li key={check.id}><Link to="/document-analysis" state={{ documentAnalysisRecordId: check.id }} className="flex min-h-20 items-center gap-3 rounded-sm py-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <FileSearch size={19} className="shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1"><h3 className="truncate text-sm font-medium">{check.fileName}</h3><p className="mt-1 text-xs text-muted-foreground">{check.result.rubricScore ? `${check.result.rubricScore.awarded}/${check.result.rubricScore.total} practice marks` : 'Structure check'} - {dateLabel(check.updatedAt)}</p></div>
                  <ArrowRight size={16} className="shrink-0 text-muted-foreground" />
                </Link></li>
              ))}
            </ul>
          ) : <div className="research-empty border-y py-7"><FileSearch size={25} className="mb-3 text-muted-foreground/60" aria-hidden="true" /><p className="mb-1 text-sm font-medium">Your feedback, kept together</p><p className="max-w-xs text-sm leading-6 text-muted-foreground">No saved checks yet. Completed document checks will appear here.</p></div>}
        </section>
        </div>
      </WorkspacePage>
    </DashboardLayout>
  );
};

export default Dashboard;
