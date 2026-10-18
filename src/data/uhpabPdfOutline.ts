import proposalStructure from './proposalStructure';
import reportStructure from './reportStructure';

const outline = (structure: Record<string, { title: string; sections?: Record<string, { title: string }> }>) =>
  Object.values(structure).flatMap(section => [section.title, ...Object.values(section.sections || {}).map(child => child.title)]);

export const proposalOutline = outline(proposalStructure);
export const reportOutline = outline(reportStructure);
