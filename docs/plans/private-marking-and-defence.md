# Private Research Marking and Proposal Defence Slides

Status: marking foundation and the local ten-slide proposal defence workspace are implemented; public deployment verification remains outstanding. See `docs/defence-slides-release.md` for the implemented slide workflow, local retention, export behaviour and remaining cloud/template work.
Prepared: 17 October 2026.
Audience: nursing, midwifery and allied health students, including students with basic browser skills.

## 1. Intended Outcome

Students should be able to upload a proposal or report privately, receive an evidence-based practice assessment, correct their work, and reuse their proposal to create exactly ten editable defence slides.

The two visible tools are:

- **Mark My Research**: upload, review detected sections, mark, revise and compare versions.
- **Defence Slides**: choose a saved proposal, upload one, or enter a topic; review facts, generate ten slides, edit and download PowerPoint.

Both tools use a shared private document library. Uploading does not publish a student's work or add it to a plagiarism repository. Neither tool promises examiner marks, approval, or a certified similarity score.

## 2. Findings From the Existing App and Sources

### Existing implementation

- `/marking-guide` already displays a report rubric. `/document-analysis` already accepts documents and displays criterion-level results. Improve and consolidate these instead of building a second unrelated checker.
- `src/data/markingGuide.ts` currently stores a report rubric totalling 100 points. Several criterion allocations differ from the current linked page.
- `src/lib/markingGuideScoring.ts` uses deterministic evidence and phrase rules. It can support structural checks but is not sufficient to establish substantive research quality.
- `src/lib/documentAnalysisStore.ts` saves file blobs and results in IndexedDB, on the current browser. This is not a cross-device private cloud library.
- Database migrations define `document_assets` and `review_results`, but the reviewed upload path does not implement private Supabase Storage uploads.
- Some current school policies allow school staff to read school-linked review results. New private workflows must not grant school-wide access by default.
- Current key handling includes a profile text column and browser storage. Server-side jobs require a restricted, encrypted credential path; storing something in Supabase alone does not establish application-level encryption.
- The current local proposal/report structures and recently added formulation contracts should be reused. Old headings remain useful import aliases, not the required final output structure.

### Source reconciliation

The proposal article now contains UHPAB wording and a report marking annex. It is not simply an unchanged legacy page, but it contains mixed references and an arithmetic discrepancy. Its assessment totals are 10 + 16 + 12 + 23 + 12 + 19 + 2 + 8 = **102**, although the displayed grand total says 100.

The local scanned guideline is the August 2025 first edition, with 80 PDF pages. Its chapter structure, appendices and formatting are useful primary references. An authoritative numerical proposal rubric has not been established in this review.

**Source priority:** the applicable official PDF or institution-approved rubric overrides explanatory web material. The website informs the adaptation; it must not silently become an official scoring authority.

Approved adaptation: reduce Background from 4 to 3 and Study Design from 3 to 2, giving an exact report total of 100. Version `uhpab-adapted-100-v3` explicitly identifies a practice rubric, not official marks. The proposal subset totals 64 with a separately normalised percentage and retains applicable ethical/approval documents. See `docs/private-research-storage.md` for implemented assessment and retention behaviour.

Sources:

- https://nursesrevisionuganda.com/writing-a-research-proposal/
- https://nursesrevisionuganda.com/preparing-for-proposal-defence/
- Local primary reference: `C:/Users/Julius Tusing/Downloads/UHPAB RESEARCH GUIDELINES.pdf`
- https://supabase.com/docs/guides/storage/buckets/fundamentals
- https://ai.google.dev/gemini-api/terms
- https://ai.google.dev/gemini-api/docs/rate-limits

## 3. Feature One: Mark My Research

### 3.1 Student flow

