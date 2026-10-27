import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

mkdirSync('tmp/defence-slides-qa', { recursive: true });
const outfile = resolve('tmp/defence-slides-qa/defenceSlides.mjs');
await build({
  entryPoints: ['src/lib/defenceSlides.ts'], outfile, bundle: true, packages: 'external',
  platform: 'node', format: 'esm', alias: { '@': resolve('src') }, define: { 'import.meta.env': '{}' },
});
const {
  DEFENCE_FACT_FIELDS, emptyDefenceFacts, extractProjectDefenceFacts, extractTextDefenceFacts,
  createDefenceDeck, buildDefenceSlide, validateDefenceDeck, missingDefenceFacts,
} = await import(pathToFileURL(outfile));

let count = 0;
async function check(name, run) { await run(); count++; console.log(`PASS ${name}`); }
const topic = 'Handwashing practices among nurses at Example Health Centre IV';
const objectives = [
  'To assess handwashing knowledge among nurses at Example Health Centre IV.',
  'To describe access to handwashing supplies among nurses at Example Health Centre IV.',
  'To explore reported barriers to handwashing among nurses at Example Health Centre IV.',
];
const questions = [
  'What handwashing knowledge do nurses at Example Health Centre IV report?',
  'What handwashing supplies are available to nurses at Example Health Centre IV?',
  'Which barriers to handwashing do nurses at Example Health Centre IV report?',
];
const project = () => ({
  id: 'proposal-qa', userId: 'student-qa', title: topic, type: 'proposal',
  createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-27T00:00:00.000Z', progress: {},
  chapters: {
    chapter1: {
      introduction: '<p>This previews Chapter One, not the background.</p>',
      background: '<p>Globally, hand hygiene supports infection prevention (WHO, 2024).</p><p>At the local study setting, Example Health Centre IV, practice needs assessment.</p><p>The local knowledge gap remains undocumented.</p>',
      statementOfProblem: '<p>Ideally, nurses should have adequate handwashing supplies.</p><p>Currently, supply access remains inconsistent (Akello, 2023).</p><p>The local knowledge gap remains undocumented.</p><p>If the problem persists, staff will face preventable interruptions.</p>',
      generalObjective: '<p>To assess handwashing practices among nurses at Example Health Centre IV.</p>',
      specificObjectives: `<ol>${objectives.map(value => `<li>${value}</li>`).join('')}</ol>`,
      researchQuestions: questions.map(value => `<p>${value}</p>`).join(''),
      scope: '<p>Content: The study will assess handwashing practices among nurses.</p><p>Place: The study will be conducted at Example Health Centre IV.</p><p>Period: The study will run during November 2026.</p>',
      justification: '<p>The study is needed to inform local planning.</p>',
      significance: '<p>The study may inform future staff education.</p>',
    },
    chapter2: { introduction: '<p>This is a literature preview only.</p>', body: '<p>Earlier studies report differing barriers (Okello et al., 2022).</p>' },
    chapter3: {
      studyDesign: '<p>A descriptive cross-sectional survey will be used.</p>',
      studySetting: '<p>Example Health Centre IV, outpatient department.</p>',
      studyPopulation: '<p>Registered nurses working in the outpatient department.</p>',
      inclusionExclusion: '<p>Include nurses on duty who consent.</p><p>Exclude nurses on leave.</p>',
      sampleSize: '<p>The proposed sample is 40 nurses, based on an accessible-population census.</p>',
      samplingMethod: '<p>All eligible nurses will be invited.</p>',
      researchInstruments: '<p>A structured questionnaire will be used.</p>',
      studyVariables: '<p>Knowledge score and reported handwashing practices.</p>',
      dataCollection: '<p>Consenting nurses will complete questionnaires privately.</p>',
      qualityControl: '<p>The questionnaire will be pretested.</p>',
      dataManagement: '<p>Responses will be coded and summarized with frequencies.</p>',
      ethicalConsiderations: '<p>Permission will be sought before recruitment.</p><p>Participation will be voluntary.</p>',
      limitations: '<p>LIMITATION_ONLY: self-report may introduce bias.</p>',
      dataPresentation: '<p>PRESENTATION_ONLY: tables will summarize responses.</p>',
    },
    references: { content: '<p>WHO. (2024). Supplied synthetic guidance.</p><p>Akello. (2023). Supplied synthetic study.</p><p>Okello et al. (2022). Supplied synthetic review.</p>' },
    chapter4: { findings: 'RESULTS_MUST_NOT_APPEAR: 93% improved.' },
    preliminaryPages: { approval: '<p>APPROVAL_PAGE_ONLY: signed by someone.</p>', tableOfContents: 'TOC_ONLY: background ........ 7' },
  },
});
const user = { id: 'student-qa', name: 'Synthetic Candidate', email: 'student@example.test', role: 'free',
  htin: 'TEST/26/001', className: 'Diploma in Nursing', schoolName: 'Example Training School', supervisorName: 'Synthetic Supervisor' };
const options = { sourceName: 'Synthetic proposal', projectId: 'proposal-qa', sourceVersion: 'revision-2', durationMinutes: 10 };
const fullFacts = () => extractProjectDefenceFacts(project(), user);
const fullDeck = () => createDefenceDeck(fullFacts(), options);
const allContent = deck => deck.slides.map(slide => `${slide.title}\n${slide.bullets.join('\n')}\n${slide.notes}`).join('\n');

