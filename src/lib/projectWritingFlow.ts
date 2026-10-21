import { proposalStructure, reportStructure } from '@/data/uhpabGuidelines';
import { newChapterWorkspace, plainChapterText, citedWorkspaceSources, type ChapterWorkspace, type ChapterSource } from './chapterWorkspace';

type Chapters = Record<string, unknown> & {
  _studyContext?: Record<string, string>; _sectionReviews?: Record<string, string>;
  _objectiveCount?: number; _sourcesLibrary?: ChapterSource[];
};
const sectionData = (chapters: Chapters, key: string): Record<string, string> =>
  chapters[key] && typeof chapters[key] === 'object' && !Array.isArray(chapters[key]) ? chapters[key] as Record<string, string> : {};
export type WritingForm = { title: string; chapters: Chapters; progress: Record<string, number> };
export const objectiveSignature = (data: WritingForm) => JSON.stringify([data.title, sectionData(data.chapters, 'chapter1').specificObjectives || '', data.chapters._objectiveCount === 2 ? 2 : 3]);

export function updateProjectStudyWorkspace(data: WritingForm, next: ChapterWorkspace): WritingForm {
  const chapters = { ...data.chapters, _studyContext: { ...next.context }, _objectiveCount: next.context.objectiveCount === '2' ? 2 : 3, _sourcesLibrary: next.sources };
  const result = { ...data, chapters };
  if (next.context.objectives?.trim() && next.context.objectives !== data.chapters._studyContext?.objectives) {
    chapters._studyContext._confirmedObjectivesFor = objectiveSignature(result);
  }
  return result;
}
export const writingSections = (type: 'proposal' | 'report', section: string) => {
  const structure = type === 'report' ? reportStructure : proposalStructure;
  const data = structure[section];
  return (data?.sections ? Object.entries(data.sections) : data ? [['content', data]] : []).filter(([id]) => id !== 'researchObjectives');
};
export const reviewFingerprint = (content: string, title: string, chapters: Chapters) => JSON.stringify([content, title, chapters._studyContext || {}, sectionData(chapters, 'chapter1').specificObjectives || '', chapters._objectiveCount || 3, chapters._sourcesLibrary || []]);
export const sectionReviewed = (data: WritingForm, section: string, id: string, content = sectionData(data.chapters, section)[id] || '') =>
  Boolean(plainChapterText(content) && data.chapters._sectionReviews?.[`${section}.${id}`] === reviewFingerprint(content, data.title, data.chapters));

export function mergeActiveWriting(data: WritingForm, type: 'proposal' | 'report', section: string, id: string, content: string | undefined, reviewed: boolean, resume = { section, component: id }): WritingForm {
  const chapters: Chapters = { ...data.chapters, [section]: { ...sectionData(data.chapters, section), ...(content === undefined ? {} : { [id]: content }) }, _activeWritingStep: resume,
    _sectionReviews: { ...data.chapters._sectionReviews } };
  const value = content ?? sectionData(chapters, section)[id] ?? '';
  if (reviewed && plainChapterText(value)) chapters._sectionReviews[`${section}.${id}`] = reviewFingerprint(value, data.title, chapters);
  else delete chapters._sectionReviews[`${section}.${id}`];
  const result = { ...data, chapters, progress: { ...data.progress } };
  const workspace = projectChapterWorkspace(result, type, section);
  if (workspace) {
    const existing = sectionData(chapters, 'references');
    const references = citedWorkspaceSources(workspace, value).map(source => source.apaReference).filter(reference => reference && !(existing.content || '').includes(reference));
    if (references.length) chapters.references = { ...existing, content: [existing.content || '', ...references].filter(Boolean).join('\n\n') };
  }
  return recalculateWritingProgress(result, type);
}

export function recalculateWritingProgress(data: WritingForm, type: 'proposal' | 'report'): WritingForm {
  const result = { ...data, progress: { ...data.progress } };
  for (const key of Object.keys(type === 'report' ? reportStructure : proposalStructure)) {
    const fields = writingSections(type, key);
    result.progress[key] = fields.length ? Math.round(fields.filter(([field]) => sectionReviewed(result, key, String(field))).length / fields.length * 100) : 0;
  }
  return result;
}

export function projectChapterWorkspace(data: WritingForm, type: 'proposal' | 'report', section: string, userId = 'draft'): ChapterWorkspace | null {
  if (!['chapter1', 'chapter2', 'chapter3'].includes(section)) return null;
  const ids = writingSections(type, section).map(([id]) => String(id));
  const w = newChapterWorkspace(userId, type, section as ChapterWorkspace['chapterKey'], data.title || 'Untitled study', ids);
  const objectives = sectionData(data.chapters, 'chapter1').specificObjectives || '';
  const context = { ...data.chapters._studyContext, objectiveCount: String(data.chapters._objectiveCount === 2 ? 2 : 3) } as Record<string, string>;
  // A changed manuscript objective must not leave an older confirmed copy active.
  if (objectives) {
    context._manuscriptObjectives = objectives;
    if (sectionReviewed(data, 'chapter1', 'specificObjectives', objectives)) context.objectives = objectives;
    else if (context._confirmedObjectivesFor !== objectiveSignature(data)) delete context.objectives;
  }
  return { ...w, id: `project-${userId}-${section}`, context,
    sections: Object.fromEntries(ids.map(id => [id, { content: sectionData(data.chapters, section)[id] || '', status: sectionReviewed(data, section, id) ? 'reviewed' : 'drafting' }])),
    sources: Array.isArray(data.chapters._sourcesLibrary) ? data.chapters._sourcesLibrary.map(s => ({ ...s, notes: s.notes || '', intendedUse: ids.includes(s.intendedUse) ? s.intendedUse : '' })) : [] };
}
