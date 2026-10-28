import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, ImagePlus, Loader2, Send, ShieldCheck, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FEEDBACK_CATEGORIES, FEEDBACK_STAGES, feedbackDiagnostic, feedbackFailure, feedbackSubmissionSchema, prepareFeedbackScreenshot, redactFeedbackText, type FeedbackContext, type FeedbackSubmission } from '@/lib/testerFeedback';
import { feedbackCloudAvailable, submitTesterFeedback } from '@/lib/testerFeedbackService';

export default function FeedbackDialog({ userId, pathname, context, onClose }: { userId: string; pathname: string; context: FeedbackContext; onClose: () => void }) {
  const [category, setCategory] = useState<FeedbackSubmission['category']>('problem');
  const [description, setDescription] = useState('');
  const [stage, setStage] = useState(context.stage || 'general');
  const [diagnostics, setDiagnostics] = useState(true);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [preview, setPreview] = useState<Omit<FeedbackSubmission, 'consent'> | null>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState('');
  const inFlight = useRef(false);
  const imageRequest = useRef(0);
  const mounted = useRef(true);
  React.useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const available = feedbackCloudAvailable(userId);
  const close = () => { if (!inFlight.current && !preparing) onClose(); };
  const review = () => {
    const cleaned = redactFeedbackText(description);
    if (cleaned.length < 20) { setError('Describe what happened and what you expected, using at least 20 characters after redaction.'); return; }
    setError(''); setConsent(false);
    setPreview({ requestId: crypto.randomUUID(), category, description: cleaned, diagnostic: diagnostics ? feedbackDiagnostic(pathname, { ...context, stage }, navigator.userAgent, window.innerWidth) : null, screenshot });
  };
  const send = async () => {
    if (!preview || !consent || inFlight.current || !available) return;
    inFlight.current = true; setBusy(true); setError('');
    const notice = toast.loading('Sending your report');
    try {
      const result = await submitTesterFeedback(feedbackSubmissionSchema.parse({ ...preview, consent }));
      if (mounted.current) {
        setReceipt(result.id); setScreenshot(null); setDescription(''); setPreview(null);
        window.dispatchEvent(new Event('uhpab:feedback-submitted'));
      }
      if (mounted.current) toast.success(result.duplicate ? 'Your report is already received' : 'Report received', { id: notice, description: 'You can track updates in Feedback and support.' });
      else toast.dismiss(notice);
    } catch (e) {
      const message = feedbackFailure(e);
      if (mounted.current) setError(message);
      if (mounted.current) toast.error('Delivery not confirmed', { id: notice, description: `${message} Retry the same report to avoid a duplicate.` });
      else toast.dismiss(notice);
    } finally { inFlight.current = false; if (mounted.current) setBusy(false); }
  };
  const attach = async (file?: File) => {
    if (!file) return;
    const request = ++imageRequest.current; setPreparing(true); setScreenshot(null); setError('');
    try { const image = await prepareFeedbackScreenshot(file); if (mounted.current && request === imageRequest.current) setScreenshot(image); }
    catch (e) { if (mounted.current && request === imageRequest.current) setError(e instanceof Error ? e.message : 'The screenshot could not be prepared.'); }
    finally { if (mounted.current && request === imageRequest.current) setPreparing(false); }
  };
  return <Dialog open onOpenChange={open => { if (!open) close(); }}>
    <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-lg p-5 sm:p-6" onInteractOutside={event => event.preventDefault()}>
      <DialogHeader><DialogTitle>{receipt ? 'Thank you for the report' : preview ? 'Review before sending' : 'Report a problem'}</DialogTitle>
        <DialogDescription>{receipt ? 'Your report is saved privately for the support team.' : 'Only the details you review and approve below will be sent to UHPAB support.'}</DialogDescription>
      </DialogHeader>
      {error && <Alert variant="destructive"><AlertDescription role="alert">{error}</AlertDescription></Alert>}
      {!available && <Alert><AlertDescription>Sending feedback requires a signed-in online account. This demonstration cannot send reports.</AlertDescription></Alert>}
      {receipt ? <div className="space-y-5"><CheckCircle2 className="h-9 w-9 text-emerald-600" /><p className="text-sm">Reference <strong>{receipt.slice(0, 8).toUpperCase()}</strong>. You can see the status, any support reply, or delete the report from Feedback and support.</p><div className="flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={close}>Done</Button><Button asChild onClick={close}><Link to="/feedback">View my reports</Link></Button></div></div> : preview ? <>
        <div className="space-y-4 text-sm">
          <div><p className="font-medium">{FEEDBACK_CATEGORIES[preview.category]}</p><p className="mt-2 whitespace-pre-wrap break-words rounded-md border bg-muted/30 p-3 leading-6">{preview.description}</p></div>
          {description.trim() !== preview.description && <p className="text-amber-800">Possible keys, links or identifiers were removed from the description. Check that the report still makes sense.</p>}
          <div className="rounded-md border p-3"><h3 className="font-medium">Technical context</h3>{preview.diagnostic ? <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 break-words">{Object.entries(preview.diagnostic).map(([key, value]) => <React.Fragment key={key}><dt className="text-muted-foreground">{({ errorCode: 'Error category', release: 'App release', device: 'Screen size', tool: 'Tool', stage: 'Stage', browser: 'Browser' })[key]}</dt><dd>{value}</dd></React.Fragment>)}</dl> : <p className="mt-1 text-muted-foreground">Not included.</p>}</div>
          {preview.screenshot && <div><p className="mb-2 font-medium">Screenshot to be shared</p><img src={`data:image/png;base64,${preview.screenshot}`} alt="Screenshot attached to this report" className="max-h-64 max-w-full rounded-md border object-contain" /><p className="mt-2 text-amber-800">Images are not automatically redacted. Go back and remove it if it shows private information.</p></div>}
          <div className="flex gap-2 rounded-md bg-emerald-50 p-3 text-emerald-950"><ShieldCheck size={18} className="mt-0.5 shrink-0" /><p>Linked to your signed-in account. Visible only to you and authorised platform support, not your school or supervisor. Access expires after 90 days, followed by scheduled deletion. You can delete it earlier.</p></div>
          <label className="flex cursor-pointer items-start gap-3 leading-6"><Checkbox checked={consent} disabled={busy} onCheckedChange={value => setConsent(value === true)} className="mt-1" /><span>I have checked this report and any image for private information, and agree to send the previewed details to support.</span></label>
        </div>
        <div className="flex flex-wrap justify-between gap-3 border-t pt-4"><Button variant="outline" disabled={busy} onClick={() => { setPreview(null); setConsent(false); setError(''); }} className="gap-2"><ArrowLeft size={16} />Edit report</Button><Button disabled={!consent || busy || !available} onClick={send} className="gap-2">{busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}{busy ? 'Sending...' : 'Send report'}</Button></div>
      </> : <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="feedback-category">Category</Label><select id="feedback-category" className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm" value={category} onChange={e => setCategory(e.target.value as FeedbackSubmission['category'])}>{Object.entries(FEEDBACK_CATEGORIES).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></div><div className="space-y-2"><Label htmlFor="feedback-stage">When did it happen?</Label><select id="feedback-stage" className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm" value={stage} onChange={e => setStage(e.target.value as typeof stage)}>{FEEDBACK_STAGES.map(value => <option key={value} value={value}>{({ general: 'General use', upload: 'Opening a document', sources: 'Finding sources', focus: 'Drafting study focus', methods: 'Drafting methods', checks: 'Checking the draft', generate: 'Generating writing', save: 'Saving work', export: 'Downloading a file' })[value]}</option>)}</select></div></div>
        <div className="space-y-2"><Label htmlFor="feedback-description">What happened?</Label><Textarea id="feedback-description" value={description} onChange={e => setDescription(e.target.value)} maxLength={4000} className="min-h-36" placeholder="What were you trying to do, what happened, and what did you expect?" /><p className="text-xs text-muted-foreground">{description.length}/4000. Do not paste research text, participant details, passwords or API keys.</p></div>
        <div className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><Label htmlFor="feedback-screenshot" className="flex items-center gap-2"><ImagePlus size={16} />Screenshot (optional)</Label>{screenshot && <Button variant="ghost" size="sm" onClick={() => { imageRequest.current++; setScreenshot(null); }} className="gap-1.5"><Trash2 size={14} />Remove</Button>}</div><input id="feedback-screenshot" type="file" accept="image/png,image/jpeg" disabled={preparing} onChange={e => { void attach(e.target.files?.[0]); e.target.value = ''; }} className="block w-full min-w-0 text-sm file:mr-3 file:rounded-md file:border file:bg-muted file:px-3 file:py-2 file:text-sm" />{preparing && <p role="status" className="text-sm">Preparing screenshot...</p>}{screenshot && <img src={`data:image/png;base64,${screenshot}`} alt="Selected screenshot preview" className="max-h-48 max-w-full rounded-md border object-contain" />}<p className="text-xs text-muted-foreground">PNG or JPEG, up to 5 MB. Crop out names, keys and private writing first. The image is resized and metadata removed; visible text is not redacted.</p></div>
        <label className="flex items-start gap-3 text-sm leading-6"><Checkbox checked={diagnostics} onCheckedChange={value => setDiagnostics(value === true)} className="mt-1" /><span>Include tool, app release, operation stage, error category and browser/screen-size category. No full URL, document, prompt or browsing history.</span></label>
        <div className="flex justify-end border-t pt-4"><Button disabled={preparing || description.trim().length < 20} onClick={review} className="gap-2">Review report<ArrowRight size={16} /></Button></div>
      </div>}
    </DialogContent>
  </Dialog>;
}
