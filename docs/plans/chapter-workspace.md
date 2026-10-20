# Chapter Workspaces: Implementation Plan

Status: implemented locally on 18 October 2026. Cloud migration and rollback-only owner/isolation/transfer tests completed on 20 October 2026. Desktop/mobile browser checks completed. Preparing release commit; live generative Gemini output was not exercised. See docs/chapter-workspace-release.md for release checks and remaining boundaries.

## Product decision

Add Work on a chapter under Work. Keep Find a topic, Check my document and the full-project workflow. Support proposal/report Chapters One, Two and Three, either as a complete chapter or selected sections. Do not add expert review, payments, similarity services or Chapters Four/Five in this release.

A chapter workspace is a private writing draft, not a marking upload. It persists until its owner deletes it; the seven-day marking-upload retention policy must not be applied to research drafts.

## Student journey

1. Open Work on a chapter. See saved chapter work and a Start chapter action.
2. Select Proposal or Report, then Chapter One, Two or Three.
3. Choose an owned project or enter/paste a topic. Prefill available project/profile context; do not require re-entry.
4. Choose Whole chapter or Specific sections. Use canonical UHPAB titles and numbering, not a second handwritten outline.
5. Confirm only the context needed for the selected sections. Keep optional information clearly separate.
6. Enter a focused workspace: section checklist, brief guidance, manuscript editor and one primary action.
7. Generate one section, review/edit it, then Save and Next. Manual writing always remains available.
8. Download the selected work as DOCX, continue later, or explicitly add it to a compatible full project.

Do not make students complete preliminary pages, school administration or unrelated chapters to use this feature. Identity details can be prefilled when needed, but must not block section drafting.

## Input requirements

### Shared

- Required: document type, chapter, scope, research topic.
- Ask for population, exact ages if known, and specific setting only when they cannot be reliably obtained from supplied context. Confirm extracted values before using them.
- Save research year for source-age checks. Use the actual research year, not silently the current year for every study.
- Report-mode sections describe actual completed methods; proposal-mode sections describe intended methods. Do not turn planned details into claims that research occurred.
- Imported project context is a snapshot with its source/update time. Topic/objective changes flag dependent drafts for review, without deleting them.

### Chapter One

- Short introduction uses the existing deterministic UHPAB paragraph, not a lengthy model essay.
- Background/problem generation needs supplied or verified evidence; topic alone must not produce fabricated local statistics or facility records.
- Objectives use the existing formulation engine: three by default, two when explicitly selected and appropriate for the topic.
- Specific objectives preserve the same topic continuation, respondent population and setting. Questions derive one-for-one from approved objectives.
- Students can confirm/edit objectives before dependent sections are drafted.
- Keep existing short-introduction, two-page background and half-page problem-statement guidance.

### Chapter Two

- Require approved objectives for generation of an objective-led review. Import them from an owned project or accept student-supplied objectives; do not silently regenerate them.
- Introduce the dependent variable before objective-led literature.
- Use the existing source/reference data shape. Extract citation and lookup helpers from ProjectEdit only where required for sharing, rather than copying them.
- Support manual sources and existing DOI/title/webpage lookup behaviour. Retrieved metadata alone is not evidence for a factual claim: record supporting excerpts/notes or accessible source text and verified identifiers.
- If adequate evidence is unavailable, show Sources needed for the affected section. Allow manual editing and saving; do not invent authors, findings or references.
- Flag missing evidence, limited source coverage, old references and incomplete synthesis. Whole-chapter checks include existing literature length/citation requirements; an individual section is not judged as if it were the entire chapter.

### Chapter Three

- Confirm design separately from approach, setting, target/access population, eligibility and actual sampling decisions.
- Collect sample-size inputs only when the selected method needs them. State the formula, assumptions and rounding; never invent a population count or force a quantitative calculation onto a qualitative design.
- Collect instruments, collection procedures, analysis plans, quality controls and ethical arrangements progressively for relevant sections.
- Distinguish permissions planned from permissions obtained. Never fabricate ethical clearance, signatures, consent or approval.
- Unknown details become explicit questions or clearly labelled incomplete fields, not plausible-sounding facts.

