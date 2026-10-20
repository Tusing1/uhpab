import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Check, Pencil, Quote, Save, Wand, X } from "lucide-react";
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
  busy?: boolean;
  generationBlocked?: boolean;
  fixedSection?: boolean;
  reviewed?: boolean;
  onReview?: (reviewed: boolean) => void;
  preparation?: React.ReactNode;
  nextLabel?: string;
  pageMeta?: {
    pageNumber?: string;
    pageNumberKind: 'none' | 'roman' | 'arabic';
    chapterTitle?: string;
    sectionTitle?: string;
    parentTitle?: string;
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
  pageMeta,
  preparation, nextLabel,
  busy = false, generationBlocked = false, fixedSection = false, reviewed = false, onReview,
}) => {
  const writingRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!isEditing) return;
    const frame = requestAnimationFrame(() => writingRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }));
    return () => cancelAnimationFrame(frame);
  }, [isEditing]);
  const hasContent = currentValue?.trim().length > 0;
  const isAbstract = /\babstract\b/i.test(label);
  const activeHasContent = !!(isEditing ? temporaryContent : currentValue)?.replace(/<[^>]*>/g, '').trim();
  const showDraftAction = allowAI && !isAutoFilled && !isDeferredFinalPage;
  const showPolishActions = allowAI && hasContent && !isAutoFilled && !isDeferredFinalPage && !fixedSection;
  const polishActions = aiActions.filter((action) => !['draft', 'draftWithBackground'].includes(action.id));
  const pageFooterLabel = pageMeta?.pageNumberKind === 'roman'
    ? `Preliminary page ${pageMeta.pageNumber}`
    : pageMeta?.pageNumberKind === 'arabic'
      ? `Estimated page ${pageMeta.pageNumber}`
      : pageMeta?.pageNumber;

  return (
    <fieldset disabled={busy} className="min-w-0 w-full space-y-5 border-0 p-0 pb-44 sm:pb-0">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        {stepLabel && <span>{stepLabel}</span>}
        <ol aria-label="Section workflow" className="flex flex-wrap items-center gap-2">
          <li className={!activeHasContent ? 'font-semibold text-foreground' : ''}>1. Prepare</li><li aria-hidden="true">/</li>
          <li className={isEditing ? 'font-semibold text-foreground' : ''}>2. Write</li><li aria-hidden="true">/</li>
          <li className={activeHasContent && !isEditing ? 'font-semibold text-foreground' : ''}>3. Review{reviewed && <Check className="ml-1 inline h-3 w-3 text-teal-700" aria-label="Reviewed" />}</li>
        </ol>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold">{label}</h3>
          <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          {!isEditing ? (
            <>
              {showDraftAction && !hasContent && (
                <Button disabled={generationBlocked} variant={generationBlocked ? 'outline' : 'default'} onClick={() => improveWithAI('draft')} className="min-h-11 gap-2">
                  <Wand className="h-4 w-4" />
                  Generate draft
                </Button>
              )}
              <Button onClick={startEditing} variant={hasContent || generationBlocked || !showDraftAction ? "default" : "outline"} className="min-h-11 gap-2">
                <Pencil className="h-4 w-4" />{hasContent ? 'Edit section' : 'Write myself'}
              </Button>
            </>
          ) : (
            <>
              <Button onClick={cancelEditing} variant="outline" className="min-h-11 gap-2">
                <X className="h-4 w-4" />Cancel editing
              </Button>
              {onInsertCitation && !fixedSection && (
                <Button onClick={onInsertCitation} variant="outline" className="gap-2">
                  <Quote className="h-4 w-4" />
                  Insert citation
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {preparation}

      {(isEditing || showPolishActions) && (
        <details className="border-y py-3">
          <summary className="cursor-pointer text-sm font-medium">More tools</summary>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2">
              {isEditing && <Button variant="outline" size="sm" onClick={saveContent}><Save className="mr-2 h-4 w-4" />Save without moving</Button>}
              {!isEditing && !fixedSection && <Button variant="outline" size="sm" disabled={generationBlocked} onClick={() => improveWithAI('draft')}>Regenerate draft</Button>}
              {!isEditing && showPolishActions && polishActions.filter(action => action.id !== 'humanize').map((action) => (
                <Button key={action.id} disabled={generationBlocked} onClick={() => improveWithAI(action.id)} variant="outline" size="sm" className="gap-2 bg-card">
                  <Wand className="h-3.5 w-3.5" />
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        </details>
      )}

      <div ref={writingRef} className="scroll-mt-56 rounded-lg bg-slate-100/80 p-3 ring-1 ring-border/70 sm:scroll-mt-40 sm:p-5 dark:bg-slate-950/30">
        <div
          className="mx-auto flex min-h-[480px] max-w-[794px] flex-col bg-white px-4 py-8 text-[12pt] leading-[2] text-slate-950 shadow-xl ring-1 ring-slate-200 sm:min-h-[980px] sm:px-12 sm:py-14"
          style={{ fontFamily: '"Times New Roman", Times, serif', lineHeight: 2 }}
        >
          <div className="min-h-[64px]">
            {pageMeta?.chapterTitle && !pageMeta.isTitlePage && (
              <p className="mb-3 text-center text-[12pt] font-bold uppercase tracking-normal">
                {pageMeta.chapterTitle}
              </p>
            )}
            {pageMeta?.parentTitle && <p className="mb-3 text-[12pt] font-bold">{pageMeta.parentTitle}</p>}
            {pageMeta?.sectionTitle && !pageMeta.isTitlePage && (
              <p className={pageMeta.isPreliminary ? "mb-6 text-center text-[12pt] font-bold uppercase" : "mb-4 text-[12pt] font-bold"}>
                {pageMeta.sectionTitle}
              </p>
            )}
          </div>

          <div className="flex-1">
          {isEditing ? (
            <div className="space-y-3">
              <RichTextEditor
                disabled={busy}
                singleSpaced={isAbstract}
                value={temporaryContent}
                onChange={setTemporaryContent}
                placeholder={`Start writing ${label} here...`}
              />
            </div>
          ) : (
            <div
              className="prose prose-sm max-w-none break-words text-justify text-[12pt] leading-[2] [overflow-wrap:anywhere] [&_table]:max-w-full"
              style={{ fontFamily: '"Times New Roman", Times, serif', lineHeight: isAbstract ? 1 : 2 }}
            >
              {hasContent ? (
                parse(currentValue)
              ) : (
                <div className="min-h-[240px] border-t border-dashed border-slate-200" aria-label="Empty section" />
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

      <div className="fixed inset-x-0 bottom-0 z-40 space-y-3 border-t bg-background px-4 py-3 [padding-bottom:max(0.75rem,env(safe-area-inset-bottom))] sm:sticky sm:inset-x-auto sm:z-20 sm:px-0">
        {onReview && <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm"><input type="checkbox" className="h-4 w-4 shrink-0 accent-primary" checked={reviewed} disabled={!activeHasContent} onChange={event => onReview(event.target.checked)} />I have checked this section's wording, facts and sources.</label>}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button onClick={onPrevious} variant="ghost" className="min-h-11 gap-2" disabled={!canPrevious}>
            <ArrowLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button onClick={canNext ? (isEditing ? onSaveAndNext : onNext) : saveContent} variant={activeHasContent ? 'default' : 'outline'} className="min-h-11 gap-2">
            {busy ? 'Saving...' : activeHasContent ? (canNext ? 'Save and Next' : 'Save section') : 'Finish later'}
            {canNext ? <ArrowRight className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          </Button>
        </div>
        {canNext && nextLabel && <p className="break-words text-right text-xs text-muted-foreground">Next: {nextLabel}</p>}
      </div>
    </fieldset>
  );
};