await check('Relevant problem, sample and contribution sentences are selected ahead of introductory prose', () => {
  const facts = fullFacts();
  facts.problem.value = '1.2 Problem statement Ideally the service should be available. The clinic has regular patient contact. However, the local uptake gap remains undocumented (Example, 2026).';
  facts.sample.value = '3.4 Sample size A formula will be used. The total sample size is 40 nurses.';
  facts.contribution.value = '1.5 Significance of the study The topic is of general interest. The findings will inform staff education.';
  const deck = createDefenceDeck(facts, options);
  assert.match(deck.slides[2].bullets.join(' '), /However, the local uptake gap/);
  assert.match(deck.slides[2].bullets.join(' '), /Ideal situation: Ideally/);
  assert.match(deck.slides[2].bullets.join(' '), /\[Add current situation\]/);
  assert.match(deck.slides[7].bullets.join(' '), /total sample size is 40/);
  assert.match(deck.slides[9].bullets.join(' '), /findings will inform/);
  assert.ok(deck.slides[2].notes.includes(facts.problem.value));
});

await check('An absent optional supervisor adds neither a fake identity nor an unresolved slide placeholder', () => {
  const facts = fullFacts();
  facts.supervisor = { value: '', source: '', status: 'missing' };
  const deck = createDefenceDeck(facts, options);
  assert.ok(!deck.slides[0].bullets.some(text => /supervisor/i.test(text)));
  assert.ok(!deck.slides[0].notes.includes('[Add supervisor]'));
  assert.deepEqual(validateDefenceDeck(deck), []);
});

await check('Field definitions cover exactly the required public fact keys without shared empty objects', () => {
  const expected = 'topic,candidate,htin,school,course,supervisor,background,problem,aim,objectives,questions,scope,literature,justification,design,setting,population,eligibility,sample,sampling,instruments,variables,collection,quality,analysis,ethics,contribution,references'.split(',');
  assert.deepEqual(DEFENCE_FACT_FIELDS.map(field => field.key).sort(), [...expected].sort());
  assert.equal(new Set(DEFENCE_FACT_FIELDS.map(field => field.key)).size, expected.length);
  const a = emptyDefenceFacts(), b = emptyDefenceFacts();
  assert.deepEqual(Object.keys(a).sort(), [...expected].sort());
  a.topic.value = 'Changed';
  assert.equal(b.topic.value, ''); assert.equal(a.sample.value, '');
  assert.ok(Object.values(b).every(fact => fact.status === 'missing' && fact.source === '' && fact.value === ''));
  assert.ok(DEFENCE_FACT_FIELDS.every(field => ['Identity', 'Study focus', 'Methods', 'Sources'].includes(field.group) && typeof field.required === 'boolean'));
});

await check('Structured extraction follows actual chapter keys and owner profile with no cross-section leakage', () => {
  const input = project(), before = JSON.stringify(input), facts = extractProjectDefenceFacts(input, user);
  assert.equal(facts.topic.value, topic);
  assert.equal(facts.candidate.value, user.name); assert.equal(facts.course.value, user.className);
  assert.equal(facts.objectives.value, objectives.map(value => `- ${value}`).join('\n')); assert.equal(facts.questions.value, questions.join('\n\n'));
  assert.match(facts.background.source, /chapters\.chapter1\.background/);
  assert.match(facts.ethics.source, /chapters\.chapter3\.ethicalConsiderations/);
  assert.match(facts.candidate.source, /profile\.name/);
  assert.match(facts.eligibility.value, /Exclude nurses on leave/);
  assert.equal(missingDefenceFacts(facts).length, 0);
  assert.doesNotMatch(JSON.stringify(facts), /previews Chapter One|literature preview|RESULTS_MUST_NOT_APPEAR|APPROVAL_PAGE_ONLY|TOC_ONLY|LIMITATION_ONLY|PRESENTATION_ONLY/);
  assert.equal(JSON.stringify(input), before);
  assert.ok(Object.values(facts).every(fact => fact.status === 'found'));
});

await check('Another viewer cannot accidentally become the candidate; profile identifiers are not invented', () => {
  const facts = extractProjectDefenceFacts(project(), { ...user, id: 'supervisor-viewer' });
  for (const key of ['candidate', 'htin', 'course', 'school', 'supervisor']) assert.equal(facts[key].status, 'missing');
  const fallback = extractProjectDefenceFacts(project(), { ...user, htin: undefined, studentId: 'LEGACY-HTIN' });
  assert.equal(fallback.htin.value, 'LEGACY-HTIN'); assert.match(fallback.htin.source, /studentId/);
  const absent = extractProjectDefenceFacts(project());
  assert.equal(absent.candidate.value, ''); assert.equal(absent.school.value, '');
});

await check('Reports are rejected before any report content can enter a proposal deck', () => {
  assert.throws(() => extractProjectDefenceFacts({ ...project(), type: 'report' }, user), /proposal.*report/i);
  assert.throws(() => extractTextDefenceFacts('RESEARCH REPORT\nCHAPTER ONE\n1.1 Background\nCompleted study.', 'report.txt'), /proposal.*report/i);
  assert.throws(() => extractTextDefenceFacts('CHAPTER FOUR: FINDINGS\n40 participants responded.', 'report.txt'), /proposal.*report/i);
});

