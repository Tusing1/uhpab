import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Bot, Quote, Save, Wand } from "lucide-react";
import parse from "html-react-parser";
import { RichTextEditor } from "@/components/ui/rich-text-editor";

interface ProjectEditorContentProps {
  isEditing: boolean;
  startEditing: () => void;
  cancelEditing: () => void;
  saveContent: () => void | Promise<void>;
  temporaryContent: string;
  setTemporaryContent: (val: string) => void;
  improveWithAI: (action?: string) => void;
  label: string;
  description: string;
  currentValue: string;
  allowAI?: boolean;
  stepLabel?: string;
  canPrevious?: boolean;
  canNext?: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
  onSaveAndNext?: () => void | Promise<void>;
  isAutoFilled?: boolean;
  isDeferredFinalPage?: boolean;
  onInsertCitation?: () => void;
  aiActions?: Array<{ id: string; label: string }>;
  pageMeta?: {
    pageNumber?: string;
    pageNumberKind: 'none' | 'roman' | 'arabic';
    chapterTitle?: string;
    sectionTitle?: string;
    isTitlePage?: boolean;
    isPreliminary?: boolean;
    continuesFromPrevious?: boolean;
  };
}

export const ProjectEditorContent: React.FC<ProjectEditorContentProps> = ({
  isEditing,
  startEditing,
  cancelEditing,
  saveContent,
  temporaryContent,
  setTemporaryContent,
  improveWithAI,
  label,
  description,
  currentValue,
  allowAI = true,
  stepLabel,
  canPrevious = false,
  canNext = false,
  onPrevious,
  onNext,
  onSaveAndNext,
  isAutoFilled = false,
  isDeferredFinalPage = false,
  onInsertCitation,
  aiActions = [
    { id: 'draft', label: 'Draft starter' },
    { id: 'improve', label: 'Improve' },
    { id: 'academic', label: 'Make academic' },
    { id: 'shorten', label: 'Shorten' },
    { id: 'uhpab', label: 'Check UHPAB' }
  ],
  pageMeta
}) => {
  const hasContent = currentValue?.trim().length > 0;
  const showDraftAction = allowAI && !isAutoFilled && !isDeferredFinalPage;
  const showPolishActions = allowAI && hasContent && !isAutoFilled && !isDeferredFinalPage;
  const polishActions = aiActions.filter((action) => action.id !== 'draft');
  const helperText = isAutoFilled
    ? "I have filled most of this page from the student's profile. Review it, then continue."
    : isDeferredFinalPage
      ? "This page is usually finished later after Chapter Three, tables, and findings exist. You can skip it for now."
      : hasContent
        ? "Review this section, make small edits if needed, then use Save and Next to keep moving."
        : "Start with this one section only. Write a short draft, use a starter where helpful, then save and continue.";
  const pageFooterLabel = pageMeta?.pageNumberKind === 'roman'
    ? `Preliminary page ${pageMeta.pageNumber}`
    : pageMeta?.pageNumberKind === 'arabic'
      ? `Page ${pageMeta.pageNumber}`
      : pageMeta?.pageNumber;

  return (
    <div className="space-y-5">
      <div className="rounded-lg border bg-cyan-50/80 p-4 text-cyan-950 dark:bg-cyan-950/30 dark:text-cyan-50">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-500 text-white shadow-sm">
            <Bot className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {stepLabel && <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-semibold text-cyan-800">{stepLabel}</span>}
            <p className="font-semibold">Study helper</p>
            </div>
            <p className="mt-1 text-sm">{helperText}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold">{label}</h3>
          <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          {!isEditing ? (
            <>
              {showDraftAction && (
                <Button onClick={() => improveWithAI('draft')} className="gap-2">
                  <Wand className="h-4 w-4" />
                  {hasContent ? "Regenerate draft" : "Generate draft"}
                </Button>
              )}
              <Button onClick={startEditing} variant={hasContent ? "default" : "outline"} className="gap-2">
                Edit section
              </Button>
            </>
          ) : (
            <>
              <Button onClick={cancelEditing} variant="outline">
                Cancel
              </Button>
              <Button onClick={saveContent} variant="outline" className="gap-2">
                <Save className="h-4 w-4" />
                Save
              </Button>
              {onInsertCitation && (
                <Button onClick={onInsertCitation} variant="outline" className="gap-2">
                  <Quote className="h-4 w-4" />
                  Insert citation
                </Button>
              )}
              <Button
                onClick={canNext ? onSaveAndNext : saveContent}
                className="gap-2 shadow-sm"
              >
                {canNext ? "Save and Next" : "Finish section"}
                {canNext ? <ArrowRight className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              </Button>
            </>
          )}
        </div>
      </div>

      {!isEditing && showPolishActions && (
        <div className="rounded-lg border bg-muted/25 p-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold">Polish and check after drafting</p>
              <p className="text-xs leading-5 text-muted-foreground">
                Use these only after the section has content. They improve wording, shorten, or check UHPAB alignment.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {polishActions.map((action) => (
                <Button key={action.id} onClick={() => improveWithAI(action.id)} variant="outline" size="sm" className="gap-2 bg-card">
                  <Wand className="h-3.5 w-3.5" />
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg bg-slate-100/80 p-3 ring-1 ring-border/70 sm:p-5 dark:bg-slate-950/30">
        <div
          className="mx-auto flex min-h-[760px] max-w-[794px] flex-col bg-white px-6 py-8 text-[12pt] leading-[2] text-slate-950 shadow-xl ring-1 ring-slate-200 sm:min-h-[980px] sm:px-12 sm:py-14"
          style={{ fontFamily: '"Times New Roman", Times, serif', lineHeight: 2 }}
        >
          <div className="min-h-[64px]">
            {pageMeta?.chapterTitle && !pageMeta.isTitlePage && (
              <p className="mb-3 text-center text-sm font-bold uppercase tracking-normal">
                {pageMeta.chapterTitle}
              </p>
            )}
            {pageMeta?.sectionTitle && !pageMeta.isTitlePage && (
              <p className={pageMeta.isPreliminary ? "mb-6 text-center text-sm font-bold uppercase" : "mb-4 text-sm font-bold"}>
                {pageMeta.sectionTitle}
              </p>
            )}
            {pageMeta?.continuesFromPrevious && (
              <p className="mb-4 text-xs italic text-slate-500">
                This section continues on the same running chapter page as the previous section.
              </p>
            )}
          </div>

          <div className="flex-1">
          {isEditing ? (
            <div className="space-y-3">
              <div className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-950">
                <p className="font-semibold">Writing box: {label}</p>
                <p>Write only this section, then use Save or Save and Next.</p>
              </div>
              <RichTextEditor
                value={temporaryContent}
                onChange={setTemporaryContent}
                placeholder={`Start writing ${label} here...`}
              />
            </div>
          ) : (
            <div
              className="prose prose-sm max-w-none text-justify text-[12pt] leading-[2]"
              style={{ fontFamily: '"Times New Roman", Times, serif', lineHeight: 2 }}
            >
              {hasContent ? (
                parse(currentValue)
              ) : (
                <div className="min-h-[520px] border-t border-dashed border-slate-200 pt-5 text-sm text-slate-500">
                  <div>
                    <p className="font-medium text-slate-700">Space reserved in the template.</p>
                    <p>Use Edit to write under this heading, or use Draft starter to insert a safe outline you can correct.</p>
                  </div>
                </div>
              )}
            </div>
          )}
          </div>
          {!isEditing && pageMeta?.pageNumberKind !== 'none' && pageMeta?.pageNumber && (
            <div className="border-t border-slate-100 pt-4 text-center text-[10pt] text-slate-500">
              {pageFooterLabel}
            </div>
          )}
        </div>
      </div>

      {!isEditing && (
        <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <Button onClick={onPrevious} variant="ghost" className="gap-2" disabled={!canPrevious}>
            <ArrowLeft className="h-4 w-4" />
            Previous section
          </Button>
          <Button onClick={onNext} className="gap-2" disabled={!canNext}>
            Next section
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
