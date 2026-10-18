import { readFileSync, writeFileSync } from 'node:fs';
import { build } from 'esbuild';

async function load(path) {
  const result = await build({ entryPoints: [path], bundle: true, platform: 'node', format: 'esm', write: false });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
}
const { getAppendixSections, strictGuidelineRules } = await load('src/data/researchGuidelineRules.ts');
const { default: proposal } = await load('src/data/proposalStructure.ts');
const path = 'src/data/uhpab_code.json';
let rows = JSON.parse(readFileSync(path, 'utf8')).filter(row => !/supervisor_commitment|authorization|copyright/.test(row.section_id));
for (const n of [1, 2]) {
  const parent = `uhpab_report_chapter_${n}_main`;
  rows = rows.filter(row => row.parent_section_id !== parent);
  for (const section of Object.values(proposal[`chapter${n}`].sections)) {
    const number = section.title.match(/^([\d.]+)/)[1].replace(/\./g, '_');
    rows.push({ section_id: `uhpab_report_chapter_${number}`, document_type: 'report', section_name: section.title, parent_section_id: parent, rules_and_guidelines: section.requirements, formatting_notes: ['Bold, left-aligned sentence case, Times New Roman 12.'], page_count_limits: null, examples: [], prompt_keywords: [section.title] });
  }
}
const prelim = ['title_page', 'declaration', 'approval', 'dedication', 'acknowledgement', 'table_of_contents', 'list_of_tables_figures', 'acronyms', 'definitions', 'abstract'];
const names = ['Title page', 'Declaration', 'Approval', 'Dedication', 'Acknowledgement', 'Table of contents', 'List of tables, figures and pictures', 'Abbreviations/acronyms', 'Operational definitions', 'Abstract'];
for (const row of rows) {
  const key = row.section_id.replace(/^uhpab_report_/, '');
  const index = prelim.indexOf(key);
  if (index >= 0) row.section_name = names[index];
  if (key === 'preliminary_main') {
    row.rules_and_guidelines = ['Each preliminary section starts on its own page.', `Required order: ${names.join('; ')}.`, 'Report: minimum 30 pages from Chapter One through appendices, excluding preliminaries.'];
    row.formatting_notes = ['Title page unnumbered. Remaining preliminary pages use centred Roman page numbers starting at i.', 'Times New Roman 12; double spacing except the single-spaced abstract.', 'Preliminary headings centred and bold.'];
  }
  if (key === 'title_page') row.rules_and_guidelines = row.rules_and_guidelines.filter(text => !/supervisor|qualification/i.test(text));
  if (key === 'table_of_contents') row.examples = ['TABLE OF CONTENTS\n' + names.slice(1).map((name, i) => `${name} ... ${['i','ii','iii','iv','v','vi','vii','viii','ix'][i]}`).join('\n') + '\nCHAPTER ONE: INTRODUCTION ... 1\nCHAPTER TWO: LITERATURE REVIEW ... [page]\nCHAPTER THREE: METHODOLOGY ... [page]\nCHAPTER FOUR: FINDINGS OF THE STUDY ... [page]\nCHAPTER FIVE: DISCUSSIONS, RECOMMENDATIONS AND CONCLUSIONS ... [page]\nREFERENCES ... [page]\nAPPENDICES ... [page]'];
  if (key === 'appendices_main') row.rules_and_guidelines = Object.values(getAppendixSections('report')).map(item => `${item.title}: ${item.description}`);
  if (key === 'abstract') row.rules_and_guidelines = [...new Set([...row.rules_and_guidelines, 'Report only. Maximum 300 words and one page, single spaced; no citations.', 'Include purpose in the introduction/background, methodology, findings by objective, conclusions, recommendations and health profession implications.'])];
  for (const field of ['rules_and_guidelines', 'formatting_notes']) row[field] = row[field].map(text => text.replace(/14\s*pt|14-point/gi, '12pt'));
}
const roots = rows.filter(row => !row.parent_section_id);
rows = roots.flatMap(root => {
  const children = rows.filter(row => row.parent_section_id === root.section_id);
  if (/preliminary_main$/.test(root.section_id)) children.sort((a, b) => prelim.indexOf(a.section_id.replace(/^uhpab_report_/, '')) - prelim.indexOf(b.section_id.replace(/^uhpab_report_/, '')));
  return [root, ...children];
});
writeFileSync(path, JSON.stringify(rows, null, 2) + '\n');
writeFileSync('src/data/uhpab_report_guidelines.json', JSON.stringify(rows, null, 2) + '\n');
const proposalRows = Object.entries(proposal).flatMap(([key, chapter]) => {
  const id = `proposal_${key}`;
  const convert = (section, sectionId, parent) => ({ section_id: sectionId, document_type: 'proposal', section_name: section.title, parent_section_id: parent, rules_and_guidelines: section.requirements || [section.description], formatting_notes: section.formatting ? [section.formatting] : [], page_count_limits: section.pageCount || null, examples: [], prompt_keywords: [key] });
  return [convert(chapter, id, null), ...Object.entries(chapter.sections || {}).map(([child, section]) => convert(section, `${id}_${child}`, id))];
});
proposalRows[0].rules_and_guidelines.push(strictGuidelineRules('proposal'));
writeFileSync('src/data/uhpab_proposal_guidelines.json', JSON.stringify(proposalRows, null, 2) + '\n');
console.log('Reconciled guideline JSON snapshots regenerated.');
