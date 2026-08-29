import React from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { WorkspacePage, WorkspacePageHeader } from "@/components/workspace/WorkspacePage";
import { WorkspaceCountBadge, WorkspaceSectionHeader } from "@/components/workspace/WorkspaceWorkflow";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { studentPremiumPricing } from "@/data/pricing";
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileCheck,
  FileText,
  GraduationCap,
  HelpCircle,
  Lightbulb,
  MessageSquareText,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  UserPlus,
  UserCheck,
  Users,
} from "lucide-react";

const studentSteps = [
  {
    title: "Find your research title",
    text: "Use plain words. Mention the topic, people or place, and what you want to find out.",
    icon: Lightbulb,
    href: "/research-topic-generator",
    action: "Get title help",
    color: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    title: "Create your proposal",
    text: "Use the chosen title to create a proposal workspace with the correct UHPAB structure.",
    icon: FileText,
    href: "/projects/new?type=proposal",
    action: "Create proposal",
    color: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    title: "Start the full report",
    text: "Open a report workspace when you are ready to write findings, discussion, conclusion, and recommendations.",
    icon: BookOpen,
    href: "/projects/new?type=report",
    action: "Create report",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    title: "Follow each UHPAB section",
    text: "Open the guide and fill one section at a time so nothing important is missed.",
    icon: BookOpen,
    href: "/guidelines",
    action: "Open guide",
    color: "bg-teal-50 text-teal-700 border-teal-200",
  },
  {
    title: "Check your document",
    text: "Find missing sections, formatting problems, and places that may need correction.",
    icon: SearchCheck,
    href: "/document-analysis",
    action: "Check document",
    color: "bg-sky-50 text-sky-700 border-sky-200",
  },
  {
    title: "Improve the wording",
    text: "Make paragraphs clearer and more academic while keeping your meaning.",
    icon: MessageSquareText,
    href: "/content-improvement",
    action: "Improve writing",
    color: "bg-violet-50 text-violet-700 border-violet-200",
  },
  {
    title: "Review and submit",
    text: "Read the final version, compare it with the UHPAB guide, then export or share as required.",
    icon: FileCheck,
    href: "/projects",
    action: "Open my work",
    color: "bg-rose-50 text-rose-700 border-rose-200",
  },
];

const schoolSteps = [
  {
    title: "Open the school workspace",
    text: "Use the command center as the school admin home for candidates, cohorts, assignments, submissions, and exports.",
    icon: GraduationCap,
    href: "/school-dashboard",
    action: "Open workspace",
    color: "bg-teal-50 text-teal-700 border-teal-200",
  },
  {
    title: "Create cohorts and invite codes",
    text: "Set the class, programme, academic year, capacity, and lead supervisor before registering candidates.",
    icon: Users,
    href: "/school-dashboard#create-cohort",
    action: "Create cohort",
    color: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    title: "Register candidates",
    text: "Add one candidate at a time or paste a class list with name, HTIN, email, phone, and topic.",
    icon: UserPlus,
    href: "/school-dashboard#candidate-registration",
    action: "Register candidates",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    title: "Check the candidate register",
    text: "Search candidates by HTIN, cohort, supervisor, account status, or topic readiness, then export the register.",
    icon: ClipboardCheck,
    href: "/school-dashboard#candidate-register",
    action: "Open register",
    color: "bg-sky-50 text-sky-700 border-sky-200",
  },
  {
    title: "Assign supervisors and tasks",
    text: "Balance supervisor workload, then publish proposal or report tasks with section and due date.",
    icon: CalendarClock,
    href: "/school-dashboard#supervisor-workload",
    action: "Review workload",
    color: "bg-violet-50 text-violet-700 border-violet-200",
  },
  {
    title: "Track submissions and exports",
    text: "Monitor submitted files, marking status, originality attention, and export summaries for school records.",
    icon: Download,
    href: "/school-dashboard#assignments-submissions",
    action: "Track submissions",
    color: "bg-rose-50 text-rose-700 border-rose-200",
  },
];

