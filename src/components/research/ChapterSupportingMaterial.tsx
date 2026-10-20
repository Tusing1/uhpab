import { useRef, useState } from 'react';
import { Paperclip, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { changeWorkspaceContext, type ChapterWorkspace } from '@/lib/chapterWorkspace';
import { attachSupportingText, publicSourceLinks, supportingDocuments, validateSupportingFile, type SupportingDocument } from '@/lib/assistedChapterDraft';

export default function ChapterSupportingMaterial({ workspace, sectionId = workspace.activeSectionId, disabled, onChange, onReading }: {
  workspace: ChapterWorkspace; sectionId?: string; disabled: boolean; onChange: (next: ChapterWorkspace) => void; onReading: (busy: boolean) => void;
}) {
  const [error, setError] = useState('');
  const [reading, setReading] = useState(false);
  const [purpose, setPurpose] = useState<SupportingDocument['purpose']>('evidence');
  const latest = useRef(workspace); latest.current = workspace;
  const files = supportingDocuments(workspace.context.supportingDocuments);
  const set = (key: string, value: string) => {
    const current = latest.current;
    onChange(changeWorkspaceContext(current, { context: { ...current.context, [key]: value } }));
  };
  const upload = async (file?: File) => {
    if (!file) return;
    setError('');
    try { validateSupportingFile(file, files); } catch (e) { setError((e as Error).message); return; }
    const workspaceId = workspace.id;
    setReading(true); onReading(true);
    try {
      const { extractDocumentText } = await import('@/lib/documentTextExtraction');
      const result = await extractDocumentText(file);
      if (latest.current.id !== workspaceId) return;
      const current = supportingDocuments(latest.current.context.supportingDocuments);
      set('supportingDocuments', JSON.stringify(attachSupportingText(file, result.text, purpose, current)));
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not read this file. Try a DOCX or TXT.'); }
    finally { setReading(false); onReading(false); }
  };
  return <details className="border-y py-3">
    <summary className="cursor-pointer text-sm font-medium">Supporting material <span className="font-normal text-muted-foreground">(optional){files.length ? ` · ${files.length} attached` : ''}</span></summary>
    <div className="mt-4 space-y-4">
      <p className="text-sm text-muted-foreground">Your topic supplies the study location and respondents. Add sources if you have them, or generate a draft and we will look for published evidence.</p>
      <label className="block space-y-2 text-sm">Public source links<Textarea disabled={disabled || reading} value={workspace.context.sourceLinks || ''} onChange={e => set('sourceLinks', e.target.value)} placeholder="https://www.who.int/...&#10;Paste one public article or report link per line. No APA typing needed." /></label>
      {!!workspace.context.sourceLinks?.trim() && !publicSourceLinks(workspace.context.sourceLinks).length && <p className="text-sm text-amber-800">Use public HTTPS links without sign-in tokens, query strings or private addresses.</p>}
      <label className="block space-y-2 text-sm">Helpful facts or instructions for this study<Textarea disabled={disabled || reading} value={workspace.context.additional || ''} onChange={e => set('additional', e.target.value)} placeholder="Optional: why this study matters locally, confirmed figures with their dates/source, or corrections to your study setting." /></label>
      {(workspace.chapterKey === 'chapter2' || sectionId === 'researchQuestions') && <label className="block space-y-2 text-sm">Your approved specific objectives (if you already have them)<Textarea disabled={disabled || reading} value={workspace.context.objectives || ''} onChange={e => set('objectives', e.target.value)} placeholder="Optional: paste each approved objective on a new line. Otherwise we will use your existing objectives or suggest a starting set." /></label>}
      <p className="text-xs text-muted-foreground">Remove patient names and identifiers first. Extracted text stays with your private project until you remove it and is sent to Gemini when drafting. The original file is not retained or published. Example reports guide style only, not findings.</p>
      <label className="block space-y-2 text-sm">This file is a<select disabled={disabled || reading} className="h-11 w-full rounded-md border bg-background px-3" value={purpose} onChange={e => setPurpose(e.target.value as SupportingDocument['purpose'])}><option value="evidence">Local report / monthly statement (supporting evidence)</option><option value="example">Example student report (style only)</option></select></label>
      <label className="block space-y-2 text-sm"><span className="inline-flex items-center gap-2"><Paperclip size={16} />Attach PDF, DOCX or TXT</span><input className="block max-w-full text-sm file:mr-3 file:min-h-11 file:rounded-md file:border file:bg-background file:px-3" type="file" accept=".pdf,.docx,.txt" disabled={disabled || reading || files.length >= 3} onChange={e => { void upload(e.target.files?.[0]); e.target.value = ''; }} /></label>
      {reading && <p role="status" className="text-sm">Reading your file…</p>}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <ul className="divide-y">{files.map(file => <li key={file.id} className="flex min-w-0 items-center gap-2 py-2"><span className="min-w-0 flex-1 break-words text-sm">{file.name}<span className="block text-xs text-muted-foreground">{file.purpose === 'example' ? 'Style example' : 'Supporting evidence'} · {file.text.split(/\s+/).length} words</span></span><Button size="icon" variant="ghost" aria-label={`Remove ${file.name}`} disabled={disabled || reading} onClick={() => set('supportingDocuments', JSON.stringify(files.filter(d => d.id !== file.id)))}><Trash2 size={16} /></Button></li>)}</ul>
      {!!workspace.sources.length && <details><summary className="cursor-pointer text-sm">Saved sources ({workspace.sources.length})</summary><ul className="mt-2 space-y-3 text-sm">{workspace.sources.map(source => <li key={source.id} className="break-words">{source.apaReference}{/^https:\/\//i.test(source.url) && <a className="ml-2 text-primary underline" href={source.url} target="_blank" rel="noopener noreferrer">Open source</a>}</li>)}</ul></details>}
      {workspace.context._searchSuggestions && <iframe title="Google Search suggestions" className="h-36 w-full border-0" sandbox="allow-popups allow-popups-to-escape-sandbox" referrerPolicy="no-referrer" srcDoc={`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src https: data:; base-uri 'none'; form-action 'none'"><base target="_blank">${workspace.context._searchSuggestions}`} />}
    </div>
  </details>;
}
