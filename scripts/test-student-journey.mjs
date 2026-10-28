import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server.js';

mkdirSync('tmp/student-journey-qa', { recursive: true });
await build({ entryPoints: ['src/components/app/RequireAuth.tsx', 'src/lib/topicWording.ts', 'src/lib/projectReviewText.ts', 'src/lib/markingImprovement.ts'], outdir: 'tmp/student-journey-qa', bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic', alias: { '@': resolve('src') }, plugins: [{ name: 'journey-fixtures', setup(builder) {
  builder.onResolve({ filter: /^@\/(contexts\/AuthContext|lib\/runtimeConfig|components\/school\/SchoolConnectionUnavailable|components\/app\/RouteLoadingScreen)$/ }, args => ({ path: args.path, namespace: 'fixture' }));
  builder.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path }) => ({ loader: 'js', resolveDir: process.cwd(), contents:
    path.endsWith('AuthContext') ? `export const useAuth=()=>globalThis.journeyAuth;` :
    path.endsWith('runtimeConfig') ? `export const isSupabaseConfigured=globalThis.journeyCloud;` :
    path.endsWith('SchoolConnectionUnavailable') ? `import React from 'react'; export default function Notice(){return React.createElement('div',null,'School collaboration unavailable');}` :
    `import React from 'react'; export default function Loading(){return React.createElement('div',null,'Loading');}` }));
} }] });
const { neutralTopicSubject } = await import(pathToFileURL(resolve('tmp/student-journey-qa/lib/topicWording.js')));
const { projectReviewText, isMatchingProposalSource } = await import(pathToFileURL(resolve('tmp/student-journey-qa/lib/projectReviewText.js')));
const { markingPassage } = await import(pathToFileURL(resolve('tmp/student-journey-qa/lib/markingImprovement.js')));
let passed = 0;
const check = (name, run) => { run(); passed++; console.log(`PASS ${name}`); };
const auth = role => ({ user: { id: 'synthetic', role }, isLoading: false, isSchoolAdmin: () => role === 'school-admin', isSchoolSupervisor: () => role === 'school-supervisor', isSchoolStudent: () => role === 'school-student' });
check('Behavioural qualifiers are neutralised for common research outcomes', () => {
  assert.equal(neutralTopicSubject('low hand hygiene practice'), 'hand hygiene practice');
  assert.equal(neutralTopicSubject('Low uptake of screening'), 'uptake of screening');
  assert.equal(neutralTopicSubject('poor adherence to treatment'), 'adherence to treatment');
});
check('Clinical terms and already neutral subjects keep their meaning', () => {
  assert.equal(neutralTopicSubject('low birth weight'), 'low birth weight');
  assert.equal(neutralTopicSubject('high blood pressure'), 'high blood pressure');
  assert.equal(neutralTopicSubject('hand hygiene practice'), 'hand hygiene practice');
});
check('Improvement handoff requires an actual evidence passage', () => {
  assert.equal(markingPassage({ evidenceSnippet: '  ' }), null);
  assert.equal(markingPassage({}), null);
  assert.equal(markingPassage({ evidenceSnippet: '  Original student text.  ' }), 'Original student text.');
});
check('Project handoff contains only saved manuscript sections and preserves paragraph boundaries', () => {
  const text = projectReviewText({ title: 'TEST ONLY: Synthetic topic', type: 'proposal', chapters: { _studyContext: { privateNote: 'DO NOT SHARE' }, chapter1: { introduction: '<p>First paragraph.</p><p>Second paragraph &amp; detail.</p>', background: '' }, chapter4: { results: '<p>Report-only result</p>' }, references: { items: [{ reference: 'QA. (2026). Synthetic reference.' }] } } });
  assert.match(text, /TITLE PAGE\nTEST ONLY/); assert.match(text, /First paragraph\.\n\nSecond paragraph & detail\./);
  assert.match(text, /REFERENCES/); assert.match(text, /Synthetic reference/);
  assert.doesNotMatch(text, /DO NOT SHARE|Report-only result|1\.1 Background|\[citation needed\]/);
});
check('Report handoff keeps saved findings but does not manufacture empty sections', () => {
  const text = projectReviewText({ title: 'Synthetic report', type: 'report', chapters: { chapter4: { introduction: '<p>TEST ONLY: no real results.</p>' } } });
  assert.match(text, /TEST ONLY: no real results/); assert.doesNotMatch(text, /CHAPTER THREE|\[citation needed\]/);
});
check('Only unchanged, owned proposal text reconnects to its project for defence', () => {
  const project = { userId: 'student', title: 'Synthetic topic', type: 'proposal', chapters: {} };
  const text = projectReviewText(project);
  assert.equal(isMatchingProposalSource(project, 'student', text), true);
  assert.equal(isMatchingProposalSource(project, 'student', text + ' changed'), false);
  assert.equal(isMatchingProposalSource(project, 'other', text), false);
  assert.equal(isMatchingProposalSource({ ...project, type: 'report' }, 'student', text), false);
});
// Runtime configuration is module-scoped, so load separate copies with different fixture values.
globalThis.journeyCloud = true;
const { default: CloudGuard } = await import(pathToFileURL(resolve('tmp/student-journey-qa/components/app/RequireAuth.js')).href + '?cloud');
const guard = (Component, role, gate) => { globalThis.journeyAuth = auth(role); return renderToStaticMarkup(React.createElement(StaticRouter, { location: '/test' }, React.createElement(Component, gate, React.createElement('div', null, 'SCHOOL CONTENT')))); };
check('Authenticated cloud school roles cannot enter browser-local collaboration screens', () => {
  for (const [role, gate] of [['school-admin', { schoolAdminOnly: true }], ['school-supervisor', { schoolSupervisorOnly: true }], ['school-student', { schoolStudentOnly: true }]]) {
    const result = guard(CloudGuard, role, gate);
    assert.match(result, /School collaboration unavailable/); assert.doesNotMatch(result, /SCHOOL CONTENT/);
  }
});
check('Cloud research tools remain available outside school-only routes', () => { assert.match(guard(CloudGuard, 'school-student', {}), /SCHOOL CONTENT/); });
globalThis.journeyCloud = false;
const { default: DemoGuard } = await import(pathToFileURL(resolve('tmp/student-journey-qa/components/app/RequireAuth.js')).href + '?demo');
check('Local demonstrations remain available for testing', () => { assert.match(guard(DemoGuard, 'school-student', { schoolStudentOnly: true }), /SCHOOL CONTENT/); });
check('The unconnected enquiry page has no submission form or simulated success', () => {
  const source = readFileSync('src/pages/Auth/ContactSales.tsx', 'utf8');
  assert.doesNotMatch(source, /<form|setTimeout|request has been submitted/i);
  assert.match(source, /cannot receive messages/i);
});
console.log(`${passed} student-journey checks passed.`);
