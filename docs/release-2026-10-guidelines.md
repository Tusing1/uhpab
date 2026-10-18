# Reconciled UHPAB release

## Confirmed policy

Reference: the project's August 2025 first-edition UHPAB PDF. The user confirmed that student documents should omit supervisor commitment, title-page supervisor names/qualifications and authorization/copyright, while retaining supervisor/principal approval and all school supervisor accounts. Similarity reports apply only to reports; the duplicated PDF entry produces one appendix.

`src/data/researchGuidelineRules.ts` owns preliminary order, appendix applicability, format rules and the binding generation instructions. Chapters One and Two are shared between proposal and report. `npm run sync:guidelines` regenerates JSON reference snapshots; the guidelines screen and DOCX use these reconciled structures. Do not restore old numbered sections from historical samples.

## Included changes

- Correct preliminary order with the combined table/figure/picture list in both types. Report abstract follows operational definitions as preliminary page ix.
- Appendices start with tools, ethical requirements, maps, pictures and information sheets; proposals add budget then work plan, reports add one similarity report.
- Existing approval, dedication, consent, methodology and other saved work is read through compatibility aliases. Retired fields remain in historical project JSON but are not selectable or exported. No destructive database cleanup is required.
- DOCX only: A4, Times New Roman 12, double-spaced body/references, single-spaced report abstract, unnumbered title page, Roman preliminary numbering and Arabic main-text numbering. Each chapter starts on a fresh page; subsection text flows continuously.
- The old simulated PDF/sample-identity export path was removed. Chapter Five follows discussion, recommendations, conclusions and health profession implications.
- Strict prompt contracts and application checks reject retired sections, report-only proposal output, title-page supervisor fields, cited/overlong abstracts, approach-only designs and author-year citations not linked to saved sources. Invalid output no longer silently replaces student work with a generic starter.
- The editor now looks up repeated component IDs, such as introduction, within the selected chapter. Gemini can use supplied methodology/findings context without inventing missing data.
- Reference-age checks use the saved research year. Recording a review does not remove an out-of-window warning or certify compliance.
- The adapted marking rubric stays 100 for reports; the proposal subset is 64 after retaining applicable ethical documents. It is a practice assessment, not an official UHPAB allocation. Unverifiable evidence remains provisional.

## Production safety gate

At the user's explicit request, private marking stays disabled for authenticated cloud accounts until Supabase setup is completed. `VITE_PRIVATE_RESEARCH_READY` defaults to false. Only set it true and rebuild after following `docs/private-research-storage.md` and verifying owner isolation, retention and scheduled physical cleanup. The deployment includes the migration/function/schedule source, but pushing Git does not apply them to Supabase.

No authentication, supervisor assignment or school review accounts are removed by this release. No real student research or API keys were used in automated browser tests. Gemini academic quality still requires genuine-model calibration and human review; strict contracts do not guarantee examiner judgement.

## Verification

- `npm run test:formulation`: 15 checks.
- `npm run test:marking`: 17 checks.
- `npm run test:guidelines`: 10 checks, including actual DOCX XML and legacy-content preservation.
- `scripts/qa-strict-marking-ui.mjs`: local demo marking with intercepted Gemini calls, PDF download, retention, deletion and mobile layout.
- `scripts/qa-guidelines-ui.mjs`: proposal/report editors, retired-title suppression, saved work, guideline display, mobile layout and the production marking-disabled gate.
- Synthetic proposal/report DOCX files were rendered using installed Microsoft Word because LibreOffice was not available. All resulting pages were visually inspected, including title-page numbering, Roman preliminaries, body numbering, headings, abstract and appendices.
- Vite production build passes. Repository-wide TypeScript and broad lint still have pre-existing errors, mainly untyped project/school data and explicit-any usage in legacy components; the changed/new strict-engine modules are checked separately.
