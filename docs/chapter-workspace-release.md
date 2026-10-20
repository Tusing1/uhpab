# Chapter Workspace Release Checks

Release verification: 20 October 2026. Chapter Workspace migration applied to production Supabase project veryqsrzxtovkhegoolj with explicit approval. Website publication follows the release commit.

## Verified for this release

- Live rollback-only SQL checks passed: owner reads/deletes, denied direct writes, denied foreign and anonymous access, versioned saves, stale-save/project/draft conflicts, Skip/Append/Replace, references and prior-content history. No synthetic database records retained.
- Local browser checks passed: create chapter, deterministic short introduction, save and next, reload/resume and evidence-gated background generation. Fixed a false unsaved-changes prompt after initial creation.
- Responsive browser checks: actual 390px and 320px widths, no horizontal overflow; mobile section checklist expands. Desktop editor inspected.
- Build, targeted ESLint, 16 chapter tests, 15 formulation tests and dashboard regression tests passed.
- Live generative Gemini output and Word/LibreOffice visual pagination are not certified by these checks. Those limitations do not affect manual editing or cloud draft storage.

## Local entry points

- /chapter-work: saved drafts.
- /chapter-work/new: proposal/report, Chapter One/Two/Three, whole chapter or selected sections, optional owned-project snapshot.
- /chapter-work/:workspaceId: section editing, manual review, generation, sources, scoped DOCX and project transfer.
- Sidebar: Work on a chapter, available to all signed-in roles.

Demo account drafts use a separate IndexedDB database, uhpab-chapter-drafts. Real UUID accounts use Supabase only. A cloud failure must never appear as a successful local save. Drafts have no seven-day expiry.

## Before Cloud Rollout

1. Review and apply supabase/migrations/202610180001_chapter_workspaces.sql in staging. Obtain permission before applying security changes to production.
2. Using two disposable authenticated accounts, verify owner read/save/delete; verify other users and anonymous requests cannot read or delete a draft. Direct authenticated INSERT/UPDATE must be denied. Only the owner-checked save RPC may write.
3. Create, edit, save, reload and delete a synthetic draft. Simultaneous edits from two tabs must fail with a version conflict, retaining the losing tab's unsaved text.
4. Test transfer to an owned matching proposal/report. Foreign ownership, wrong topic/type, stale project timestamp and stale draft version must all fail without modifying any section. Verify Skip/Append/Replace, citation references, retained draft and _chapterWorkspaceHistory snapshots.
5. With the account owner's consent and a synthetic topic, test Gemini generation, missing-key errors, unavailable-model errors, and source-supported Chapter Two output. Generation is one section at a time. A draft is not automatically examiner-approved.
6. Verify desktop and mobile, including 320px, 390px and 1280px widths. Check the collapsed section list, keyboard labels, toolbar, contenteditable, save status, source forms, long topics and no horizontal overflow. Browser tools were blocked in the implementation session, so this remains outstanding.
7. Check dirty navigation: Chromium Navigation API covers same-document navigation/back; beforeunload covers reload/closing. Non-Navigation-API browsers get anchor warnings but need additional native-back regression coverage before broad rollout.
8. Open the synthetic DOCX in Word/LibreOffice and inspect page layout. Automated OOXML tests cover A4, font, spacing, page numbering, hanging references, selected-section scope, continuous subsections, bold text and real editable tables. The bundled renderer was attempted but could not find LibreOffice soffice.exe; a visual render is still required.

## Automated Checks

Run node scripts/test-chapter-workspaces.mjs, npm run test:formulation, node scripts/test-student-dashboard.mjs and npm run build. Chapter tests use synthetic text and mocked lookup/storage calls; they do not certify deployed RLS or Gemini factual accuracy.

The repository currently has unrelated TypeScript errors in ProjectContext, researchTextMarkers, schoolWorkspaceStore, ProjectView and SchoolStudentWorkspace. Do not hide those by disabling checks. Confirm no new errors originate from Chapter Workspace files.

## Current Boundaries

- Sources can be entered manually or looked up as metadata. Website addresses become editable webpage drafts, not article matches. DOI/title matching uses Crossref and rejects weak title matches; students must read the source and provide evidence notes. Metadata is not verified evidence.
- The initial methodology workflow records student-confirmed calculations and assumptions; it does not independently calculate or certify sample size.
- Chapter Two's five-page/20-citation requirement remains an explicit whole-chapter review responsibility, not a fabricated automatic pass.
- Project transfer history retains original section text under chapters._chapterWorkspaceHistory. There is no dedicated history-restore UI yet; the original chapter draft also remains saved.
- Chapter Four/Five, uploads/OCR, new similarity providers, expert review and payments are outside this release.
