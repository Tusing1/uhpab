import React from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { WorkspacePage, WorkspacePageHeader } from "@/components/workspace/WorkspacePage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { markingGuideSourceUrl, reportMarkingGuide, totalMarkingGuideMarks } from "@/data/markingGuide";
import {
  ArrowRight,
  ArrowUpRight,
  ClipboardCheck,
  FileSearch,
  GraduationCap,
  ListChecks,
} from "lucide-react";

const MarkingGuide = () => {
  return (
    <DashboardLayout>
      <WorkspacePage>
        <WorkspacePageHeader
          eyebrow="Research report marking guide"
          tone="success"
          icon={<GraduationCap size={14} />}
          title="See exactly where the 100 marks come from"
          description="Use this guide to revise each report section before running the document checker. The criteria are paraphrased from the published research report marking guide."
          actions={
            <>
              <Button asChild className="gap-2">
                <Link to="/document-analysis">
                  Check my document
                  <ArrowRight size={16} />
                </Link>
              </Button>
              <Button asChild variant="outline" className="gap-2 bg-white/80">
                <a href={markingGuideSourceUrl} target="_blank" rel="noreferrer">
                  Source page
                  <ArrowUpRight size={16} />
                </a>
              </Button>
            </>
          }
          aside={
            <>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning-muted text-warning shadow-sm">
                <GraduationCap size={22} />
              </div>
              <div>
                <h2 className="font-semibold">Marking overview</h2>
                <p className="text-sm text-muted-foreground">Start with the highest-weight sections first.</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="text-2xl font-bold">{totalMarkingGuideMarks}</p>
                <p className="text-sm text-muted-foreground">total marks</p>
              </div>
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="text-2xl font-bold">{reportMarkingGuide.length}</p>
                <p className="text-sm text-muted-foreground">assessment areas</p>
              </div>
              <div className="rounded-lg border bg-warning-muted p-3 text-sm leading-6 text-warning-foreground sm:col-span-2 lg:col-span-1">
                Methodology, discussion, introduction, results, and literature review carry most of the marks.
              </div>
            </div>
            </>
          }
        />

        <section className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {reportMarkingGuide.map((section, index) => {
            const percentage = Math.round((section.marks / totalMarkingGuideMarks) * 100);
            return (
              <Card
                key={section.id}
                className="animate-fade-up rounded-lg border bg-white/85 p-4 shadow-sm"
                style={{ animationDelay: `${index * 45}ms` }}
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md border border-sky-200 bg-sky-50 text-primary">
                    {index % 2 === 0 ? <ClipboardCheck size={20} /> : <ListChecks size={20} />}
                  </div>
                  <Badge variant="outline" className="bg-primary/5 text-primary">
                    {section.marks} marks
                  </Badge>
                </div>
                <h3 className="font-semibold">{section.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{section.criteria.length} criteria</p>
                <Progress value={percentage} className="mt-3" />
              </Card>
            );
          })}
        </section>

        <section className="mt-8 space-y-4">
          {reportMarkingGuide.map((section, sectionIndex) => (
            <Card
              key={section.id}
              className="study-card animate-fade-up rounded-lg p-5"
              style={{ animationDelay: `${sectionIndex * 45}ms` }}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <Badge variant="outline" className="mb-3 bg-emerald-50 text-emerald-700">
                    {section.marks} marks
                  </Badge>
                  <h2 className="text-xl font-semibold">{section.title}</h2>
                </div>
                <Button asChild variant="outline" size="sm" className="w-fit gap-2 bg-white/80">
                  <Link to={`/document-analysis`}>
                    Run check
                    <FileSearch size={15} />
                  </Link>
                </Button>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {section.criteria.map((criterion) => (
                  <div key={criterion.id} className="rounded-lg border bg-white/75 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium">{criterion.label}</p>
                      <Badge variant="outline" className="shrink-0 bg-primary/5 text-primary">
                        {criterion.marks}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{criterion.guidance}</p>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </section>
      </WorkspacePage>
    </DashboardLayout>
  );
};

export default MarkingGuide;
