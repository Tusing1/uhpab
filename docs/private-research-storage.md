# Private marking: deployment and verification

## Scope and assessment limits

The report practice rubric totals 100. The reference website's 102 was adjusted by reducing Background from 4 to 3 and Study Design from 3 to 2. The structure is aligned with the current app's UHPAB sections. This is an adapted practice assessment, not an official UHPAB allocation or grade. The proposal subset totals 64; percentages are normalised and exclude results, discussion, abstract and similarity report. Applicable ethical/approval documents, participant information, budget and work plan are assessed; pending approvals must not be fabricated.

Gemini evaluates each substantive requirement independently. Full credit needs all requirements met; partial earns half of that requirement's share; missing or unassessable earns zero confirmed credit. The application calculates and sums the marks to two decimals, rounding down each criterion. Every met/partial finding requires an exact quotation from an actual evidence chunk. Invalid JSON, invented quotes or omitted checks fail closed: no invented/mock score is saved. This prevents fabrication of evidence, but does not make model judgement infallible. Human moderation remains necessary.

PDF, DOCX and pasted text are supported, up to 25 MB and 100 readable pages. Scans need OCR first. Extracted text cannot certify fonts, page layout, images, signatures, source authenticity or a similarity provider's report. Such checks are explicitly provisional. Basic redaction removes some identifiers, not all: users must remove confidential and personal information before consenting to Gemini processing. Free-tier Gemini may use submitted material for product improvement. An individual API key does not waive Google's terms or quotas.

## Required production setup (not performed by a frontend build)

1. Review and apply `supabase/migrations/202610170001_private_research_storage.sql` to the intended Supabase project. This creates an owner-only metadata table, private bucket, expiry enforcement, and service-only cleanup queue/functions. Do not make the bucket public.
2. Deploy `expire-research-documents` with JWT verification disabled **only for this function**. Its handler independently requires a dedicated secret. Example with an authenticated Supabase CLI:

   ```powershell
   supabase functions deploy expire-research-documents --project-ref veryqsrzxtovkhegoolj --no-verify-jwt
   ```

3. Set `RESEARCH_CLEANUP_SECRET` as a function secret using Supabase's secure dashboard. Generate a strong random value. Do not put it or a service-role key in Vite variables, Git, SQL source or client code.
4. Add two Supabase Vault secrets: `research_cleanup_url` (the deployed function URL) and `research_cleanup_secret` (the same dedicated secret).
5. Apply `supabase/schedules/research-retention.sql`. It checks both secrets exist and installs the hourly job. Confirm `pg_cron` and `pg_net` are available in the hosted project.
6. Live private marking is **disabled by default**. After verifying storage/RLS and cleanup, set `VITE_PRIVATE_RESEARCH_READY=true` in Cloudflare Pages and rebuild the frontend. Without that explicit switch, authenticated cloud accounts cannot submit marking work, no private archive query is made, and the page explains that setup is pending. Local demo QA remains available. There is never a fallback to public storage.

## Retention behaviour

- Default expiry is server-controlled, seven days from upload. Looking at or reusing a result never extends the deadline.
- `Keep this document` removes the scheduled expiry. Turning it off starts a new seven-day deadline; `Delete now` removes the file and marking record.
- Expired material immediately becomes inaccessible through owner RLS. Physical deletion uses the Storage API during hourly cleanup, rather than deleting `storage.objects` metadata directly. A batch claims up to 100 expired documents plus up to 100 queued orphan objects. Backlogs or failures can delay physical removal beyond seven days, so monitor the job.
- A claimed document cannot be kept, reopened or changed. Failed storage deletes preserve the cleanup record for retry. Metadata/account deletion queues remaining objects for cleanup as well.
- No public URLs or signed sharing links are created by this feature. Files cannot be anonymously fetched or indexed from this private bucket. This does not promise deletion from provider backups or prevent an owner sharing a downloaded copy.
- Local demo accounts use IndexedDB and purge expired files when the archive is opened; a closed browser cannot run cloud-style background cleanup. Existing browser-only files are not silently uploaded.
- Other tools' separately saved excerpts/results are outside this document retention policy. The associated private marking record and original file are covered.

## Release checklist

- Run `npm run test:marking`, `npm run test:formulation` and `npm run build`.
- With two disposable authenticated accounts, upload a non-confidential sample as A. Verify A can list/download/delete it; B and anonymous requests cannot read its metadata or object, or alter retention. Verify anonymous public-object URLs return no file.
- Verify cached results preserve `expires_at`, Keep makes it null, and disabling Keep sets a seven-day deadline. Try setting an arbitrary future expiry through the API: the trigger must preserve the server deadline.
- With administrator SQL on disposable rows, simulate expiry. The owner must lose access immediately. Invoke the cleanup function: the object and metadata must disappear. A wrong cleanup secret must return 401; GET must return 405.
- Simulate Storage API failure: metadata/queue must remain claimed for retry. Confirm a retry succeeds. Delete a disposable account before cleanup and verify the queued file is removed.
- Check cron run history and `net.http_post` responses; alert on non-2xx runs and a growing expired/deletion queue. Schedule creation alone is not proof of successful physical deletion.
- Run one genuine Gemini-assisted review with an eligible document and test key after consent. Check substantive feedback against a human examiner, not only schema tests. No genuine model calls are made by the automated unit tests.
- Download a marking PDF and inspect the criterion table, repeated headers, totals, human-check flags and website footer on desktop and mobile.

## Current test coverage

`scripts/test-strict-marking.mjs` verifies allocation totals, proposal exclusions, scoring arithmetic, evidence rejection, strict prompt integration with a stub model, redaction, retention deadlines, cleanup authentication and storage-before-metadata ordering. It does not substitute for live Supabase RLS/cron tests or human calibration of Gemini's academic judgement.

`scripts/qa-strict-marking-ui.mjs` uses an isolated browser and local demo account. It intercepts Gemini calls and verifies consent gating, marking feedback, actual PDF download, Keep/reset retention, reload/resume, deletion, the proposal subset and mobile horizontal overflow. Screenshots are written under `tmp/screenshots/`; the illustrative PDF under `output/pdf/` is a design sample, not a real student's grade. The production build and changed-file lint checks pass. The repository-wide TypeScript check still reports existing errors in unrelated project, school and originality modules.
