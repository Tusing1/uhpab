import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundled = await build({ entryPoints: ['src/lib/uhpabWritingEngine.ts'], bundle: true, format: 'esm', platform: 'node', write: false });
const engine = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`);
const formulationBundle = await build({ entryPoints: ['src/lib/researchFormulation.ts'], bundle: true, format: 'esm', platform: 'node', write: false });
const rules = await import(`data:text/javascript;base64,${Buffer.from(formulationBundle.outputFiles[0].text).toString('base64')}`);
let checked = 0;
const check = (name, test) => { test(); checked++; console.log(`PASS ${name}`); };
const title = 'PREDICTORS OF TREATMENT DEFAULT AMONG DRUG-SENSITIVE TUBERCULOSIS PATIENTS AT KIYUMBA HEALTH CENTRE IV, KAMPALA';
const context = { projectTitle: title, projectType: 'proposal', sectionKey: 'chapter1', componentId: 'specificObjectives', componentLabel: '1.3.2 Specific Objectives' };
const draft = '<ol><li>To identify socio-demographic predictors of the wrong issue among other people at another hospital.</li><li>To assess patient-related predictors of treatment default.</li><li>To examine health facility-related predictors of treatment default.</li></ol>';
const topic = rules.parseResearchTopic(title);
const objectivesHtml = engine.normalizeUhpabGeneratedDraft(draft, context);
const objectives = rules.readResearchList(objectivesHtml);

check('Example retains issue, respondent group and named location in every objective', () => {
  assert.equal(objectives.length, 3);
  assert.equal(objectives[0], `To identify the socio-demographic predictors of treatment default ${topic.populationAndSetting}.`);
  for (const objective of objectives) assert.ok(objective.endsWith(`treatment default ${topic.populationAndSetting}.`));
  assert.ok(!objectivesHtml.includes('wrong issue') && !objectivesHtml.includes('another hospital'));
});
check('General objective copies the title rather than referring to the study titled', () => {
  const output = engine.normalizeUhpabGeneratedDraft('unrelated essay', { ...context, componentId: 'generalObjective' });
  assert.equal(output, `<p>To determine the ${topic.sentence}.</p>`);
});
check('Questions derive one-for-one from saved objectives, without another model response', () => {
  const output = engine.normalizeUhpabGeneratedDraft('invented question?', { ...context, componentId: 'researchQuestions', specificObjectives: objectivesHtml });
  const questions = rules.readResearchList(output);
  assert.equal(questions.length, 3);
  assert.equal(questions[0], `What are the socio-demographic predictors of treatment default ${topic.populationAndSetting}?`);
});
check('Missing saved objectives block question generation', () => {
  assert.throws(() => engine.normalizeUhpabGeneratedDraft('What are the causes?', { ...context, componentId: 'researchQuestions' }), /Save your 3 specific objectives/);
});
check('Default three is enforced rather than silently accepting one, two or four', () => {
  for (const n of [1, 2, 4]) {
    const value = rules.formulationListHtml(Array.from({ length: n }, (_, i) => objectives[i % 3]));
    assert.throws(() => engine.normalizeUhpabGeneratedDraft(value, context), /exactly 3/);
  }
});
check('Explicitly selected two objectives produce two matching questions', () => {
  const html = engine.normalizeUhpabGeneratedDraft(rules.formulationListHtml(objectives.slice(0, 2)), { ...context, objectiveCount: 2 });
  const output = engine.normalizeUhpabGeneratedDraft('', { ...context, componentId: 'researchQuestions', objectiveCount: 2, specificObjectives: html });
  assert.equal(rules.readResearchList(output).length, 2);
});
check('KAP uses knowledge, attitude and practices in order, with exact age and setting', () => {
  const kapTitle = 'KNOWLEDGE, ATTITUDE AND PRACTICES TOWARDS MALARIA PREVENTION AMONG WOMEN AGED 16-27 AT ALIBA HEALTH CENTRE III';
  const html = engine.normalizeUhpabGeneratedDraft('unrelated prose', { ...context, projectTitle: kapTitle });
  const items = rules.readResearchList(html);
  assert.match(items[0], /^To determine the level of knowledge towards malaria prevention/);
  assert.match(items[1], /^To establish the attitude towards malaria prevention/);
  assert.match(items[2], /^To identify the practices towards malaria prevention/);
  assert.ok(items.every(item => item.endsWith('among women aged 16-27 at aliba health centre III.')));
  const twoHtml = engine.normalizeUhpabGeneratedDraft('', { ...context, projectTitle: kapTitle, objectiveCount: 2 });
  assert.equal(rules.readResearchList(twoHtml).length, 2);
  assert.match(twoHtml, /knowledge and attitude/);
});
check('Knowledge and attitude does not invent a third construct', () => {
  const kaTitle = 'KNOWLEDGE AND ATTITUDE TOWARDS MALARIA PREVENTION AMONG PREGNANT WOMEN IN ALIBA PARISH';
  assert.throws(() => engine.normalizeUhpabGeneratedDraft('', { ...context, projectTitle: kaTitle }), /two|2 constructs/);
  assert.equal(rules.readResearchList(engine.normalizeUhpabGeneratedDraft('', { ...context, projectTitle: kaTitle, objectiveCount: 2 })).length, 2);
});
check('Broad locations and vague populations are rejected without invented details', () => {
  for (const location of ['Uganda', 'Kampala District', 'hospital', 'health centre IV']) assert.equal(rules.hasSpecificStudySetting(location), false);
  assert.throws(() => rules.parseResearchTopic('FACTORS ASSOCIATED WITH MALARIA AMONG PEOPLE AT ALIBA HEALTH CENTRE III'), /actual population/);
  assert.throws(() => rules.parseResearchTopic('FACTORS ASSOCIATED WITH MALARIA AMONG PREGNANT WOMEN IN UGANDA'), /specific setting/);
});
check('A preposition in the health issue is not mistaken for the population', () => {
  const parsed = rules.parseResearchTopic('FACTORS ASSOCIATED WITH DELAY IN SEEKING CARE AMONG TB PATIENTS AT LIRA REGIONAL REFERRAL HOSPITAL');
  assert.equal(parsed.issue, 'delay in seeking care');
  assert.match(parsed.populationAndSetting, /^among TB patients/);
});
check('Duplicate categories and intervention recommendations are rejected', () => {
  assert.throws(() => engine.normalizeUhpabGeneratedDraft(rules.formulationListHtml([objectives[0], objectives[0], objectives[2]]), context), /distinct categories/);
  assert.throws(() => engine.normalizeUhpabGeneratedDraft(rules.formulationListHtml([objectives[0], objectives[1], 'To establish possible ways of improving the main outcome.']), context), /category/);
});
check('Prevalence and factors keeps one prevalence objective and factor categories', () => {
  const hybrid = { ...context, projectTitle: 'PREVALENCE AND FACTORS ASSOCIATED WITH ANAEMIA AMONG PREGNANT WOMEN AT LIRA REGIONAL REFERRAL HOSPITAL' };
  const value = '<ol><li>To determine the prevalence of anaemia.</li><li>To assess socio-demographic factors.</li><li>To examine health facility-related factors.</li></ol>';
  const html = engine.normalizeUhpabGeneratedDraft(value, hybrid);
  assert.match(html, /prevalence of anaemia among pregnant women/);
  assert.match(html, /health facility-related factors associated with anaemia among pregnant women/);
});
check('Every supported factor relationship is preserved', () => {
  for (const prefix of ['FACTORS ASSOCIATED WITH', 'FACTORS INFLUENCING', 'FACTORS AFFECTING', 'DETERMINANTS OF', 'BARRIERS TO']) {
    const parsed = rules.parseResearchTopic(`${prefix} TREATMENT ADHERENCE AMONG TB PATIENTS AT LIRA REGIONAL REFERRAL HOSPITAL`);
    const items = rules.normalizeSpecificObjectives(draft, parsed);
    assert.ok(items.every(item => item.includes(`${parsed.noun} ${parsed.relationship} ${parsed.issue}`)));
  }
});
check('Misaligned saved objectives cannot be used to create unrelated questions', () => {
  assert.throws(() => engine.normalizeUhpabGeneratedDraft('', { ...context, componentId:'researchQuestions', specificObjectives:draft }), /Align the specific objectives/);
});
check('Prompt carries exact issue, tail, count and topic-specific category constraints', () => {
  const prompt = engine.buildUhpabGenerationPrompt({ ...context, objectiveCount:2 }, 'draft');
  assert.ok(prompt.includes('Exactly 2 specific objectives'));
  assert.ok(prompt.includes(topic.populationAndSetting));
  assert.ok(prompt.includes('predictors of treatment default'));
});
console.log(`${checked} research formulation checks passed.`);
