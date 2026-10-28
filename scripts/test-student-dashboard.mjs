import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { writeFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server.js';

await build({
  entryPoints: ['src/pages/Dashboard.tsx'], outfile: 'tmp/dashboard-render-qa.mjs',
  bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic',
  alias: { '@': resolve('src') },
  external: ['react', 'react/jsx-runtime', 'react-router-dom'],
  plugins: [{ name: 'dashboard-fixtures', setup(build) {
    build.onResolve({ filter: /^@\/(contexts\/(AuthContext|ProjectContext)|lib\/documentAnalysisStore|components\/layout\/DashboardLayout)$/ }, args => ({ path: args.path, namespace: 'fixture' }));
    build.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path }) => ({ contents:
      path.endsWith('AuthContext') ? 'export const useAuth=()=>({user:globalThis.dashboardFixture.user});' :
        path.endsWith('ProjectContext') ? 'export const useProjects=()=>globalThis.dashboardFixture;' :
          path.endsWith('documentAnalysisStore') ? 'export const listAnalysisRecords=async()=>[];' :
            'export default function Layout({children}){return children;}', loader: 'js' }));
  } }],
});
const { default: Dashboard } = await import(pathToFileURL(resolve('tmp/dashboard-render-qa.mjs')));
const render = (overrides = {}) => {
  globalThis.dashboardFixture = { user: { id: 'qa', name: 'Student' }, projects: [], isLoading: false, ...overrides };
  return renderToStaticMarkup(React.createElement(StaticRouter, { location: '/dashboard' }, React.createElement(Dashboard)));
};
const project = (id, updatedAt, progress) => ({ id, title: `Research ${id}`, type: 'proposal', updatedAt,
  progress: { chapter1: progress, chapter2: progress, chapter3: progress, appendices: progress }, chapters: {} });

assert.match(render(), /Find my research topic/);
assert.match(render(), /I already have a topic/);
console.log('PASS First-time students get topic generation and an existing-topic alternative');
assert.match(render({ user: { id: 'qa', researchTopic: 'An existing topic' } }), /Start my proposal/);
assert.doesNotMatch(render({ user: { id: 'qa', researchTopic: 'An existing topic' } }), /Find my research topic/);
console.log('PASS A saved topic leads directly to starting a proposal');
const working = render({ projects: [project('older', '2026-09-01', 25), project('recent', '2026-10-18', 40)] });
assert.match(working, /Continue writing/);
assert.match(working, /40% complete/);
assert.ok(working.indexOf('Research recent') < working.indexOf('Research older'));
assert.equal((working.match(/>Continue writing</g) || []).length, 1);
console.log('PASS Active research is prioritised with one primary continue action');
assert.match(render({ projects: [project('done', '2026-10-18', 100)] }), /Open my project/);
assert.doesNotMatch(render({ projects: [project('done', '2026-10-18', 100)] }), /Continue writing/);
console.log('PASS Completed projects are opened rather than presented as unfinished');
assert.match(render({ isLoading: true }), /Loading your research/);
assert.doesNotMatch(render({ isLoading: true }), /Find my research topic/);
console.log('PASS Loading does not briefly show the wrong next action');
for (const removed of ['Command center', 'Workspace status', 'Human review', 'Originality check', 'Full access']) assert.ok(!working.includes(removed));
assert.match(working, /href="\/projects\?view=archive"/);
assert.match(working, /practice marking/);
console.log('PASS Clutter is removed, saved reviews stay reachable, marking is labelled as practice');
assert.match(render(), /research-notebook\.webp/);
assert.doesNotMatch(working, /research-notebook\.webp/);
assert.match(working, /research-paper/);
assert.match(render(), /aria-current="step"/);
console.log('PASS The journey uses actual project state and the active document replaces decorative artwork');

await build({
  entryPoints: ['src/components/layout/DashboardLayout.tsx'], outfile: 'tmp/dashboard-layout-qa.mjs',
  bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic', alias: { '@': resolve('src') },
  plugins: [{ name: 'role-fixtures', setup(build) {
    build.onResolve({ filter: /^@\/(contexts\/AuthContext|lib\/runtimeConfig)$/ }, args => ({ path: args.path, namespace: 'role' }));
    build.onLoad({ filter: /.*/, namespace: 'role' }, ({ path }) => ({ loader: 'js', contents: path.endsWith('runtimeConfig') ? 'export const isSupabaseConfigured=false;' : `export const useAuth=()=>({
      user:globalThis.dashboardFixture.user,logout:async()=>{},
      isPremium:()=>globalThis.dashboardFixture.user.role==='premium',
      isSchoolAdmin:()=>globalThis.dashboardFixture.user.role==='school-admin',
      isSchoolSupervisor:()=>globalThis.dashboardFixture.user.role==='school-supervisor',
      isSchoolStudent:()=>globalThis.dashboardFixture.user.role==='school-student'
    });` }));
  } }],
});
const { default: Layout } = await import(pathToFileURL(resolve('tmp/dashboard-layout-qa.mjs')));
const renderLayout = (role = 'free', location = '/dashboard') => {
  globalThis.dashboardFixture = { user: { id: 'qa', name: 'QA Student', email: 'qa@example.invalid', role } };
  return renderToStaticMarkup(React.createElement(StaticRouter, { location }, React.createElement(Layout, null, 'Workspace')));
};
const navigation = renderLayout();
assert.ok(navigation.indexOf('aria-label="Settings"') > navigation.indexOf('aria-label="Start here"'));
assert.ok(navigation.indexOf('aria-label="Account menu"') > navigation.indexOf('aria-label="Settings"'));
for (const removed of ['Today', 'Human review', 'Originality check', 'Marking guide', 'Improve writing']) assert.ok(!navigation.includes(removed));
assert.ok(!navigation.includes('lg:w-20'));
console.log('PASS New users get labelled navigation with Settings and account at the bottom');
for (const [role, route] of [['school-admin', '/school-dashboard'], ['school-supervisor', '/supervisor-students'], ['school-student', '/student-workspace']]) {
  assert.ok(renderLayout(role).includes(`href="${route}"`));
}
console.log('PASS School administrator, supervisor and student workspaces remain reachable');

// Static visual fixtures exercise long real-world titles without changing a
// student's browser storage, profile or saved projects.
const title = 'FACTORS ASSOCIATED WITH TREATMENT COMPLETION AMONG DRUG-SENSITIVE TUBERCULOSIS PATIENTS AT KIYUMBA HEALTH CENTRE IV, KAMPALA';
for (const [scenario, topic, fixtureProjects] of [
  ['active', undefined, [{ ...project('active', '2026-10-18', 40), title }]],
  ['saved-topic', title, []],
]) {
  globalThis.dashboardFixture = { user: { id: 'qa', name: 'QA Student', role: 'free', researchTopic: topic }, projects: fixtureProjects, isLoading: false };
  const content = renderToStaticMarkup(React.createElement(StaticRouter, { location: '/dashboard' }, React.createElement(Layout, null, React.createElement(Dashboard))));
  writeFileSync(`tmp/dashboard-${scenario}-qa.html`, `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dashboard visual QA</title><link rel="stylesheet" href="/src/index.css?direct"></head><body>${content}</body></html>`);
}
console.log('PASS Long-title visual fixtures generated without changing user data');