1. Open **Mark My Research**. The first screen contains one upload area and a Proposal/Report selector.
2. Upload PDF or DOCX, or select an existing private document/project version. Proposed initial limit: 25 MB and 100 pages; confirm deployment limits before fixing these values.
3. Validate the file, show upload progress, save it privately, and extract its content.
4. Display the detected title, document type, chapters and readability. The student confirms or corrects detection.
5. Start marking. Show actual stages: Reading document, Checking sections, Reviewing quality, Preparing feedback.
6. Open the result: score summary, coverage, high-priority corrections and chapter breakdown.
7. Expand a criterion to see evidence, the reason for the award, and a concrete next action.
8. Download the marking report as PDF or DOCX. Link it to the user's project if requested.
9. Upload a revision as a new version and compare changes. Preserve the previous result.

Full-document marking is the default. Section-only review is a secondary option. Clearly distinguish a partial review from a full-document assessment.

### 3.2 Proposal and report applicability

Use two versioned rubric definitions, with explicit applicability conditions, rather than filtering a report rubric and leaving report-only criteria inside proposal sections.

| Area | Proposal assessment | Report assessment |
|---|---|---|
| Preliminary pages | Required proposal pages, with draft/approval-stage conditions | Required report pages, including abstract |
| Chapter One | Background, problem, general/specific objectives, questions, justification, significance, scope | Same structural alignment, appropriate completed-study wording |
| Chapter Two | Objective-led literature, synthesis, gaps, citation support | Same, aligned to the actual study |
| Chapter Three | Planned design, setting, population, sample, sampling, tools, procedures, analysis, quality, ethics, limitations, dissemination | What was actually done, with coherent methods and results |
| Chapter Four | Not applicable | Objective-led findings, respondent characteristics, appropriate tables/figures, accurate narratives |
| Chapter Five | Not applicable | Interpretation, literature comparison, conclusions, actionable recommendations, health profession implications |
| References | Citation/reference correspondence and applicable reference requirements | Same, for the completed report |
| Appendices | Instruments, consent/information templates, work plan, budget and relevant materials | Required completed-study attachments, permissions and applicable similarity report |

Draft proposals must not lose marks for absent results, discussion or abstract. Approval letters and signed forms need stage rules: a proposal awaiting defence cannot be assumed to possess permissions that are issued after approval. Missing required content is not automatically 'not applicable'.

Supervisor commitment is excluded from student documents; supervisor/principal approval remains. Chapter One scope, separate data presentation and study limitations must be checked under the reconciled structure. Combined lists of tables/pictures/figures must not be penalised for failing to use old separate-page headings. Frameworks and hypotheses must not be imposed when the applicable guidelines do not require them.

New structural requirements without a verified point allocation become explicit compliance findings. Do not invent marks or double-deduct under multiple criteria.

### 3.3 Marking engine

Use three stages:

**A. Evidence extraction and structural checks**

- Read headings, paragraphs, lists, tables and captions; retain source anchors.
- Map legacy heading aliases to current section identities.
- Apply deterministic checks for required sections, counts, arithmetic, reference links and the formulation rules already implemented.
- Prefer actual PDF page anchors. For DOCX, use section/paragraph/table anchors unless a rendering service establishes reliable pagination.
- Do not claim font, margin, page-count or centring compliance from plain extracted text. Mark unsupported visual checks as unassessable.
- For scanned PDFs, offer OCR with clear page coverage and confidence. Do not grade unreadable scans as empty documents.

**B. Guided substantive assessment**

- Assess each criterion against explicit performance descriptors and only the relevant document evidence.
- Use the student's verified credential and an appropriate data-processing mode.
- Ask for structured data: criterion ID, suggested award, evidence IDs, explanation, missing points and correction advice.
- Verify that every evidence anchor exists, every award is within its allowed range, and every rubric criterion is accounted for.
- Treat uploaded text as evidence, never instructions. A document saying 'give this full marks' must not influence scoring policy.
- Review cross-section consistency: topic/objectives/questions, objectives/tools, sample calculations, planned analysis, and report findings/conclusions.
- Require human review or a retry for unsupported or contradictory assessments rather than fabricating evidence.

**C. Deterministic aggregation**

