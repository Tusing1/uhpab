# Student Writing Walkthrough

Tested 20 October 2026 against the signed-in production full-project editor. This is an audit, not an implementation or release. Existing work was preserved. The previously empty Chapter One introduction was generated and saved using Save and Next. Background and methodology test drafts were inspected and cancelled rather than saved. Specific-objective generation hit provider overload, so its actual output could not be assessed in this run.

Private screenshots and generated output remain under tmp/student-audit and must not be committed. No names, HTINs or actual project titles are included here.

## Highest Priority

1. **Top-level Save Changes misses the active editing buffer.** Code-confirmed, not destructively reproduced in production. handleSave persists formData while active text is in temporaryContent, then exits editing. Merge the active section first, or remove this competing action. All save entry points must share one persistence operation and preserve editing on failure.
2. **Paragraph normalization destroys valid structure.** Live background: 463 words in one paragraph, with 13 citation-needed placeholders. An isolated engine reproduction turns four HTML paragraphs into one. stripHtmlWithBreaks emits single breaks for closing paragraphs while later converters split on double breaks. Preserve HTML block boundaries and enforce structural checks after every transformation.
3. **Generation accepts unsupported local claims and unconfirmed methods.** The full-project background asserted hospital-specific observations without supplied evidence. Study Design chose an analytical cross-sectional design/quantitative approach and broadened the outcome to include precancerous lesions without confirmation. Ask for real facts, confirmed design and outcome; do not silently invent them. Reuse the stricter Chapter Workspace readiness logic in the full-project editor.

## Generation Findings

- Short deterministic introduction: passed; concise chapter preview rather than a long disease overview. Save and Next persisted it successfully.
- Background: global-to-local themes were present but flattened into one paragraph. No actual saved-source citations were supplied; citation-needed placeholders dominated. Treat this as an incomplete scaffold, not a completed background. Require relevant source findings and distinguish unsupported local gaps from verified local data.
- Methodology: the generated text introduced study decisions and extra outcomes not confirmed by the student. It also included instructional commentary about design versus approach that should not occupy the final manuscript.
- Both prose test outputs ended with duplicate punctuation. The full-project path applies humanizeResearchText to generated HTML before normalization; that text-cleanup routine can append punctuation after a closing HTML tag. Handle text nodes or structured blocks, then validate the final output.
- A toast claimed the draft had been cleaned by Human Review. That operation is automated text cleanup, not a person reviewing the work. Rename it and make any meaning-changing rewriting explicit.
- Objectives attempt: provider returned a high-demand error. This is not evidence of a formulation failure. Separate provider availability/auth/rate-limit errors from contract-validation errors; show a persistent retry action and retain context.
- Literature-review Body offered Generate draft despite missing confirmed objectives and sources. This was inspected but not generated. Gate factual drafting with the same prerequisites used in standalone Chapter Workspace, while always permitting manual writing.

## Student Workflow

- Continue writing opened the title page, rather than resuming the last writing section. Persist the active section and offer a clear next unfinished section.
- The roadmap contains 43 steps. Chapters do collapse visually, but hidden descendants remain in the accessibility snapshot. Use semantic accordion controls and hide/inert collapsed content; keep the current chapter prominent.
- Save Changes, Save and Save and Next compete. Keep one primary Save and Next action with an explicit saved/unsaved state. Secondary save behavior must not differ.
- Once a section has content, five more prose actions appear: Improve, Make academic, Human review, Shorten and Check UHPAB. This is especially unnecessary for a fixed deterministic introduction. Hide optional transformations under a single More tools control and do not offer incompatible actions on fixed sections.
- An evidence prompt and citation action appear even for the short uncited introduction. Show section-relevant helpers only.
- General study-helper copy repeats on every section. Replace it with one specific task or question for the current section.
- The structural 1.3 Research Objectives heading is treated as a separate writing task. Render the heading automatically around general/specific objectives rather than asking students to generate filler.
- Prefilled title/declaration/approval pages are labelled Done without student review. Use Prefilled or Ready to review. Signatures and approvals are not established merely by having a template.
- Progress is based on the maximum text length of a single saved section rather than the aggregate reviewed sections. Observed: one of ten Chapter One components became 17% chapter progress. Extra length must not imply completion. Use section states and requirement checks instead.
- Page numbers are estimates based on cumulative words, and Chapter Three can claim it continues on the same running page. Respect chapter breaks and label estimates until a true layout/export preview is available.

## Suggested Order

1. Unify saving; preserve drafts and navigation state.
2. Fix paragraph/punctuation transformations and add regression tests.
3. Apply shared context/evidence gates to both editors; confirm objectives and methodological choices.
4. Simplify the current-step interface and section-specific helper text.
5. Correct review/progress states, provider retry behavior and page-preview labels.

