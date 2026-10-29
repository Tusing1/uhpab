export type DocumentSection = { sectionTitle: string; chapter: string };

const sections: Record<string, DocumentSection> = {
  preliminary: { sectionTitle: 'preliminary', chapter: 'Preliminary pages' },
  introduction: { sectionTitle: 'introduction', chapter: 'Chapter One' },
  literature: { sectionTitle: 'literature', chapter: 'Chapter Two' },
  methodology: { sectionTitle: 'methodology', chapter: 'Chapter Three' },
  results: { sectionTitle: 'results', chapter: 'Results / Findings' },
  discussion: { sectionTitle: 'discussion', chapter: 'Discussion / Conclusion / Recommendations' },
  references: { sectionTitle: 'references', chapter: 'References' },
  appendices: { sectionTitle: 'appendices', chapter: 'Appendices' },
  unknown: { sectionTitle: 'unknown', chapter: 'Unknown section' },
};
const chapterKeys: Record<string, string> = { one: 'introduction', '1': 'introduction', two: 'literature', '2': 'literature', three: 'methodology', '3': 'methodology', four: 'results', '4': 'results', five: 'discussion', '5': 'discussion' };
const sectionOrder: Record<string, number> = { unknown: 0, preliminary: 1, introduction: 2, literature: 3, methodology: 4, results: 5, discussion: 6, references: 7, appendices: 8 };

// Only recognise standalone headings, not mentions inside ordinary paragraphs.
export function headingSection(line: string): DocumentSection | null {
  const heading = line.trim();
  if (!heading || heading.length > 150 || /\.{3,}|\t\s*\d+\s*$|\s{3,}\d+\s*$/.test(heading)) return null;
  const chapter = heading.match(/^chapter\s+(one|two|three|four|five|[1-5])(?:\s*[:.-]\s*[a-z][a-z ,/&-]*|\s+(?:introduction|literature review|methodology|results|findings|discussion))?\s*\.?$/i);
  if (chapter) return sections[chapterKeys[chapter[1].toLowerCase()]];
  if (/^(?:table of contents|list of tables|list of figures|abstract|abbreviations|acronyms|title page)$/i.test(heading)) return sections.preliminary;
  if (/^(?:references|bibliography)\s*:?$/i.test(heading)) return sections.references;
  if (/^appendi(?:x|ces)(?:\s+[a-z0-9]+)?\s*:?$/i.test(heading)) return sections.appendices;
  const numbered = heading.match(/^([1-5])(?:\.\d+)+[.)]?\s+([a-z][a-z /&-]{1,100})\s*:?$/i);
  if (numbered) return sections[chapterKeys[numbered[1]]];
  if (/^(?:literature review|review of literature)$/i.test(heading)) return sections.literature;
  if (/^(?:methodology|research methodology)$/i.test(heading)) return sections.methodology;
  if (/^(?:results|findings|results and findings)$/i.test(heading)) return sections.results;
  if (/^(?:discussion|discussion and conclusion|conclusion and recommendations)$/i.test(heading)) return sections.discussion;
  return null;
}

export function detectDocumentSection(text: string, previous?: DocumentSection): DocumentSection {
  const line = text.split(/\r?\n/, 1)[0];
  const heading = headingSection(line);
  if (heading && previous && sectionOrder[heading.sectionTitle] < sectionOrder[previous.sectionTitle] && !/^\s*chapter\b/i.test(line)) return previous;
  return heading ?? previous ?? sections.unknown;
}

export function partitionPageLines(lines: string[], pageNumber: number, previous?: DocumentSection) {
  let current = previous ?? sections.unknown;
  let contents: string[] = [];
  const chunks: Array<DocumentSection & { pageNumber: number; text: string }> = [];
  const flush = () => {
    const text = contents.join('\n').trim();
    if (text) chunks.push({ ...current, pageNumber, text });
    contents = [];
  };
  for (const line of lines) {
    const heading = detectDocumentSection(line, current);
    if (heading.sectionTitle !== current.sectionTitle) { flush(); current = heading; }
    contents.push(line);
  }
  flush();
  return { chunks, lastSection: current };
}

export function applyUserSelectedSection<T extends DocumentSection>(chunks: T[], sectionId: string): T[] {
  if (sectionId === 'full' || !sections[sectionId] || chunks.some(chunk => chunk.sectionTitle !== 'unknown')) return chunks;
  return chunks.map(chunk => ({ ...chunk, ...sections[sectionId] }));
}