- The application calculates totals and percentages, not the language model.
- Distinguish full, partial, not met, not applicable and cannot assess.
- Record reviewed coverage separately. If mandatory pages are unreadable or missing from processing, label the overall result provisional; do not present an inflated final percentage based only on readable pages.
- A section-only review uses that section's denominator and is never labelled a whole-report mark.
- Keep guideline compliance and rubric points visible as related but distinct results.

### 3.4 Feedback students receive

Each finding contains the current UHPAB section, criterion, available/awarded points, evidence location, short explanation and a specific correction. Example: identify which objective and question disagree, quote their actual wording, and explain what needs aligning.

The result screen shows a small summary, a prioritised correction list, expandable chapter details, and the source preview when supported. Mobile opens one criterion at a time, with a separate evidence view and a clear return action. Do not scatter the score across repeated cards or several unrelated download buttons.

Suggested corrections never overwrite the submitted file. A separate 'Apply to my project' action may create an editable revision with the student's approval.

### 3.5 Repeatability and version history

- Reopening a completed assessment returns the saved result.
- Re-uploading the same file can reuse a result only for the same owner, document type, scope, rubric version, extraction version and assessment configuration.
- A changed file becomes a new immutable document version.
- An intentional reassessment creates a new run, rather than silently replacing the previous mark.
- Compare criterion-level changes and unresolved issues across versions.
- Do not deduplicate private documents across users in a way that reveals that another student has the same work.

## 4. Shared Private Document Library

### 4.1 Storage and access

Use a **private Supabase Storage bucket**, with database and object-storage policies that enforce ownership on upload, read, update and delete. Use opaque IDs for object paths, for example owner/document/version, while keeping the original filename in owner-only metadata.

Authenticated downloads or an authorised proxy are the default. Short-lived signed URLs may be used where necessary, but they are bearer links while valid and must never be described as inherently owner-only. Do not return permanent public object URLs.

Original files, extracted text, OCR images, thumbnails, feedback, slide JSON and exported files all inherit the same privacy rules. Private files must not enter the website's public assets, deployment bundle, sitemap, analytics payloads, error logs, public caches or shared service-worker caches.

Add `X-Robots-Tag: noindex, noarchive` where our delivery layer controls headers, and `Cache-Control: private, no-store` for private responses. These are supplementary controls; authentication and private storage prevent access. `robots.txt` alone is not document security.

Owner access is the default. A school or supervisor relationship does not automatically share a personal upload. If sharing is added, use an explicit per-document grant that the student can revoke. Keep staff and administrator access narrowly scoped and auditable.

### 4.2 Document lifecycle

- Validate extension, MIME signature, declared size and decompression limits. Do not accept executable or macro-enabled files.
- Distinguish upload success from metadata/processing success. Clean up orphan uploads after failures.
- Support upload retry and recovery on unstable mobile connections.
- Store immutable originals; edits create new versions.
- Let users delete a document and choose whether linked reports/slides should also be deleted.
- Use a deletion job to remove originals and derivatives, disable access immediately, and document backup retention separately. Do not promise instant removal from provider backups.
- Offer existing browser-only records for explicit migration into the private library; never silently upload old local files.

### 4.3 Search indexing, plagiarism and external processing

Correct private storage prevents anonymous search crawlers from fetching the content through our app. It does not guarantee a particular plagiarism result, prevent a recipient from redistributing a downloaded file, or undo an earlier public upload elsewhere. The app must not publish documents or submit them to a third-party similarity repository without an explicit separate action.

**Google processing is a separate decision.** Google's current unpaid Gemini terms allow submitted content and responses to be used for product improvement and human review, and say not to submit sensitive, confidential or personal information. This is different from saying the content becomes indexed by Google Search.

Proposed operating modes:

- **Private structural check:** local deterministic checking without sending document content to Gemini; available regardless of cloud-generation eligibility.
- **Non-sensitive drafting:** a topic or deliberately prepared non-confidential excerpt may use the user's own key after a clear processing disclosure.
- **Confidential document review:** require a credential/project with suitable paid-service data handling or another approved processing arrangement. A free key alone is not sufficient justification to transmit a confidential thesis.

