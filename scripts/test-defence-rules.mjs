import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

mkdirSync('tmp/defence-rules-qa', { recursive: true });
const outfile = resolve('tmp/defence-rules-qa/rules.mjs');
await build({
  stdin: { contents: `export * from './src/lib/defenceSectionRules';
    export * from './src/lib/researchFormulation';
    export { getUhpabSectionContract, sectionCitationPolicy } from './src/lib/uhpabWritingEngine';
    export { emptyDefenceFacts } from './src/lib/defenceSlides';`, resolveDir: process.cwd(), loader: 'ts' },
  outfile, bundle: true, packages: 'external', platform: 'node', format: 'esm',
  alias: { '@': resolve('src') }, define: { 'import.meta.env': '{}' },
});
const {
  DEFENCE_RULES_VERSION, getDefenceSectionRule, reviewDefenceRules, getRuleAwareDefencePoints,
  parseResearchTopic, buildGeneralObjective, normalizeSpecificObjectives, buildResearchQuestions,
  emptyDefenceFacts, getUhpabSectionContract, sectionCitationPolicy,
} = await import(pathToFileURL(outfile));
let checked = 0;
const check = (name, test) => { test(); checked++; console.log(`PASS ${name}`); };
const title = 'Factors associated with uptake of cervical cancer screening among pregnant women aged 18-35 attending ANC at Kampala Hospital';
const categories = ['socio-demographic', 'patient-related', 'health facility-related'];
const put = (facts, key, value) => { facts[key] = { value, source: `Synthetic proposal: ${key}`, status: 'found' }; };
function fixture(topicTitle = title, count = 3) {
  const facts = emptyDefenceFacts(), topic = parseResearchTopic(topicTitle);
  const objectives = normalizeSpecificObjectives(categories.slice(0, count).map(category => `To assess the ${category} factors associated with ${topic.issue} ${topic.populationAndSetting}.`).join('\n'), topic, count);
  put(facts, 'topic', topicTitle); put(facts, 'aim', buildGeneralObjective(topic));
  put(facts, 'objectives', objectives.join('\n')); put(facts, 'questions', buildResearchQuestions(objectives, topic).join('\n'));
  return facts;
}
const sourceFindings = (facts, key) => reviewDefenceRules(facts).filter(item => item.key === key && item.target !== 'slide');
const displayFindings = (facts, slides, key) => reviewDefenceRules(facts, slides).filter(item => item.target === 'slide' && (!key || item.key === key));
const slide = (role, keys, bullets) => ({ id: `test-${role}`, role, title: role, bullets, sourceKeys: keys, notes: 'Source remains intact.', approvedShortening: true });
const ideal1 = 'Ideally, pregnant women should receive screening at ANC (WHO, 2024).';
const ideal2 = 'ANC services should provide a second screening opportunity.';
const actual = 'However, screening uptake remains 12.5% (Okello et al., 2023).';
const local = 'At Kampala Hospital, uptake is low despite access to ANC (Hospital audit, 2024).';
const evidenceGap = 'Existing literature often overlooks screening uptake among pregnant women at Kampala Hospital (Akello, 2024).';
const effect = 'If this problem is not addressed, low uptake will persist.';
const problem = `1.2 Statement of the Problem ${ideal1} ${ideal2} ${actual} ${local} ${evidenceGap} ${effect}`;

