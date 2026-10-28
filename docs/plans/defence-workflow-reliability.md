# Defence workflow: reliability and academic quality

Implement these workstreams in order. Completion of generation is not evidence of academic correctness or a guarantee of marks.

## 1. Recover interrupted generation

Status: Implemented and locally verified. Included in this workstream's tester release.

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

Status: Pending; follows recovery.

- Keep retrieved-source records and their provider annotations, retrieval dates and supported findings together.
- Reconcile in-text citations with references in both directions; distinguish missing source, metadata requiring review and retrieved evidence.
- Flag unsupported local statistics and prevent non-local findings being presented as study-facility results.
- Provide focused source replacement/retrieval without rewriting accepted text. Revalidate only affected draft stages when evidence changes.
- Verify with grounded, ungrounded, inaccessible, contradictory and mismatched-citation fixtures. Export the same evidence limitations seen on screen.

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
