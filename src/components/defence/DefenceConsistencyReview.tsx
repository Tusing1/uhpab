import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, ChevronDown, ChevronUp, FileDiff, Loader2, RotateCcw, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DEFENCE_FACT_FIELDS, extractTextDefenceFacts, type DefenceDeck } from '@/lib/defenceSlides';
import { captureDefenceSource, changedDefenceSourceFields, previewDefenceSlideUpdate, readDefenceSourceSnapshot, reviewDefenceConsistency, type DefenceSourceSnapshot } from '@/lib/defenceConsistency';

type Props = { deck: DefenceDeck; latest: DefenceSourceSnapshot | null; sourceUnavailable: boolean; open: boolean; onOpenChange: (open: boolean) => void; onApply: (next: DefenceDeck) => void; onEdit: (index: number) => void; canUndo: boolean; onUndo: () => void };
const label = (key: string) => DEFENCE_FACT_FIELDS.find(field => field.key === key)?.label || key;

export function DefenceConsistencyReview({ deck, latest, sourceUnavailable, open, onOpenChange, onApply, onEdit, canUndo, onUndo }: Props) {
  const [view, setView] = useState('slides'), [selected, setSelected] = useState<number[]>([]);
  const [revision, setRevision] = useState<DefenceSourceSnapshot | null>(null), [preview, setPreview] = useState<DefenceDeck | null>(null);
  const [paste, setPaste] = useState(''), [reading, setReading] = useState(false), [error, setError] = useState('');
  const requestId = useRef(0);
  useEffect(() => () => { requestId.current++; }, []);
  useEffect(() => { if (open && latest && latest.sourceVersion !== deck.sourceVersion) { setView('revision'); setSelected([]); } }, [open, latest, deck.sourceVersion]);
  const findings = useMemo(() => reviewDefenceConsistency(deck), [deck]);
  const original = readDefenceSourceSnapshot(deck.sourceSnapshot);
  const candidate = revision || latest || readDefenceSourceSnapshot(deck.comparisonSource);
  const allChanges = candidate ? changedDefenceSourceFields(deck, candidate) : [];
  const changes = allChanges.filter(key => candidate?.facts[key].status !== 'missing' && candidate?.facts[key].value.trim());
  const missingInRevision = allChanges.filter(key => !changes.includes(key));
  const affected = view === 'slides' ? [...new Set(findings.map(item => item.slideIndex))] : deck.slides.flatMap((slide, index) => slide.sourceKeys.some(key => changes.includes(key) && candidate?.facts[key].status !== 'missing' && candidate?.facts[key].value.trim()) ? [index] : []);
  const originalChanges = original ? changedDefenceSourceFields(deck, original) : [];
  const previewToken = useRef('');
  const preparePreview = () => {
    try {
      const next = previewDefenceSlideUpdate(deck, selected, view === 'revision' ? candidate || undefined : undefined);
      previewToken.current = JSON.stringify({ deck, source: view === 'revision' ? candidate : null }); setPreview(next); setError('');
    } catch (error) { setError(error instanceof Error ? error.message : 'The update could not be prepared.'); }
  };
  const compareText = async (text: string, name: string, kind: 'upload' | 'handoff') => {
    const id = ++requestId.current; setReading(true); setError('');
    try {
      if (text.trim().split(/\s+/).length < 30 || text.length > 100000) throw new Error('Use a proposal extract with at least 30 words and no more than 100,000 characters.');
      if (/^\s*chapter\s+(?:four|4)\s*[:.-]?\s*(?:results(?:\s+and\s+findings)?)?\s*$/im.test(text)) throw new Error('This extract contains a report results chapter. Compare the proposal version, not a completed report.');
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      const version = `text-sha256:${Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')}`;
      const snapshot = captureDefenceSource(extractTextDefenceFacts(text, name), { name, kind, sourceVersion: version });
      if (id !== requestId.current) return;
      setRevision(snapshot); setView('revision'); setSelected([]); setPreview(null);
      toast.success('Proposal revision ready to compare', { description: 'No study details or slides have been changed.' });
    } catch (error) { if (id === requestId.current) setError(error instanceof Error ? error.message : 'The revised proposal could not be read.'); }
    finally { if (id === requestId.current) setReading(false); }
  };
  const readFile = async (file?: File) => {
    if (!file) return;
    const id = ++requestId.current; setReading(true); setError('');
    try {
      if (!/\.(pdf|docx|txt)$/i.test(file.name) || file.size > 25 * 1024 * 1024) throw new Error('Choose a PDF, DOCX or TXT proposal up to 25 MB.');
      const { extractDocumentText } = await import('@/lib/documentTextExtraction');
      const result = await extractDocumentText(file);
      if (id !== requestId.current) return;
      if ((result.pageCount || 0) > 100) throw new Error('Choose a proposal with no more than 100 pages.');
      await compareText(result.text, file.name, 'upload');
    } catch (error) { if (id === requestId.current) { setError(error instanceof Error ? error.message : 'The proposal could not be read.'); setReading(false); } }
  };
  const apply = () => {
    if (!preview) return;
    if (previewToken.current !== JSON.stringify({ deck, source: view === 'revision' ? candidate : null })) { setPreview(null); setError('The presentation or compared proposal changed after this preview. Preview the update again so newer edits are not overwritten.'); return; }
    onApply(preview); setPreview(null); setSelected([]);
    toast.success('Selected slides updated', { description: 'Other slides and speaker notes were kept. Review retained notes after source changes. Undo is available until the next edit.' });
  };
  return <section aria-label="Proposal consistency" className="min-w-0 border-y py-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 font-semibold"><FileDiff size={18} />Proposal consistency</h2><p className="mt-1 text-sm text-muted-foreground">Slide review items: {findings.length}{candidate ? ` | Different source fields: ${changes.length}` : ''}</p></div><Button type="button" variant="outline" className="gap-2" aria-expanded={open} onClick={() => onOpenChange(!open)}>{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}{open ? 'Close comparison' : 'Compare with proposal'}</Button></div>
    {open && <div className="mt-5 min-w-0 space-y-5">
      <p className="border-l-4 border-sky-500 bg-sky-50 p-3 text-sm leading-6 text-sky-950">{original ? `Original input: ${original.name}. Captured ${new Date(original.capturedAt).toLocaleString()}.` : 'This older presentation has no original import snapshot. Its reviewed study fields remain available for comparison.'} Wording checks need supervisor review; they do not prove academic accuracy.</p>
      {sourceUnavailable && <p className="text-sm leading-6 text-amber-900">The linked proposal is currently unavailable. Saved fields have been kept; no original proposal has been reconstructed.</p>}
      <Tabs value={view} onValueChange={value => { setView(value); setSelected([]); setError(''); }}><TabsList className="h-auto flex-wrap"><TabsTrigger value="slides">Slide wording</TabsTrigger><TabsTrigger value="revision">Proposal revision</TabsTrigger></TabsList></Tabs>
      {error && <p role="alert" className="break-words border-l-4 border-red-500 bg-red-50 p-3 text-sm leading-6 text-red-950">{error}</p>}
      {view === 'slides' ? <div className="space-y-4">
        {!findings.length && <p className="text-sm leading-6">No differences requiring review were detected in the supported wording checks. This is not proof that every paraphrase preserves the source meaning.</p>}
        {findings.map((item, index) => <section key={`${item.code}-${index}`} className="min-w-0 space-y-3 border-b pb-5"><div><p className="text-xs text-muted-foreground">Slide {item.slideIndex + 1} / {label(item.field)}</p><h3 className="mt-1 text-sm font-semibold">{item.title}</h3><p className="mt-1 text-sm leading-6">{item.detail}</p></div><div className="grid min-w-0 gap-4 md:grid-cols-2"><div><h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Reviewed source</h4><p className="whitespace-pre-wrap break-words text-sm leading-6">{item.sourceText || 'Not supplied'}</p><p className="mt-2 break-words text-xs text-muted-foreground">{deck.facts[item.field].source || 'No source anchor'}</p></div><div><h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Slide wording</h4><p className="whitespace-pre-wrap break-words text-sm leading-6">{item.slideText}</p></div></div><Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => onEdit(item.slideIndex)}>Edit slide {item.slideIndex + 1}<ArrowRight size={14} /></Button></section>)}
      </div> : <div className="space-y-5">
        {candidate ? <><div><h3 className="font-semibold">{candidate.name}</h3><p className="mt-1 break-words text-xs text-muted-foreground">Revision: {candidate.sourceVersion || candidate.capturedAt}</p></div>{!changes.length ? <p className="text-sm">The compared proposal fields match the reviewed study details.</p> : <div className="divide-y">{changes.map(key => <section key={key} className="min-w-0 py-4"><h3 className="mb-3 text-sm font-semibold">{label(key)}</h3><div className="grid min-w-0 gap-4 md:grid-cols-2"><div><p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Current study detail</p><p className="whitespace-pre-wrap break-words text-sm leading-6">{deck.facts[key].value || 'Not supplied'}</p></div><div><p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Compared proposal</p><p className="whitespace-pre-wrap break-words text-sm leading-6">{candidate.facts[key].value || 'Not found in this revision; current work will be kept.'}</p></div></div></section>)}</div>}</> : <p className="text-sm leading-6">No proposal revision is available. Compare an uploaded or pasted proposal below.</p>}
        {missingInRevision.length > 0 && <details className="border-y py-4"><summary className="cursor-pointer text-sm font-semibold">Not present in this revision ({missingInRevision.length})</summary><p className="mt-3 text-sm leading-6">Current details are kept. These missing fields are not proposed deletions.</p><ul className="mt-3 grid list-disc gap-2 pl-5 text-sm sm:grid-cols-2">{missingInRevision.map(key => <li key={key}>{label(key)}</li>)}</ul></details>}
        <details className="border-y py-4"><summary className="cursor-pointer text-sm font-semibold">Compare another proposal</summary><div className="mt-4 space-y-4"><div className="space-y-2"><Label htmlFor="defence-revision-file">Revised PDF, DOCX or TXT</Label><Input id="defence-revision-file" type="file" accept=".pdf,.docx,.txt" className="h-auto py-3" disabled={reading} onChange={event => readFile(event.target.files?.[0])} /></div><div className="space-y-2"><Label htmlFor="defence-revision-text">Or paste the revised proposal</Label><Textarea id="defence-revision-text" rows={8} value={paste} onChange={event => setPaste(event.target.value)} disabled={reading} /></div><Button type="button" variant="outline" className="gap-2" disabled={reading || !paste.trim()} onClick={() => compareText(paste, 'Pasted proposal revision', 'handoff')}>{reading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}{reading ? 'Reading revision...' : 'Compare pasted proposal'}</Button></div></details>
      </div>}
      {affected.length > 0 && <section className="space-y-4 border-y py-4"><h3 className="text-sm font-semibold">Choose slides to update</h3><p className="text-sm leading-6 text-muted-foreground">Selected slide points will be replaced after preview. Custom speaker notes and other slides stay unchanged. Missing revision fields do not erase current work.</p><div className="grid gap-3 sm:grid-cols-2">{affected.map(index => <div key={index} className="flex min-w-0 items-start gap-3"><Checkbox id={`compare-slide-${index}`} checked={selected.includes(index)} onCheckedChange={checked => setSelected(current => checked === true ? [...current, index] : current.filter(item => item !== index))} /><Label className="min-w-0 break-words leading-5" htmlFor={`compare-slide-${index}`}>{index + 1}. {deck.slides[index].title}</Label></div>)}</div><Button type="button" className="gap-2" disabled={!selected.length} onClick={preparePreview}><Check size={16} />Preview selected updates</Button></section>}
      {originalChanges.length > 0 && <details className="border-b pb-4"><summary className="cursor-pointer text-sm font-semibold">Changes since original input ({originalChanges.length})</summary><div className="mt-4 space-y-4">{originalChanges.map(key => <div key={key}><h3 className="text-sm font-semibold">{label(key)}</h3><div className="mt-2 grid gap-3 md:grid-cols-2"><p className="whitespace-pre-wrap break-words text-sm leading-6">Original: {original!.facts[key].value || 'Not supplied'}</p><p className="whitespace-pre-wrap break-words text-sm leading-6">Reviewed: {deck.facts[key].value || 'Not supplied'}</p></div></div>)}</div></details>}
      {canUndo && <Button type="button" variant="outline" className="gap-2" onClick={onUndo}><RotateCcw size={16} />Undo comparison update</Button>}
    </div>}
    <Dialog open={Boolean(preview)} onOpenChange={value => { if (!value) setPreview(null); }}><DialogContent className="max-h-[90dvh] max-w-5xl overflow-y-auto"><DialogHeader><DialogTitle>Review selected slide updates</DialogTitle></DialogHeader><p className="text-sm leading-6">Only the selected slides below will change. Their custom notes and text-size choices will be kept. Updating source fields does not approve methods or fabricate missing details.</p>{preview && selected.map(index => <section key={index} className="space-y-3 border-b pb-5"><h3 className="font-semibold">Slide {index + 1}: {deck.slides[index].title}</h3><div className="grid min-w-0 gap-5 md:grid-cols-2"><div><h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Current points</h4><p className="whitespace-pre-wrap break-words text-sm leading-6">{[deck.slides[index].title, ...deck.slides[index].bullets].join('\n')}</p></div><div><h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Proposed points</h4><p className="whitespace-pre-wrap break-words text-sm leading-6">{[preview.slides[index].title, ...preview.slides[index].bullets].join('\n')}</p></div></div></section>)}<div className="sticky -bottom-6 flex flex-wrap justify-end gap-3 border-t bg-background py-4"><Button type="button" variant="outline" onClick={() => setPreview(null)}>Keep current slides</Button><Button type="button" onClick={apply}>Apply selected updates</Button></div></DialogContent></Dialog>
  </section>;
}
