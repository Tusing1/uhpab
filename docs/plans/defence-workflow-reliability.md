# Defence workflow: reliability and academic quality

Implement these workstreams in order. Completion of generation is not evidence of academic correctness or a guarantee of marks.

## 1. Recover interrupted generation

Status: Implemented, verified and published in commit 07dd524.

- Save validated source, study-focus and methodology stages to account-scoped IndexedDB on this device, separately from reviewed presentations.
- Bind recovery to the exact input facts, source/project version, drafting engine, section rules and model. Changed inputs cannot silently reuse earlier output.
- Offer Resume saved draft, Review completed draft and Discard progress. Preserve recovery across refresh/navigation; never apply partial content to the proposal or presentation.
- Resume only unfinished stages. Keep source evidence, citations and warnings with the checkpoint, including a disclosed unsuccessful source lookup.
- Persist ready-but-unapplied results too. Apply/discard remains explicit, with protection against late results from another account or a cancelled request.
- Respect provider Retry-After. Do not rotate keys to evade quotas or automatically loop failing requests. Prevent simultaneous same-account generation in supporting browsers.
- If device storage is unavailable, retain progress in the open page and clearly warn that refresh recovery is unavailable.
- Verify: simulated stage failures, refresh recovery, cancellation, changed input, corrupt/versioned records, account isolation, storage failure, cooldowns and repeated resume without duplicate source/focus calls; desktop/mobile controls; production build.

Implementation: `defenceDraftCheckpoint.ts`, `defenceDraftStore.ts`, the resumable `draftDefenceFacts` pipeline and recovery controls in `DefenceSlides.tsx`. Checkpoints use a separate owner-scoped IndexedDB database. Apply saves the presentation before clearing recovery; unavailable storage retains an in-page draft with a download warning. The model, rules and engine versions are checked, and changed/deleted source proposals cannot resume silently.

Verification: 15 recovery tests, the existing 91 defence tests and 20 shared assisted-drafting tests. Controlled browser QA used an isolated localhost-only synthetic API: source lookup and study focus succeeded; the first methods call returned a simulated 503 with Retry-After; refresh recovered two stages; resuming sent only the methods call. Counts were sources=1, focus=1, methods=2. A second refresh recovered the completed draft, which reopened without a key or network generation, was applied, reopened from saved presentations and exported as a labelled test PowerPoint. Mobile controls had no horizontal overflow. No real Google requests or student proposal edits were used in this interruption test.

## 2. Trace claims to evidence

Status: Implemented and verified for the tester release.

- Keep retrieved-source records and their provider annotations, retrieval dates and supported findings together.
- Reconcile in-text citations with references in both directions; distinguish missing source, metadata requiring review and retrieved evidence.
- Flag unsupported local statistics and prevent non-local findings being presented as study-facility results.
- Provide focused source replacement/retrieval without rewriting accepted text. Revalidate only affected draft stages when evidence changes.
- Verify with grounded, ungrounded, inaccessible, contradictory and mismatched-citation fixtures. Export the same evidence limitations seen on screen.

Implementation: the defence workspace now has an Evidence and citations review on the study-details and slide-editing screens. Source records retain bibliographic metadata, provider URL/title annotations, retrieval timestamps and model-summarised findings with scope. They are stored with account-scoped presentations and recovery, never with API keys. APA matching handles parenthetical and narrative citations, grouped sources, year suffixes, organisation aliases and n.d.; it flags missing, uncited, ambiguous or incomplete entries and differing retrieved bibliography details. The original source is always available for inspection.

Generated percentages must have a cited retrieved finding with the same value. A proposed study site's percentage cannot be supported merely by a general or other-site record. Existing supplied writing is flagged rather than rewritten. These are bounded checks of recorded findings, not semantic verification of every claim, a check of denominators or proof that source metadata is correct. Qualitative contradictions, unusual citation styles and source-page inaccuracies still require academic review.

