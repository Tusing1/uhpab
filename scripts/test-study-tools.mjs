import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import JSZip from 'jszip';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
mkdirSync('tmp/study-tools-qa',{recursive:true});
async function bundle(entry,name){const outfile=resolve(`tmp/study-tools-qa/${name}.mjs`);await build({entryPoints:[entry],outfile,bundle:true,packages:'external',platform:'node',format:'esm',jsx:'automatic',alias:{'@':resolve('src')},define:{'import.meta.env':'{}'}});return import(pathToFileURL(outfile));}
const tools=await bundle('src/lib/researchStudyTools.ts','tools');
const instrument=await bundle('src/lib/researchInstrument.ts','instrument');
const engine=await bundle('src/lib/uhpabWritingEngine.ts','engine');
const flow=await bundle('src/lib/projectWritingFlow.ts','flow');
const workspace=await bundle('src/lib/chapterWorkspace.ts','workspace');
const api=await bundle('src/lib/api.ts','api');
const ui=await bundle('src/components/research/ResearchProjectTools.tsx','ui');
const help=await bundle('src/components/research/SectionExplanation.tsx','help');
const topic='FACTORS ASSOCIATED WITH HANDWASHING AMONG NURSES AT TEST HEALTH CENTRE IV, KAMPALA';
const objectiveContext={projectTitle:topic,projectType:'proposal',sectionKey:'chapter1',componentId:'specificObjectives',componentLabel:'Specific objectives',objectiveCount:3};
const objectives=engine.normalizeUhpabGeneratedDraft('<ol><li>To identify socio-demographic factors.</li><li>To assess health facility-related factors.</li><li>To examine behavioural factors.</li></ol>',objectiveContext);
const base=()=>({title:topic,progress:{},chapters:{chapter1:{specificObjectives:objectives},_studyContext:{design:'A cross-sectional quantitative survey to assess the current situation.'}}});
const confirmed=()=>tools.confirmStudyProfile(base(),'proposal');
const fixture=()=>({instructions:'Participation is voluntary. Do not write your name.',questions:[1,2,3].flatMap(objective=>[{objective,text:`What challenges relate to objective ${objective}?`,response:'text',options:[]},{objective,text:`How often do you encounter challenge ${objective}?`,response:'single',options:['Never','Sometimes','Often']}])});
const parsed=()=>instrument.parseInstrument(JSON.stringify(fixture()),confirmed(),'proposal','questionnaire');
let count=0;
async function check(name,run){await run();count++;console.log(`PASS ${name}`);}
await check('Justification does not demand citations or citation-needed placeholders',()=>{
  const context={projectTitle:topic,projectType:'proposal',sectionKey:'chapter1',componentId:'justification',componentLabel:'Justification'};
  const prompt=engine.buildUhpabGenerationPrompt(context,'draft');
  assert.match(prompt,/citations are NOT required by default/);
  assert.doesNotMatch(prompt,/None yet\. Use \[citation needed\]/);
  assert.equal(engine.sectionCitationPolicy('chapter1','justification'),'only-if-borrowed');
  assert.equal(engine.sectionCitationPolicy('chapter1','generalObjective'),'none');
  assert.equal(engine.sectionCitationPolicy('chapter2','introduction'),'evidence');
  assert.match(engine.buildUhpabGenerationPrompt({...context,componentId:'background'},'draft'),/factual claims require supporting evidence/);
});
await check('Legacy projects infer shared details without silently rewriting manuscript',()=>{
  const form=base(),before=JSON.stringify(form);
  const profile=tools.studyProfile(form,'proposal');
  assert.equal(profile.population,'nurses');assert.match(profile.setting,/test health centre/i);
  assert.equal(JSON.stringify(form),before);
});
await check('Confirmation is explicit, topic-bound and rejects a mere methodological approach',()=>{
  const form=base();assert.equal(tools.fieldConfirmed(form,'proposal','objectives'),false);
  const result=tools.confirmStudyProfile(form,'proposal');
  assert.equal(tools.fieldConfirmed(result,'proposal','objectives'),true);
  assert.equal(tools.fieldConfirmed({...result,title:topic+' UPDATED'},'proposal','objectives'),false);
  assert.throws(()=>tools.confirmStudyProfile({...form,chapters:{...form.chapters,_studyContext:{design:'quantitative'}}},'proposal'),/actual study design/);
});
await check('Objective confirmation enforces count and exact issue/population/setting',()=>{
  const form=base();form.chapters.chapter1.specificObjectives='<p>To investigate something.</p>';
  assert.throws(()=>tools.confirmStudyProfile(form,'proposal'),/exactly 3/);
});
await check('Profile objective typing survives legacy manuscript objectives without being rubbed out',()=>{
  const form=base();
  const updated=tools.updateStudyProfile(form,'proposal',{objectives:'A draft being typed'});
  assert.equal(tools.studyProfile(updated,'proposal').objectives,'A draft being typed');
  const changed=tools.updateStudyProfile(confirmed(),'proposal',{},2);
  assert.equal(tools.fieldConfirmed(changed,'proposal','objectives'),false);
  assert.equal(readResearchObjectiveLines(changed).length,3);
});
function readResearchObjectiveLines(form){return tools.studyProfile(form,'proposal').objectives.split('\n');}
await check('Questions mirror approved objectives and alternative wording requires manual review',()=>{
  const form=confirmed();
  const w=flow.projectChapterWorkspace(form,'proposal','chapter1');
  const context=workspace.workspaceWritingContext(w,'researchQuestions');
  form.chapters.chapter1.researchQuestions=engine.getUhpabSectionContract(context).fallback(context);
  assert.equal(tools.consistencyChecks(form,'proposal').find(c=>c.id==='questions').status,'passed');
  form.chapters.chapter1.researchQuestions='<p>What about another issue?</p>';
  assert.equal(tools.consistencyChecks(form,'proposal').find(c=>c.id==='questions').status,'manual');
});
await check('Readiness flags missing sections, placeholders and actual missing reference entries',()=>{
  const form=base();form.chapters.chapter1.background='<p>Guidance (WHO, 2024).</p>';form.chapters.chapter1.justification='<p>[insert rationale]</p>';
  form.chapters._sourcesLibrary=[{id:'who',title:'Synthetic guidance',authors:'WHO',year:'2024',citationText:'(WHO, 2024)',apaReference:'WHO. (2024). Synthetic guidance.',notes:'A supplied finding.',intendedUse:'background',url:''}];
  const checks=tools.readinessChecks(form,'proposal',2026);
  assert.ok(checks.some(c=>c.id==='section-chapter1-justification'&&c.status==='needs-attention'));
  assert.ok(checks.some(c=>c.id.startsWith('reference-')&&c.status==='needs-attention'));
  assert.ok(checks.some(c=>c.id==='final-format'&&c.status==='manual'));
  assert.ok(!checks.some(c=>c.id==='appendix-similarityReport'));
});
await check('Report-specific checks include genuine similarity documentation and citation-free abstract',()=>{
  const form=base();form.chapters.preliminaryPages={abstract:'Research (WHO, 2024).'};
  const checks=tools.readinessChecks(form,'report',2026);
  assert.ok(checks.some(c=>c.id==='abstract'&&c.status==='needs-attention'));
  assert.ok(checks.some(c=>c.id==='appendix-similarityReport'));
  assert.ok(!checks.some(c=>c.id==='appendix-budget'));
});
await check('Reference age uses study period and respects accepted exceptions',()=>{
  const form=base();form.chapters._studyContext.period='January to June 2020';
  form.chapters._sourcesLibrary=[{id:'old',title:'Historical source',year:'2014',acceptedOld:false}];
  assert.ok(!tools.readinessChecks(form,'proposal',2026).some(c=>c.id==='old-old'));
  form.chapters._studyContext.period='2026';assert.ok(tools.readinessChecks(form,'proposal',2026).some(c=>c.id==='old-old'));
  form.chapters._sourcesLibrary[0].acceptedOld=true;assert.ok(!tools.readinessChecks(form,'proposal',2026).some(c=>c.id==='old-old'));
});
await check('Instrument generation requires confirmed objectives and actual design',()=>{
  assert.throws(()=>instrument.instrumentPrompt(base(),'proposal','questionnaire'),/Confirm your specific objectives/);
  const prompt=instrument.instrumentPrompt(confirmed(),'proposal','questionnaire');
  assert.match(prompt,/Do not collect names/);assert.match(prompt,/not a validated instrument/);
});
await check('Instrument parser rejects malformed, unassigned, duplicated and identifying questions',()=>{
  assert.throws(()=>instrument.parseInstrument('invalid',confirmed(),'proposal','questionnaire'),/incomplete/);
  const data=fixture();data.questions[0].objective=9;assert.throws(()=>instrument.parseInstrument(JSON.stringify(data),confirmed(),'proposal','questionnaire'),/invalid objective/);
  const dup=fixture();dup.questions[1].text=dup.questions[0].text;assert.throws(()=>instrument.parseInstrument(JSON.stringify(dup),confirmed(),'proposal','questionnaire'),/What challenges/);
  const identity=fixture();identity.questions[0].text='What is your full name?';assert.throws(()=>instrument.parseInstrument(JSON.stringify(identity),confirmed(),'proposal','questionnaire'),/identifiers/);
});
await check('Every objective has a coverage check without pretending semantic validity',()=>{
  const value=parsed();const checks=instrument.instrumentChecks(value,confirmed(),'proposal');
  assert.equal(checks.filter(c=>c.id.includes('coverage')).length,3);
  assert.ok(checks.filter(c=>c.id.includes('coverage')).every(c=>c.status==='manual'));
  value.questions=value.questions.filter(q=>q.objective!==2);
  assert.ok(instrument.instrumentChecks(value,confirmed(),'proposal').some(c=>c.id==='instrument-coverage-2'&&c.status==='needs-attention'));
});
await check('Interview guides use open-ended responses and changes invalidate tool alignment',()=>{
  const form=confirmed();const value=instrument.parseInstrument(JSON.stringify(fixture()),form,'proposal','interview');
  assert.ok(value.questions.every(q=>q.response==='text'&&q.options.length===0));
  form.title+=' UPDATED';assert.ok(instrument.instrumentChecks(value,form,'proposal').some(c=>c.id==='instrument-stale'));
});
await check('Generated appendix is escaped, grouped and carries no explanatory helper UI',()=>{
  const value=parsed();value.questions[0].text='<script>alert(1)</script>';
  const html=instrument.instrumentHtml(value,tools.plainObjectives(objectives).split('\n'));
  assert.doesNotMatch(html,/<script>/);assert.match(html,/&lt;script&gt;/);assert.match(html,/Objective 3/);
});
await check('Tool DOCX has editable questions, A4 dimensions and Times New Roman 12',async()=>{
  const blob=await instrument.buildInstrumentDocx(parsed(),tools.plainObjectives(objectives).split('\n'));
  const zip=await JSZip.loadAsync(await blob.arrayBuffer());const xml=await zip.file('word/document.xml').async('string');
  assert.match(xml,/Times New Roman/);assert.match(xml,/w:sz w:val="24"/);assert.match(xml,/w:line="480"/);assert.match(xml,/w:w="11906"/);assert.match(xml,/QUESTIONNAIRE - DRAFT/);
  writeFileSync('tmp/study-tools-qa/questionnaire.docx',Buffer.from(await blob.arrayBuffer()));
});
await check('Full project DOCX includes the approved tool in Appendix 1 only',async()=>{
  const form=confirmed();form.chapters.appendices={tools:instrument.instrumentHtml(parsed(),tools.plainObjectives(objectives).split('\n'))};
  const blob=await api.buildTemplateDocx('proposal',form);const zip=await JSZip.loadAsync(await blob.arrayBuffer());const xml=await zip.file('word/document.xml').async('string');
  assert.match(xml,/Appendix 1: Data collection tools/);assert.match(xml,/What challenges relate to objective 3/);
  assert.doesNotMatch(xml,/Confirm these details|Study tools|Generate tool draft/);
});
await check('Standalone work retains tools privately without a database migration',()=>{
  const w=workspace.newChapterWorkspace('qa','proposal','chapter3',topic,['studyDesign']);
  w.context={_researchInstrument:JSON.stringify(parsed()),_toolsAppendix:'<p>Synthetic approved tool.</p>'};
  const form=tools.workspaceForm(w);assert.ok(instrument.instrumentFromProject(form));assert.match(tools.studySection(form,'appendices').tools,/Synthetic approved tool/);
});
await check('Helper and study tools start collapsed and do not claim official grades',()=>{
  const html=renderToStaticMarkup(React.createElement(ui.default,{form:base(),type:'proposal',disabled:false,onChange(){},onNavigate(){},onBusy(){}}));
  assert.match(html,/<details class="my-4 border-y py-3">/);assert.match(html,/Study profile/);assert.match(html,/Consistency/);
  assert.match(html,/Back to writing/);
  assert.match(readFileSync('src/pages/Projects/ProjectEditorContent.tsx','utf8'),/hidden=\{toolsOpen\}/);
  const explanation=renderToStaticMarkup(React.createElement(help.default,{context:{projectTitle:topic,projectType:'proposal',sectionKey:'chapter1',componentId:'justification',componentLabel:'Justification'}}));
  assert.match(explanation,/No citations are required by default/);assert.doesNotMatch(explanation,/<details[^>]*open=/);
});
await check('Both editors require comparison before replacing populated sections',()=>{
  for(const path of ['src/pages/Projects/ProjectEdit.tsx','src/pages/ChapterWork.tsx']){const source=readFileSync(path,'utf8');assert.match(source,/DraftComparison/);assert.match(source,/setPendingDraft/);assert.match(source,/previousContent|_writingUndo/);}
});
console.log(`\n${count} study-tool checks passed. Synthetic data only; no model calls.`);
