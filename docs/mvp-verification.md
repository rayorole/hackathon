# MVP verification — 16 September 2026

Integration based on Ray's main `30accf8`. Tested on localhost:3101 against the dedicated project database, using Jochem's registered and confirmed officer account.

Passed: registration and email confirmation (user completed password entry); pending access before administrator grant; authenticated dashboard; 543 real establishments and 27 Paalstraat results; business-name and establishment-ID search; empty search; correct Amplifon establishment/parent separation; dated evidence and working external source link; phone approval and email rejection; server-recorded reviewer identity; full page reload preserves both decisions; downloaded CSV has only the approved phone and its source URL; real coordinate map; source inventory; supported source refresh preserves reviewed proposals and adds an opening-hours proposal; sign-out and protected-page redirect afterward.

Backend checks: all protected APIs return 401 when signed out; foreign-origin writes return 403. Actual persisted dossier inspection confirmed both reviews, correct actor ID, independent proposal revisions and preserved evidence. 14 regression tests, lint, all relevant TypeScript checks and production build pass locally.

Test decisions intentionally remain in the Amplifon history with explicit MVP test notes. The phone is supported by two local sources; the email rejection tests export filtering and is not a claim that the address is wrong. They can be superseded through a new review, preserving the audit. The opening-hours proposal remains pending for the demo.

Limitations: partial sample, no municipal completeness claim; 543 real establishments are loaded in one bounded workspace request; source refresh has explicitly configured targets only; map coordinates are range-checked, not field-verified; the Toestanden page is a UI-state preview. No hosted deployment or official register publication was performed. New users require confirmed email and a trusted officer-role grant. AI budget uses one local shared ledger and is not suitable for multiple independent hosts/serverless instances without a shared atomic reservation store.
