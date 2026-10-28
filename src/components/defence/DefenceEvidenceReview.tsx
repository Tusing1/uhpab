import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Check, ChevronDown, ChevronUp, ExternalLink, Loader2, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { auditDefenceEvidence, applyDefenceEvidence, type DefenceEvidence } from '@/lib/defenceEvidence';
import { retrieveDefenceEvidence } from '@/lib/defenceSourceLookup';
import { researchRetryAt } from '@/lib/researchServiceError';
import type { DefenceFactKey, DefenceFacts, DefenceSlide } from '@/lib/defenceSlides';

type Props = { facts: DefenceFacts; records: DefenceEvidence[]; slides?: DefenceSlide[]; onChange: (facts: DefenceFacts, records: DefenceEvidence[]) => void; onReview?: (field?: DefenceFactKey, slideIndex?: number) => void };

export function DefenceEvidenceReview({ facts, records, slides, onChange, onReview }: Props) {
  const [open, setOpen] = useState(false), [link, setLink] = useState(''), [busy, setBusy] = useState(false);
  const [results, setResults] = useState<DefenceEvidence[]>([]), [message, setMessage] = useState('');
  const [pendingSource, setPendingSource] = useState<DefenceEvidence | null>(null);
  const [retryAt, setRetryAt] = useState(0), [clock, setClock] = useState(Date.now());
  const controller = useRef<AbortController | null>(null);
  const audit = useMemo(() => auditDefenceEvidence(facts, records, slides), [facts, records, slides]);
  const retrySeconds = Math.max(0, Math.ceil((retryAt - clock) / 1000));
  useEffect(() => () => { controller.current?.abort(); }, []);
  useEffect(() => { controller.current?.abort(); controller.current = null; setResults([]); setPendingSource(null); setMessage(''); setBusy(false); }, [facts.topic.value]);
  useEffect(() => {
    if (retryAt <= Date.now()) return;
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [retryAt]);
  const lookup = async () => {
    if (controller.current || Date.now() < retryAt) return;
    const request = new AbortController(); controller.current = request;
    setBusy(true); setMessage(''); setResults([]);
    const notice = toast.loading('Looking up published sources');
    try {
      const sources = await retrieveDefenceEvidence(facts.topic.value, link, { signal: request.signal });
      if (controller.current !== request || request.signal.aborted) return;
      setResults(sources);
      setMessage(sources.length ? `${sources.length} source drafts retrieved. Check the findings and metadata before using them.` : 'No source was retrieved with a matching provider annotation. Try a public source link; no references were added.');
      toast[sources.length ? 'success' : 'info'](sources.length ? 'Sources ready to review' : 'No source retrieved', { id: notice });
    } catch (error) {
      if (request.signal.aborted || controller.current !== request) { toast.dismiss(notice); return; }
      const nextRetry = researchRetryAt(error); if (nextRetry) { setClock(Date.now()); setRetryAt(nextRetry); }
      const detail = error instanceof Error ? error.message : 'Source lookup failed. Your writing and references are unchanged.';
      setMessage(detail); toast.error('Sources could not be retrieved', { id: notice, description: detail });
    } finally { if (controller.current === request) { controller.current = null; setBusy(false); } }
  };
  const applySource = (source: DefenceEvidence) => {
    try {
      const next = applyDefenceEvidence(facts, records, source); onChange(next.facts, next.evidence);
      setResults(current => current.filter(item => item.id !== source.id));
      setPendingSource(null);
      toast.success('Source and reference updated', { description: 'Your writing is unchanged. Review the affected citation links below.' });
    } catch (error) { toast.error(error instanceof Error ? error.message : 'The source could not be added.'); }
  };
  return <section aria-label="Evidence and citations" className="min-w-0 border-y py-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="flex items-center gap-2 text-base font-semibold"><BookOpen size={18} />Evidence and citations</h2><p className="mt-1 text-sm text-muted-foreground">References: {audit.referenceCount} | Retrieved sources: {audit.evidence.length} | Review items: {audit.issues.length}</p></div>
      <Button type="button" variant="outline" aria-expanded={open} className="gap-2" onClick={() => setOpen(value => !value)}>{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}{open ? 'Close source review' : 'Review sources'}</Button>
    </div>
    {open && <div className="mt-5 min-w-0 space-y-6">
      <p className="border-l-4 border-amber-500 bg-amber-50 p-3 text-sm leading-6 text-amber-950">A citation match is not proof of factual support. Retrieved findings are model summaries; check the original source, population and geographical scope. This review does not detect every unsupported claim.</p>
      <div className="space-y-3"><Label htmlFor="defence-source-link">Public source URL (optional)</Label><div className="flex flex-wrap gap-2"><Input id="defence-source-link" type="url" className="min-w-0 flex-1 basis-64" value={link} onChange={event => setLink(event.target.value)} placeholder="https://..." disabled={busy} /><Button type="button" className="gap-2" disabled={busy || retrySeconds > 0 || !facts.topic.value.trim()} onClick={lookup}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}{busy ? 'Looking up sources...' : 'Find sources'}</Button>{busy && <Button type="button" variant="ghost" size="icon" title="Stop source lookup" aria-label="Stop source lookup" onClick={() => controller.current?.abort()}><X size={16} /></Button>}</div>
        {retrySeconds > 0 && <p role="status" className="text-sm text-amber-900">Retry available in {retrySeconds} seconds. Your references are unchanged.</p>}
        {message && <p role="status" className="break-words text-sm leading-6">{message}</p>}
      </div>
      {results.length > 0 && <section><h3 className="font-semibold">Source drafts to review</h3><div className="divide-y">{results.map(source => <article key={source.id} className="min-w-0 space-y-2 py-4"><h4 className="break-words text-sm font-semibold">{source.title}</h4><p className="break-words text-sm leading-6">{source.apaReference}</p><p className="whitespace-pre-wrap break-words text-sm leading-6">{source.notes}</p><div className="flex flex-wrap gap-3"><a className="inline-flex items-center gap-2 text-sm font-medium text-primary underline" href={source.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} />Open original source</a><Button type="button" size="sm" variant="outline" className="gap-2" onClick={() => setPendingSource(source)}><Check size={14} />Use source and reference</Button></div></article>)}</div></section>}
      <section><h3 className="font-semibold">Review items</h3>{!audit.issues.length ? <p className="mt-2 text-sm leading-6">No author-year mismatches or unsupported percentages were detected in these fields. This is not an academic approval.</p> : <ul className="mt-3 divide-y">{audit.issues.map((issue, index) => <li key={`${issue.code}-${index}`} className="min-w-0 space-y-2 py-3"><p className="text-xs font-semibold uppercase text-muted-foreground">{issue.section}</p><p className="text-sm leading-6">{issue.detail}</p><blockquote className="whitespace-pre-wrap break-words border-l-2 pl-3 text-sm leading-6 text-muted-foreground">{issue.excerpt}</blockquote>{onReview && <Button type="button" size="sm" variant="outline" onClick={() => onReview(issue.field, issue.slideIndex)}>Review wording</Button>}</li>)}</ul>}</section>
      {audit.citations.length > 0 && <section><h3 className="font-semibold">Citation links</h3><ul className="mt-3 divide-y">{audit.citations.map((item, index) => <li key={`${item.section}-${index}`} className="space-y-1 py-3 text-sm leading-6"><p className="font-medium">{item.citation.text} · {item.section}</p><p>{item.references.length === 1 ? 'Reference matched' : 'Reference needs review'} · {item.sources.length ? 'Source retrieved; check claim support' : 'Source not retrieved'}</p></li>)}</ul></section>}
      {audit.evidence.length > 0 && <section><h3 className="font-semibold">Saved source findings</h3><div className="divide-y">{audit.evidence.map(source => <article key={source.id} className="min-w-0 space-y-2 py-4"><h4 className="break-words text-sm font-semibold">{source.citationText} · {source.title}</h4><p className="text-xs text-muted-foreground">Retrieved {new Date(source.retrievedAt).toLocaleString()}</p><p className="whitespace-pre-wrap break-words text-sm leading-6">{source.notes}</p><div className="flex flex-wrap gap-3"><a className="inline-flex items-center gap-2 text-sm font-medium text-primary underline" href={source.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} />Open original source</a><Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => { setLink(source.url); setResults([]); }}>Look up this source again</Button></div></article>)}</div></section>}
    </div>}
    <Dialog open={Boolean(pendingSource)} onOpenChange={value => { if (!value) setPendingSource(null); }}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto"><DialogHeader><DialogTitle>Update this source and reference?</DialogTitle></DialogHeader>
        <p className="text-sm leading-6">The source record and bibliography entry will be updated. Accepted paragraphs, slide points and speaker notes will stay unchanged. Check the affected citations afterwards.</p>
        <p className="break-words border-y py-4 text-sm leading-6">{pendingSource?.apaReference}</p>
        <div className="flex flex-wrap justify-end gap-3"><Button type="button" variant="outline" onClick={() => setPendingSource(null)}>Keep current sources</Button><Button type="button" onClick={() => { if (pendingSource) applySource(pendingSource); }}>Update source and reference</Button></div>
      </DialogContent>
    </Dialog>
  </section>;
}