check('Version and public contracts reuse actual shared purpose and citation policy', () => {
  const facts = fixture(); assert.equal(DEFENCE_RULES_VERSION, 2);
  for (const [key, componentId] of [['problem', 'statementOfProblem'], ['background', 'background'], ['aim', 'generalObjective'], ['objectives', 'specificObjectives'], ['questions', 'researchQuestions'], ['scope', 'scope'], ['justification', 'justification'], ['contribution', 'significance']]) {
    const rule = getDefenceSectionRule(key, facts);
    assert.equal(rule.purpose, getUhpabSectionContract({ sectionKey: 'chapter1', componentId, componentLabel: key, projectTitle: title }).purpose);
    assert.equal(rule.citationPolicy, sectionCitationPolicy('chapter1', componentId));
    assert.ok(rule.requirements.length); assert.doesNotMatch(rule.requirements.join(' '), /paragraph|page|TNR|font|20 in-text citations/i);
  }
  assert.equal(getDefenceSectionRule('candidate', facts), null);
  assert.equal(getRuleAwareDefencePoints('aim', facts), null);
});
check('Default methods contracts include proposal content requirements without manuscript formatting', () => {
  const facts = fixture();
  assert.match(getDefenceSectionRule('design', facts).requirements.join(' '), /actual study design.*fits the objectives/i);
  assert.match(getDefenceSectionRule('ethics', facts).requirements.join(' '), /consent/);
  assert.match(getDefenceSectionRule('sample', facts).requirements.join(' '), /formula or justification/);
  assert.doesNotMatch(getDefenceSectionRule('literature', facts).requirements.join(' '), /pages|20 in-text citations/i);
});
check('Valid two- and three-objective factors formulations pass without missing-field duplicates', () => {
  assert.deepEqual(reviewDefenceRules(emptyDefenceFacts()), []);
  assert.deepEqual(reviewDefenceRules(fixture()), []);
  assert.deepEqual(reviewDefenceRules(fixture(title, 2)), []);
});
check('Backwards general objective lacking To gets canonical suggestion, not an automatic rewrite', () => {
  const facts = fixture(); facts.aim.value = facts.aim.value.replace(/^To /, '');
  const before = structuredClone(facts), findings = sourceFindings(facts, 'aim');
  assert.equal(findings.length, 1); assert.equal(findings[0].suggestion, buildGeneralObjective(parseResearchTopic(title)));
  assert.deepEqual(facts, before);
});
check('Four questions for three objectives gets exactly the three original aligned suggestions', () => {
  const facts = fixture(); facts.questions.value += '\nWhat other factors matter?';
  const finding = sourceFindings(facts, 'questions')[0];
  assert.match(finding.detail, /4 questions for 3 objectives/); assert.equal(finding.suggestion.split('\n').length, 3);
});
check('Wrong issue, population, age and setting in source objectives are never normalized away', () => {
  for (const [from, to] of [['cervical cancer', 'breast cancer'], ['pregnant women', 'nurses'], ['18-35', '20-40'], ['kampala hospital', 'lira hospital']]) {
    const facts = fixture(); facts.objectives.value = facts.objectives.value.replace(from, to);
    const before = structuredClone(facts), findings = sourceFindings(facts, 'objectives');
    assert.ok(findings.length, `${from} loss was not found`); assert.ok(findings.every(item => !item.suggestion)); assert.deepEqual(facts, before);
  }
});
check('Invalid factor objective gives actionable category error without inventing categories or questions', () => {
  const facts = fixture(); facts.objectives.value = facts.objectives.value.split('\n').slice(0, 2).concat('To establish possible ways of improving screening uptake.').join('\n');
  facts.questions.value += '\nWhat recommendations should be made?';
  assert.match(sourceFindings(facts, 'objectives')[0].detail, /clear factor category/);
  assert.ok(sourceFindings(facts, 'objectives').every(item => !item.suggestion));
  assert.ok(sourceFindings(facts, 'questions').every(item => !item.suggestion));
});
check('KAP and knowledge-only constructs obey the shared formulations and selected counts', () => {
  for (const count of [2, 3]) assert.deepEqual(reviewDefenceRules(fixture('Knowledge, attitude and practices towards malaria prevention among women aged 16-27 at Aliba Health Centre III', count)), []);
  assert.deepEqual(reviewDefenceRules(fixture('Knowledge and attitude towards malaria prevention among pregnant women at Aliba Health Centre III', 2)), []);
  const facts = fixture(); facts.objectives.value = normalizeSpecificObjectives('', parseResearchTopic('Knowledge, attitude and practices towards uptake of cervical cancer screening among pregnant women aged 18-35 attending ANC at Kampala Hospital'), 3).join('\n');
  assert.ok(sourceFindings(facts, 'objectives').length);
  const kap = fixture('Knowledge, attitude and practices towards malaria prevention among women aged 16-27 at Aliba Health Centre III');
  kap.objectives.value = categories.map(category => `To assess the ${category} factors associated with malaria prevention among women aged 16-27 at aliba health centre III.`).join('\n');
  assert.ok(sourceFindings(kap, 'objectives').length);
});
check('Source lists ignore HTML and inline numbered heading scaffolding, not real items', () => {
  const facts = fixture();
  facts.objectives.value = `<p>1.3.2 Specific Objectives To achieve the aim:</p><ol>${facts.objectives.value.split('\n').map(item => `<li>${item}</li>`).join('')}</ol>`;
  facts.questions.value = `1.3.3 Research Questions General research question: What is the overall issue? ${facts.questions.value.split('\n').map((item, i) => `${i + 1}. ${item}`).join(' ')}`;
  assert.deepEqual(reviewDefenceRules(facts), []);
});
check('A separate general question is not counted as a specific research question', () => {
  const facts = fixture();
  facts.questions.value = `1.3.3 Research Questions\n\nGeneral Research Question\n\nWhat is the overall research issue?\n\nSpecific Research Questions\n\n${facts.questions.value.split('\n').map((item, i) => `${i + 1}. ${item}`).join('\n\n')}`;
  assert.deepEqual(sourceFindings(facts, 'questions'), []);
  facts.questions.value += '\n\n4. What other factors matter?';
  assert.match(sourceFindings(facts, 'questions')[0].detail, /4 questions for 3 objectives/);
});
check('Problem selects four different roles from source, not two ideals, preserving decimals and citations', () => {
  const facts = fixture(); put(facts, 'problem', problem);
  const before = structuredClone(facts), points = getRuleAwareDefencePoints('problem', facts);
  assert.equal(points.length, 4);
  assert.ok([ideal1, ideal2].some(text => points[0] === `Ideal situation: ${text}`));
  assert.equal(points[1], `Current situation: ${actual}`); assert.equal(points[2], `Gap: ${evidenceGap}`); assert.equal(points[3], `Consequence/study need: ${effect}`);
  assert.doesNotMatch(points.join(' '), /1\.2|Statement of the Problem/); assert.deepEqual(facts, before);
});
check('Unavailable roles and overlong components stay visible draft markers', () => {
  const facts = fixture(); put(facts, 'problem', `${ideal1} ${ideal2}`);
  assert.deepEqual(getRuleAwareDefencePoints('problem', facts).slice(1), ['[Add current situation]', '[Add gap]', '[Add consequence/study need]']);
  put(facts, 'problem', `However, ${'the local situation remains difficult '.repeat(12)}(WHO, 2024).`);
  assert.equal(getRuleAwareDefencePoints('problem', facts)[1], '[Review current situation in source notes]');
});
const longEffect = 'If this problem is not urgently investigated and addressed, low screening uptake will persist, leading to missed opportunities for early diagnosis, presentation at advanced disease stages, prohibitive treatment costs, and elevated mortality rates among women in their prime productive years.';
check('Only a complete uncited consequence adjunct can be shortened, preserving negation and condition', () => {
  const facts = fixture(); put(facts, 'problem', longEffect);
  assert.equal(getRuleAwareDefencePoints('problem', facts)[3], 'Consequence/study need: If this problem is not urgently investigated and addressed, low screening uptake will persist.');
  for (const join of ['resulting in', 'contributing to']) {
    put(facts, 'problem', longEffect.replace('leading to', join));
    assert.match(getRuleAwareDefencePoints('problem', facts)[3], /not urgently investigated and addressed, low screening uptake will persist\.$/);
  }
});
check('Incomplete conditional/main clause or dropped citation never permits consequence shortening', () => {
  const facts = fixture();
  for (const text of [longEffect.replace('addressed, low screening uptake will persist', 'addressed'), longEffect.replace('will persist', 'will not'), longEffect.replace('years.', 'years (WHO, 2024).'), longEffect.replace('years.', 'years [12].')]) {
    put(facts, 'problem', text); assert.equal(getRuleAwareDefencePoints('problem', facts)[3], '[Review consequence/study need in source notes]');
  }
});
check('An ideal claim can leave its uncited purpose in notes without losing the claim or a citation', () => {
  const facts = fixture();
  const claim = 'Ideally, all women of reproductive age (18, 49 years) should undergo routine cervical cancer screening';
  const purpose = 'to enable early detection and effective management of precancerous cervical lesions';
  put(facts, 'problem', `${claim} ${purpose}.`);
  assert.equal(getRuleAwareDefencePoints('problem', facts)[0], `Ideal situation: ${claim}.`);
  assert.equal(facts.problem.value, `${claim} ${purpose}.`);
  put(facts, 'problem', `${claim} ${purpose} (WHO, 2024).`);
  assert.equal(getRuleAwareDefencePoints('problem', facts)[0], `Ideal situation: ${claim} ${purpose} (WHO, 2024).`);
  put(facts, 'problem', `Ideally, women should work to improve access.`);
  assert.equal(getRuleAwareDefencePoints('problem', facts)[0], 'Ideal situation: Ideally, women should work to improve access.');
});
check('No other role loses clauses, conditions, negation or supporting citations', () => {
  const facts = fixture(); const sentence = 'However, uptake is not 12.5% at Kampala Hospital (Okello et al., 2024).';
  put(facts, 'problem', sentence); assert.equal(getRuleAwareDefencePoints('problem', facts)[1], `Current situation: ${sentence}`);
  put(facts, 'problem', `However, uptake is low, leading to ${'additional service challenges and unmet needs '.repeat(9)}.`);
  assert.equal(getRuleAwareDefencePoints('problem', facts)[1], '[Review current situation in source notes]');
});
check('Old two-ideal problem display fails even when its source contains all four components', () => {
  const facts = fixture(); put(facts, 'problem', problem);
  const findings = displayFindings(facts, [slide('problem', ['problem'], [`Problem statement: ${ideal1}`, `Problem statement: ${ideal2}`])], 'problem');
  assert.equal(findings.length, 1); assert.match(findings[0].detail, /current situation, gap, consequence/);
  assert.deepEqual(displayFindings(facts, [slide('problem', ['problem'], getRuleAwareDefencePoints('problem', facts))]), []);
});
check('Unlabelled semantic roles and explicit per-role draft markers both pass display review', () => {
  const facts = fixture(); put(facts, 'problem', problem);
  assert.deepEqual(displayFindings(facts, [slide('problem', ['problem'], [ideal1, actual, evidenceGap, effect])]), []);
  assert.deepEqual(displayFindings(facts, [slide('problem', ['problem'], [ideal1, '[Add current situation]', '[Review gap in source notes]', '[Review long consequence in notes]'])]), []);
});
check('Display aim without To is caught independently of the valid source aim', () => {
  const facts = fixture();
  const slides = [slide('objectives', ['aim', 'objectives'], [`Aim: ${facts.aim.value.replace(/^To /, '')}`, ...facts.objectives.value.split('\n')])];
  assert.ok(displayFindings(facts, slides, 'aim').length);
  slides[0].bullets[0] = `Aim: ${facts.aim.value}`; assert.deepEqual(displayFindings(facts, slides), []);
});
check('Approved shortening cannot lose issue, population, age, setting, category or item count', () => {
  for (const key of ['objectives', 'questions']) {
    const facts = fixture(), role = key === 'objectives' ? 'objectives' : 'questions-scope';
    for (const [from, to] of [['cervical cancer', 'breast cancer'], ['pregnant women', 'women'], ['18-35', '20-40'], ['kampala hospital', 'lira hospital'], ['socio-demographic', 'environmental']]) {
      const item = slide(role, [key], facts[key].value.split('\n')); item.bullets[0] = item.bullets[0].replace(from, to);
      assert.ok(displayFindings(facts, [item], key).length, `${key}: ${from}`);
    }
    assert.ok(displayFindings(facts, [slide(role, [key], facts[key].value.split('\n').slice(0, 2))], key).some(item => /count/i.test(item.title)));
  }
});
check('Direct shorter phrases with identical category and full exact topic tail are allowed', () => {
  const facts = fixture();
  const objectives = facts.objectives.value.split('\n').map(text => text.replace(/^To assess the /, ''));
  assert.deepEqual(displayFindings(facts, [slide('objectives', ['objectives'], objectives)]), []);
});
check('Question scope text and missing-scope markers do not add fake questions', () => {
  const facts = fixture(), questions = facts.questions.value.split('\n');
  for (const scope of [['[Add study scope]'], ['[Add content]', '[Add place]', '[Add period]'], ['Content: Actual source content.', 'Place: Kampala Hospital.', 'Period: November 2026.']])
    assert.deepEqual(displayFindings(facts, [slide('questions-scope', ['questions', 'scope'], [...questions, ...scope])]), []);
});
check('Unrelated low-level export fixtures are not formulation displays', () => {
  const facts = fixture();
  assert.deepEqual(displayFindings(facts, [slide('qa-1', ['aim', 'objectives', 'questions', 'problem'], ['An unrelated layout fixture.'])]), []);
});
check('Equivalent alternate question grammar requires manual source review, not a hard display contradiction', () => {
  const facts = fixture(); facts.questions.value = facts.questions.value.replace('What are the socio-demographic factors associated with', 'What socio-demographic factors are associated with');
  assert.ok(sourceFindings(facts, 'questions').length);
  assert.deepEqual(displayFindings(facts, [slide('questions-scope', ['questions'], facts.questions.value.split('\n'))]), []);
});
check('Background selects wider/local/gap; justification and significance do not substitute for one another', () => {
  const facts = fixture();
  put(facts, 'background', `Globally, screening supports prevention (WHO, 2024). ${local} ${evidenceGap}`);
  const points = getRuleAwareDefencePoints('background', facts); assert.equal(points.length, 3); assert.ok(points.every(text => !text.startsWith('[')));
  const rationale = 'The study is needed because local screening barriers remain unclear.';
  const beneficiaries = 'The findings may help health workers tailor screening education.';
  put(facts, 'justification', beneficiaries); assert.match(getRuleAwareDefencePoints('justification', facts)[0], /^\[Add/);
  put(facts, 'justification', `${beneficiaries} ${rationale}`); assert.equal(getRuleAwareDefencePoints('justification', facts)[0], `Why the study is needed: ${rationale}`);
  put(facts, 'contribution', rationale); assert.match(getRuleAwareDefencePoints('contribution', facts)[0], /^\[Add/);
  put(facts, 'contribution', `${rationale} ${beneficiaries}`); assert.equal(getRuleAwareDefencePoints('contribution', facts)[0], `Who benefits and how: ${beneficiaries}`);
});
check('Scope uses supplied content/place/period without inventing dates, and flags a mismatched place', () => {
  const facts = fixture(), topic = parseResearchTopic(title);
  put(facts, 'scope', `Content scope: The study will assess ${topic.issue} ${topic.populationAndSetting}.\nGeographical scope: Kampala Hospital.\nTime scope: November 2026.`);
  let points = getRuleAwareDefencePoints('scope', facts); assert.ok(points.every(text => !text.startsWith('['))); assert.deepEqual(sourceFindings(facts, 'scope'), []);
  assert.doesNotMatch(points.join(' '), /Content: Content scope:|Place: Geographical scope:|Period: Time scope:/i);
  facts.scope.value = facts.scope.value.replace('Time scope: November 2026.', ''); points = getRuleAwareDefencePoints('scope', facts); assert.equal(points[2], '[Add period]');
  facts.scope.value = facts.scope.value.replace('Geographical scope: Kampala Hospital.', 'Geographical scope: Lira Hospital.');
  assert.ok(sourceFindings(facts, 'scope').some(item => /place/i.test(item.title)));
});
check('Headings and writing instructions are excluded, but abbreviations, decimals and citations remain intact', () => {
  const facts = fixture();
  put(facts, 'problem', `<h2>1.2 Statement of the Problem</h2><p>Describe the current situation.</p><p>Before submission, make sure all components are included.</p><p>However, uptake is not 12.5% (Okello et al., 2024).</p>`);
  const points = getRuleAwareDefencePoints('problem', facts); assert.equal(points[1], 'Current situation: However, uptake is not 12.5% (Okello et al., 2024).');
  assert.doesNotMatch(points.join(' '), /Describe|Before submission|1\.2|Statement of the Problem/);
});
check('Citation policy requires evidence only in evidence sections; dates are not citations', () => {
  const facts = fixture();
  put(facts, 'justification', 'The study is needed to address a local knowledge gap.');
  put(facts, 'contribution', 'Health workers may use the findings to tailor education.');
  assert.ok(!sourceFindings(facts, 'justification').some(item => /citation|evidence/i.test(item.title)));
  assert.ok(!sourceFindings(facts, 'contribution').some(item => /citation|evidence/i.test(item.title)));
  put(facts, 'background', 'Globally, screening uptake is low.'); assert.ok(sourceFindings(facts, 'background').some(item => /evidence/i.test(item.title)));
  put(facts, 'background', 'Globally, screening uptake is low (WHO, 2024).'); assert.ok(!sourceFindings(facts, 'background').some(item => /evidence/i.test(item.title)));
  facts.aim.value += ' (WHO, 2024).'; assert.ok(sourceFindings(facts, 'aim').some(item => /citation/i.test(item.title)));
  put(facts, 'scope', 'Time scope: November 2026.'); assert.ok(!sourceFindings(facts, 'scope').some(item => /citation/i.test(item.title)));
});
check('Read-only review preserves both source facts and edited slides including approval flags', () => {
  const facts = fixture(); put(facts, 'problem', problem);
  const slides = [slide('problem', ['problem'], [ideal1, ideal2]), slide('objectives', ['objectives'], ['To assess factors.'])];
  const before = structuredClone({ facts, slides }); reviewDefenceRules(facts, slides); getRuleAwareDefencePoints('problem', facts);
  assert.deepEqual({ facts, slides }, before);
});
console.log(`\n${checked} defence-rule checks passed. Synthetic data only; no full build, model or network calls.`);