await check('Shared study context fills only gaps and never replaces manuscript objectives or methods', () => {
  const input = project();
  delete input.chapters.chapter3.studyDesign; delete input.chapters.chapter3.sampleSize;
  input.chapters._studyContext = { design: 'A qualitative case study is planned.', sample: 'Twelve interviews are planned.',
    objectives: 'CONFLICTING_OBJECTIVE', setting: 'CONFLICTING_SETTING', sampling: 'CONFLICTING_SAMPLING',
    ethics: 'CONFLICTING_ETHICS', beneficiaries: 'CONFLICTING_BENEFICIARY' };
  const facts = extractProjectDefenceFacts(input);
  assert.equal(facts.design.value, input.chapters._studyContext.design);
  assert.match(facts.sample.source, /_studyContext\.sample/);
  assert.equal(facts.objectives.value, objectives.map(value => `- ${value}`).join('\n'));
  assert.doesNotMatch(JSON.stringify(facts), /CONFLICTING_/);
  input.chapters = { _studyContext: { objectives: objectives.join('\n'), period: 'January to March 2027',
    eligibility: 'Include consenting staff.', rationale: 'A stated local uncertainty.', beneficiaries: 'Managers may use the evidence.' } };
  const context = extractProjectDefenceFacts(input);
  assert.equal(context.objectives.value, objectives.join('\n')); assert.match(context.scope.value, /January to March 2027/);
  assert.equal(context.problem.value, 'A stated local uncertainty.'); assert.equal(context.contribution.value, 'Managers may use the evidence.');
  assert.equal(context.sample.status, 'missing');
});

await check('Only exact, current study-profile signatures confer confirmed status', () => {
  const input = project();
  input.chapters._studyContext = { objectives: objectives.join('\n'), design: 'A descriptive cross-sectional survey will be used.' };
  input.chapters._studyContext._confirmedStudyFields = JSON.stringify({
    objectives: JSON.stringify([input.title, objectives.join('\n'), 3]),
    design: JSON.stringify([input.title, input.chapters._studyContext.design]),
  });
  let facts = extractProjectDefenceFacts(input);
  assert.equal(facts.objectives.status, 'confirmed'); assert.equal(facts.design.status, 'confirmed');
  input.title += ' revised'; facts = extractProjectDefenceFacts(input); assert.equal(facts.objectives.status, 'found');
  input.title = topic; input.chapters._objectiveCount = 2;
  assert.equal(extractProjectDefenceFacts(input).objectives.status, 'found');
  input.chapters._objectiveCount = 3; input.chapters.chapter1.specificObjectives += '<p>New objective.</p>';
  assert.equal(extractProjectDefenceFacts(input).objectives.status, 'found');
  input.chapters._studyContext._confirmedStudyFields = '{broken';
  assert.doesNotThrow(() => extractProjectDefenceFacts(input));
  assert.equal(extractProjectDefenceFacts(input).design.status, 'found');
});

const manuscript = `Research title: ${topic}
Candidate name: Synthetic Candidate
HTIN: TEST/26/001
School: Example Training School
Course: Diploma in Nursing
TABLE OF CONTENTS
1.1 Background to the Study ........ 1
1.2 Statement of the Problem 2
1.3.2 Specific Objectives ........ 3
CHAPTER TWO: LITERATURE REVIEW ........ 6
CHAPTER ONE: INTRODUCTION
1.0 Introduction
INTRO_ONLY: This is the chapter preview.
1.1 Background to the Study
Hygiene needs local study (WHO, 2024).
1.2 Statement of the Problem
The local gap is undocumented (Akello, 2023).
1.3 Research Objectives
1.3.1 Purpose of the Study or General Objective
To assess handwashing practices.
1.3.2 Specific Objectives
${objectives.map((value, index) => `${index + 1}. ${value}`).join('\n')}
1.3.3 Research Questions
${questions.map((value, index) => `${index + 1}. ${value}`).join('\n')}
1.4 Justification of the Study
Local planning needs evidence.
1.5 Significance of the Study
The study may inform staff education.
1.6 Scope of the Study
Outpatient services in November 2026.
CHAPTER TWO: LITERATURE REVIEW
2.0 Introduction
This review compares prior evidence.
2.1 Knowledge and practice
Literature has mixed findings (Okello et al., 2022).
2.2 Research questions
LITERATURE_ONLY: this heading must not overwrite the actual questions.
CHAPTER THREE: METHODOLOGY
3.1 Study Design
A cross-sectional survey is planned.
3.2 Study Setting
Example Health Centre IV.
3.3 Study Population
Registered nurses.
3.4 Sample Size
Forty eligible nurses will be invited as a census.
3.5 Sampling Method
All eligible staff will be invited.
3.6 Inclusion and Exclusion Criteria
Include consenting staff; exclude those on leave.
3.7 Study Variables
Knowledge score and reported practices.
3.8 Research Instruments
A structured questionnaire is planned.
3.9 Data Collection Procedure
Private questionnaires will be offered.
3.10 Data Management and Analysis
Frequencies will summarize responses.
3.11 Data Presentation
PRESENTATION_ONLY: tables and charts.
3.12 Quality Control
The tool will be pretested.
3.13 Ethical Considerations
Permission will be sought; participation will be voluntary.
3.14 Limitations of the Study
LIMITATIONS_ONLY: self-report bias.
3.15 Dissemination of Results
DISSEMINATION_ONLY: a local feedback meeting.
REFERENCES
WHO. (2024). Supplied synthetic guidance.
Okello et al. (2022). Supplied synthetic review.
APPENDICES
Appendix 1: Data collection tools
Research questions
APPENDIX_ONLY: a questionnaire question, not a research question.`;

