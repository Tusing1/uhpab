import type { ChapterSource } from './chapterWorkspace';

type CrossrefWork = { DOI?: string; title?: string[]; author?: Array<{ given?: string; family?: string }>; published?: { 'date-parts'?: number[][] }; 'container-title'?: string[]; publisher?: string; volume?: string; issue?: string; page?: string };
const words = (text: string) => new Set(text.toLowerCase().match(/[a-z0-9]{3,}/g) || []);
export const strongSourceTitleMatch = (query: string, title: string) => {
  const wanted = words(query); const found = words(title);
  return wanted.size >= 4 && [...wanted].filter(word => found.has(word)).length / wanted.size >= 0.75;
};
export async function lookupChapterSource(query: string, request: typeof fetch = fetch): Promise<Partial<ChapterSource>> {
  const input = query.trim();
  const doi = input.match(/(?:https?:\/\/(?:dx\.)?doi\.org\/)?(10\.\d{4,9}\/\S+)/i)?.[1];
  if (!doi && /^(?:https?:\/\/|(?:www\.)?[a-z0-9-]+\.[a-z]{2,}(?:\/|$))/i.test(input)) {
    const url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('Use a public webpage URL without login details.');
    return { url: url.href, title: url.hostname.replace(/^www\./, ''), authors: '', year: '', citationText: '', apaReference: `[[Author / organization]]. ([[Year or n.d.]]). [[Actual page title]]. ${url.href}`, notes: '' };
  }
  if (!doi && words(input).size < 4) throw new Error('Paste a DOI or a more specific article title. Short searches can match the wrong paper.');
  const endpoint = doi ? `https://api.crossref.org/works/${encodeURIComponent(doi)}` : `https://api.crossref.org/works?rows=1&query.bibliographic=${encodeURIComponent(input)}`;
  const response = await request(endpoint, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error('Source lookup was unavailable. Add the source manually or try again.');
  const result = await response.json();
  const work: CrossrefWork | undefined = doi ? result.message : result.message?.items?.[0];
  const title = work?.title?.[0]?.trim();
  if (!work || !title || (!doi && !strongSourceTitleMatch(input, title))) throw new Error('No close title match found. Use the DOI or add the correct source manually.');
  if (doi && work.DOI?.toLowerCase() !== doi.toLowerCase()) throw new Error('The returned DOI does not match. Check the source manually.');
  const authorList = (work.author || []).filter(a => a.family).map(a => `${a.family}, ${(a.given || '').split(/\s+/).filter(Boolean).map(name => `${name[0]}.`).join(' ')}`);
  const familyNames = (work.author || []).map(a => a.family).filter(Boolean);
  const author = familyNames.length > 2 ? `${familyNames[0]} et al.` : familyNames.join(' & ');
  const year = String(work.published?.['date-parts']?.[0]?.[0] || '');
  const url = work.DOI ? `https://doi.org/${work.DOI}` : '';
  const publication = work['container-title']?.[0] || work.publisher || '';
  return { title, authors: authorList.join(', '), year, url, citationText: author && year ? `(${author}, ${year})` : '',
    apaReference: `${authorList.join(', ') || '[[Author]]'}. (${year || 'n.d.'}). ${title}. ${publication}${work.volume ? `, ${work.volume}` : ''}${work.issue ? `(${work.issue})` : ''}${work.page ? `, ${work.page}` : ''}. ${url}`, notes: '' };
}
