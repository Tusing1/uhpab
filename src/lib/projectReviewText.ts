import { proposalStructure, reportStructure } from '@/data/uhpabGuidelines';
import { stripHtmlWithBreaks } from './uhpabWritingEngine';
import type { Project } from '@/types';

const asObject = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const savedText = (value: unknown) => typeof value === 'string' ? stripHtmlWithBreaks(value) : '';

/** Only saved manuscript text is included: no inferred findings, placeholder pages or internal study metadata. */
export function projectReviewText(project: Pick<Project, 'title' | 'type' | 'chapters'>) {
  const structure = project.type === 'report' ? reportStructure : proposalStructure;
  const chapters = asObject(project.chapters);
  const parts: string[] = [];
  const titlePage = asObject(chapters.preliminaryPages);
  const titleContent = savedText(titlePage.titlePage);
  if (project.title.trim() || titleContent) parts.push(['TITLE PAGE', project.title.trim(), titleContent].filter(Boolean).join('\n'));
  for (const [groupId, group] of Object.entries(structure)) {
    const values = asObject(chapters[groupId]);
    if (group.sections) {
      const sections = Object.entries(group.sections).flatMap(([id, section]) => {
        if (groupId === 'preliminaryPages' && id === 'titlePage') return [];
        const text = savedText(values[id]);
        return text ? [`${section.title}\n${text}`] : [];
      });
      if (sections.length) parts.push([group.title, ...sections].join('\n\n'));
    } else if (groupId === 'references') {
      const content = savedText(values.content);
      const entries = Array.isArray(values.items) ? values.items.map(item => savedText(asObject(item).reference)).filter(Boolean) : [];
      const unique = entries.filter(entry => !content.includes(entry));
      if (content || unique.length) parts.push([group.title, content, ...unique].filter(Boolean).join('\n\n'));
    } else {
      const content = savedText(values.content);
      if (content) parts.push(`${group.title}\n${content}`);
    }
  }
  return parts.join('\n\n');
}

export function isMatchingProposalSource(project: Project, userId: string | undefined, text: string) {
  return Boolean(userId && project.userId === userId && project.type === 'proposal' && text === projectReviewText(project));
}