## Workspace UI

- Preserve the new dashboard/sidebar style. One new sidebar entry, not separate sidebar links for every chapter and section.
- Desktop: compact chapter checklist beside an unframed manuscript/editor area. Collapse the checklist on small screens; show the current section and a Change section control.
- Show only the selected section's guidance and relevant helpers. References belong with evidence-intensive sections, not a permanently expanded global panel.
- Primary action states: Generate draft when empty, Edit for a saved draft, Save and Next while editing. Regenerate is secondary and never silently overwrites edited work.
- Section states: Not started, Drafting, Needs information and Reviewed by me. The last label is the student's acknowledgement, not examiner approval.
- Keep A4 styling, Times New Roman 12 and existing formatting controls. A chapter starts on a fresh page; its subsections flow together, not one forced page per subsection.
- Show Saving, Saved, Unsaved changes, save failures and generation progress explicitly. Retain edited text on failures.
- Respect reduced motion, keyboard navigation and touch targets. Keep manual editing usable without a Gemini key; request a key only when generation is attempted.
- Do not offer a one-shot whole-chapter response in the first release. Whole chapter means a guided sequence through its sections. Later batch generation must expose each section's validation and allow cancellation.

## Shared engine and component boundaries

Reuse these existing sources of truth:

- src/data/proposalStructure.ts and reportStructure.ts: applicable chapters, section keys and numbering.
- src/data/researchGuidelineRules.ts: current formatting/applicability rules and version.
- src/lib/uhpabWritingEngine.ts: section contracts, deterministic formulation, prompt construction, validation and normalisation.
- src/utils/geminiApi.ts and existing authenticated generation path: user's own key and current error handling.
- src/components/ui/rich-text-editor.tsx: manuscript editing controls.
- src/lib/api.ts: existing DOCX building blocks; extend export scope rather than maintaining another formatter.

ProjectEdit currently owns project-specific state, reference forms and workflow navigation. Do not embed the entire component into a new route or duplicate it. Extract only genuinely shared section/context/export helpers, with regression tests for the existing full-document editor. Keep full-project state ownership in ProjectContext.

Proposed routes:

- /chapter-work: saved chapter work and start flow.
- /chapter-work/new: minimal setup, with optional preselected chapter.
- /chapter-work/:workspaceId: focused editor and resume state.

Use privateRoute rather than researcherRoute so school students are not redirected away from the tool. Existing school roles do not automatically gain access to another student's chapter drafts.

## Storage and security

Create a separate chapter_workspaces table with owner-only RLS, plus a small store module. Standalone chapter drafts must not populate the full Projects list as fake complete documents.

Proposed record:

```ts
type ChapterWorkspace = {
  id: string;
  userId: string;
  documentType: 'proposal' | 'report';
  chapterKey: 'chapter1' | 'chapter2' | 'chapter3';
  topic: string;
  selectedSectionIds: string[];
  context: StudyContext; // Typed topic/objectives/methodology facts and evidence.
  sections: Record<string, {
    content: string;
    status: 'not-started' | 'drafting' | 'needs-information' | 'reviewed';
    previousContent?: string;
    contextFingerprint?: string;
    updatedAt: string;
  }>;
  references: SavedReferences; // Compatible with existing references content/items.
  sources: SavedSource[]; // Compatible with the current source library.
  activeSectionId: string;
  guidelineVersion: string;
  sourceProjectId?: string;
  sourceProjectUpdatedAt?: string;
  createdAt: string;
  updatedAt: string;
  version: number;
};
```

Validate payload keys against the canonical structure; never accept arbitrary chapter keys as model instructions. Treat source text and pasted project data as untrusted content in prompts. Sanitize generated/pasted manuscript HTML using the same safe allowlist for preview and export.

Real authenticated accounts save to Supabase. Local demo accounts may use owner-scoped IndexedDB. Never fall back to browser-only storage while telling a real account that cloud saving succeeded. Debounced saves must flush before navigation/download and use version checks to prevent stale responses or another tab overwriting newer work. On failure preserve current text, show Unsaved and offer retry/download.