Before cloud processing, minimise the payload and remove identity pages, signatures, HTINs, contacts and identifiable patient/respondent material. Redaction does not automatically make the remaining intellectual content non-confidential. Do not infer a key's billing or privacy status from its length or prefix. Establish how processing eligibility is verified before enabling this mode.

Do not enrol private student uploads in training datasets. Any future training reuse would require its own clearly separate opt-in and policy.

### 4.4 Credentials and operational limits

- Encrypt saved credentials in a restricted server-side store; do not include secrets in job payloads, logs, slide data or assessment exports.
- Store only key status/last verification information in ordinary profile responses. Migrate/remove legacy profile/auth-metadata key exposure as part of this prerequisite.
- Resolve a user's key on the server after authenticating ownership of the job. Do not use an unrestricted shared server key as an automatic fallback.
- Personal keys allocate model usage to each user's Google project, but rate limits still apply per project, not per key.
- Handle invalid/revoked keys, unavailable models, exhausted quota, safety blocks and interrupted requests without losing the uploaded document.
- Storage, bandwidth, rendering and background-job costs remain application costs even when model tokens are user-funded.
- Use bounded retries with backoff and cancellation, plus clear 'retry later' states. Avoid repeated billable calls after a result is already saved.

## 5. Feature Two: Defence Slides

### 5.1 Entry points and input modes

Offer **Defence Slides** in navigation, in a proposal's workspace, and after marking. A prior marking result can help identify gaps, but marking must not be compulsory to generate slides.

There are three inputs:

- **Saved proposal:** select the exact saved version, with facts extracted from it.
- **Upload proposal:** reuse the private upload and extraction flow.
- **Topic only:** prepare a clearly labelled working draft. Ask for the minimum missing details, one step at a time, or use visible placeholders for unconfirmed design, sample, tools and analysis.

Prefill the candidate name, school, course, HTIN and supervisor only from saved or supplied details. Supervisor name and approved methods must not be invented.

### 5.2 Student flow

1. Choose proposal/project/upload/topic.
2. Review extracted facts: exact topic, population, age range, setting, objectives, design, sample and tools. Highlight missing or conflicting details.
3. Confirm presentation duration and school format if available; default to a ten-slide proposal presentation.
4. Generate slide content, validate facts and layout, then display exactly ten slides.
5. Edit a slide's title, bullets, diagram labels and speaker notes. Regenerate only the chosen slide when requested, preserving other edits.
6. Preview the presentation and rehearse with notes/timer.
7. Download an editable PPTX, with an optional PDF and separate speaker-notes/reference handout.

The defence resource gives a ten-slide example and says institution-specific requirements take precedence. Our structure is an adaptation to the current proposal sections, not a claim of a universally mandated UHPAB slide order.

### 5.3 Proposed ten-slide structure

| Slide | Main purpose | Content and guardrails |
|---|---|---|
| 1 | Title and candidate | Exact topic; student; HTIN; school/course; supervisor where supplied |
| 2 | Background | Brief wider-to-local context using the proposal's verified evidence |
| 3 | Research problem | Ideal/current gap, available magnitude and why the study is needed; never invent local statistics |
| 4 | Aim and specific objectives | Preserve approved objective wording and order; arrange for readability; keep full source wording in notes if presentation shortening is explicitly approved |
| 5 | Research questions and scope | Questions mirror objectives; retain the same population, setting and age boundaries |
| 6 | Literature gap and study value | Main reviewed evidence, gap, justification/significance; use an existing approved framework where relevant, rather than requiring or inventing one |
| 7 | Methodology: design and population | Planned design with rationale, study area, target group and key eligibility criteria |
| 8 | Methodology: sample and measurement | Confirmed sample calculation/justification, sampling procedure, variables and instruments |
| 9 | Methodology: execution and safeguards | Collection, quality control, analysis/presentation, ethics; detail belongs in speaker notes |
| 10 | Closing and next steps | Brief study contribution, readiness for approved next steps and invitation for questions; no fabricated findings |

