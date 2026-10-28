import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, ChevronRight, Image, Loader2, MessageSquareWarning, RefreshCw, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { WorkspacePage } from '@/components/workspace/WorkspacePage';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useReportProblem } from '@/contexts/feedbackContextValue';
import { FEEDBACK_CATEGORIES, FEEDBACK_STATUSES, feedbackFailure, type FeedbackEvent, type FeedbackReport, type FeedbackStatus } from '@/lib/testerFeedback';
import { deleteMyTesterFeedback, feedbackCloudAvailable, feedbackEvents, feedbackReviewerAccess, feedbackScreenshot, listTesterFeedback, triageTesterFeedback } from '@/lib/testerFeedbackService';
import { cn } from '@/lib/utils';

function ReportDetail({ report, support, onUpdated, onDeleted }: { report: FeedbackReport; support: boolean; onUpdated: () => void; onDeleted: () => void }) {
  const reportProblem = useReportProblem();
  const [status, setStatus] = useState<FeedbackStatus>(report.status);
  const [response, setResponse] = useState(report.response);
  const [note, setNote] = useState('');
  const [events, setEvents] = useState<FeedbackEvent[]>([]);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');
  const operation = useRef(false);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    if (support) feedbackEvents(report.id).then(data => { if (mounted.current) setEvents(data); }).catch(() => { if (mounted.current) setError('Internal history could not be loaded. Refresh before reviewing this report.'); });
    return () => { mounted.current = false; };
  }, [report.id, support]);
  const save = async () => {
    if (operation.current || !note.trim()) return;
    operation.current = true; setBusy(true); setError('');
    const notice = toast.loading('Saving support update');
    try {
      await triageTesterFeedback(report, status, response, note);
      toast.success('Support update saved', { id: notice });
      if (mounted.current) onUpdated();
    } catch (e) { if (mounted.current) setError(feedbackFailure(e)); toast.error('Update not saved', { id: notice }); }
    finally { operation.current = false; if (mounted.current) setBusy(false); }
  };
  const remove = async () => {
    if (operation.current) return;
    operation.current = true; setBusy(true); setError('');
    try { await deleteMyTesterFeedback(report.id); toast.success('Report and attachment deleted'); if (mounted.current) onDeleted(); }
    catch { if (mounted.current) setError('The report could not be deleted. Please retry.'); toast.error('Report not deleted'); }
    finally { operation.current = false; if (mounted.current) setBusy(false); }
  };
  const loadImage = async () => {
    if (imageBusy) return;
    setImageBusy(true); setError('');
    try { const image = await feedbackScreenshot(report.id); if (mounted.current) { if (image) setScreenshot(image); else setError('The attachment is no longer available.'); } }
    catch { if (mounted.current) setError('The private screenshot could not be loaded.'); }
    finally { if (mounted.current) setImageBusy(false); }
  };
  return <section className="min-w-0 space-y-5" aria-label="Report details">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs text-muted-foreground">REPORT {report.id.slice(0, 8).toUpperCase()}</p><h2 className="mt-1 text-lg font-semibold">{FEEDBACK_CATEGORIES[report.category]}</h2><p className="mt-1 text-xs text-muted-foreground">{new Date(report.created_at).toLocaleString()} · {FEEDBACK_STATUSES[report.status]}</p></div>{!support && <Button size="icon" variant="ghost" disabled={busy} aria-label="Delete my report" title="Delete my report" onClick={() => setConfirmDelete(true)}><Trash2 size={16} /></Button>}</div>
    {error && <Alert variant="destructive"><AlertDescription role="alert">{error}</AlertDescription></Alert>}
    <p className="whitespace-pre-wrap break-words text-sm leading-7">{report.description}</p>
    {report.diagnostic && <details className="border-y py-3 text-sm"><summary className="cursor-pointer font-medium">Shared technical context</summary><dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-2 break-words">{Object.entries(report.diagnostic).map(([key, value]) => <React.Fragment key={key}><dt className="text-muted-foreground">{({ tool: 'Tool', release: 'Release', stage: 'Stage', errorCode: 'Error category', browser: 'Browser', device: 'Screen size' })[key]}</dt><dd>{value}</dd></React.Fragment>)}</dl></details>}
    {report.has_screenshot && <div>{screenshot ? <img src={`data:image/png;base64,${screenshot}`} alt="Private screenshot supplied with this report" className="max-h-96 max-w-full rounded-md border object-contain" /> : <Button variant="outline" size="sm" className="gap-2" disabled={imageBusy} onClick={loadImage}>{imageBusy ? <Loader2 size={16} className="animate-spin" /> : <Image size={16} />}View attached screenshot</Button>}</div>}
    {report.response && <div className="border-l-2 border-emerald-600 bg-emerald-50 p-4 text-sm text-emerald-950"><h3 className="font-semibold">Support reply</h3><p className="mt-2 whitespace-pre-wrap break-words leading-6">{report.response}</p><p className="mt-2 text-xs">Updated {new Date(report.updated_at).toLocaleString()}</p></div>}
    {!support && !report.response && <p className="text-sm text-muted-foreground">No support reply yet. Refresh this page to check for updates.</p>}
    {!support && report.status === 'needs_info' && <div className="space-y-2 text-sm"><p>To send more details, open a new report and mention reference {report.id.slice(0, 8).toUpperCase()}.</p><Button variant="outline" size="sm" onClick={() => reportProblem()} className="gap-2"><MessageSquareWarning size={16} />Send more details</Button></div>}
    {support && <div className="space-y-4 border-t pt-5"><h3 className="font-semibold">Triage</h3><div className="space-y-2"><Label htmlFor="triage-status">Status</Label><select id="triage-status" value={status} onChange={e => setStatus(e.target.value as FeedbackStatus)} className="h-11 w-full rounded-md border bg-background px-3 text-sm">{Object.entries(FEEDBACK_STATUSES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div><div className="space-y-2"><Label htmlFor="triage-response">Reply visible to the tester</Label><Textarea id="triage-response" value={response} onChange={e => setResponse(e.target.value)} maxLength={4000} className="min-h-24" /></div><div className="space-y-2"><Label htmlFor="triage-note">Internal resolution note (required)</Label><Textarea id="triage-note" value={note} onChange={e => setNote(e.target.value)} maxLength={4000} className="min-h-24" /><p className="text-xs text-muted-foreground">Only platform support can see internal notes. Do not copy private research or credentials here.</p></div><Button onClick={save} disabled={busy || !note.trim()} className="gap-2">{busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}Save update</Button>{events.length > 0 && <details className="border-t pt-3 text-sm"><summary className="cursor-pointer font-medium">Internal history</summary><ol className="mt-3 space-y-4">{events.map(event => <li key={event.id}><p className="text-xs text-muted-foreground">{new Date(event.created_at).toLocaleString()} · {FEEDBACK_STATUSES[event.status]}</p><p className="mt-1 whitespace-pre-wrap break-words leading-6">{event.note}</p></li>)}</ol></details>}</div>}
    <p className="border-t pt-3 text-xs text-muted-foreground">Retention deadline: {new Date(report.expires_at).toLocaleDateString()}. Deleting your report also removes its screenshot and support history.</p>
    <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete this report?</AlertDialogTitle><AlertDialogDescription>The report, screenshot and support history will be permanently removed. This does not affect your research documents.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={remove}>Delete report</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </section>;
}

function FeedbackWorkspace() {
  const { user } = useAuth();
  const reportProblem = useReportProblem();
  const [reviewer, setReviewer] = useState(false);
  const [scope, setScope] = useState<'mine' | 'support'>('mine');
  const [reports, setReports] = useState<FeedbackReport[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [more, setMore] = useState(false);
  const request = useRef(0);
  const available = feedbackCloudAvailable(user?.id);
  useEffect(() => {
    let active = true;
    setReviewer(false); setScope('mine');
    if (available) feedbackReviewerAccess().then(value => { if (active) setReviewer(value); }).catch(() => undefined);
    return () => { active = false; };
  }, [available, user?.id]);
  const load = useCallback(async (before?: FeedbackReport) => {
    if (!user?.id || !available) return;
    const token = ++request.current; setBusy(true); setError('');
    try {
      const items = await listTesterFeedback(user.id, scope, before);
      if (token !== request.current) return;
      setReports(current => before ? [...current, ...items.filter(item => !current.some(old => old.id === item.id))] : items);
      setMore(items.length === 30);
      if (!before) setSelectedId(current => items.some(item => item.id === current) ? current : '');
    } catch (e) { if (token === request.current) setError(feedbackFailure(e)); }
    finally { if (token === request.current) setBusy(false); }
  }, [available, scope, user?.id]);
  const invalidate = useCallback(() => { request.current++; }, []);
  useEffect(() => { setReports([]); setSelectedId(''); void load(); return invalidate; }, [load, invalidate]);
  useEffect(() => {
    const refresh = () => { void load(); };
    window.addEventListener('uhpab:feedback-submitted', refresh);
    return () => window.removeEventListener('uhpab:feedback-submitted', refresh);
  }, [load]);
  const selected = reports.find(report => report.id === selectedId);
  return <DashboardLayout><WorkspacePage className="space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4 border-b pb-5"><div><h1 className="text-2xl font-semibold">Feedback and support</h1><p className="mt-2 text-sm text-muted-foreground">Your reports, support replies and progress.</p></div><div className="flex gap-2"><Button size="icon" variant="outline" disabled={busy || !available} onClick={() => load()} aria-label="Refresh reports" title="Refresh reports"><RefreshCw size={16} className={cn(busy && 'animate-spin')} /></Button><Button className="gap-2" onClick={() => reportProblem()}><MessageSquareWarning size={16} />Report a problem</Button></div></header>
    {!available && <Alert><AlertDescription>Feedback delivery is available to signed-in online accounts. Reports are not sent from demonstration accounts.</AlertDescription></Alert>}
    {error && <Alert variant="destructive"><AlertDescription role="alert">{error}<Button size="sm" variant="outline" className="ml-3" onClick={() => load()}>Retry</Button></AlertDescription></Alert>}
    {reviewer && <div className="flex gap-1 border-b" role="tablist" aria-label="Feedback view">{(['mine','support'] as const).map(value => <button key={value} role="tab" aria-selected={scope === value} onClick={() => { if (!busy) setScope(value); }} className={cn('border-b-2 px-4 py-3 text-sm', scope === value ? 'border-primary font-semibold text-primary' : 'border-transparent text-muted-foreground')}>{value === 'mine' ? 'My reports' : 'Support inbox'}</button>)}</div>}
    <div className="grid min-w-0 gap-7 lg:grid-cols-[minmax(16rem,0.8fr)_minmax(0,1.2fr)]">
      <section aria-label="Reports" className="min-w-0"><div className="flex items-center justify-between border-b pb-3"><h2 className="text-sm font-semibold">{scope === 'support' ? 'Tester reports' : 'My reports'}</h2><span className="text-xs text-muted-foreground">Newest first</span></div>{!reports.length && !busy ? <div className="py-10 text-sm text-muted-foreground">{error ? 'Reports unavailable.' : 'No reports yet.'}</div> : <ul className="divide-y">{reports.map(report => <li key={report.id}><button className={cn('flex w-full min-w-0 items-center gap-3 px-2 py-4 text-left hover:bg-muted/50', selectedId === report.id && 'bg-muted/70')} onClick={() => setSelectedId(report.id)} aria-pressed={selectedId === report.id}><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs text-muted-foreground">{new Date(report.created_at).toLocaleDateString()}</span><span className={cn('text-xs font-medium', report.status === 'resolved' ? 'text-emerald-700' : report.status === 'needs_info' ? 'text-amber-700' : 'text-muted-foreground')}>{FEEDBACK_STATUSES[report.status]}</span></span><span className="mt-2 block text-sm font-medium">{FEEDBACK_CATEGORIES[report.category]}</span><span className="mt-1 line-clamp-2 break-words text-sm text-muted-foreground">{report.description}</span><span className="mt-2 block text-xs text-muted-foreground">{report.diagnostic?.tool || 'No technical context'} · {report.id.slice(0, 8).toUpperCase()}</span></span><ChevronRight size={16} className="shrink-0 text-muted-foreground" /></button></li>)}</ul>}{busy && <p role="status" className="py-4 text-sm text-muted-foreground">Loading reports...</p>}{more && <Button variant="outline" className="mt-4" disabled={busy} onClick={() => load(reports[reports.length - 1])}>Load older reports</Button>}</section>
      <div className="min-w-0 lg:border-l lg:pl-7">{selected ? <ReportDetail key={`${user?.id}:${scope}:${selected.id}:${selected.updated_at}`} report={selected} support={scope === 'support' && reviewer} onUpdated={() => load()} onDeleted={() => { setSelectedId(''); void load(); }} /> : <div className="py-8 text-sm text-muted-foreground"><Send size={24} className="mb-3 opacity-50" /><p>Select a report to see its details and support reply.</p><p className="mt-3 leading-6">Private to you and authorised platform support. School staff cannot see reports merely because they manage or supervise your research.</p></div>}</div>
    </div>
  </WorkspacePage></DashboardLayout>;
}

export default function Feedback() {
  const { user } = useAuth();
  return <FeedbackWorkspace key={user?.id || 'signed-out'} />;
}