Focused lookup can retrieve a public URL or search only the public topic. Students explicitly preview and apply a source/reference update. Refreshing one source leaves accepted paragraphs, slides and speaker notes unchanged; the local audit updates without regenerating accepted stages or making extra text-generation calls. New draft recovery is bound to its original selected evidence as well as facts, so changed findings cannot silently reuse a different generation context. The engine version is now 2; earlier recovery records require a fresh draft, but saved presentations remain available. Unretrieved legacy references are not silently upgraded to retrieved evidence.

Verification: 17 new evidence checks plus the existing 106 defence checks and 20 shared assisted-drafting checks. Fixtures cover ungrounded/inaccessible sources, annotated URL mismatches, contradictory percentages, local scope, author-year collisions, metadata differences, source refresh, changed-evidence recovery, private URL rejection, account storage and exact audit retention in PPTX notes/handouts. Controlled browser QA retrieved and refreshed a clearly labelled synthetic source, confirmed the explicit update dialog, retained one reference/source without rewriting slides, flagged a slide statistic absent from recorded findings, and restored records/edits after refresh. At 390px mobile width, document scroll width equalled the 375px content viewport with no horizontal overflow. This tests application behaviour, not real academic evidence or Google's availability.

## 3. Compare slides with the proposal

Status: Implemented and verified for the tester release.

- Compare the exact source snapshot with slide wording: objectives/questions, issue, population/ages, setting, dates, design, sample assumptions and recruitment.
- Separate presentation shortening from an actual research change. Identify contradictions and show source/slide text side by side.
- Update only selected slides after the student reviews the differences; preserve manual edits, notes, source anchors and undo.
- Verify that changed source versions are surfaced and that no draft gains approval, results or new identities during summarisation.

Implementation: `defenceConsistency.ts` adds a validated, separate original-input snapshot and local comparison against reviewed fields. New input snapshots are captured before edits/drafting and travel with saved presentations and interrupted-generation sessions. Older presentations explicitly disclose that their original import snapshot is unavailable; no original proposal is reconstructed. Original-versus-reviewed fields and the same consistency findings appear in the notes/handout.

The comparison covers existing formulation rules plus new figures/assumptions, named design and recruitment terms, population/place wording, months/durations, missing qualifications, changed identity details and newly completed approval/recruitment/results claims. Citation years are excluded from study-figure comparisons. Harmless extractive shortening is allowed; paraphrases and unlabelled custom text require review rather than being called factual errors. This is bounded text comparison, not general semantic verification or academic approval.

Saved-project revisions and locally extracted PDF/DOCX/TXT or pasted proposals can be compared without generation or search calls. Students select slides and preview before applying. Missing revision fields never erase existing work. Changed topic updates require including the title slide. Source updates preserve unselected slides, custom notes and text sizes; labelled unaffected points on a selected slide are retained too. A partial update cannot mark outstanding supplied source changes as adopted. A one-step undo remains available until another edit. A changed presentation/revision invalidates an open preview. Retained notes must still be checked against updated study details.

Verification: 23 new checks, bringing the defence suite to 146, plus 20 shared assisted-drafting checks. Controlled browser QA used synthetic local presentations with no Google calls: a changed statistic was compared/restored/undone, a pasted methods revision showed its one supplied change before 22 collapsed missing fields, and only the selected methods slide was updated. A fresh topic-only presentation retained its original input and later manually entered design separately after reload. The preview was checked at desktop and 390px mobile width with no horizontal overflow. Browser testing also found and fixed duplicate sibling React keys between comparison and evidence panels. Existing unrelated repository-wide TypeScript errors remain outside this workstream.

## 4. Capture tester feedback safely

Status: Implemented and installed in production. One confirmed account was explicitly designated for platform-support access on 28 October 2026; its Support inbox tab was verified in the live application.

