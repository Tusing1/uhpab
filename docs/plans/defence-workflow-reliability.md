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

Status: Pending; uses evidence records from workstream 2.

- Compare the exact source snapshot with slide wording: objectives/questions, issue, population/ages, setting, dates, design, sample assumptions and recruitment.
- Separate presentation shortening from an actual research change. Identify contradictions and show source/slide text side by side.
- Update only selected slides after the student reviews the differences; preserve manual edits, notes, source anchors and undo.
- Verify that changed source versions are surfaced and that no draft gains approval, results or new identities during summarisation.

## 4. Capture tester feedback safely

Status: Pending.

- Add Report a problem from tool pages and generation/export errors, with category, description and optional screenshot.
- Preview the report and request consent before sending. Never automatically attach document text, prompts, API keys, identifiers or browser storage.
- Include only minimal approved diagnostic context: tool, app release, operation stage, sanitised error code and browser information.
- Add authenticated, rate-limited submission storage and an admin triage workflow with status and resolution notes.
- Verify consent, redaction, access controls, duplicate submission prevention, upload restrictions and visible success/failure feedback.

## 5. Walk through the student journey

Status: Pending; final integration validation.

- Test both topic-only and existing-proposal paths, using clearly labelled synthetic fixtures and permissioned real documents.
- Follow topic selection, proposal writing, source management, marking-guide review, corrections, supervisor feedback, defence drafting, rehearsal and downloads.
- Exercise empty states, missing information, mobile navigation, key failures, quotas, interrupted generation and changed proposals.
- Keep reports/results distinct from proposals; never invent study findings to complete a test.
- Keep local originality/style reviews distinct from verified database matches or proof of AI authorship.
- Record each obstacle, severity, reproduction, fix and retest. Inspect exported PowerPoint/documents visually and check their text against the source.
- Acceptance: students can identify their next action, recover interrupted work, see evidence limitations and obtain readable, consistent exports without unnecessary copying between tools.

## Release gate

For each workstream: focused tests, regression tests for shared behaviour, build, desktop/mobile QA, privacy check and public release verification. Report external provider failures separately from application defects. Update this plan as each workstream actually completes.
