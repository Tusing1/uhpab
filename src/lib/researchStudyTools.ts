import { proposalStructure, reportStructure } from '@/data/uhpabGuidelines';
import { legacySectionAliases } from '@/data/researchGuidelineRules';
import { generationNeeds, citedWorkspaceSources, inferredStudyContext, plainChapterText, workspaceWritingContext, type ChapterWorkspace } from './chapterWorkspace';
import { objectiveSignature, projectChapterWorkspace, sectionReviewed, reviewFingerprint, type WritingForm } from './projectWritingFlow';
import { normalizeSpecificObjectives, parseResearchTopic, readResearchList, buildResearchQuestions } from './researchFormulation';
import { assertUhpabDraftAllowed, getUhpabSectionContract } from './uhpabWritingEngine';
export type StudyField = 'setting' | 'population' | 'objectives' | 'design' | 'sample' | 'sampling' | 'period';
export const studyFields: Array<{
    key: StudyField;
    label: string;
    placeholder: string;
}> = [
    { key: 'setting', label: 'Study setting', placeholder: 'The named health facility or community and district.' },
    { key: 'population', label: 'Respondent group', placeholder: 'Who will participate? Keep the population and ages aligned with your topic.' },
    { key: 'objectives', label: 'Specific objectives', placeholder: 'One objective per line. Keep the exact population and setting at the end of each.' },
    { key: 'design', label: 'Study design and approach', placeholder: 'The actual study design, approach and a short reason for choosing it.' },
    { key: 'sample', label: 'Sample size and justification', placeholder: 'Confirmed sample size, calculation or method and assumptions. Do not guess inputs.' },
    { key: 'sampling', label: 'Sampling method', placeholder: 'How respondents will be selected.' },
    { key: 'period', label: 'Study period', placeholder: 'Planned or actual dates, including the year.' },
];
export const studySection = (form: WritingForm, chapter: string): Record<string, string> => {
    const data = form.chapters[chapter];
    const value = data && typeof data === 'object' && !Array.isArray(data) ? data as Record<string, string> : {};
    if (chapter === 'appendices' && !value.tools && form.chapters._studyContext?._toolsAppendix)
        return { ...value, tools: form.chapters._studyContext._toolsAppendix };
    return value;
};
export function studyProfile(form: WritingForm, type: 'proposal' | 'report'): Record<string, string> {
    const w = projectChapterWorkspace(form, type, 'chapter1')!;
    const context = inferredStudyContext(w);
    const methods = studySection(form, 'chapter3');
    return { ...context, objectives: plainObjectives(context.objectives || studySection(form, 'chapter1').specificObjectives || ''), design: context.design || plainChapterText(methods.studyDesign || ''), sample: context.sample || plainChapterText(methods.sampleSize || ''), sampling: context.sampling || plainChapterText(methods.samplingMethod || '') };
}
export const plainObjectives = (value: string) => readResearchList(value).join('\n');
export function updateStudyProfile(form: WritingForm, type:'proposal'|'report', patch: Partial<Record<StudyField,string>>, count?:2|3):WritingForm {
    const context:Record<string,string>={...studyProfile(form,type),...patch,objectiveCount:String(count || (form.chapters._objectiveCount===2?2:3))};
    const next={...form,chapters:{...form.chapters,_studyContext:context,_objectiveCount:count || (form.chapters._objectiveCount===2?2:3)}};
    if(patch.objectives!==undefined || count!==undefined) context._confirmedObjectivesFor=objectiveSignature(next);
    return next;
}
const confirmationValue=(form:WritingForm,profile:Record<string,string>,key:StudyField)=>JSON.stringify([form.title,profile[key],...(key==='objectives'?[form.chapters._objectiveCount===2?2:3]:[])]);
function confirmations(context: Record<string, string>): Record<string, string> {
    try {
        const result = JSON.parse(context._confirmedStudyFields || '{}');
        return result && typeof result === 'object' && !Array.isArray(result) ? result : {};
    }
    catch {
        return {};
    }
}
export function fieldConfirmed(form: WritingForm, type: 'proposal' | 'report', key: StudyField) {
    const profile = studyProfile(form, type);
    if (!profile[key]?.trim())
        return false;
    if (confirmations(profile)[key] === confirmationValue(form,profile,key))
        return true;
    const section = ({ objectives: ['chapter1', 'specificObjectives'], design: ['chapter3', 'studyDesign'], sample: ['chapter3', 'sampleSize'], sampling: ['chapter3', 'samplingMethod'] } as Partial<Record<StudyField, string[]>>)[key];
    return !!section && sectionReviewed(form, section[0], section[1]);
}
export function confirmStudyProfile(form: WritingForm, type: 'proposal' | 'report'): WritingForm {
    const profile = studyProfile(form, type);
    if (profile.design && generationNeeds({ ...projectChapterWorkspace(form, type, 'chapter3')!, context: profile }, 'studyDesign').length)
        throw new Error('Name an actual study design before confirming. Quantitative or qualitative alone describes the approach, not the design.');
    if (profile.objectives) {
        const count = form.chapters._objectiveCount === 2 ? 2 : 3;
        const items = readResearchList(profile.objectives);
        if (items.length !== count)
            throw new Error(`Keep exactly ${count} specific objectives before confirming.`);
        const aligned = normalizeSpecificObjectives(profile.objectives, parseResearchTopic(form.title), count);
        if (aligned.some((item, i) => normalize(item) !== normalize(items[i])))
            throw new Error('Align each objective with your exact topic before confirming.');
    }
    const confirmed = Object.fromEntries(studyFields.filter(f => profile[f.key]?.trim()).map(f => [f.key, confirmationValue(form,profile,f.key)]));
    return { ...form, chapters: { ...form.chapters, _studyContext: { ...profile, _confirmedStudyFields: JSON.stringify(confirmed) } } };
}
export function profileImpact(key: StudyField) {
    return ({ setting: 'Background, scope, setting, objectives and questions', population: 'Objectives, questions, population, sampling and instruments', objectives: 'Questions, literature review, variables, instruments, findings and discussion', design: 'Sample size, sampling, collection and analysis', sample: 'Sample-size section, sampling and data collection', sampling: 'Sampling and data collection', period: 'Scope and methodology' } as Record<StudyField, string>)[key];
}
const normalize = (value: string) => plainChapterText(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
export type StudyCheck = {
    id: string;
    status: 'needs-attention' | 'manual' | 'passed';
    title: string;
    detail: string;
    section: string;
    component: string;
};
export function consistencyChecks(form: WritingForm, type: 'proposal' | 'report'): StudyCheck[] {
    const profile = studyProfile(form, type);
    const checks: StudyCheck[] = [];
    const add = (id: string, status: StudyCheck['status'], title: string, detail: string, section = 'chapter1', component = 'specificObjectives') => checks.push({ id, status, title, detail, section, component });
    try {
        const parsed = parseResearchTopic(form.title);
        add('topic', 'passed', 'Topic structure', 'A specific issue, respondent group and setting can be identified.');
        const general=plainChapterText(studySection(form,'chapter1').generalObjective||'');
        const generalIssue=general.replace(/^to\s+(?:assess|determine|identify|explore|establish|examine|evaluate|describe)\s+(?:the\s+)?/i,'');
        add('general-objective',general&&normalize(generalIssue)===normalize(parsed.sentence)?'passed':'needs-attention','General objective follows the topic',general?'Use an appropriate action verb followed by the exact issue, population and setting from the topic.':'The general objective is missing.','chapter1','generalObjective');
        for (const key of ['setting', 'population'] as const)
            add(`topic-${key}`, normalize(profile[key]) === normalize(parsed[key]) ? 'passed' : 'manual', `${key === 'setting' ? 'Setting' : 'Population'} matches the topic`, normalize(profile[key]) === normalize(parsed[key]) ? 'The shared study detail matches the topic.' : 'The shared detail differs from the topic. Check whether this is extra detail or a contradiction.', 'chapter3', key === 'setting' ? 'studySetting' : 'studyPopulation');
        const count = form.chapters._objectiveCount === 2 ? 2 : 3;
        const items = readResearchList(profile.objectives);
        const normalized = normalizeSpecificObjectives(profile.objectives, parsed, count);
        const exact = items.length === count && normalized.every((value, i) => normalize(value) === normalize(items[i]));
        add('objectives', exact ? 'passed' : 'needs-attention', 'Objectives align with the topic', exact ? 'The number, categories, issue, population and setting are aligned.' : 'Revise the objectives to match the topic and selected count.');
        const manuscriptObjectives=plainObjectives(studySection(form,'chapter1').specificObjectives||'');
        if(manuscriptObjectives && normalize(manuscriptObjectives)!==normalize(profile.objectives)) add('objective-profile-mismatch','needs-attention','Shared objectives differ from Chapter One','Reconcile your shared objectives with the actual Specific objectives section. Neither version has been automatically rewritten.');
        const expected = buildResearchQuestions(normalized, parsed);
        const questions = readResearchList(studySection(form, 'chapter1').researchQuestions || '');
        add('questions', !questions.length ? 'needs-attention' : questions.length === expected.length && questions.every((q, i) => normalize(q) === normalize(expected[i])) ? 'passed' : 'manual', 'Questions mirror the objectives', !questions.length ? 'Research questions are missing.' : 'Compare each question with the same-numbered objective; alternative wording needs manual review.', 'chapter1', 'researchQuestions');
    }
    catch (error) {
        add('formulation', 'needs-attention', 'Topic and objective alignment', error instanceof Error ? error.message : 'Check the topic and objectives.');
    }
    add('design', !profile.design ? 'needs-attention' : /cross.sectional|case.control|cohort|experimental|phenomenolog|ethnograph|case study|grounded theory|descriptive|exploratory/i.test(profile.design) ? 'manual' : 'needs-attention', 'Methodology fits the research', profile.design ? 'Check that design, sampling, measurements and analysis can answer every objective. A named design alone does not establish suitability.' : 'Choose and justify the actual design.', 'chapter3', 'studyDesign');
    for(const [field,id] of [['population','studyPopulation'],['setting','studySetting']] as const){const actual=plainChapterText(studySection(form,'chapter3')[id]||'');if(actual && profile[field] && !normalize(actual).includes(normalize(profile[field])))add(`methods-${field}`,'manual',`Methodology: check the ${field}`,`The exact shared ${field} is not repeated in this section. Check whether the wording is equivalent or contradicts the topic.`,'chapter3',id);}
    const literature = studySection(form, 'chapter2').body || '';
    add('literature-coverage', literature ? 'manual' : 'needs-attention', 'Literature covers the objectives', literature ? 'Check objective-based headings, comparison of studies, synthesis and gaps. Topic-word overlap alone does not prove coverage.' : 'Literature review body is missing.', 'chapter2', 'body');
    return checks;
}
export function readinessChecks(form: WritingForm, type: 'proposal' | 'report', studyYear = new Date().getFullYear()): StudyCheck[] {
    const structure = type === 'report' ? reportStructure : proposalStructure;
    const checks = consistencyChecks(form, type);
    const references = normalize(studySection(form, 'references').content || '');
    const sections = Object.entries(structure).filter(([key]) => /^chapter[1-5]$/.test(key)).flatMap(([key, chapter]) => Object.entries(chapter.sections || {}).filter(([id]) => id !== 'researchObjectives').map(([id, meta]) => ({ key, id, meta, html: studySection(form, key)[id] || '' })));
    for (const { key, id, meta, html } of sections) {
        const text = plainChapterText(html);
        const placeholder = /\[\[|\[(?:citation needed|verify|insert|add|provide|replace|enter)\b/i.test(text);
        checks.push({ id: `section-${key}-${id}`, status: !text || placeholder ? 'needs-attention' : sectionReviewed(form, key, id) ? 'passed' : 'manual', title: meta.title, detail: !text ? 'This section is empty.' : placeholder ? 'Resolve the marked gaps.' : 'Check the wording, facts and sources before submission.', section: key, component: id });
        if (text && ['chapter1', 'chapter2', 'chapter3'].includes(key)) {
            const w = projectChapterWorkspace(form, type, key)!;
            try {
                assertUhpabDraftAllowed(html, { ...workspaceWritingContext(w, id), knownSources: w.sources });
            }
            catch (error) {
                checks.push({ id: `validation-${key}-${id}`, status: 'needs-attention', title: `Sources / structure: ${meta.title}`, detail: (error as Error).message, section: key, component: id });
            }
            for (const source of citedWorkspaceSources(w, html))
                if (!references.includes(normalize(source.apaReference)))
                    checks.push({ id: `reference-${key}-${id}-${source.id}`, status: 'needs-attention', title: 'Cited source missing from reference page', detail: source.title, section: 'references', component: 'content' });
            const limit = getUhpabSectionContract(workspaceWritingContext(w, id)).maxWords;
            if (limit && text.split(/\s+/).length > limit)
                checks.push({ id: `length-${key}-${id}`, status: 'needs-attention', title: `Length: ${meta.title}`, detail: `Keep within this section's ${limit}-word limit.`, section: key, component: id });
        }
    }
    const preliminary = studySection(form, 'preliminaryPages');
    const valueFor = (id: string) => [id, ...legacySectionAliases[id] || []].map(key => preliminary[key] || '').find(Boolean) || '';
    if (type === 'report') {
        const abstract = plainChapterText(valueFor('abstract'));
        checks.push({ id: 'abstract', status: !abstract || abstract.split(/\s+/).length > 300 || /\([^)]*(?:\b(?:19|20)\d{2}\b|n\.d\.)[^)]*\)/i.test(abstract) ? 'needs-attention' : 'manual', title: 'Report abstract', detail: 'Check the report-only abstract: at most 300 words, no citations, and based on actual findings.', section: 'preliminaryPages', component: 'abstract' });
    }
    const appendix = studySection(form, 'appendices');
    for (const key of ['tools', 'ethicalRequirements', ...(type === 'proposal' ? ['budget', 'workPlan'] : ['similarityReport'])])
        checks.push({ id: `appendix-${key}`, status: plainChapterText(appendix[key] || '') ? 'manual' : 'needs-attention', title: `Appendix: ${key.replace(/([A-Z])/g, ' $1').toLowerCase()}`, detail: key === 'similarityReport' ? 'Attach a genuine similarity-provider report. An app check cannot certify it.' : 'Verify that the appendix is complete, relevant and genuine.', section: 'appendices', component: key });
    const years = studyProfile(form, type).period?.match(/\b(?:19|20)\d{2}\b/g);
    const referenceYear = years?.length ? Number(years[years.length - 1]) : studyYear;
    for (const source of form.chapters._sourcesLibrary || [])
        if (!source.acceptedOld && /^\d{4}$/.test(source.year) && referenceYear - Number(source.year) > 10)
            checks.push({ id: `old-${source.id}`, status: 'manual', title: 'Older reference', detail: `${source.title}: over ten years before ${referenceYear}. Check whether an accepted classic, legal or guideline exception applies.`, section: 'references', component: 'content' });
    const register = form.chapters._tableFigureRegister;
    if (Array.isArray(register)) {
        const used = new Set<string>();
        for (const item of register) {
            if (!item || typeof item !== 'object')
                continue;
            const key = `${item.type}:${item.number}`;
            if (used.has(key))
                checks.push({ id: `number-${key}`, status: 'needs-attention', title: 'Duplicate table / figure number', detail: key, section: 'chapter4', component: 'results' });
            used.add(key);
        }
        if (register.length)
            checks.push({ id: 'captions', status: 'manual', title: 'Tables, figures and preliminary list', detail: 'Check every registered caption, its position and objective, and the generated preliminary list in the DOCX.', section: 'chapter4', component: 'results' });
    }
    checks.push({ id: 'final-format', status: 'manual', title: 'Final DOCX and preliminary pages', detail: 'Open the downloaded DOCX to check A4 layout, Times New Roman 12, spacing, actual page count, Roman/Arabic numbering, contents/list page numbers, identity details and genuine approval signatures. These checks do not certify plagiarism or academic approval.', section: 'preliminaryPages', component: 'tableOfContents' });
    return checks;
}
export function workspaceForm(w: ChapterWorkspace): WritingForm {
    const context = w.context;
    let instrument: unknown;
    let previousInstrument: unknown;
    try {
        instrument = JSON.parse(context._researchInstrument || 'null');
    }
    catch {
        instrument = null;
    }
    try {
        previousInstrument = JSON.parse(context._researchInstrumentPrevious || 'null');
    }
    catch {
        previousInstrument = null;
    }
    const form: WritingForm = { title: w.topic, progress: {}, chapters: { [w.chapterKey]: Object.fromEntries(Object.entries(w.sections).map(([id, s]) => [id, s.content])), appendices: { tools: context._toolsAppendix || '' }, _researchInstrument: instrument, _researchInstrumentPrevious: previousInstrument, _studyContext: context, _sourcesLibrary: w.sources, _objectiveCount: context.objectiveCount === '2' ? 2 : 3, _sectionReviews: {} } };
    for (const [id, section] of Object.entries(w.sections))
        if (section.status === 'reviewed')
            form.chapters._sectionReviews[`${w.chapterKey}.${id}`] = reviewFingerprint(section.content, w.topic, form.chapters);
    return form;
}