Budget, timetable, limitations and dissemination can be summarised in relevant notes or supporting handout when needed. Full references go in notes/handout; on-slide citations remain beside relevant claims. Exactly ten slides means no automatically appended eleventh references slide.

Do not impose hypotheses, theories or a conceptual framework solely because a legacy example contains them. If a school requires an alternative ten-slide structure, use a versioned school template that retains required study content.

Report-defence decks are a future separate template. The first release is proposal defence; do not accidentally present completed-study results as planned proposal content.

### 5.4 Generation contracts

Create an extracted facts record before generating slides. Each fact carries its source anchor and status: found, student-confirmed, missing or conflicting. Identity details remain local to trusted rendering wherever possible.

The model returns structured slide JSON, never arbitrary HTML or a single rendered image. Each slide contains an ID, title, layout type, bullets, source IDs, optional diagram/table data, speaker notes and unresolved fields.

Validate exactly ten unique slide IDs, expected roles, supported layout types, no missing mandatory titles, and all cited evidence/source IDs. Objectives and questions reuse our formulation contracts. Uploaded approved objectives are preserved; inconsistencies are flagged for correction, not silently rewritten.

Do not invent sample sizes, prevalence, statistical significance, citations, ethical approvals, supervisor details or completed results. A topic-only draft with unknown details must remain visibly incomplete until the student supplies or confirms them.

Add suggested defence questions and study-specific answer prompts in a separate preparation panel/handout. These are not extra presentation slides or claims to know the real examiner's questions.

### 5.5 PowerPoint quality and mobile layout

- Default to a clean 16:9 deck, with high contrast, consistent typography, slide numbers and restrained school/UHPAB Study branding. Do not present the app as an official board product.
- Use editable text, shapes, tables and diagrams rather than screenshot slides.
- Target 24-point or larger body text and short bullets. Prioritise splitting across the fixed layout or moving explanation to notes; never solve overflow by shrinking text until unreadable.
- Test long topics and long objectives explicitly. Preserve essential study meaning and let students approve any shortened presentation wording.
- Provide editable speaker notes that explain points in plain language and support the chosen duration.
- Desktop: thumbnails on the left, selected slide centrally, contextual controls beside it.
- Mobile: one slide at a time, labelled previous/next controls, a numbered slide picker, and a separate content/notes editor. Export must work without desktop-only hover actions.
- Render exported decks for visual checks: text clipping, overlap, font substitution, diagram arrows, citations, slide count and notes. If PDF export needs a rendering service, establish that service before promising it.

## 6. Architecture and Data

Keep Cloudflare Pages for the frontend and Supabase for authentication, metadata and private storage. Use authenticated API routes for upload authorisation, job creation, result reads, export and deletion. Long extraction/marking/export operations need persisted jobs and a queue-backed worker or another durable processing service; do not rely on the browser staying open or a single long Pages request.

Reuse existing tables where their permissions and shapes fit. Suggested entities:

| Entity | Key information |
|---|---|
| `document_assets` | Owner, optional project, original filename, MIME type, size, object path, version, checksum, page count, extraction/privacy state |
| `document_extractions` | Private section/chunk data, evidence anchors, OCR confidence, extraction version |
| `marking_rubrics` | Immutable version, source references, approval/adaptation status, document type, criterion maxima, applicability rules |
| `review_results` | Owner, document version, rubric/config versions, criterion awards, evidence, coverage, status and totals |
| `defence_decks` | Owner, proposal version or topic, confirmed facts, template version, slide JSON, notes and status |
| `generated_assets` | Owner, parent result/deck, private object path, file format and export version |
| `processing_jobs` | Owner, job type, input IDs, status, progress, attempts, safe error code, timestamps and cancellation |
| `document_shares` | Optional explicit recipient grant and revocation; do not add automatic school sharing |
| restricted credentials | Encrypted per-user key, encryption-key version, verification status; never exposed through ordinary profile reads |

Queue messages contain IDs, not private document text or API keys. Every worker step resolves and checks ownership. Use a narrow credential access path and separate encryption secrets from the database. Version scoring prompts, rubrics, models and extractors so results remain explainable after upgrades.

