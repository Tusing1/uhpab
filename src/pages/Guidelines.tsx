import React, { useMemo, useState } from "react";
import { proposalStructure } from "@/data/uhpabGuidelines";
import officialGuidelines from "@/data/uhpabOfficialGuidelines";
import { proposalOutline, reportOutline } from "@/data/uhpabPdfOutline";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { WorkspacePage, WorkspacePageHeader } from "@/components/workspace/WorkspacePage";
import { WorkspaceMetric } from "@/components/workspace/WorkspaceWorkflow";
import { triggerBrowserDownload } from "@/lib/download";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowUpRight,
  BookOpenCheck,
  CheckCircle2,
  Download,
  FileText,
  GraduationCap,
  Lightbulb,
  ListChecks,
  Sparkles,
} from "lucide-react";

const officialPdfPath = "/uhpab-research-guidelines.pdf";

type OfficialGuideline = {
  section_id: string;
  document_type: string;
  section_name: string;
  parent_section_id: string | null;
  rules_and_guidelines: string[];
  formatting_notes: string[];
  page_count_limits: string | null;
  examples: string[];
  prompt_keywords: string[];
};

const proposalChapters = Object.entries(proposalStructure).map(([key, chapter]: [string, any]) => ({
  key,
  chapter,
  sectionCount: chapter.sections ? Object.keys(chapter.sections).length : 1,
}));

const officialRoots = (officialGuidelines as OfficialGuideline[]).filter((section) => !section.parent_section_id);

const childrenFor = (parentId: string) =>
  (officialGuidelines as OfficialGuideline[]).filter((section) => section.parent_section_id === parentId);

const OutlinePanel = ({ title, items }: { title: string; items: string[] }) => (
  <div className="rounded-lg border bg-white/80 p-4">
    <div className="mb-3 flex items-center justify-between gap-3">
      <h3 className="font-semibold">{title}</h3>
      <Badge variant="outline" className="bg-primary/5 text-primary">
        {items.length} items
      </Badge>
    </div>
    <ol className="max-h-[420px] space-y-2 overflow-auto pr-1 text-sm text-muted-foreground">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="flex gap-2 rounded-md bg-slate-50 px-3 py-2">
          <span className="font-medium text-primary">{index + 1}</span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  </div>
);

const renderOfficialDetail = (section: OfficialGuideline) => (
  <div className="space-y-4">
    {section.rules_and_guidelines?.length > 0 && (
      <div className="rounded-lg border bg-white/75 p-4">
        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <ListChecks className="h-4 w-4 text-primary" />
          Official UHPAB rules and guidance
        </h4>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {section.rules_and_guidelines.map((rule, index) => (
            <li key={index} className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span>{rule}</span>
            </li>
          ))}
        </ul>
      </div>
    )}

    <div className="grid gap-3 md:grid-cols-2">
      {section.formatting_notes?.length > 0 && (
        <div className="rounded-lg border bg-sky-50/80 p-4 text-sm">
          <p className="font-semibold text-sky-950">Formatting notes</p>
          <ul className="mt-2 space-y-1.5 text-sky-950/75">
            {section.formatting_notes.map((note, index) => (
              <li key={index}>{note}</li>
            ))}
          </ul>
        </div>
      )}
      {section.page_count_limits && (
        <div className="rounded-lg border bg-amber-50/80 p-4 text-sm">
          <p className="font-semibold text-amber-950">Page guidance</p>
          <p className="mt-2 leading-6 text-amber-900/80">{section.page_count_limits}</p>
        </div>
      )}
    </div>

    {section.examples?.length > 0 && (
      <div className="rounded-lg border bg-violet-50/80 p-4">
        <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-violet-950">
          <Lightbulb className="h-4 w-4" />
          Example from the new UHPAB file
        </h4>
        <p className="whitespace-pre-wrap text-sm leading-6 text-violet-950/80">
          {section.examples[0]}
        </p>
      </div>
    )}

    {section.prompt_keywords?.length > 0 && (
      <div className="flex flex-wrap gap-2">
        {section.prompt_keywords.map((keyword) => (
          <Badge key={keyword} variant="outline" className="bg-white/75 text-muted-foreground">
            {keyword}
          </Badge>
        ))}
      </div>
    )}
  </div>
);

