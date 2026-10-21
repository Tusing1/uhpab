# Research keyring and connection repair

## Changes

- Settings supports up to five named keys: primary first, explicit reordering,
  testing and removal. Full keys are masked; only the last four characters are
  displayed. Verification/save failures remain visible instead of a generic toast.
- Account keys are saved in owner-only public.research_keyrings JSON, not in
  research documents, workspace backups or school staff records. No new key is
  saved to localStorage. Demo keys are session-only. The existing signup/profile
  key remains a compatible fallback until the owner saves a keyring.
- Database RLS, TLS and platform-managed at-rest encryption protect account
  storage. This is not application-level encryption or a guarantee against a
  privileged database administrator. Existing legacy profile keys are not purged.
- Browser generation now uses /api/gemini, which forwards the per-request key to
  Google's fixed endpoint. No key is logged, returned or cached. store=false is
  retained for Interactions. Timeout and provider-status responses are preserved.
- Vite serves the same key-validation and generation handlers locally. Previously
  those Pages Functions were absent from the local development server.
- One backup attempt is allowed for a key-specific authentication rejection.
  There is no automatic rotation for 429/quota, billing, project restrictions,
  model-not-found, network errors or service outages. No model rotation is added.
- Session revision checks prevent late key loads from restoring signed-out keys.
  Cloud save must succeed before the runtime keyring changes.

## Verification

The owner-only migration was approved and applied to veryqsrzxtovkhegoolj.
Rollback-only live SQL tests passed for owner CRUD, denied foreign CRUD,
denied ownership changes and denied anonymous access. No test keys remain.
The repeatable test is scripts/research-keyring-privacy-qa.sql.

Six suites pass: 18 key tests, 20 assisted drafting, 19 study tools, 14 writing,
16 chapter workspaces and 15 formulation checks. Provider responses are mocked
in automated tests. Targeted lint and production build pass. Existing unrelated
repository-wide TypeScript errors remain.

The local validation route was verified with deliberately invalid synthetic input
and returned a structured 400 instead of a missing endpoint. Desktop/mobile
Settings and actionable format errors were inspected. Live generation must be
checked after deployment using the existing separate synthetic chapter, not a
student project. Do not interpret a successful models-list check as proof of
generation quota or supported model access.

The first live Settings check exposed a legacy-key hydration race. Owner changes
now clear session credentials, while same-owner auth refresh does not clear them.
Settings can fetch the existing signup key if profile hydration has not finished.

Google documentation reviewed:
- https://ai.google.dev/api/interactions-api
- https://ai.google.dev/gemini-api/docs/interactions-overview
