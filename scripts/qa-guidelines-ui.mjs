import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/Julius Tusing/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const origin = process.env.QA_ORIGIN || 'http://127.0.0.1:8080';
mkdirSync('tmp/screenshots', { recursive: true });
const errors = [];
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  await context.addInitScript(() => {
    localStorage.setItem('uhpabUser', JSON.stringify({ id: '2', name: 'QA Student', email: 'premium@uhpab.edu', role: 'premium', className: 'Diploma in Nursing', htin: 'JAN26/U001/001' }));
    localStorage.setItem('projects_2', JSON.stringify(['proposal', 'report'].map(type => ({ id: `qa-${type}`, userId: '2', title: 'FACTORS ASSOCIATED WITH TREATMENT COMPLETION AMONG ADULT PATIENTS AT KIYUMBA HEALTH CENTRE IV, KAMPALA', type, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), progress: { preliminaryPages: 0, chapter1: 0, chapter2: 0, chapter3: 0, chapter4: 0, chapter5: 0, references: 0, appendices: 0 }, chapters: { preliminaryPages: { titlePage: '<p>SUPERVISOR: RETIRED TITLE FIELD</p>', supervisorCommitment: '<p>RETIRED COMMITMENT BODY</p>', ivDedication: '<p>Legacy dedication remains.</p>' }, chapter1: { introduction: '<p>This chapter introduces the study background, problem, objectives, questions, justification, significance and scope.</p>' }, appendices: { workPlan: '<p>Legacy work plan preserved.</p>', consentForm: '<p>Legacy consent preserved.</p>' } } }))));
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  for (const type of ['proposal', 'report']) {
    await page.goto(`${origin}/projects/qa-${type}/edit`);
    await page.getByText('Title Page', { exact: true }).first().waitFor({ timeout: 20000 }).catch(() => page.getByText('Title page', { exact: true }).first().waitFor());
    const body = await page.locator('body').innerText();
    assert.ok(!body.includes('RETIRED TITLE FIELD') && !body.includes('RETIRED COMMITMENT BODY'));
    assert.ok(!/Commitment by Research Supervisor|Authorization.*Copyright/i.test(body));
    await page.getByRole('heading', { name: 'Chapter One: Introduction', exact: true }).first().click();
    await page.getByText('This chapter introduces the study background, problem, objectives, questions, justification, significance and scope.', { exact: true }).waitFor();
    await page.screenshot({ path: `tmp/screenshots/guidelines-${type}-desktop.png`, fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    await page.screenshot({ path: `tmp/screenshots/guidelines-${type}-mobile.png`, fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
  }
  await page.goto(`${origin}/guidelines`);
  await page.getByText('Appendix 1: Data collection tools', { exact: true }).first().waitFor();
  assert.ok(!(await page.locator('body').innerText()).includes('Commitment by Research Supervisor'));
  await context.close();
  const liveLike = await browser.newContext();
  await liveLike.addInitScript(() => localStorage.setItem('uhpabUser', JSON.stringify({ id: '11111111-2222-4333-8444-555555555555', name: 'QA Cloud User', role: 'premium', email: 'qa@example.test' })));
  const cloudPage = await liveLike.newPage();
  let privateRequests = 0;
  await cloudPage.route('**/*.supabase.co/**', async route => { if (/private_research_documents|research-private/.test(route.request().url())) privateRequests++; await route.fulfill({ contentType: 'application/json', body: '[]' }); });
  await cloudPage.goto(`${origin}/document-analysis`);
  await cloudPage.getByText('Private marking is coming soon', { exact: true }).waitFor();
  assert.equal(await cloudPage.getByRole('button', { name: 'Start marking-guide check' }).isDisabled(), true);
  assert.equal(privateRequests, 0);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ success: true, checked: ['proposal editor', 'report editor', 'legacy title suppression', 'saved work visible', 'guidelines', 'mobile overflow', 'production private-marking gate'] }));
  await liveLike.close();
} finally { await browser.close(); }