const OfficialReportGuide = () => (
  <div className="space-y-4">
    {officialRoots.map((root, rootIndex) => {
      const children = childrenFor(root.section_id);
      return (
        <div
          key={root.section_id}
          className="study-card animate-fade-up rounded-lg p-4"
          style={{ animationDelay: `${rootIndex * 45}ms` }}
        >
          <div className="mb-4">
            <Badge variant="outline" className="mb-3 bg-emerald-50 text-emerald-700">
              Official JSON source
            </Badge>
            <h2 className="text-xl font-semibold">{root.section_name}</h2>
            {root.rules_and_guidelines?.[0] && (
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{root.rules_and_guidelines[0]}</p>
            )}
          </div>

          {children.length > 0 ? (
            <Accordion type="single" collapsible className="rounded-md border bg-white/65">
              <AccordionItem value={`${root.section_id}-overview`} className="px-4">
                <AccordionTrigger className="text-left hover:no-underline">
                  <span className="font-medium">Overview and general rules</span>
                </AccordionTrigger>
                <AccordionContent>{renderOfficialDetail(root)}</AccordionContent>
              </AccordionItem>
              {children.map((section) => (
                <AccordionItem key={section.section_id} value={section.section_id} className="px-4">
                  <AccordionTrigger className="text-left hover:no-underline">
                    <span className="font-medium">{section.section_name}</span>
                  </AccordionTrigger>
                  <AccordionContent>{renderOfficialDetail(section)}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            renderOfficialDetail(root)
          )}
        </div>
      );
    })}
  </div>
);

const renderProposalDetail = (section: any) => (
  <div className="space-y-4">
    {section.description && <p className="text-sm leading-6 text-muted-foreground">{section.description}</p>}
    {section.requirements?.length > 0 && (
      <div className="rounded-lg border bg-white/75 p-4">
        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <ListChecks className="h-4 w-4 text-primary" />
          What to include
        </h4>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {section.requirements.map((req: string, index: number) => (
            <li key={index} className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span>{req}</span>
            </li>
          ))}
        </ul>
      </div>
    )}
    {section.formatting && (
      <div className="rounded-lg border bg-sky-50/80 p-4 text-sm">
        <p className="font-semibold text-sky-950">Formatting</p>
        <p className="mt-2 leading-6 text-sky-950/75">{section.formatting}</p>
      </div>
    )}
  </div>
);

const ProposalReferenceGuide = () => (
  <div className="space-y-4">
    <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-4">
      <p className="text-sm leading-6 text-emerald-950">
        This proposal guide has been corrected against the scanned UHPAB Research Guidelines PDF, including the updated Chapter One numbering and Chapter Three methodology list.
      </p>
    </div>
    {proposalChapters.map(({ key, chapter, sectionCount }, chapterIndex) => (
      <div
        key={key}
        className="study-card animate-fade-up rounded-lg p-4"
        style={{ animationDelay: `${chapterIndex * 45}ms` }}
      >
        <Badge variant="outline" className="mb-3 bg-primary/5 text-primary">
          {sectionCount} {sectionCount === 1 ? "section" : "sections"}
        </Badge>
        <h2 className="text-xl font-semibold">{chapter.title}</h2>
        {chapter.description && (
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{chapter.description}</p>
        )}
        <div className="mt-4">
          {chapter.sections ? (
            <Accordion type="single" collapsible className="rounded-md border bg-white/65">
              {Object.entries(chapter.sections).map(([sectionKey, section]: [string, any]) => (
                <AccordionItem key={sectionKey} value={sectionKey} className="px-4">
                  <AccordionTrigger className="text-left hover:no-underline">
                    <span className="font-medium">{section.title}</span>
                  </AccordionTrigger>
                  <AccordionContent>{renderProposalDetail(section)}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            renderProposalDetail(chapter)
          )}
        </div>
      </div>
    ))}
  </div>
);

const Guidelines: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"proposal" | "report">("proposal");
  const reportSectionCount = (officialGuidelines as OfficialGuideline[]).length;
  const reportMainPartCount = useMemo(() => officialRoots.length, []);

  return (
    <DashboardLayout>
      <WorkspacePage>
        <WorkspacePageHeader
          eyebrow="Official UHPAB structure"
          tone="success"
          icon={<BookOpenCheck size={14} />}
          title="UHPAB proposal and report guidelines"
          description="Follow the official proposal and report structure, with proposal guidance first because students complete it before the full report."
          actions={
            <>
              <Button asChild className="gap-2">
                <a href={officialPdfPath} target="_blank" rel="noreferrer">
                  Open official PDF
                  <ArrowUpRight size={16} />
                </a>
              </Button>
              <Button
                variant="outline"
                className="gap-2 bg-white/80"
                onClick={() => triggerBrowserDownload(officialPdfPath, "UHPAB-Research-Guidelines.pdf")}
              >
                Download PDF
                <Download size={16} />
              </Button>
            </>
          }
          aside={
            <>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning-muted text-warning shadow-sm">
                <Sparkles size={22} />
              </div>
              <div>
                <h2 className="font-semibold">Current official guide</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Chapter One numbering was corrected, report Chapter One and Two accordions were added, Chapter Three now includes 3.0 to 3.15, and the full Proposal vs Report roadmap is visible.
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <WorkspaceMetric label="Official main parts" value={reportMainPartCount} tone="warning" />
              <WorkspaceMetric label="Official sections" value={reportSectionCount} tone="info" />
            </div>
            <div className="mt-4 grid gap-2 text-sm text-foreground/80">
              <div className="rounded-lg border bg-muted/40 p-3">
                <strong>HTIN on title page:</strong> Health Trainee Identification Number is now shown in the official title page rules.
              </div>
              <div className="rounded-lg border bg-muted/40 p-3">
                <strong>30+ pages:</strong> The report should not be below 30 pages from Chapter One through appendices.
              </div>
              <div className="rounded-lg border bg-muted/40 p-3">
                <strong>Updated Chapter 4 and 5:</strong> Findings, discussions, recommendations, conclusions, and health profession implications are separated clearly.
              </div>
            </div>
            </>
          }
        />

        <section className="mt-8 grid gap-4 lg:grid-cols-2">
          <OutlinePanel title="Proposal structure from PDF" items={proposalOutline} />
          <OutlinePanel title="Report structure from PDF" items={reportOutline} />
        </section>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "proposal" | "report")}
          className="mt-8"
        >
          <TabsList className="grid h-auto w-full gap-2 rounded-lg bg-white/70 p-2 sm:grid-cols-2">
            <TabsTrigger value="proposal" className="gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <FileText size={16} />
              Proposal reference
            </TabsTrigger>
            <TabsTrigger value="report" className="gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BookOpenCheck size={16} />
              New official report guide
            </TabsTrigger>
          </TabsList>

          <div className="my-6 grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border bg-white/80 p-4">
              <GraduationCap className="mb-2 h-5 w-5 text-primary" />
              <p className="font-semibold">Open access</p>
              <p className="text-sm text-muted-foreground">No premium lock on guideline content.</p>
            </div>
            <div className="rounded-lg border bg-white/80 p-4">
              <ListChecks className="mb-2 h-5 w-5 text-emerald-600" />
              <p className="font-semibold">New JSON content</p>
              <p className="text-sm text-muted-foreground">Report sections now derive from the official UHPAB data.</p>
            </div>
            <div className="rounded-lg border bg-white/80 p-4">
              <Lightbulb className="mb-2 h-5 w-5 text-amber-600" />
              <p className="font-semibold">Examples included</p>
              <p className="text-sm text-muted-foreground">Official examples and keywords are displayed.</p>
            </div>
          </div>

          <TabsContent value="proposal">
            <ProposalReferenceGuide />
          </TabsContent>
          <TabsContent value="report">
            <OfficialReportGuide />
          </TabsContent>
        </Tabs>
      </WorkspacePage>
    </DashboardLayout>
  );
};

export default Guidelines;
