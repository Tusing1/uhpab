# Tester feedback operations

The feedback migration `202610280001_tester_feedback.sql` and hourly schedule were applied to the production project on 28 October 2026 after rollback-only security testing. The production project did not have a `supabase_migrations.schema_migrations` ledger, so this installation was performed in the SQL editor. Reconcile migration history before any future automated migration push; do not blindly reapply this migration.

No account receives platform-support access from its school role. A database administrator must provision each specifically authorised existing account:

```sql
insert into public.feedback_reviewers(user_id)
select id from auth.users where lower(email) = lower('<approved account email>')
on conflict (user_id) do nothing;
```

Check that exactly one intended account was selected before applying this statement. Remove its reviewer row to revoke access. Do not put reviewer identities in public client code or grant this capability through user-editable profile metadata. The support inbox appears under Feedback and support for an authorised account; the authenticated sender sees only their own reports and sender-visible replies.

The scheduled `uhpab-feedback-retention` job runs hourly and calls `purge_expired_tester_feedback()`. Check the job and its recent runs after deployment. Reports are hidden immediately after their 90-day deadline and physically removed by the next successful job, including attachments and internal history. The independent submission-rate slots are also removed after 24 hours. Testers may delete their reports earlier. If the job fails, investigate and run the service-only purge as a privileged administrator after fixing it.

Descriptions and replies are not a secure place for credentials or research documents. Automatic text redaction is deliberately limited; testers must review all text and screenshots before consenting. The original selected screenshot is not uploaded: the browser creates a resized PNG without original metadata, though any visible text remains visible. The database limits accepted PNG size and dimensions; it does not establish that an image contains no private information.

Run `npm run test:feedback`, `npm run test:defence`, `npm run test:assisted` and the safe production build before publishing changes. `scripts/qa-tester-feedback.sql` is designed to run after the migration inside a transaction that is rolled back, on a fresh isolated installation with at least three test accounts. Do not run that installation-only test against an existing live feedback table.