Do not create public document URLs, add drafts to search indexes or transmit entire unrelated projects to Gemini. Save sources and citations with the draft; never store an API key in workspace JSON. Apply the migration and verify isolation before enabling this route for production accounts.

## DOCX and project handoff

- Add an explicit export scope to shared DOCX construction: full document versus selected chapter/sections. Existing full-document downloads remain unchanged by default.
- A chapter-only download starts with its official chapter heading, keeps original section numbering and includes references cited by the selected work. It has Arabic page numbering from 1 and no unrelated preliminary pages or empty chapters.
- A one-section export still identifies its parent chapter and original number; do not renumber 1.2 to 1.0 just because it was selected alone.
- Preserve saved evidence/source links in the workspace. Missing references and unfilled details are visible warnings before download, not hidden or converted into fabricated references.
- Before export, present a concise incomplete-work summary. A student can download an explicitly labelled draft; do not certify compliance from presence checks alone.
- Add to project lists only owned compatible projects, shows the exact section changes and preserves existing content by default.
- For conflicts choose Skip, Append or Replace explicitly per section. Replacement requires confirmation and keeps a recoverable previous version.
- Use a transaction with ownership, document-type and expected-version checks. Merge reference/source records by stable ID/DOI/normalised URL without losing existing entries. Do not modify unrelated chapters or automatically mark imported work as reviewed/compliant.
- Leave the standalone workspace intact after the transfer, showing the destination and transfer time.

## Implementation order

1. Shared foundation: typed workspace/context model, canonical section selection, store + RLS migration, privacy/version tests. Isolate necessary shared editor/export helpers and prove full-project behaviour unchanged.
2. Vertical slice: Chapter One, standalone and project-linked input, section drafting/editing, save/resume, citation preservation and chapter-only DOCX. Validate against UHPAB fixtures before expanding.
3. Literature: Chapter Two objectives/evidence setup, section-specific source support and source-backed generation. No invented-reference fallback.
4. Methodology: Chapter Three progressive fact collection, design/approach validation and applicable sample-size checks.
5. Integration: safe project handoff, saved-work listing/dashboard access, mobile polish, migration deployment and production enablement after verification.

Each phase is usable and tested; do not turn on a half-connected production entry. Keep existing dashboard/navigation design changes local until the user approves publishing.

## Acceptance tests

- Student with only a topic can create, save and reopen Chapter One without a full project.
- Single-section work shows only selected sections and exports correct parent/numbering.
- Proposal/report use their own applicable rules and tense. Canonical guideline changes do not silently delete saved work.
- Introduction remains brief. Objectives preserve the common population/setting; questions match approved objectives, including explicit two-objective cases.
- Chapter Two generation blocks missing approved objectives/evidence and rejects invented citations. Sources/references survive reload/export/transfer.
- Chapter Three asks for missing facts, distinguishes approach/design, validates calculation inputs and never invents permission or collected data.
- Cancelling/regenerating does not erase edited content. Failed requests cannot report success. Navigation/download waits for the latest save.
- Two tabs cannot silently overwrite each other's drafts; stale context marks dependent sections for review.
- Another user and anonymous requests cannot list, read, edit, export or link someone else's workspace. School roles do not bypass ownership.
- Project transfer validates ownership/type/version, previews conflicts, preserves prior content and rolls back completely on failure.
- Chapter DOCX and full-document DOCX both pass content/XML tests and rendered layout inspection, including long headings and multi-page sections.
- Keyboard/mobile checks at 320/390px and desktop: no horizontal overflow, reachable controls, sensible focus, reduced-motion support.
- Regression: current project creation, full editor, references, marking, downloads and school-supervisor workflows remain functional.

## Explicit limits for the first release

No verified-source retrieval promise beyond the sources actually available; no official examiner grade; no guaranteed finished chapter from a topic alone; no automatic collection of patient data; no new document-upload flow or OCR; no paid expert review or payment handling; no automatic replacement of project content.