await check('Anchored document headings exclude contents and isolate all chapter sections with source anchors', () => {
  const facts = extractTextDefenceFacts(manuscript, 'synthetic.docx');
  assert.equal(facts.topic.value, topic); assert.equal(facts.candidate.value, user.name);
  assert.equal(facts.background.value, 'Hygiene needs local study (WHO, 2024).');
  assert.equal(facts.problem.value, 'The local gap is undocumented (Akello, 2023).');
  assert.equal(facts.objectives.value, objectives.map((value, i) => `${i + 1}. ${value}`).join('\n'));
  assert.equal(facts.questions.value, questions.map((value, i) => `${i + 1}. ${value}`).join('\n'));
  assert.match(facts.literature.value, /LITERATURE_ONLY/); assert.doesNotMatch(facts.questions.value, /LITERATURE_ONLY/);
  assert.equal(facts.ethics.value, 'Permission will be sought; participation will be voluntary.');
  assert.equal(facts.analysis.value, 'Frequencies will summarize responses.');
  assert.doesNotMatch(JSON.stringify(facts), /INTRO_ONLY|PRESENTATION_ONLY|LIMITATIONS_ONLY|DISSEMINATION_ONLY|APPENDIX_ONLY|\.\.\.\./);
  const backgroundLine = manuscript.split('\n').indexOf('1.1 Background to the Study') + 1;
  assert.equal(facts.background.source, `synthetic.docx: line ${backgroundLine} (1.1 Background to the Study)`);
  assert.match(facts.references.value, /WHO\. \(2024\)/);
});

await check('Bare contents lists cannot be mistaken for actual study facts', () => {
  const facts = extractTextDefenceFacts('TABLE OF CONTENTS\nBackground\nProblem statement\nSpecific objectives\nStudy design\nReferences', 'contents.txt');
  assert.ok(Object.values(facts).every(fact => fact.status === 'missing'));
  const numbered = extractTextDefenceFacts('1.1 Background ........ 1\n1.2 Statement of the Problem 2\n3.4 Sample Size ........ 12', 'contents.txt');
  assert.equal(numbered.background.value, ''); assert.equal(numbered.sample.value, '');
  const unanchored = extractTextDefenceFacts('The background describes our concern. Our sample size is not fixed.\nWe discuss ethics here without a heading.', 'prose.txt');
  assert.equal(unanchored.background.status, 'missing'); assert.equal(unanchored.sample.status, 'missing');
});

await check('HTML and Markdown headings, nested lists, entities and text boundaries preserve wording', () => {
  const html = '<h2>Specific objectives</h2><ol><li>To assess nurses&#39; knowledge &amp; attitudes.</li><li>To describe &lt;5 years of service.</li></ol><h2>Research questions</h2><p>What are nurses&#39; views?</p><h2>Study design</h2><p>A cross-sectional survey.</p><script>INJECTED_TEXT</script>';
  const facts = extractTextDefenceFacts(html, 'html.docx');
  assert.equal(facts.objectives.value, "- To assess nurses' knowledge & attitudes.\n- To describe <5 years of service.");
  assert.equal(facts.questions.value, "What are nurses' views?"); assert.doesNotMatch(JSON.stringify(facts), /INJECTED_TEXT/);
  const markdown = extractTextDefenceFacts('## 1.3.2 Specific objectives\n1. To assess knowledge.\n2. To explore barriers.\n## 1.3.3 Research questions\nWhat barriers exist?\n## 3.1 Study design\nA case study.', 'notes.md');
  assert.equal(markdown.objectives.value, '1. To assess knowledge.\n2. To explore barriers.');
  assert.equal(markdown.design.value, 'A case study.');
});

await check('Separate eligibility and scope subsections remain traceable, without contaminating the next fact', () => {
  const facts = extractTextDefenceFacts('Inclusion criteria\nConsenting nurses.\nExclusion criteria\nNurses on leave.\nStudy variables\nKnowledge score.\nContent scope\nHandwashing.\nGeographical scope\nExample Health Centre IV.\nTime scope\nNovember 2026.\nStudy design\nA survey.', 'subsections.txt');
  assert.equal(facts.eligibility.value, 'Consenting nurses.\n\nNurses on leave.');
  assert.match(facts.eligibility.source, /Inclusion criteria.*Exclusion criteria/);
  assert.doesNotMatch(facts.eligibility.value, /Knowledge/);
  assert.match(facts.scope.value, /Handwashing/); assert.match(facts.scope.value, /November 2026/);
  assert.match(facts.scope.value, /content scope:/); assert.match(facts.scope.value, /geographical scope:/); assert.match(facts.scope.value, /time scope:/);
  assert.doesNotMatch(facts.scope.value, /survey/);
});

