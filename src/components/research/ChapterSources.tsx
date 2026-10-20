import { useState } from 'react';
import { toast } from 'sonner';
import { Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { chapterSections, changeWorkspaceContext, workspaceSources, type ChapterSource, type ChapterWorkspace } from '@/lib/chapterWorkspace';
import { lookupChapterSource } from '@/lib/chapterSourceLookup';

const emptySource = (): ChapterSource => ({ id: crypto.randomUUID(), title: '', authors: '', year: '', citationText: '', apaReference: '', url: '', notes: '', intendedUse: '' });

export default function ChapterSources({ workspace: w, sectionId, disabled, onChange, onInsert }: {
  workspace: ChapterWorkspace; sectionId: string; disabled: boolean;
  onChange: (next: ChapterWorkspace) => void; onInsert: (citation: string) => void;
}) {
  const [source, setSource] = useState(emptySource);
  const [query, setQuery] = useState('');
  const [looking, setLooking] = useState(false);
  const [error, setError] = useState('');
  const blocked = disabled || looking;
  const researchYear = Number(w.context.researchYear) || new Date().getFullYear();
  const lookup = async () => {
    setLooking(true); setError('');
    try {
      setSource({ ...emptySource(), ...await lookupChapterSource(query) });
      toast.info('Source draft ready. Check it and add a finding you have read before saving.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Lookup failed. You can add the source manually.'); }
    finally { setLooking(false); }
  };
  return <details className="chapter-details">
    <summary className="cursor-pointer text-sm font-medium">Sources and supporting evidence · {workspaceSources(w, sectionId).length}</summary>
    <div className="mt-4 space-y-4">
      <label className="block space-y-1 text-sm">Research year (for source-age warnings)
        <Input type="number" min="1900" max="2100" value={w.context.researchYear || ''} placeholder="Research year" disabled={blocked}
          onChange={e => onChange(changeWorkspaceContext(w, { context: { ...w.context, researchYear: e.target.value } }))} />
      </label>
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-0 flex-1 space-y-1 text-sm">Find source details
          <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="DOI, specific article title or webpage URL" disabled={blocked} />
        </label>
        <Button variant="outline" onClick={lookup} disabled={blocked || !query.trim()}><Search size={16} className="mr-2" />{looking ? 'Looking up...' : 'Lookup'}</Button>
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {w.sources.map(s => <article key={s.id} className="border-b pb-3 text-sm">
        <p className="break-words font-medium">{s.title || s.apaReference}</p>
        <p className="mt-1 break-words text-xs text-muted-foreground">{s.citationText} · {s.intendedUse || 'All sections'}</p>
        {/^\d{4}$/.test(s.year) && researchYear - Number(s.year) > 10 && !s.acceptedOld && <p className="mt-1 text-xs text-amber-700">Over 10 years old for this research year. Confirm its suitability.</p>}
        <div className="mt-2 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={blocked} onClick={() => onInsert(s.citationText)}>Insert citation</Button>
          <Button size="sm" variant="ghost" disabled={blocked} onClick={() => setSource(s)}>Edit source</Button>
          <Button size="icon" variant="ghost" title="Remove source" aria-label={`Remove source ${s.title}`} disabled={blocked}
            onClick={() => { onChange(changeWorkspaceContext(w, { sources: w.sources.filter(item => item.id !== s.id) })); if (source.id === s.id) setSource(emptySource()); }}><Trash2 size={14} /></Button>
        </div>
      </article>)}
      <div className="grid gap-3 sm:grid-cols-2">
        {(['title', 'authors', 'year', 'citationText', 'url'] as const).map(key => <label key={key} className="space-y-1 text-sm">
          {{ title: 'Source title', authors: 'Author / organization', year: 'Publication year', citationText: 'Citation, e.g. (WHO, 2021)', url: 'DOI URL or webpage' }[key]}
          <Input disabled={blocked} value={source[key]} onChange={e => setSource({ ...source, [key]: e.target.value })} />
        </label>)}
        <label className="space-y-1 text-sm">Applies to
          <select className="h-11 w-full rounded-md border bg-background px-3 text-sm" disabled={blocked} value={source.intendedUse} onChange={e => setSource({ ...source, intendedUse: e.target.value })}>
            <option value="">All selected sections</option>
            {chapterSections(w.documentType, w.chapterKey).filter(([key]) => w.selectedSectionIds.includes(key)).map(([key, s]) => <option key={key} value={key}>{s.title}</option>)}
          </select>
        </label>
      </div>
      <label className="block space-y-1 text-sm">Full APA reference<Textarea disabled={blocked} value={source.apaReference} onChange={e => setSource({ ...source, apaReference: e.target.value })} /></label>
      <label className="block space-y-1 text-sm">Supporting finding / evidence note
        <Textarea disabled={blocked} value={source.notes} onChange={e => setSource({ ...source, notes: e.target.value })} placeholder="Finding, population, setting and page/section. Record only what you read." />
      </label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={blocked} checked={!!source.acceptedOld} onChange={e => setSource({ ...source, acceptedOld: e.target.checked })} />Accepted classic, legal or guideline source</label>
      <Button variant="outline" disabled={blocked || !source.citationText.trim() || !source.apaReference.trim() || !source.notes.trim() || /\[\[/.test(source.apaReference)}
        onClick={() => { onChange(changeWorkspaceContext(w, { sources: [...w.sources.filter(s => s.id !== source.id), source] })); setSource(emptySource()); }}>Save source</Button>
    </div>
  </details>;
}
