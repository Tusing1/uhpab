import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import JSZip from 'jszip';
import { createHash } from 'node:crypto';

const directory = resolve('tmp/defence-export-qa');
mkdirSync(directory, { recursive: true });
async function bundle(entry, name) {
  const outfile = resolve(directory, `${name}.mjs`);
  await build({
    entryPoints: [entry], outfile, bundle: true, packages: 'external',
    platform: 'node', format: 'esm', alias: { '@': resolve('src') },
  });
  return import(pathToFileURL(outfile).href);
}
const exporter = await bundle('src/lib/defenceSlidesExport.ts', 'exporter');
const model = await bundle('src/lib/defenceSlides.ts', 'model');
const {
  buildDefencePptx, buildDefenceHandout, defenceSlideLayoutIssues,
  defenceSlideLayout, defenceDeckIsWorkingDraft, DEFENCE_SLIDE_LAYOUT: layout,
} = exporter;
const factKeys = [
  'topic', 'candidate', 'htin', 'school', 'course', 'supervisor', 'background',
  'problem', 'aim', 'objectives', 'questions', 'scope', 'literature', 'justification',
  'design', 'setting', 'population', 'eligibility', 'sample', 'sampling',
  'instruments', 'variables', 'collection', 'quality', 'analysis', 'ethics',
  'contribution', 'references',
];
const topic = 'FACTORS ASSOCIATED WITH HANDWASHING AMONG NURSES AT TEST HEALTH CENTRE IV, KAMPALA';
const fullReference = 'Synthetic Author. (2026). Supplied QA reference, not real evidence. Test Press.\nSecond Author. (2025). Another supplied QA reference. https://example.org/test?a=1&b=2';
function fixture() {
  const facts = Object.fromEntries(factKeys.map(key => [key, {
    value: `Supplied synthetic ${key} field.`, source: `Synthetic proposal: ${key} / paragraph 1`, status: 'found',
  }]));
  facts.topic.value = topic;
  facts.candidate.value = 'Test Candidate';
  facts.htin.value = 'TEST-001';
  facts.school.value = 'Test School';
  facts.course.value = 'Test Programme';
  facts.supervisor.value = 'Test Supervisor';
  const tail = 'handwashing among nurses at test health centre IV, kampala';
  facts.aim.value = `To determine the factors associated with ${tail}.`;
  facts.objectives.value = `To identify the individual factors associated with ${tail}.\nTo assess the health facility-related factors associated with ${tail}.`;
  facts.questions.value = `What are the individual factors associated with ${tail}?\nWhat are the health facility-related factors associated with ${tail}?`;
  facts.background.value = 'Globally, handwashing supports care (Synthetic Author, 2026). At test health centre IV, kampala, handwashing needs local review. A local evidence gap remains.';
  facts.problem.value = 'Ideally, nurses should have adequate supplies. Currently, local access remains inconsistent (Synthetic Author, 2026). A local evidence gap remains. If this persists, nurses may face service interruptions.';
  facts.literature.value = 'A local gap was described (Synthetic Author, 2026).';
  facts.scope.value = `Content: The study will assess ${tail}.\nPlace: The study will be conducted at test health centre IV, kampala.\nPeriod: The study will run during November 2026.`;
  facts.justification.value = 'The study is needed because local evidence is incomplete.';
  facts.contribution.value = 'Facility managers will use the findings to guide staff education.';
  facts.references.value = fullReference;
  return {
    version: 1, rulesVersion: 2, id: 'synthetic-defence-export', projectId: 'qa-only',
    sourceName: 'Synthetic proposal & notes', sourceVersion: 'qa-v1',
    updatedAt: '2026-10-27T08:00:00.000Z', durationMinutes: 10, facts,
    slides: Array.from({ length: 10 }, (_, index) => ({
      id: `slide-${index + 1}`, role: index === 0 ? 'title' : `qa-${index}`,
      rulesVersion: 2,
      title: index === 0 ? topic : `Academic subject ${index + 1}`,
      bullets: index === 0
        ? ['Test Candidate', 'HTIN: TEST-001', 'Test School', 'Test Programme', 'Supervisor: Test Supervisor']
        : [`Editable source point ${index + 1}: nurses & practice < 100%.`, 'A second supplied point remains editable.'],
      notes: `Complete speaker notes ${index + 1}. Keep 5 < 8 & 9 > 4 as supplied.`,
      sourceKeys: index === 0 ? ['topic', 'candidate', 'htin', 'school', 'course', 'supervisor'] : ['background', 'objectives'],
    })),
  };
}
const decodeXml = text => text.replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const xmlText = xml => [...xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map(match => decodeXml(match[1]).replace(/\r\n/g, '\n'));
const pptxZip = async deck => {
  const blob = await buildDefencePptx(deck);
  assert.ok(blob instanceof Blob);
  assert.equal(blob.type, 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
  return JSZip.loadAsync(await blob.arrayBuffer());
};
let checks = 0;
async function check(name, run) {
  await run();
  checks++;
  console.log(`PASS ${name}`);
}

await check('Preview geometry uses inches, points and the shared 1280x720 scale', () => {
  assert.ok(Math.abs(layout.width / layout.height - 16 / 9) < 1e-12);
  assert.equal(layout.marginX * 96, 68);
  assert.equal(layout.titleY * 96, 46);
  assert.equal(layout.footerY * 96, 650);
  assert.equal(layout.bodyFontSize * 4 / 3, 32);
  const deck = fixture(), before = JSON.stringify(deck);
  deck.slides.forEach((slide, index) => {
    assert.deepEqual(defenceSlideLayoutIssues(slide, index), []);
    assert.deepEqual(defenceSlideLayout(slide, index), defenceSlideLayout(slide, index));
  });
  assert.equal(JSON.stringify(deck), before);
});

const deck = fixture();
let zip;
await check('Builder works without window/document and returns ten native slides and note pages', async () => {
  assert.equal(typeof globalThis.window, 'undefined');
  assert.equal(typeof globalThis.document, 'undefined');
  const before = JSON.stringify(deck);
  zip = await pptxZip(deck);
  assert.equal(JSON.stringify(deck), before);
  assert.equal(zip.file(/^ppt\/slides\/slide\d+\.xml$/).length, 10);
  assert.equal(zip.file(/^ppt\/notesSlides\/notesSlide\d+\.xml$/).length, 10);
  assert.equal(zip.file(/^ppt\/notesSlides\/_rels\/notesSlide\d+\.xml\.rels$/).length, 10);
  assert.ok(zip.file(/^ppt\/media\/.+\.png$/).length > 0);
  const presentation = await zip.file('ppt/presentation.xml').async('string');
  assert.match(presentation, /<p:sldSz cx="12192000" cy="6858000"/);
});

await check('Every slide text run is native Arial, explicitly black, sized by the shared layout and in bounds', async () => {
  const emu = value => Math.round(value * 914400);
  for (let index = 0; index < 10; index++) {
    const xml = await zip.file(`ppt/slides/slide${index + 1}.xml`).async('string');
    const strings = xmlText(xml);
    assert.ok(strings.includes(deck.slides[index].title));
    for (const bullet of deck.slides[index].bullets) assert.ok(strings.includes(bullet));
    assert.ok(strings.includes('UHPAB Study'));
    assert.ok(strings.includes(`${index + 1} / 10`));
    assert.doesNotMatch(xml, /<a:normAutofit|<a:spAutoFit/);
    assert.match(xml, /<p:pic>/);
    assert.match(xml, /<a:srgbClr val="FFFFFF"/);
    assert.match(xml, /<a:srgbClr val="087F83"/);
    const plan = defenceSlideLayout(deck.slides[index], index);
    let textShapeCount = 0;
    for (const shapeMatch of xml.matchAll(/<p:sp>([\s\S]*?)<\/p:sp>/g)) {
      const shape = shapeMatch[1];
      const transform = shape.match(/<a:xfrm[^>]*>\s*<a:off x="(\d+)" y="(\d+)"\/>\s*<a:ext cx="(\d+)" cy="(\d+)"\/>/);
      assert.ok(transform, 'A native shape must have explicit geometry');
      const [x, y, w, h] = transform.slice(1).map(Number);
      assert.ok(x >= 0 && y >= 0 && x + w <= emu(layout.width) + 2 && y + h <= emu(layout.height) + 2);
      if (!shape.includes('<a:t>')) continue;
      textShapeCount++;
      const name = shape.match(/<p:cNvPr[^>]* name="([^"]*)"/)?.[1];
      const plannedText = name === 'Exact study topic' || name === 'Slide title' ? plan.title
        : name?.startsWith('Point ') ? plan.bullets[Number(name.slice(6)) - 1] : undefined;
      if (plannedText) {
        assert.ok(Math.abs(x - emu(plannedText.x)) <= 1);
        assert.ok(Math.abs(y - emu(plannedText.y)) <= 1);
        assert.ok(Math.abs(h - emu(plannedText.h)) <= 1);
        assert.ok(y + h <= emu(layout.bodyBottom) + 2);
      }
      for (const runMatch of shape.matchAll(/<a:r>([\s\S]*?)<\/a:r>/g)) {
        const run = runMatch[1];
        assert.match(run, /<a:solidFill><a:srgbClr val="000000"\/><\/a:solidFill>/);
        assert.match(run, /<a:latin typeface="Arial"/);
        const size = Number(run.match(/<a:rPr[^>]* sz="(\d+)"/)?.[1]);
        assert.equal(size, name === 'Study footer' || name === 'Slide number' ? 1100 : plannedText.fontSize * 100);
      }
    }
    assert.equal(textShapeCount, deck.slides[index].bullets.length + 3);
    if (index === 0) assert.doesNotMatch(xml, /<a:buChar/);
    else assert.match(xml, /<a:buChar/);
    const relationships = await zip.file(`ppt/slides/_rels/slide${index + 1}.xml.rels`).async('string');
    assert.match(relationships, new RegExp(`notesSlide${index + 1}\\.xml`));
  }
});

await check('Every slide embeds the unchanged site logo, clear of the title and body', async () => {
  const brand = JSON.parse(readFileSync('src/data/defenceLogo.json', 'utf8'));
  assert.equal(brand.sourceSha256, createHash('sha256').update(readFileSync(brand.source)).digest('hex'));
  const png = Buffer.from(brand.dataUrl.split(',')[1], 'base64');
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  for (let i = 0; i < 10; i++) {
    const plan = defenceSlideLayout(deck.slides[i], i);
    assert.ok(plan.title.x + plan.title.w + layout.logoGap <= plan.logo.x + 0.0001);
    assert.ok(plan.logo.y + plan.logo.h < plan.divider.y);
    assert.equal(plan.logo.w, plan.logo.h);
    const xml = await zip.file(`ppt/slides/slide${i + 1}.xml`).async('string');
    assert.equal([...xml.matchAll(/<p:pic>/g)].length, 1);
    assert.match(xml, /UHPAB Study logo/);
  }
  const images = zip.file(/^ppt\/media\/.+\.png$/);
  for (const image of images) assert.deepEqual(await image.async('nodebuffer'), png);
});

await check('Automatic sizing preserves all dense wording and stops at the readable 18pt minimum', async () => {
  for (const [length, expectedSize] of [[160, 20], [240, 18]]) {
    const dense = fixture();
    dense.slides[3].bullets = Array.from({ length: 4 }, () => 'This supplied objective retains the study population and setting. '.repeat(4).slice(0, length));
    const before = structuredClone(dense), plan = defenceSlideLayout(dense.slides[3], 3);
    assert.equal(plan.bodyFontSize, expectedSize); assert.equal(plan.autoFitted, true);
    assert.deepEqual(plan.issues, []); assert.ok(plan.bullets.every(item => item.fontSize >= 18));
    const result = await pptxZip(dense);
    const xml = await result.file('ppt/slides/slide4.xml').async('string');
    for (const text of dense.slides[3].bullets) assert.ok(xmlText(xml).includes(text));
    assert.match(xml, new RegExp(`sz="${expectedSize * 100}"`));
    assert.deepEqual(dense, before);
  }
  const extreme = fixture(); extreme.slides[3].bullets = ['Extremely dense source details. '.repeat(150)];
  assert.equal(defenceSlideLayout(extreme.slides[3], 3).bodyFontSize, 18);
  await assert.rejects(buildDefencePptx(extreme), /minimum is 18pt/);
});

await check('Manual text size is respected, persisted and cannot bypass overflow or invalid values', async () => {
  const dense = fixture();
  dense.slides[3].bullets = Array.from({ length: 4 }, () => 'This supplied objective retains the study population and setting. '.repeat(4).slice(0, 200));
  dense.slides[3].bodyFontSize = 24;
  assert.equal(defenceSlideLayout(dense.slides[3], 3).bodyFontSize, 24);
  await assert.rejects(buildDefencePptx(dense), /Choose Auto text size/);
  dense.slides[3].bodyFontSize = 20;
  assert.deepEqual(defenceSlideLayoutIssues(dense.slides[3], 3), []);
  assert.equal(JSON.parse(JSON.stringify(dense)).slides[3].bodyFontSize, 20);
  dense.slides[3].bodyFontSize = 16;
  await assert.rejects(buildDefencePptx(dense), /valid text size/);
});

await check('Test presentation metadata is preserved and labelled on all slides and in the handout', async () => {
  const test = model.createDefenceDeck(fixture().facts, { sourceName: 'Demonstration only', durationMinutes: 10, testData: true });
  assert.equal(test.testData, true);
  const result = await pptxZip(test);
  for (let i = 1; i <= 10; i++) assert.match(await result.file(`ppt/slides/slide${i}.xml`).async('string'), /TEST VERSION/);
  assert.match(buildDefenceHandout(test), /Not for academic submission/);
  test.testData = 'true'; await assert.rejects(buildDefencePptx(test), /must be a boolean/);
});

await check('Ten editable speaker-note pages retain full sources, anchors and supplied references', async () => {
  for (let index = 0; index < 10; index++) {
    const notes = await zip.file(`ppt/notesSlides/notesSlide${index + 1}.xml`).async('string');
    const text = xmlText(notes).join('\n');
    assert.ok(text.includes(deck.slides[index].notes));
    assert.ok(text.includes('Source version: qa-v1'));
    for (const key of deck.slides[index].sourceKeys) {
      assert.ok(text.includes(deck.facts[key].value));
      assert.ok(text.includes(`Source anchor: ${deck.facts[key].source}`));
    }
    assert.match(notes, /<p:ph type="body"/);
  }
  const last = xmlText(await zip.file('ppt/notesSlides/notesSlide10.xml').async('string')).join('\n');
  for (const key of factKeys) assert.ok(last.includes(deck.facts[key].value));
  assert.ok(last.includes(fullReference));
  const theme = await zip.file('ppt/theme/theme1.xml').async('string');
  const master = await zip.file('ppt/notesMasters/notesMaster1.xml').async('string');
  assert.match(theme, /<a:dk1><a:sysClr val="windowText" lastClr="000000"\/><\/a:dk1>/);
  assert.match(theme, /<a:minorFont>\s*<a:latin typeface="Arial"/);
  assert.match(master, /tx1="dk1"/);
  assert.match(master, /<a:solidFill><a:schemeClr val="tx1"\/><\/a:solidFill>/);
});

await check('Handout separates slide content, notes, source fields and full unmodified references', () => {
  const handout = buildDefenceHandout(deck);
  assert.equal(typeof handout, 'string');
  const content = handout.indexOf('\nSLIDE CONTENT\n');
  const notes = handout.indexOf('\nSPEAKER NOTES\n');
  const sources = handout.indexOf('\nFULL SOURCE FIELDS AND ANCHORS\n');
  const refs = handout.indexOf('\nFULL REFERENCES (AS SUPPLIED)\n');
  assert.ok(content > 0 && notes > content && sources > notes && refs > sources);
  assert.equal((handout.slice(content, notes).match(/^Slide \d+:/gm) || []).length, 10);
  assert.equal((handout.slice(notes, sources).match(/^Slide \d+:/gm) || []).length, 10);
  for (const fact of Object.values(deck.facts)) assert.ok(handout.includes(fact.value));
  assert.ok(handout.endsWith(fullReference + '\n'));
});

await check('Missing facts and [Add ...] fields can export a visibly labelled working draft', async () => {
  const draft = fixture();
  draft.facts.sample = { value: '', source: '', status: 'missing' };
  draft.slides[7].bullets = ['[Add sample size and justification]'];
  assert.equal(defenceDeckIsWorkingDraft(draft), true);
  const draftZip = await pptxZip(draft);
  for (let index = 1; index <= 10; index++) {
    const xml = await draftZip.file(`ppt/slides/slide${index}.xml`).async('string');
    assert.ok(xmlText(xml).includes('UHPAB Study   WORKING DRAFT'));
    for (const run of xml.matchAll(/<a:r>([\s\S]*?)<\/a:r>/g)) {
      assert.match(run[1], /<a:solidFill><a:srgbClr val="000000"\/><\/a:solidFill>/);
    }
  }
  assert.ok(xmlText(await draftZip.file('ppt/slides/slide8.xml').async('string')).includes('[Add sample size and justification]'));
  const emptyDeck = model.createDefenceDeck(model.emptyDefenceFacts(), { sourceName: 'Incomplete QA draft', durationMinutes: 10 });
  assert.equal(emptyDeck.slides.flatMap(defenceSlideLayoutIssues).length, 0);
  assert.ok((await pptxZip(emptyDeck)).file('ppt/slides/slide10.xml'));
});

await check('Review placeholders mark filled decks as drafts and optional absent supervisor does not', async () => {
  const review = fixture();
  review.slides[1].bullets = ['Background: [Review full text in speaker notes]'];
  assert.equal(defenceDeckIsWorkingDraft(review), true);
  const reviewZip = await pptxZip(review);
  assert.match(await reviewZip.file('ppt/slides/slide1.xml').async('string'), /WORKING DRAFT/);
  const complete = fixture();
  complete.facts.supervisor = { value: '', source: '', status: 'missing' };
  complete.slides[0].bullets.pop();
  assert.equal(defenceDeckIsWorkingDraft(complete), false);
});

await check('Missing references are disclosed without fabricated bibliography entries or extra slides', async () => {
  const draft = fixture();
  draft.facts.references = { value: '', source: '', status: 'missing' };
  const handout = buildDefenceHandout(draft);
  assert.match(handout, /No reference entries were supplied/);
  assert.ok(!handout.includes(fullReference));
  const result = await pptxZip(draft);
  assert.equal(result.file(/^ppt\/slides\/slide\d+\.xml$/).length, 10);
  assert.match(await result.file('ppt/notesSlides/notesSlide10.xml').async('string'), /No reference entries were supplied/);
});

await check('Old rule versions and every explicit review marker remain working drafts', async () => {
  const old = fixture();
  delete old.slides[2].rulesVersion;
  assert.equal(defenceDeckIsWorkingDraft(old), true);
  assert.match(buildDefenceHandout(old), /WORKING DRAFT/);
  const review = fixture();
  review.slides[2].bullets = ['[Review current situation in source notes]'];
  assert.equal(defenceDeckIsWorkingDraft(review), true);
  assert.match(buildDefenceHandout(review), /WORKING DRAFT/);
});

await check('PPTX export blocks missing problem roles and shortened topic losses even in a draft', async () => {
  const oldProblem = model.createDefenceDeck(fixture().facts, { sourceName: 'Rule export test', durationMinutes: 10 });
  oldProblem.slides[2].bullets = ['Ideally, nurses should have adequate supplies.'];
  await assert.rejects(buildDefencePptx(oldProblem), /current situation, gap, consequence/i);
  assert.match(buildDefenceHandout(oldProblem), /SECTION RULE REVIEW/);
  const shortened = model.createDefenceDeck(fixture().facts, { sourceName: 'Rule export test', durationMinutes: 10 });
  shortened.slides[3].approvedShortening = true;
  shortened.slides[3].bullets[1] = 'To identify the individual factors associated with handwashing.';
  await assert.rejects(buildDefencePptx(shortened), /must retain/);
});

await check('Long but fitting exact topics and multi-line objectives remain unchanged and editable', async () => {
  const long = fixture();
  long.facts.topic.value = long.slides[0].title = 'FACTORS ASSOCIATED WITH HANDWASHING AMONG NURSES WORKING AT TEST HEALTH CENTRE IV IN KAMPALA DISTRICT, CENTRAL UGANDA';
  long.slides[3].bullets = [
    'To identify factors associated with handwashing among nurses at Test Health Centre IV in Kampala district.',
    'To assess facility factors associated with handwashing among nurses at Test Health Centre IV in Kampala district.',
    'To examine reported practices associated with handwashing among nurses at Test Health Centre IV in Kampala district.',
  ];
  const plan = defenceSlideLayout(long.slides[0], 0);
  assert.ok(plan.title.lines >= 3);
  assert.equal(long.slides.flatMap(defenceSlideLayoutIssues).length, 0);
  const result = await pptxZip(long);
  assert.ok(xmlText(await result.file('ppt/slides/slide1.xml').async('string')).includes(long.facts.topic.value));
  for (const objective of long.slides[3].bullets) {
    assert.ok(xmlText(await result.file('ppt/slides/slide4.xml').async('string')).includes(objective));
  }
});

await check('Overlong topics, headings, objectives, wide tokens and manual line breaks block PPTX', async () => {
  const scenarios = [
    [0, 'title', 'A long exact research topic about nurses in Kampala '.repeat(20), /cover allows 4/],
    [1, 'title', 'A deliberately extended academic heading '.repeat(15), /limit is 2/],
    [3, 'bullets', ['To assess factors associated with practice among nurses '.repeat(30)], /18pt/],
    [4, 'bullets', ['W'.repeat(400)], /unbroken word or link/],
    [5, 'bullets', [Array.from({ length: 22 }, () => 'Separate line').join('\n')], /wrapped lines/],
  ];
  for (const [index, key, value, expected] of scenarios) {
    const dense = fixture();
    dense.slides[index][key] = value;
    if (index === 0) dense.facts.topic.value = value;
    const before = JSON.stringify(dense);
    assert.match(defenceSlideLayoutIssues(dense.slides[index], index).join('\n'), expected);
    await assert.rejects(buildDefencePptx(dense), expected);
    assert.equal(JSON.stringify(dense), before);
    assert.ok(buildDefenceHandout(dense).includes(typeof value === 'string' ? value : value[0]));
  }
});

await check('Invalid slide counts, IDs, source keys and cover-topic conflicts are actionable', async () => {
  for (const count of [9, 11]) {
    const invalid = fixture();
    invalid.slides = count === 9 ? invalid.slides.slice(0, 9) : [...invalid.slides, { ...invalid.slides[9], id: 'eleven' }];
    await assert.rejects(buildDefencePptx(invalid), /exactly ten slides/);
  }
  const duplicate = fixture();
  duplicate.slides[1].id = duplicate.slides[0].id;
  await assert.rejects(buildDefencePptx(duplicate), /unique ID/);
  const badKey = fixture();
  badKey.slides[2].sourceKeys = ['fabricated'];
  await assert.rejects(buildDefencePptx(badKey), /source keys/);
  const changed = fixture();
  changed.slides[0].title = 'A different topic';
  await assert.rejects(buildDefencePptx(changed), /exact study topic/);
  const tabs = fixture();
  tabs.slides[1].bullets = ['Field\tValue'];
  await assert.rejects(buildDefencePptx(tabs), /replace tab characters/);
  const control = fixture();
  control.slides[1].notes += '\u0000';
  await assert.rejects(buildDefencePptx(control), /invalid control characters/);
});

await check('Actual deck generator and exporter agree on editable slide content', async () => {
  const generated = model.createDefenceDeck(fixture().facts, { sourceName: 'Synthetic model integration', durationMinutes: 10 });
  assert.deepEqual(generated.slides.flatMap(defenceSlideLayoutIssues), []);
  const result = await pptxZip(generated);
  assert.equal(result.file(/^ppt\/slides\/slide\d+\.xml$/).length, 10);
  assert.equal(result.file(/^ppt\/notesSlides\/notesSlide\d+\.xml$/).length, 10);
});

await check('Four source-derived problem components fit without shrinking or losing full source notes', async () => {
  const facts = fixture().facts;
  facts.problem.value = 'Ideally, all women of reproductive age (18, 49 years) should undergo routine cervical cancer screening to enable early detection and effective management of precancerous cervical lesions. However, the current screening uptake among eligible women in Uganda remains critically low, estimated at 12.5% nationally (Synthetic Author, 2026). Existing literature often overlooks the unique dynamics of women attending urban hospital-based ANC services, creating a crucial evidence gap. If this problem is not urgently investigated and addressed, low screening uptake will persist, leading to missed opportunities for early diagnosis, presentation at advanced disease stages, prohibitive treatment costs, and elevated mortality rates among women in their prime productive years.';
  const slide = model.buildDefenceSlide(2, facts);
  assert.equal(slide.bullets.length, 4);
  assert.deepEqual(defenceSlideLayoutIssues(slide, 2), []);
  assert.ok(defenceSlideLayout(slide, 2).bullets.every(item => item.fontSize === 24));
  assert.ok(slide.notes.includes(facts.problem.value));
});

await check('Exporter bundles for the browser and keeps PPTXGenJS in a lazy chunk', async () => {
  const result = await build({
    entryPoints: ['src/lib/defenceSlidesExport.ts'], outdir: resolve(directory, 'browser'),
    bundle: true, splitting: true, platform: 'browser', format: 'esm', metafile: true,
  });
  const entry = Object.entries(result.metafile.outputs).find(([, info]) => info.entryPoint === 'src/lib/defenceSlidesExport.ts');
  assert.ok(entry);
  assert.ok(entry[1].imports.some(item => item.kind === 'dynamic-import'));
  const source = readFileSync(entry[0], 'utf8');
  assert.doesNotMatch(source, /\b(?:document|window)\s*[.\[]|\bwriteFile\s*\(/);
  assert.ok(Object.keys(result.metafile.inputs).some(path => path.includes('pptxgenjs')));
});

console.log(`\n${checks} defence-export checks passed. Synthetic data only; no full application build.`);