## 7. Build Order

1. **Lock academic rules:** verify the rubric source and arithmetic, approve adapted report/proposal criteria and stage applicability, and approve the ten-slide template.
2. **Build the private foundation:** storage policies, credential handling, metadata, upload validation, authenticated download, deletion and ownership tests.
3. **Add extraction and jobs:** section mapping, evidence anchors, OCR/readability handling, resumable processing and safe failures.
4. **Upgrade marking:** connect the current checker, replace generic quality judgements with evidence-backed assessment, implement totals/coverage, result history and exports.
5. **Build slides:** facts review, ten-slide contracts, editable preview, notes and PPTX export using the same private documents.
6. **Add integrated preparation:** 'Create defence slides' after marking, targeted slide repair, version comparisons and rehearsal support.
7. **Pilot before release:** approved examples, weak documents, scans, mobile connections, permissions and download tests; review results with a qualified supervisor.

No application changes, migrations, cloud deployments or newly configured services are authorised merely by this planning document.

## 8. Acceptance Tests

### Privacy and storage

- Logged-out requests cannot read originals, extracts, previews, results or slides.
- User B cannot read, list, update or delete user A's assets, even using known IDs or guessed paths.
- School membership alone does not reveal personal uploads or reports.
- Authenticated and any signed-link expiry/revocation behaviour is tested accurately.
- No private file or secret appears in public URLs, deployment assets, analytics or logs.
- Deletion blocks access immediately and removes derivatives through the documented process.
- Existing local files are not uploaded without an explicit student action.
- Free/unpaid processing paths do not accept confidential document payloads.

### Marking

- Confirm each rubric's actual point sum and separately verify percentage calculations.
- Proposals do not lose points for report-only sections or premature approval documents.
- Required missing criteria cannot be excluded to raise a score.
- Every substantive award cites real evidence; forged evidence IDs are rejected.
- Unreadable pages produce incomplete/provisional results, not confident zeros or an inflated final score.
- Misaligned objectives/questions, incorrect sample arithmetic, missing instruments and unsupported conclusions are detected on known examples.
- Old numbering is understood without forcing old output sections.
- Reference counts exclude duplicates; cited/uncited and unmatched entries are distinguished. A check is not a claim to verify every source's truth or detect all plagiarism.
- Exact repeat requests reuse eligible saved results; revisions retain separate assessments.
- Calibration against supervisor-marked examples checks systematic overmarking, undermarking and inconsistent awards before public release.

### Slides

- Topic-only and proposal-based inputs both yield exactly ten slides, with their different completeness states visible.
- No invented facts or completed results appear in a proposal deck.
- Topic, setting, population, age range, objectives and questions remain consistent across source, slides and notes.
- Missing mandatory facts remain placeholders with a visible checklist; students can export an explicitly labelled draft but cannot mistake it for a fully checked deck.
- Regenerating one slide preserves edits to the other nine.
- PPTX opens in PowerPoint and LibreOffice with editable text, working diagrams and speaker notes.
- Long text does not clip or overlap; charts/diagrams are legible.
- Desktop and phone preview/edit/download flows work, including recovery from network and quota errors.

## 9. Decisions To Set Before Building

1. Approved: use the explicitly adapted 100-point practice report scale, removing one mark each from Background and Study Design.
2. Approve a separate proposal rubric and stage-aware attachment rules. Do not call a derived proposal score an official board allocation.
3. Approve the adapted ten-slide structure, including optional rather than mandatory frameworks/hypotheses.
4. Approve the privacy/processing policy: free keys for non-sensitive drafting and structural checks; a suitable protected processing arrangement for confidential proposals/reports.
5. Approved: owner-only private Supabase uploads, no public sharing, default seven-day expiry, with explicit Keep and Delete now controls. Limits: 25 MB/100 readable pages. Production RLS and scheduled cleanup must be verified before release.

Recommended starting point: resolve decisions 1 and 4 first, then build the shared private library before either feature accepts real student documents.