await check('Topic-only inputs yield a visibly incomplete ten-slide draft without invented methods, results or references', () => {
  const facts = extractTextDefenceFacts(topic, 'Entered topic');
  assert.equal(facts.topic.value, topic);
  for (const key of ['sample', 'population', 'design', 'objectives', 'questions', 'ethics', 'references']) assert.equal(facts[key].status, 'missing');
  const deck = createDefenceDeck(facts, { sourceName: 'Entered topic', durationMinutes: 8 });
  assert.equal(deck.slides.length, 10); assert.equal(deck.slides[0].title, topic);
  assert.match(deck.slides[7].bullets.join('\n'), /\[Add sample size and justification\]/);
  assert.match(deck.slides[8].bullets.join('\n'), /\[Add ethical arrangements\]/);
  assert.match(deck.slides[9].notes, /\[Add references\]/);
  assert.equal(deck.slides[9].title, 'Closing and next steps');
  assert.ok(deck.slides[9].bullets.includes('Questions and discussion'));
  assert.doesNotMatch(deck.slides[9].bullets.join('\n'), /references/i);
  assert.doesNotMatch(allContent(deck), /384|Kish|Leslie|approved by|ethical approval was|statistically significant|\bWHO[,.(]|2024|95%/i);
  assert.ok(validateDefenceDeck(deck).some(error => /Add specific objectives/.test(error)));
  assert.ok(missingDefenceFacts(facts).some(field => field.key === 'sample'));
});

await check('Generation is offline, deterministic per slide, exactly ten stable IDs and all facts have a slide', () => {
  const facts = fullFacts(), before = JSON.stringify(facts), deck = createDefenceDeck(facts, options), again = createDefenceDeck(facts, options);
  const roles = ['title', 'background', 'problem', 'objectives', 'questions-scope', 'literature-value', 'design-population', 'sample-measurement', 'execution-ethics', 'closing'];
  assert.deepEqual(deck.slides.map(slide => slide.role), roles);
  assert.deepEqual(deck.slides.map(slide => slide.id), roles.map(role => `defence-${role}`));
  assert.deepEqual(deck.slides, again.slides); assert.equal(new Set(deck.slides.map(slide => slide.id)).size, 10);
  assert.deepEqual([...new Set(deck.slides.flatMap(slide => slide.sourceKeys))].sort(), Object.keys(facts).sort());
  assert.equal(deck.version, 1); assert.equal(deck.projectId, options.projectId); assert.equal(deck.sourceVersion, options.sourceVersion);
  assert.equal(deck.durationMinutes, 10); assert.ok(Number.isFinite(Date.parse(deck.updatedAt)));
  assert.deepEqual(validateDefenceDeck(deck), []);
  assert.equal(JSON.stringify(facts), before);
  facts.sample.value = 'Changed after generation'; assert.notEqual(deck.facts.sample.value, facts.sample.value);
  assert.throws(() => createDefenceDeck(facts, { ...options, durationMinutes: 0 }), /positive/);
  assert.throws(() => createDefenceDeck(facts, { ...options, durationMinutes: NaN }), /positive/);
  assert.throws(() => createDefenceDeck(facts, { ...options, sourceName: ' ' }), /source name/);
});

await check('Objectives and research questions are preserved verbatim in bullets and full source notes', () => {
  const deck = fullDeck();
  assert.deepEqual(deck.slides[3].bullets.slice(1), objectives);
  assert.deepEqual(deck.slides[4].bullets.slice(0, questions.length), questions);
  for (const slide of deck.slides) for (const key of slide.sourceKeys) {
    assert.ok(slide.notes.includes(deck.facts[key].value)); assert.ok(slide.notes.includes(deck.facts[key].source));
  }
  assert.match(deck.slides[1].notes, /WHO, 2024/); assert.match(deck.slides[9].notes, /Supplied synthetic guidance/);
  assert.doesNotMatch(allContent(deck), /RESULTS_MUST_NOT_APPEAR|APPROVAL_PAGE_ONLY/);
});

await check('Long objectives and questions are never silently truncated and trigger actionable length warnings', () => {
  const facts = fullFacts();
  const long = `To assess ${'the exact prespecified knowledge, behaviour and setting details '.repeat(12)}among nurses.`;
  const last = 'To preserve the eighth objective exactly.';
  facts.objectives.value = [long, ...objectives, 'To retain item five.', 'To retain item six.', 'To retain item seven.', last].join('\n');
  facts.questions.value = `How does ${'the complete supplied research question wording '.repeat(15)}relate to handwashing?`;
  const deck = createDefenceDeck(facts, options);
  assert.ok(deck.slides[3].bullets.includes(long)); assert.ok(deck.slides[3].bullets.includes(last));
  assert.ok(deck.slides[4].bullets.includes(facts.questions.value));
  assert.ok(deck.slides[3].notes.includes(facts.objectives.value));
  const errors = validateDefenceDeck(deck);
  assert.ok(errors.some(error => /Slide 4.*exceed.*18pt.*No text has been removed/.test(error)));
  assert.ok(!errors.some(error => /Slide 5.*exceed/.test(error)), 'The long question now fits using automatic sizing.');
  deck.slides[3].bullets.pop(); assert.ok(validateDefenceDeck(deck).some(error => /preserve every original objective verbatim/.test(error)));
});

await check('Extractive bullets keep adjacent citations, abbreviations and decimal values together', () => {
  const facts = fullFacts();
  facts.background.value = 'Globally, a concern was identified. (WHO, 2024). At the local study setting, the measured value was 3.5 units (Akello et al., 2023). A local evidence gap remains. A third sentence remains in notes.';
  const slide = buildDefenceSlide(1, facts);
  assert.equal(slide.bullets[0], 'Wider context: Globally, a concern was identified. (WHO, 2024).');
  assert.equal(slide.bullets[1], 'Local context: At the local study setting, the measured value was 3.5 units (Akello et al., 2023).');
  assert.ok(slide.notes.includes('A third sentence remains in notes.'));
  facts.literature.value = 'Okello et al. (2022) described a local gap. Another finding was reported (WHO, 2024).';
  assert.equal(buildDefenceSlide(5, facts).bullets[0], 'Literature review and gap: Okello et al. (2022) described a local gap.');
  facts.problem.value = `Currently, ${'a long supplied clause '.repeat(30)}(WHO, 2024).`;
  const long = buildDefenceSlide(2, facts);
  assert.match(long.bullets[1], /Review current situation in source notes/); assert.ok(long.notes.includes(facts.problem.value));
});

await check('Single-slide regeneration is isolated and index errors are explicit', () => {
  const deck = fullDeck(); deck.slides[2].title = 'My manually edited problem title';
  const before = structuredClone(deck.slides);
  deck.slides[7] = buildDefenceSlide(7, { ...deck.facts, sample: { ...deck.facts.sample, value: 'A revised census of 42 eligible staff is proposed.' } });
  for (let i = 0; i < 10; i++) if (i !== 7) assert.deepEqual(deck.slides[i], before[i]);
  assert.equal(deck.slides[7].id, before[7].id); assert.match(deck.slides[7].notes, /42 eligible staff/);
  for (const index of [-1, 10, 1.5, NaN]) assert.throws(() => buildDefenceSlide(index, deck.facts), /0 to 9/);
});

await check('Placeholders remain missing even when a caller mistakenly marks them found', () => {
  const facts = fullFacts(); facts.sample = { value: '[insert sample size]', source: 'Manuscript: sample', status: 'found' };
  assert.ok(missingDefenceFacts(facts).some(field => field.key === 'sample'));
  const deck = createDefenceDeck(facts, options);
  assert.equal(deck.slides[7].bullets[0], '[Add sample size and justification]');
  assert.ok(deck.slides[7].notes.includes('[insert sample size]'));
  assert.ok(validateDefenceDeck(deck).some(error => /Resolve the placeholder/.test(error)));
});

await check('Explicit draft exports skip readiness only; edited notes can be validated independently', () => {
  const facts = emptyDefenceFacts(); facts.topic = { value: topic, source: 'Entered topic', status: 'confirmed' };
  const deck = createDefenceDeck(facts, options);
  assert.ok(validateDefenceDeck(deck).length > 0);
  assert.deepEqual(validateDefenceDeck(deck, { allowDraft: true }), []);
  deck.slides[0].notes = 'My own opening remarks.';
  assert.ok(validateDefenceDeck(deck, { allowDraft: true }).some(error => /notes must retain|source anchor/.test(error)));
  assert.deepEqual(validateDefenceDeck(deck, { allowDraft: true, allowEditedNotes: true }), []);
  assert.ok(validateDefenceDeck(deck, { allowEditedNotes: true }).some(error => /Add specific objectives/.test(error)));
  deck.facts.sample = { value: '[insert sample size]', source: 'User entry', status: 'found' };
  assert.ok(validateDefenceDeck(deck, { allowDraft: true, allowEditedNotes: true }).some(error => /Resolve the placeholder/.test(error)));
  deck.facts.sample.status = 'missing';
  assert.deepEqual(validateDefenceDeck(deck, { allowDraft: true, allowEditedNotes: true }), []);
  deck.facts.sample.value = 40;
  assert.ok(validateDefenceDeck(deck, { allowDraft: true, allowEditedNotes: true }).some(error => /Repair the sample/.test(error)));
});

await check('Edited-note and draft options never bypass objective/question wording, length or slide roles', () => {
  const validationOptions = { allowDraft: true, allowEditedNotes: true };
  const deck = fullDeck(); deck.slides.forEach(slide => { slide.notes = 'Personal rehearsal notes.'; });
  assert.deepEqual(validateDefenceDeck(deck, validationOptions), []);
  deck.slides[3].bullets[1] = 'A shortened objective.';
  assert.ok(validateDefenceDeck(deck, validationOptions).some(error => /original objective verbatim/.test(error)));
  deck.slides[4].bullets[0] = 'An altered question?';
  assert.ok(validateDefenceDeck(deck, validationOptions).some(error => /original research question verbatim/.test(error)));
  deck.slides[8].role = 'findings';
  assert.ok(validateDefenceDeck(deck, validationOptions).some(error => /role/.test(error)));
  deck.slides[3].bullets.push('Too much detail '.repeat(100));
  assert.ok(validateDefenceDeck(deck, validationOptions).some(error => /exceed.*18pt/.test(error)));
});

await check('Long-sentence review placeholders mark strict decks as drafts even if every fact is present', () => {
  const facts = fullFacts(); facts.background.value = `Globally, ${'a long complete supplied statement '.repeat(20)}(WHO, 2024).`;
  const deck = createDefenceDeck(facts, options);
  assert.equal(missingDefenceFacts(facts).length, 0);
  assert.ok(validateDefenceDeck(deck).some(error => /draft:.*Review/.test(error)));
  assert.deepEqual(validateDefenceDeck(deck, { allowDraft: true }), []);
  assert.ok(deck.slides[1].notes.includes(facts.background.value));
});

await check('Real legacy instructional methods and ethical checklists remain reviewable but are never presented as facts', () => {
  const input = project();
  const collection = '<p>This section should explain 3.9 Data collection procedure for this study. Write directly, keep the wording academic, and only add facts that you can support with evidence.</p><p><strong>Before submission, make sure this section covers:</strong></p><ul><li>Describe permissions</li><li>Describe participant approach and consent</li><li>Describe actual data collection steps</li></ul>';
  const ethics = '<p>Ethical approval and permission will be obtained before data collection. Respondents will be informed about the purpose of the study, voluntary participation, confidentiality, and their right to withdraw at any time.</p><p><strong>Before submission, make sure this section covers:</strong></p><ul><li>Mention approvals</li><li>Mention informed consent</li><li>Mention confidentiality and voluntary participation</li></ul>';
  input.chapters.chapter3.dataCollection = collection; input.chapters.chapter3.ethicalConsiderations = ethics;
  input.chapters.chapter3.sampleSize = '<p>The sample size will be determined using an appropriate method approved by the supervisor. The calculation or justification should match the study design, population size, and available data collection period.</p>';
  input.chapters.chapter3.studyDesign = '<p>[Name the actual study design and give the study-specific rationale. Quantitative/qualitative describe approaches, not designs.]</p>';
  const facts = extractProjectDefenceFacts(input, user), deck = createDefenceDeck(facts, options);
  for (const key of ['collection', 'ethics', 'sample', 'design']) {
    assert.equal(facts[key].status, 'missing'); assert.ok(facts[key].value.length > 50);
    assert.ok(missingDefenceFacts(facts).some(field => field.key === key));
  }
  assert.match(deck.slides[8].notes, /This section should explain 3\.9/);
  assert.match(deck.slides[8].notes, /Before submission, make sure this section covers/);
  assert.doesNotMatch(deck.slides.flatMap(slide => slide.bullets).join('\n'), /This section|Before submission|Describe permissions|Mention approvals|Ethical approval and permission will be obtained/);
  assert.ok(deck.slides[8].bullets.includes('[Add data collection]'));
  assert.ok(deck.slides[8].bullets.includes('[Add ethical arrangements]'));
  assert.deepEqual(validateDefenceDeck(deck, { allowDraft: true }), []);
  const upload = extractTextDefenceFacts('3.9 Data Collection Procedure\nThis section should explain 3.9 Data collection procedure.\nBefore submission, make sure this section covers:\n- Describe permissions\n3.13 Ethical Considerations\nPermission will be obtained. Before submission, make sure this section covers:\n- Mention approvals', 'legacy.txt');
  assert.equal(upload.collection.status, 'missing'); assert.equal(upload.ethics.status, 'missing');
  deck.slides[8].bullets[0] = 'This section should explain 3.9 Data collection procedure.';
  assert.ok(validateDefenceDeck(deck, { allowDraft: true, allowEditedNotes: true }).some(error => /instructional template text/.test(error)));
});

await check('Inline numbered section scaffolding and general questions do not crowd exact objective/question lists', () => {
  const input = project();
  input.chapters.chapter1.specificObjectives = `<p><strong>1.3.2 Specific Objectives</strong> To achieve the general objective, the study will address the following specific objectives:</p><ol>${objectives.map(value => `<li>${value}</li>`).join('')}</ol>`;
  input.chapters.chapter1.researchQuestions = `<p><strong>1.3.3 Research Questions</strong></p><p>General research question: What is the overall practice?</p><p>The study will be guided by the following research questions:</p><ol>${questions.map(value => `<li>${value}</li>`).join('')}</ol>`;
  const facts = extractProjectDefenceFacts(input, user), deck = createDefenceDeck(facts, options);
  assert.deepEqual(deck.slides[3].bullets.slice(1), objectives);
  assert.deepEqual(deck.slides[4].bullets.slice(0, 3), questions);
  assert.equal(deck.slides[3].bullets.length, 4); assert.equal(deck.slides[4].bullets.length, 6);
  assert.match(deck.slides[3].notes, /1\.3\.2 Specific Objectives/);
  assert.match(deck.slides[3].notes, /To achieve the general objective/);
  assert.match(deck.slides[4].notes, /General research question: What is the overall practice/);
  assert.ok(deck.slides[3].notes.includes(facts.objectives.value));
  assert.deepEqual(validateDefenceDeck(deck), []);
  deck.slides[3].bullets[2] = 'To describe access to supplies.';
  assert.ok(validateDefenceDeck(deck, { allowDraft: true, allowEditedNotes: true }).some(error => /original objective verbatim/.test(error)));
  const inline = fullFacts();
  inline.objectives.value = `1.3.2 Specific Objectives To achieve the general objective: ${objectives.map((value, i) => `${i + 1}. ${value}`).join(' ')}`;
  inline.questions.value = `1.3.3 Research Questions General research question: What is the overall practice? ${questions.map((value, i) => `${i + 1}. ${value}`).join(' ')}`;
  const inlineDeck = createDefenceDeck(inline, options);
  assert.deepEqual(inlineDeck.slides[3].bullets.slice(1), objectives);
  assert.deepEqual(inlineDeck.slides[4].bullets.slice(0, 3), questions);
  assert.ok(inlineDeck.slides[3].notes.includes(inline.objectives.value));
  assert.deepEqual(validateDefenceDeck(inlineDeck), []);
});

await check('Original HTML fact values use the established list reader while notes retain the entire raw fact', () => {
  const facts = fullFacts();
  facts.objectives.value = `<p>1.3.2 Specific Objectives To achieve the aim:</p><ol>${objectives.map(value => `<li>${value}</li>`).join('')}</ol>`;
  facts.questions.value = `<p>General research question: What is the overall practice?</p><ol>${questions.map(value => `<li>${value}</li>`).join('')}</ol>`;
  const deck = createDefenceDeck(facts, options);
  assert.deepEqual(deck.slides[3].bullets.slice(1), objectives);
  assert.deepEqual(deck.slides[4].bullets.slice(0, 3), questions);
  assert.ok(deck.slides[3].notes.includes(facts.objectives.value)); assert.ok(deck.slides[4].notes.includes(facts.questions.value));
  assert.deepEqual(validateDefenceDeck(deck), []);
});

await check('A blank background remains missing and long cover titles defer to actual exporter layout', () => {
  const input = project(); input.chapters.chapter1.background = '';
  const facts = extractProjectDefenceFacts(input, user);
  assert.equal(facts.background.status, 'missing'); assert.equal(facts.background.value, '');
  assert.doesNotMatch(facts.background.value, /Earlier studies/);
  facts.topic.value = 'A deliberately detailed but editable research topic '.repeat(5).trim();
  const deck = createDefenceDeck(facts, options);
  assert.ok(deck.slides[0].title.length > 200);
  assert.ok(validateDefenceDeck(deck, { allowDraft: true }).some(error => /Slide 1.*cover allows 4/.test(error)));
});

await check('Presentation-only shortening requires explicit per-slide approval and preserves the fact snapshot', () => {
  const facts = fullFacts();
  facts.objectives.value = `To assess ${'the exact prespecified knowledge and behaviour details '.repeat(40)}among nurses.`;
  facts.questions.value = `How do ${'the prespecified knowledge and behaviour details '.repeat(40)}relate to handwashing?`;
  const original = structuredClone(facts), deck = createDefenceDeck(facts, options);
  assert.ok(validateDefenceDeck(deck).some(error => /exceed.*18pt/.test(error)));
  deck.slides[3].bullets = ['To assess nurses\' handwashing knowledge and behaviour.'];
  deck.slides[4].bullets = ['How do knowledge and behaviour relate to handwashing?'];
  const beforeApproval = validateDefenceDeck(deck, { allowDraft: true, allowEditedNotes: true });
  assert.ok(beforeApproval.some(error => /original objective verbatim/.test(error)));
  assert.ok(beforeApproval.some(error => /original research question verbatim/.test(error)));
  deck.slides[3].approvedShortening = false;
  assert.ok(validateDefenceDeck(deck).some(error => /original objective verbatim/.test(error)));
  deck.slides[3].approvedShortening = true;
  assert.ok(validateDefenceDeck(deck).some(error => /original research question verbatim/.test(error)));
  deck.slides[4].approvedShortening = true;
  assert.deepEqual(validateDefenceDeck(deck), []);
  assert.deepEqual(facts, original); assert.deepEqual(deck.facts, original);
  assert.ok(deck.slides[3].notes.includes(original.objectives.value));
  assert.ok(deck.slides[4].notes.includes(original.questions.value));
  assert.ok(deck.slides[3].notes.includes(original.objectives.source));
  deck.slides[3].notes = 'Student-edited rehearsal notes only.';
  assert.ok(validateDefenceDeck(deck).some(error => /notes must retain the full original specific objectives/.test(error)));
  assert.deepEqual(validateDefenceDeck(deck, { allowEditedNotes: true }), []);
  assert.equal(buildDefenceSlide(3, deck.facts).approvedShortening, undefined);
  assert.deepEqual(deck.facts, original);
});

await check('Shortening flags are typed opt-ins and never bypass roles, sources or layout limits', () => {
  for (const invalid of ['true', 1, null, {}, []]) {
    const deck = fullDeck(); deck.slides[3].approvedShortening = invalid;
    assert.ok(validateDefenceDeck(deck, { allowDraft: true, allowEditedNotes: true }).some(error => /approvedShortening must be a boolean/.test(error)));
  }
  const deck = fullDeck(); deck.slides[3].approvedShortening = true;
  deck.slides[3].bullets = ['Still too much presentation text '.repeat(100)];
  assert.ok(validateDefenceDeck(deck).some(error => /exceed.*18pt/.test(error)));
  deck.slides[3].sourceKeys = ['objectives'];
  assert.ok(validateDefenceDeck(deck).some(error => /missing source keys/.test(error)));
  deck.slides[3].role = 'findings';
  assert.ok(validateDefenceDeck(deck).some(error => /role/.test(error)));
});

await check('Validation rejects corrupt metadata, fact schemas, slide structure, IDs, roles and source keys without throwing', () => {
  for (const invalid of [null, undefined, [], 'bad', 7]) assert.ok(validateDefenceDeck(invalid).length);
  const mutations = [
    deck => { deck.version = 99; }, deck => { deck.id = ''; }, deck => { deck.sourceName = null; },
    deck => { deck.updatedAt = 'not-a-date'; }, deck => { deck.durationMinutes = Infinity; },
    deck => { deck.projectId = 7; }, deck => { deck.facts = null; }, deck => { delete deck.facts.sample; },
    deck => { deck.facts.sample = { value: 12, source: [], status: 'invented' }; },
    deck => { deck.slides = null; }, deck => { deck.slides.pop(); }, deck => { deck.slides.push(structuredClone(deck.slides[0])); },
    deck => { deck.slides[2] = null; }, deck => { deck.slides[2].id = deck.slides[1].id; },
    deck => { deck.slides[2].role = 'findings'; }, deck => { deck.slides[2].title = ''; },
    deck => { deck.slides[2].bullets = 'not an array'; }, deck => { deck.slides[2].bullets = [null]; },
    deck => { deck.slides[2].sourceKeys = ['invented']; }, deck => { deck.slides[2].sourceKeys = ['problem', 'problem']; },
    deck => { deck.slides[2].sourceKeys = []; }, deck => { deck.slides[2].notes = null; },
    deck => { deck.slides[2].notes = 'The original text and source have been lost.'; },
    deck => { deck.facts.problem.source = ''; }, deck => { deck.slides[3].bullets[1] = 'Shortened objective.'; },
  ];
  for (const mutate of mutations) {
    const deck = fullDeck(); mutate(deck); let errors;
    assert.doesNotThrow(() => { errors = validateDefenceDeck(deck); });
    assert.ok(errors.length > 0, `Corruption was not detected: ${mutate}`);
    assert.ok(errors.every(error => typeof error === 'string' && error.length > 5));
  }
});

console.log(`\n${count} defence-slide checks passed. Synthetic data only; no model or network calls.`);
