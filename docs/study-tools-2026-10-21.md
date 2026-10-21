# Guided study tools

Implemented locally for both full projects and standalone chapter workspaces.
No Supabase migration or new public storage is required. Data stays in the
existing owner-scoped project/workspace JSON and follows its save lifecycle.

## Student flow

1. Continue writing a section. Optional section guidance starts collapsed.
2. Open Study tools when shared details, alignment or readiness need attention.
3. Confirm objectives and an actual study design before drafting a questionnaire
   or interview guide. A blank manual tool is available without model access.
4. Edit objective-grouped questions, response types and answer options.
5. Review a comparison before inserting or replacing Appendix 1. Save the project
   to persist the change. An editable, separate tool DOCX is also available.

Generation no longer demands citations for Justification by default. Evidence
sections retain source checks. No new permission to invent sources is added.
Replacing populated writing requires comparison and explicit acceptance; the
previous generated version can be restored. Stale asynchronous results are not
applied to a changed section or study snapshot.

Shared details do not silently rewrite existing manuscript sections. Changes
identify affected sections and invalidate review where appropriate. Readiness
and consistency are structural aids, not marks, official approval, a plagiarism
certificate or proof of semantic instrument validity. Final quality, consent,
pretesting, ethics and document pagination remain manual checks.

## Verification

- 19 study-tool checks: policies, confirmation, alignment, tool validation,
  escaped appendix output, editable DOCX formatting, full export and workspace
  compatibility, collapsed controls and replacement safeguards.
- 20 assisted-drafting, 14 student-writing, 16 chapter-workspace and 15 research
  formulation checks.
- Production build and targeted lint pass. Existing repository-wide TypeScript
  errors and legacy ProjectEdit lint errors are not represented as fixed.
- Synthetic local browser work tested profile confirmation, manual questions,
  objective accordions, appendix comparison/acceptance, saving, desktop and
  390px mobile layouts. Mobile writing controls hide while Study tools is open.
- No live Gemini calls, real student documents or production project edits were
  used for this feature's verification. Model behavior is tested with fixtures;
  a live-provider end-to-end check remains outstanding.

Publication approved by the user on 21 October 2026. The release excludes local
QA artifacts and student data. A separate, clearly labelled synthetic chapter is
used for live-provider smoke testing; existing student projects are not edited.