const supervisorSteps = [
  {
    title: "Open supervisor workspace",
    text: "Start from the supervisor review desk to see pending submissions, correction pressure, and ready-for-admin work.",
    icon: UserCheck,
    href: "/supervisor-dashboard",
    action: "Open review desk",
    color: "bg-teal-50 text-teal-700 border-teal-200",
  },
  {
    title: "Check assigned students",
    text: "Search your candidates by name, HTIN, cohort, topic, stage, or correction status.",
    icon: Users,
    href: "/supervisor-students",
    action: "Open students",
    color: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    title: "Review latest submissions",
    text: "Open each student's latest submitted work, marking status, originality attention, and previous supervisor comments.",
    icon: FileCheck,
    href: "/supervisor-dashboard",
    action: "Review queue",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    title: "Add correction comments",
    text: "Leave comments by section, marking-guide issue, citation issue, originality issue, formatting, or general guidance.",
    icon: MessageSquareText,
    href: "/supervisor-students",
    action: "Comment on work",
    color: "bg-sky-50 text-sky-700 border-sky-200",
  },
  {
    title: "Mark and decide",
    text: "Record awarded marks, strengths, required corrections, and a decision such as needs correction or ready for admin.",
    icon: ClipboardCheck,
    href: "/supervisor-students",
    action: "Open review form",
    color: "bg-violet-50 text-violet-700 border-violet-200",
  },
  {
    title: "Export supervisor register",
    text: "Download your assigned-student register with latest submissions, decisions, marks, and open comments.",
    icon: Download,
    href: "/supervisor-dashboard",
    action: "Export records",
    color: "bg-rose-50 text-rose-700 border-rose-200",
  },
];

const studentQuickTips = [
  "Save your work after finishing each section.",
  "Use short paragraphs and clear headings.",
  "Do not paste patient names or private clinical information.",
  "Ask your tutor before changing an approved title.",
];

const schoolQuickTips = [
  "Create the cohort before importing a class list.",
  "Verify HTIN or candidate numbers before sending invite codes.",
  "Assign every candidate to a supervisor early.",
  "Export the register after each major registration update.",
  "Do not store patient names or private clinical information in student topics.",
];

const supervisorQuickTips = [
  "Review submitted work before adding new correction comments.",
  "Keep comments specific to a section or marking-guide criterion.",
  "Use Needs correction only when the student has clear action items.",
  "Use Ready for admin when the supervisor review is complete.",
  "Do not include patient identifiers or private clinical details in comments.",
];

const roadmapTitle = (schoolAdmin: boolean, schoolSupervisor: boolean) => {
  if (schoolAdmin) return "School research administration roadmap";
  if (schoolSupervisor) return "Supervisor review roadmap";
  return "Your UHPAB research roadmap";
};

const roadmapDescription = (schoolAdmin: boolean, schoolSupervisor: boolean) => {
  if (schoolAdmin) {
    return "A practical path for registering candidates, organizing cohorts, assigning supervisors, and tracking submissions from the school workspace.";
  }
  if (schoolSupervisor) {
    return "A practical path for tracking assigned students, reviewing submissions, adding comments, and sending ready work back to the school office.";
  }
  return "A simple path from first title to final review. Each roadmap stop opens the tool that helps with that step.";
};