- Add Report a problem from tool pages and generation/export errors, with category, description and optional screenshot.
- Preview the report and request consent before sending. Never automatically attach document text, prompts, API keys, identifiers or browser storage.
- Include only minimal approved diagnostic context: tool, app release, operation stage, sanitised error code and browser information.
- Add authenticated, rate-limited submission storage and an admin triage workflow with status and resolution notes.
- Verify consent, redaction, access controls, duplicate submission prevention, upload restrictions and visible success/failure feedback.

Implementation: a report action is available from the workspace header and defence generation/export failures. A review screen shows the description, optional diagnostic fields and optional screenshot before explicit consent. Common secret, email, URL, identifier and path patterns are redacted from descriptions, but this is not a guarantee of identifying all private information. Screenshots are voluntarily selected, checked, resized and re-encoded; visible content is not redacted. Reports are tied to the sender's account and can be tracked or deleted in Feedback and support. Technical context is allowlisted and excludes page URLs, prompts, research text, provider messages, keys and browser storage.

The database accepts only authenticated, validated submissions. Per-account locks and independent rate slots enforce five reports per hour and 20 per day, including after report deletion. Retrying the same request and identical recent reports returns the existing receipt. Only explicitly provisioned platform support accounts can access the triage inbox; school administrators and supervisors do not receive access by role. Status, an optional sender-visible reply and required internal resolution notes are recorded. An optimistic timestamp prevents stale overwrites. Reports expire after 90 days, and an hourly job removes expired reports, screenshots, internal history and old rate slots. Submitters can delete their own reports earlier.

Verification so far: 10 focused validation/redaction checks, 146 defence checks and 20 assisted-drafting checks. SQL tests ran with synthetic data inside a rollback-only transaction against the target Supabase project; they covered consent, unrecognised fields, redaction, PNG bounds, duplicate requests, rate limits, account isolation, support-only triage, stale updates, internal-note privacy, expiry and cascade deletion. Per-account locks prevent parallel rate-check races, though simultaneous network submissions have not been separately load-tested. A separate rolled-back test verified the cleanup schedule. The tested migration and hourly schedule were then installed in the target project, with zero support accounts provisioned. The project has no Supabase migration ledger; this migration was applied through its SQL editor and must not be blindly reapplied by a future migration push. Desktop preview, a JPEG attachment, file-type mismatch rejection and a 390px mobile layout were checked with a demo account and synthetic text. A clearly labelled synthetic report submitted from a signed-in production account returned a receipt and was visible in its private report list. That check found a missing automatic list refresh, which is fixed in the follow-up release.

## 5. Walk through the student journey

Status: In progress. A synthetic topic-to-marking walkthrough has identified and addressed several obstacles; full integration validation is not yet complete.

Walkthrough findings and fixes:

- Critical: school candidate records, submissions, reviews and comments are browser-local, not shared between accounts. Live school-only screens are now paused with an explanation; existing local data is preserved. Local demonstrations remain available with an explicit warning and local-only confirmation messages. A real school workflow requires a shared, access-controlled backend and independent cross-account verification.
- High: the school enquiry form reported success without sending a message. It now clearly states that enquiries are unavailable. Unsupported school pricing and collaboration claims were also removed.
- High: marking feedback without an identified passage could send examiner instructions to the correction editor as if they were student writing. Only an actual evidence passage can now be handed off.
- Medium: a saved proposal had to be downloaded and uploaded again for marking, and the marking overview always described the report guide. Saved project text can now open directly in the correct proposal or report guide. The screen explains that unsaved material, page numbers, images and formatting are not included.
- Medium: the marking-to-defence action lost the topic when given saved project text as a generic document. Unchanged, owned proposal text now reconnects to the original project; changed or uploaded content remains a separate handoff unless its text exactly matches the project.
- Medium: topic templates could turn a low level of a practice into barriers to the low level. The qualifier is removed for recognised behavioural outcomes, while clinical terms such as low birth weight are preserved.
- Medium: a missing research key error pointed to settings without a direct action. The editor now offers an Open Settings action.
- High: the local originality review inferred page numbers from sentence positions and displayed heuristic percentages and possible source categories despite having no source database. The interface, archive and PDF now show passage numbers and counts, disclose the first-14-qualifying-passage limit, and do not present scores or source categories as evidence. Older stored reports are normalised on display/export; exact-result reuse requires the new engine version. This remains a limited wording aid, not a plagiarism checker.
- Medium: the originality PDF's final limitation notice needed a page-space check to avoid overlapping the footer. A synthetic export was rendered for inspection.
- Critical: section detection matched chapter-related words in ordinary prose, and a missing section caused strict marking to fall back to the whole document. Detection now uses standalone headings and separates section changes within PDF pages. If no relevant section is identified, its criteria are unassessable and require human review, rather than borrowing another chapter's evidence. Explicit section selection can classify an otherwise unheaded excerpt, but never overrides a recognised chapter. Cache engine version 8 requires fresh reviews; older saved reports remain accessible and carry a warning on screen and in PDF exports.