No source code or deployment was changed during the original audit. Live model behavior was sampled, not exhaustively evaluated. Sample-size calculations, Chapter Four, exports and mobile editing were not retested in that walkthrough.

## Implementation Follow-Up

Implemented locally after approval:

- Unified save, save-and-next and roadmap autosave around the current editing buffer. Failed saves retain the text and editor. Added unsaved-change warnings and a visible save state. DOCX download includes active edits.
- Persisted the next writing step for refresh/resume. Collapsed roadmap children are unmounted, with semantic expanded states. Structural objective headings are no longer separate writing tasks or generated filler in the full export.
- Shared Chapter Workspace study-details and evidence prerequisites with full-project drafting. Source findings are required for factual background/literature drafting; methodology requires confirmed choices. Manual writing remains available.
- Preserved paragraph boundaries and removed automatic humanization of generated HTML. Strict generation rejects excessive length, unresolved evidence placeholders, unsupported citation identities and a background without 4-6 distinct paragraphs.
- Retained cited saved sources in the reference list, preserving existing entries. Changed facts/objectives invalidate review; stale confirmed objectives cannot satisfy the next chapter's gate.
- Simplified the primary editor flow; optional transformations are under More tools and absent for deterministic sections. Prefilled pages require review. Progress counts reviewed sections rather than text length. Page estimates respect chapter boundaries and are labelled estimates.
- Separated provider overload/authentication errors from formulation errors; overload has a retry action in the full editor. Late cancelled generation responses cannot replace the draft.

Verification: 9 student-writing regression checks, 16 chapter-workspace checks and 15 formulation checks passed. Production build passed. Targeted lint passed for the new helpers/hook and editor component. TypeScript checking still reports the pre-existing errors in ProjectContext, researchTextMarkers, schoolWorkspaceStore, ProjectView and SchoolStudentWorkspace; none in the changed writing modules.

Browser verification used a synthetic local demo project only: deterministic introduction generation, editing, review, Save and Next, refresh/resume, source gating, collapsed roadmap accessibility and a 390px mobile viewport. The edited introduction survived refresh and the next section resumed correctly. No further production student document was modified and no live Gemini request was made in this implementation pass. Screenshots remain private under tmp/screenshots.

Limits: source-identity validation does not prove a paper supports every generated claim. A student must still verify evidence. Page counts remain estimates until Word lays out the DOCX. Native back-navigation confirmation depends on browser Navigation API support; refresh/close and link warnings remain available. Database outages were not injected during the browser walkthrough.

## Focused Editor UI Follow-Up

- Removed the always-visible chapter sidebar. Roadmap is a closed-by-default, keyboard-accessible drawer; browsing chapter accordions does not navigate until a section is selected. Selection saves pending work and closes the drawer.
- Current-section workspace is full width with a compact sticky chapter/roadmap strip. Study details and evidence share a collapsible preparation area. Global reference warnings no longer interrupt unrelated sections; specialist panels start collapsed.
- Empty sections offer Generate draft or Write myself; existing sections offer Edit section. Blocked generation is visually secondary, and optional transformations remain under More tools. Save and Next has one persistent mobile footer with review and next-section context.
- Mobile formatting has bold/italic/underline plus an expandable menu for other tools. Touch controls are 44px; text and tables are width constrained. Starting editing scrolls directly to the writing surface, respecting reduced motion.
- Browser checks passed on a synthetic local project: desktop, 390px and 320px; drawer fit, chapter browsing/selection, manual editing, Save and Next, compact formatting expansion and no horizontal overflow. Production student work was not changed. Screenshots stay under tmp/screenshots and are excluded from Git.
- Writing regressions now total 11 checks, including rendered empty/populated/editing states and focused navigation. The 16 chapter and 15 formulation checks still pass. Build and targeted UI lint pass; existing unrelated TypeScript errors remain.

### Required-Field Arrangement

Preparation now precedes Generate draft. Required study details and the three required source fields have visible red asterisks, accessible required labels and required attributes. Optional source metadata stays collapsed. Source entry opens automatically when evidence is required and none is saved. Advisory placeholders explain the requested setting, rationale, design, population and source findings without suggesting invented data.

Writing regression checks now total 12 and verify required-field markers, placeholder advice, preparation-before-generation order and the readiness transition. Local browser verification confirmed five required Background inputs appear before Generate draft, and completing them plus Save source enables the button. Mobile width 390px had no horizontal overflow. Synthetic inputs were discarded without saving the project or calling Gemini.