const GettingStarted = () => {
  const navigate = useNavigate();
  const { isPremium, isSchoolAdmin, isSchoolSupervisor } = useAuth();
  const hasPremiumAccess = isPremium();
  const schoolAdmin = isSchoolAdmin();
  const schoolSupervisor = isSchoolSupervisor();
  const roadmapSteps = schoolAdmin ? schoolSteps : schoolSupervisor ? supervisorSteps : studentSteps;
  const quickTips = schoolAdmin ? schoolQuickTips : schoolSupervisor ? supervisorQuickTips : studentQuickTips;

  return (
    <DashboardLayout>
      <WorkspacePage width="wide">
        <WorkspacePageHeader
          eyebrow="Start here"
          tone="success"
          icon={<HelpCircle size={14} />}
          title={roadmapTitle(schoolAdmin, schoolSupervisor)}
          description={roadmapDescription(schoolAdmin, schoolSupervisor)}
          actions={
            <>
              <Button
                className="gap-2"
                onClick={() =>
                  navigate(
                    schoolAdmin
                      ? "/school-dashboard#candidate-registration"
                      : schoolSupervisor
                        ? "/supervisor-dashboard"
                        : "/research-topic-generator"
                  )
                }
              >
                {schoolAdmin ? "Register candidates" : schoolSupervisor ? "Open review desk" : "Find my topic"}
                {schoolAdmin ? <UserPlus size={16} /> : schoolSupervisor ? <UserCheck size={16} /> : <ArrowRight size={16} />}
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() =>
                  navigate(
                    schoolAdmin
                      ? "/school-dashboard#candidate-register"
                      : schoolSupervisor
                        ? "/supervisor-students"
                        : "/document-analysis"
                  )
                }
              >
                {schoolAdmin ? "Open candidate register" : schoolSupervisor ? "Open assigned students" : "Check existing document"}
                {schoolAdmin || schoolSupervisor ? <ClipboardCheck size={16} /> : <SearchCheck size={16} />}
              </Button>
            </>
          }
          aside={
            <>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-info-muted text-info">
                  <HelpCircle size={20} />
                </span>
                <div>
                  <h2 className="font-semibold">Best first step</h2>
                  <p className="text-sm text-muted-foreground">
                    {schoolAdmin
                      ? "Set the cohort structure before registering a class."
                      : schoolSupervisor
                        ? "Start with pending submissions, then clear correction comments."
                        : "Choose the path that matches your current work."}
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <p>
                    {schoolAdmin ? (
                      <>
                        New intake? Start with <strong>Create cohort</strong>, then register candidates.
                      </>
                    ) : schoolSupervisor ? (
                      <>
                        New submission? Start with <strong>Open review desk</strong>.
                      </>
                    ) : (
                      <>
                        New proposal or report? Start with <strong>Find your research title</strong>.
                      </>
                    )}
                  </p>
                </div>
                <div className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <p>
                    {schoolAdmin ? (
                      <>
                        Already have a class list? Use <strong>Bulk import</strong> in the school workspace.
                      </>
                    ) : schoolSupervisor ? (
                      <>
                        Need to follow one candidate? Use <strong>Assigned students</strong>.
                      </>
                    ) : (
                      <>
                        Already have a document? Use <strong>Check existing document</strong>.
                      </>
                    )}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/40 p-3">
                  <p className="font-medium">Keep it simple</p>
                  <p className="mt-1 text-muted-foreground">
                    {schoolAdmin
                      ? "Keep cohorts, candidates, supervisors, and submissions in one admin flow."
                      : schoolSupervisor
                        ? "Keep marks, comments, and final decisions inside the student review page."
                      : "Finish one roadmap stop before moving to the next one."}
                  </p>
                </div>
              </div>
            </>
          }
        />

        <section className="mt-8">
          <WorkspaceSectionHeader
            title="Roadmap"
            description={
              schoolAdmin
                ? "Open any step to continue in the school workspace."
                : schoolSupervisor
                  ? "Open any step to continue in the supervisor workspace."
                  : "Open any step to continue with the matching tool."
            }
            actions={<WorkspaceCountBadge count={roadmapSteps.length} label="steps" />}
          />

          <div className="grid auto-rows-fr gap-4 md:grid-cols-2 xl:grid-cols-3">
            {roadmapSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <Link
                  key={step.title}
                  to={step.href}
                  className="group flex min-h-[16.5rem] animate-fade-up flex-col rounded-lg border bg-card p-4 shadow-sm transition-colors duration-200 hover:border-primary/40 hover:bg-muted/20 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  style={{ animationDelay: `${index * 70}ms` }}
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md border ${step.color}`}>
                      <Icon size={20} />
                    </div>
                    <span className="rounded-md border bg-muted/35 px-2 py-1 text-xs font-semibold uppercase text-muted-foreground">
                      Step {index + 1}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold leading-6">{step.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">{step.text}</p>
                  <span className="mt-5 flex items-center justify-between gap-3 border-t pt-4 text-sm font-medium text-primary">
                    <span>{step.action}</span>
                    <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <section className={`mt-8 grid gap-4 ${hasPremiumAccess ? "" : "lg:grid-cols-[0.8fr_1.2fr]"}`}>
          <Card className="animate-fade-up [animation-delay:120ms]">
            <CardHeader>
              <CardTitle className="text-lg">Quick safety tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {quickTips.map((tip) => (
                <div key={tip} className="flex gap-3 text-sm">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{tip}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {!hasPremiumAccess && (
            <Card className="animate-fade-up overflow-hidden border-primary/20 bg-white/88 backdrop-blur [animation-delay:180ms]">
              <div className="grid gap-0 md:grid-cols-[1fr_0.75fr]">
                <div className="p-6">
                  <div className="mb-3 flex items-center gap-2 text-primary">
                    <Sparkles size={18} />
                    <span className="text-sm font-semibold">Premium support</span>
                  </div>
                  <h2 className="text-xl font-semibold">Need more powerful help?</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Premium gives guided AI help for section writing, document checks, clearer wording, and downloadable review reports.
                  </p>
                  <Button className="mt-4 gap-2" onClick={() => navigate("/premium")}>
                    See premium tools
                    <ArrowRight size={16} />
                  </Button>
                </div>
                <div className="bg-slate-900 p-6 text-white">
                  <p className="text-sm text-white/70">Student plan</p>
                  <p className="mt-2 text-3xl font-bold">{studentPremiumPricing.monthly.amount}</p>
                  <p className="text-sm text-white/70">per month, cancel anytime</p>
                  <div className="mt-5 space-y-2 text-sm text-white/85">
                    <p>Section-by-section writing help</p>
                    <p>Detailed document review</p>
                    <p>Exportable feedback reports</p>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </section>
      </WorkspacePage>
    </DashboardLayout>
  );
};

export default GettingStarted;