Verification so far: a local synthetic topic, project and saved paragraph were taken through the 64-mark proposal screen, using a local fixture rather than Gemini. The marking result explicitly contained no real academic assessment. The missing-passage state was verified in the browser, and the project-to-defence action retained the saved topic. A synthetic marking PDF downloaded successfully; the first two rendered pages were inspected for table and footer overflow. Ten focused journey checks, 17 marking checks, 14 writing checks, 146 defence checks, 20 assisted-drafting checks and 10 feedback checks passed. No actual student result or source accuracy was inferred from the fixture.

Additional verification: the built-in synthetic sample was checked locally and its citation passage was sent to the correction workspace intact; the editor preserved the wording and stated that no safe rewrite was needed. The browser displayed an export-start notification and backup link, but its download event did not confirm a completed file. The same exporter generated a synthetic PDF directly for visual inspection, and focused tests check new and legacy reports for fabricated locations, categories and percentages. The exact-result cache version was incremented. A synthetic saved proposal produced a labelled ten-slide working draft with absent details still visible; rehearsal opened, navigation and start/pause controls responded, and the source notes followed the selected slide. This was not a timed or academic assessment. No source database or real external AI provider was used.

The app's extraction code was exercised locally with the supplied 62-page similarity PDF, a supplied DOCX and synthetic TXT. All PDF pages contained readable text, the DOCX exposed its chapter transitions, and no source document was sent to a provider. Synthetic tests cover table-of-contents entries, mentions of other chapters in prose, mixed-section pages, explicitly selected unheaded excerpts, missing-section behaviour, and historical PDF warnings. The browser's synthetic TXT upload succeeded, but the test browser stalled before returning control.

Still required: a full existing-proposal walkthrough with an authorised real document, live-provider behaviour, completed browser download verification, all pages of the exports and presentation in this journey, a timed rehearsal, and broader mobile checks. Section recognition depends on readable, recognisable headings and does not guarantee academic accuracy. Supervisor sharing cannot be verified end-to-end until the shared backend exists. Repository-wide TypeScript checks have pre-existing unrelated errors.

- Test both topic-only and existing-proposal paths, using clearly labelled synthetic fixtures and permissioned real documents.
- Follow topic selection, proposal writing, source management, marking-guide review, corrections, supervisor feedback, defence drafting, rehearsal and downloads.
- Exercise empty states, missing information, mobile navigation, key failures, quotas, interrupted generation and changed proposals.
- Keep reports/results distinct from proposals; never invent study findings to complete a test.
- Keep local originality/style reviews distinct from verified database matches or proof of AI authorship.
- Record each obstacle, severity, reproduction, fix and retest. Inspect exported PowerPoint/documents visually and check their text against the source.
- Acceptance: students can identify their next action, recover interrupted work, see evidence limitations and obtain readable, consistent exports without unnecessary copying between tools.

## Release gate

For each workstream: focused tests, regression tests for shared behaviour, build, desktop/mobile QA, privacy check and public release verification. Report external provider failures separately from application defects. Update this plan as each workstream actually completes.
