export type ResearchCitation = { key: string; author: string; year: string; text: string };
export type ResearchReference = { text: string; key?: string };

const yearPattern = '(?:(?:19|20)\\d{2}[a-z]?|n\\.\\s*d\\.)';
const aliases: Record<string, string> = {
  who: 'worldhealthorganization', worldhealthorganisation: 'worldhealthorganization',
  unicef: 'unitednationschildrensfund',
  iarc: 'internationalagencyforresearchoncancer',
};
const authorKey = (author: string) => {
  const first = author.replace(/\s*\[[^\]]+\]/g, '').split(/\s+(?:et\s+al\.?|and)\b|\s*&\s*|,/i)[0];
  const key = first.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '');
  return aliases[key] || key;
};
export const researchCitationKey = (author: string, year: string) => `${authorKey(author)}:${year.toLowerCase().replace(/\s+/g, '')}`;

/** APA author-year matching, not a check of source existence or factual support. */
export function extractResearchCitations(text: string): ResearchCitation[] {
  const found = new Map<string, ResearchCitation>();
  const add = (author: string, year: string, raw: string) => {
    if (!/[A-Za-z]/.test(author) || /^(?:p{1,2}\.?|n|age|aged|between|from|in|since|during|period|year)$/i.test(author.trim())) return;
    const key = researchCitationKey(author.trim(), year);
    if (!found.has(key)) found.set(key, { key, author: author.trim(), year, text: raw });
  };
  for (const group of text.matchAll(/\(([^()]+)\)/g)) {
    for (const part of group[1].split(';')) {
      const match = part.trim().match(new RegExp(`^([A-Za-z][^;]*?),\\s*(${yearPattern})(?=\\b|,|$)`, 'i'));
      if (!match) continue;
      add(match[1], match[2], group[0]);
      const rest = part.slice(part.indexOf(match[2]) + match[2].length);
      for (const extra of rest.matchAll(new RegExp(`,\\s*(${yearPattern})(?=\\b|,|$)`, 'gi'))) add(match[1], extra[1], group[0]);
    }
  }
  const narrative = new RegExp(`\\b([A-Z][A-Za-z'\u2019-]*(?:\\s+(?:et\\s+al\\.?|and|&|of|the|for|on|[A-Z][A-Za-z'\u2019-]*)){0,10})(?:\\s*\\[[A-Z]+\\])?\\s*\\((${yearPattern})\\)`, 'g');
  for (const match of text.matchAll(narrative)) add(match[1].replace(/^(?:According to|As reported by|As|The)\s+/i, ''), match[2], match[0]);
  return [...found.values()];
}

/** Keep wrapped entries together; never match an author in one entry to a year in another. */
export function parseResearchReferences(text: string): ResearchReference[] {
  const entries: string[] = [];
  for (const paragraph of text.replace(/\r/g, '').split(/\n\s*\n/)) {
    let current = '';
    for (const line of paragraph.split('\n').map(line => line.trim()).filter(Boolean)) {
      if (/^(?:references|bibliography)$/i.test(line)) continue;
      const startsEntry = new RegExp(`^[^()]{2,300}\\((${yearPattern})\\)\\s*\\.`, 'i').test(line);
      if (startsEntry && current) { entries.push(current); current = ''; }
      current += `${current ? ' ' : ''}${line}`;
    }
    if (current) entries.push(current);
  }
  return entries.map(entry => {
    const match = entry.match(new RegExp(`^([^()]{2,300})\\((${yearPattern})\\)\\s*\\.`, 'i'));
    return { text: entry, ...(match ? { key: researchCitationKey(match[1].trim().replace(/\.$/, ''), match[2]) } : {}) };
  });
}
