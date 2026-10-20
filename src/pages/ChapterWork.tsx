import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronDown, Download, FilePenLine, Loader2, Plus, Save, Sparkles, Trash2, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import ChapterSources from '@/components/research/ChapterSources';
import ChapterStudyDetails from '@/components/research/ChapterStudyDetails';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/contexts/ProjectContext';
import { buildTemplateDocx } from '@/lib/api';
import { triggerBrowserDownload, sanitizeFileName } from '@/lib/download';
import { generateResearchComponent } from '@/utils/geminiApi';
import { assertUhpabDraftAllowed } from '@/lib/uhpabWritingEngine';
import { chapterSections, chapterStructure, changeWorkspaceContext, citedWorkspaceSources, generationNeeds, newChapterWorkspace, plainChapterText, reviewWorkspaceSection, sanitizeChapterHtml, workspaceFingerprint, workspaceWritingContext, type ChapterKey, type ChapterSource, type ChapterWorkspace } from '@/lib/chapterWorkspace';
import { readResearchList } from '@/lib/researchFormulation';
import { deleteChapterWorkspace, listChapterWorkspaces, saveChapterWorkspace, transferChapterWorkspace, type TransferMode } from '@/lib/chapterWorkspaceStore';

const statusLabels = { 'not-started': 'Not started', drafting: 'Drafting', 'needs-information': 'Needs review', reviewed: 'Reviewed by me' };
const errorText = (error: unknown) => error instanceof Error ? error.message : 'Something went wrong. Your text is still here.';
const emptySource = (): ChapterSource => ({ id: crypto.randomUUID(), title: '', authors: '', year: '', citationText: '', apaReference: '', url: '', notes: '', intendedUse: '' });
const selectClass = 'h-11 w-full rounded-md border border-input bg-background px-3 text-sm';

export default function ChapterWork() {
  const { user } = useAuth();
  const userId = user?.id;
  const { projects, isLoading: projectsLoading, updateProject } = useProjects();
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const [saved, setSaved] = useState<ChapterWorkspace[]>([]);
  const [draft, setDraft] = useState<ChapterWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  const [type, setType] = useState<'proposal' | 'report'>('proposal');
  const [chapter, setChapter] = useState<ChapterKey>('chapter1');
  const [topic, setTopic] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [partial, setPartial] = useState(false);
  const [projectId, setProjectId] = useState('');
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [transferId, setTransferId] = useState('');
  const [modes, setModes] = useState<Record<string, TransferMode>>({});
  const [showTransfer, setShowTransfer] = useState(false);
  const editorPanel = useRef<HTMLElement>(null);
  const current = useRef(draft);
  current.current = draft;
  const requestNumber = useRef(0);
  const isNew = workspaceId === 'new';
  const isList = !workspaceId;

  useEffect(() => {
    let cancelled = false;
    const request = requestNumber;
    request.current++;
    setLoading(true); setError(''); setDirty(false); setDraft(null); setBusy('');
    if (!userId) return;
    setShowTransfer(false); setTransferId('');
    listChapterWorkspaces(userId).then(items => {
      if (cancelled) return;
      setSaved(items);
      if (workspaceId && !isNew) {
        const found = items.find(w => w.id === workspaceId);
        if (!found) throw new Error('Chapter draft not found or not accessible to this account.');
        setDraft({ ...found, sections: Object.fromEntries(Object.entries(found.sections).map(([id, section]) => [id, { ...section, content: sanitizeChapterHtml(section.content), previousContent: sanitizeChapterHtml(section.previousContent || '') }])) });
      }
    }).catch(e => { if (!cancelled) setError(errorText(e)); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; request.current++; };
  }, [userId, workspaceId, isNew]);

  useEffect(() => {
    if (!dirty && busy !== 'Generating draft') return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    const click = (event: MouseEvent) => {
      const anchor = (event.target as Element)?.closest('a');
      if (anchor && anchor.href !== window.location.href && !anchor.download && !window.confirm('Your latest changes are not saved. Leave this page?')) { event.preventDefault(); event.stopPropagation(); }
    };
    const navigation = (window as Window & { navigation?: EventTarget }).navigation;
    const navigating = (event: Event) => {
      if ((event as Event & { destination?: { sameDocument: boolean } }).destination?.sameDocument === false) return;
      if (event.cancelable && !window.confirm('Your latest changes are not saved. Leave this page?')) event.preventDefault();
    };
    window.addEventListener('beforeunload', beforeUnload);
    if (navigation) navigation.addEventListener('navigate', navigating);
    else document.addEventListener('click', click, true);
    return () => { window.removeEventListener('beforeunload', beforeUnload); navigation?.removeEventListener('navigate', navigating); document.removeEventListener('click', click, true); };
  }, [dirty, busy]);

  const edit = (next: ChapterWorkspace) => { setDraft(next); setDirty(true); setError(''); };
  const save = async (value = draft) => {
    if (!value) return null;
    const token = requestNumber.current;
    setBusy('Saving'); setError('');
    try {
      const result = await saveChapterWorkspace(value);
      if (token !== requestNumber.current) return null;
      setDraft(result); setDirty(false); return result;
    } catch (e) { if (token === requestNumber.current) setError(errorText(e)); return null; }
    finally { if (token === requestNumber.current) setBusy(''); }
  };

  const start = async () => {
    if (!user) return;
    setBusy('Creating'); setError('');
    try {
      let value = newChapterWorkspace(user.id, type, chapter, topic, partial ? selected : chapterSections(type, chapter).map(([id]) => id));
      const project = projects.find(p => p.id === projectId && p.userId === user.id);
      if (project) {
        const imported = project.chapters[chapter] as Record<string, string> | undefined;
        const firstChapter = project.chapters.chapter1 as Record<string, string> | undefined;
        const objectives = readResearchList(firstChapter?.specificObjectives || '');
        value = { ...value, sourceProjectId: project.id, context: { objectives: objectives.join('\n'), objectiveCount: objectives.length === 2 ? '2' : '3' },
          sections: Object.fromEntries(value.selectedSectionIds.filter(id => typeof imported?.[id] === 'string').map(id => [id, { content: sanitizeChapterHtml(imported![id]), status: 'drafting' as const }])) };
        const library = project.chapters._sourcesLibrary;
        if (Array.isArray(library)) value.sources = library.map(s => ({ ...emptySource(), ...s }));
      }
      const result = await saveChapterWorkspace(value);
      navigate(`/chapter-work/${result.id}`);
    } catch (e) { setError(errorText(e)); } finally { setBusy(''); }
  };

  const id = draft?.activeSectionId || '';
  const section = draft ? chapterStructure(draft.documentType, draft.chapterKey).sections?.[id] : null;
  const content = draft?.sections[id]?.content || '';
  const needs = draft ? generationNeeds(draft, id) : [];
  const hasContent = Boolean(plainChapterText(content));
  const changeSection = (nextId: string) => {
    if (!draft) return;
    edit({ ...draft, activeSectionId: nextId }); setChecklistOpen(false);
    requestAnimationFrame(() => editorPanel.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }));
  };
  const setContent = (html: string) => {
    if (!draft) return;
    const sanitized = sanitizeChapterHtml(html);
    if (sanitized === content) return;
    edit({ ...draft, sections: { ...draft.sections, [id]: { ...draft.sections[id], content: sanitized, status: plainChapterText(html) ? 'drafting' : 'not-started' } } });
  };
  const generate = async () => {
    if (!draft || needs.length || busy) return;
    if (hasContent && !window.confirm('Replace this section with a new draft? Your current text will be kept for Undo.')) return;
    const token = ++requestNumber.current;
    const snapshot = draft;
    const context = workspaceWritingContext(snapshot, id);
    setBusy('Generating draft'); setError('');
    try {
      const result = await generateResearchComponent(section!.title, snapshot.topic, snapshot.documentType, context);
      if (token !== requestNumber.current || current.current?.id !== snapshot.id) return;
      if (result.error) throw new Error(result.error);
      if (!plainChapterText(result.text)) throw new Error('No usable draft returned. Your previous text has not been changed.');
      assertUhpabDraftAllowed(result.text, context);
      const next = { ...snapshot, sections: { ...snapshot.sections, [id]: { content: sanitizeChapterHtml(result.text), previousContent: content, status: 'drafting' as const, contextFingerprint: workspaceFingerprint(snapshot) } } };
      edit(next);
      toast.success('Draft ready. Read and edit it before marking it reviewed.');
    } catch (e) { if (token === requestNumber.current) setError(errorText(e)); }
    finally { if (token === requestNumber.current) setBusy(''); }
  };
  const download = async () => {
    if (!draft) return;
    const unfinished = draft.selectedSectionIds.some(key => draft.sections[key]?.status !== 'reviewed');
    if (unfinished && !window.confirm('This contains unfinished or unreviewed sections. Download an editable draft anyway?')) return;
    setBusy('Preparing DOCX'); setError('');
    try {
      const text = draft.selectedSectionIds.map(key => draft.sections[key]?.content || '').join(' ');
      const sources = citedWorkspaceSources(draft, text);
      const blob = await buildTemplateDocx(draft.documentType, { title: draft.topic, chapters: { [draft.chapterKey]: Object.fromEntries(draft.selectedSectionIds.map(key => [key, draft.sections[key]?.content || ''])), references: { content: sources.map(s => s.apaReference).join('\n\n') }, _sourcesLibrary: sources } }, { chapterKey: draft.chapterKey, sectionIds: draft.selectedSectionIds });
      const url = URL.createObjectURL(blob);
      triggerBrowserDownload(url, sanitizeFileName(`${draft.chapterKey}-${draft.topic}.docx`));
      window.setTimeout(() => URL.revokeObjectURL(url), 300_000);
    } catch (e) { setError(errorText(e)); } finally { setBusy(''); }
  };
  const transfer = async () => {
    if (!draft || dirty || !user) return;
    const project = projects.find(p => p.id === transferId && p.userId === user.id);
    if (!project) return;
    if (!Object.entries(modes).some(([key, mode]) => mode !== 'skip' && plainChapterText(draft.sections[key]?.content || ''))) { setError('Choose at least one nonempty section to add.'); return; }
    if (!window.confirm('Apply these choices to the project? Replaced text will be kept in the project transfer history. Your chapter draft will remain unchanged.')) return;
    setBusy('Adding to project'); setError('');
    try {
      if (/^[0-9a-f]{8}-/i.test(user.id)) {
        await transferChapterWorkspace(draft, project.id, project.updatedAt, modes);
        window.location.assign(`/projects/${project.id}/edit`);
        return;
      }
      const latest = JSON.parse(localStorage.getItem(`projects_${user.id}`) || '[]').find((p: { id: string }) => p.id === project.id);
      if (!latest || latest.updatedAt !== project.updatedAt) throw new Error('Project changed. Reload before transferring.');
      if (latest.type !== draft.documentType || latest.title.trim().toLowerCase() !== draft.topic.trim().toLowerCase()) throw new Error('Project type and topic must match.');
      const chapters = structuredClone(latest.chapters);
      const history = chapters._chapterWorkspaceHistory || [];
      chapters[draft.chapterKey] ||= {};
      let transferred = '';
      for (const [key, mode] of Object.entries(modes)) {
        const incoming = draft.sections[key]?.content || '';
        if (mode === 'skip' || !plainChapterText(incoming)) continue;
        const previous = chapters[draft.chapterKey][key] || '';
        history.push({ workspaceId: draft.id, chapter: draft.chapterKey, section: key, content: previous, transferredAt: new Date().toISOString(), mode });
        chapters[draft.chapterKey][key] = mode === 'append' ? `${previous}<p><br></p>${incoming}` : incoming;
        transferred += incoming;
      }
      const sources = citedWorkspaceSources(draft, transferred);
      chapters.references ||= {};
      chapters.references.content = [...new Set([chapters.references.content || '', ...sources.map(s => s.apaReference)])].filter(Boolean).join('\n\n');
      chapters._sourcesLibrary = [...(chapters._sourcesLibrary || []), ...sources];
      chapters._chapterWorkspaceHistory = history;
      await updateProject({ ...latest, chapters, updatedAt: new Date().toISOString() });
      navigate(`/projects/${project.id}/edit`);
    } catch (e) { setError(errorText(e)); } finally { setBusy(''); }
  };
  const markReviewed = (checked: boolean) => {
    if (!draft) return;
    try {
      edit(checked ? reviewWorkspaceSection(draft, id) : { ...draft, sections: { ...draft.sections, [id]: { ...draft.sections[id], status: 'drafting' } } });
    } catch (e) { setError(errorText(e)); }
  };

  return <DashboardLayout><div className="chapter-workspace mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><Link to="/chapter-work" className="mb-3 inline-flex items-center gap-2 text-sm text-muted-foreground"><BookOpen size={16} /> Chapter workspace</Link>
        <h1 className="text-2xl font-semibold sm:text-3xl">{isList ? 'One chapter. Your next step.' : isNew ? 'What are you working on?' : draft ? chapterStructure(draft.documentType, draft.chapterKey).title.replace(/^CHAPTER (ONE|TWO|THREE): /, '') : 'Chapter workspace'}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{isList ? 'Start a chapter or pick up where you left off.' : isNew ? 'Choose only the work you need today.' : draft ? `${draft.documentType === 'report' ? 'Report' : 'Proposal'} · ${draft.chapterKey.replace('chapter', 'Chapter ')} · ${dirty ? 'Unsaved changes' : 'Saved'}` : ''}</p></div>
      {isList ? <Button asChild><Link to="/chapter-work/new"><Plus size={16} className="mr-2" />Start a chapter</Link></Button> : draft ? <Button variant="outline" disabled={!!busy} onClick={download}><Download size={16} className="mr-2" />Download DOCX</Button> : null}
    </header>
    {error && <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}{isList && <Button variant="link" onClick={() => window.location.reload()}>Retry</Button>}</div>}
    {loading ? <p role="status" className="flex items-center gap-2 py-12"><Loader2 className="animate-spin" size={18} />Loading chapter drafts...</p> : isList ? <>
      {!saved.length && !error ? <section className="chapter-empty flex flex-col items-start gap-4 border-y py-10 sm:flex-row sm:items-center sm:justify-between"><div className="max-w-xl"><FilePenLine size={30} className="mb-4 text-teal-700" /><h2 className="text-xl font-semibold">A focused place to write</h2><p className="mt-2 text-muted-foreground">Introduction, literature review or methodology. Keep your work here, then add it to a full project when you are ready.</p></div><Button variant="outline" asChild><Link to="/chapter-work/new">Choose a chapter<ArrowRight size={16} className="ml-2" /></Link></Button></section> : null}
      <div className="divide-y">{saved.map(w => <article key={w.id} className="flex min-w-0 flex-wrap items-center gap-4 py-5"><div className="min-w-0 flex-1"><p className="text-xs font-medium uppercase text-teal-700">{w.documentType} / {w.chapterKey.replace('chapter', 'Chapter ')}</p><Link to={`/chapter-work/${w.id}`} className="mt-2 block break-words text-lg font-semibold hover:underline">{w.topic}</Link><p className="mt-2 text-sm text-muted-foreground">{w.selectedSectionIds.filter(key => w.sections[key]?.status === 'reviewed').length} of {w.selectedSectionIds.length} sections reviewed · Saved {new Date(w.updatedAt).toLocaleDateString('en-GB')}</p></div><Button variant="outline" asChild><Link to={`/chapter-work/${w.id}`}>Continue<ArrowRight size={16} className="ml-2" /></Link></Button><Button size="icon" variant="ghost" title="Delete chapter draft" aria-label={`Delete ${w.topic}`} disabled={!!busy} onClick={async () => { if (!window.confirm('Permanently delete this chapter draft? Full projects will not be affected.')) return; setBusy('Deleting'); try { await deleteChapterWorkspace(w); setSaved(items => items.filter(item => item.id !== w.id)); } catch (e) { setError(errorText(e)); } finally { setBusy(''); } }}><Trash2 size={16} /></Button></article>)}</div>
      <p className="text-xs text-muted-foreground">{user && !/^[0-9a-f]{8}-/i.test(user.id) ? 'Demo drafts are saved in this browser only.' : 'Chapter drafts are private and remain saved until you delete them.'}</p>
    </> : isNew ? <section className="max-w-3xl space-y-6 border-t pt-6">
      <div className="grid gap-5 sm:grid-cols-2"><label className="space-y-2 text-sm font-medium">Document type<select className={selectClass} value={type} onChange={e => { setType(e.target.value as typeof type); setProjectId(''); setSelected([]); }}><option value="proposal">Proposal</option><option value="report">Report</option></select></label><label className="space-y-2 text-sm font-medium">Chapter<select className={selectClass} value={chapter} onChange={e => { setChapter(e.target.value as ChapterKey); setSelected([]); }}><option value="chapter1">Chapter One: Introduction</option><option value="chapter2">Chapter Two: Literature review</option><option value="chapter3">Chapter Three: Methodology</option></select></label></div>
      <label className="block space-y-2 text-sm font-medium">Use a project (optional)<select className={selectClass} disabled={projectsLoading} value={projectId} onChange={e => { setProjectId(e.target.value); const p = projects.find(p => p.id === e.target.value); if (p) setTopic(p.title); }}><option value="">Start with a topic</option>{projects.filter(p => p.type === type && p.userId === user?.id).map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
      <label className="block space-y-2 text-sm font-medium">Research topic<Textarea rows={3} value={topic} onChange={e => setTopic(e.target.value)} placeholder="Your research topic, including population and specific setting" /></label>
      <fieldset className="space-y-3"><legend className="mb-3 text-sm font-medium">How much do you need?</legend><div className="flex flex-wrap gap-6"><label className="flex items-center gap-2 text-sm"><input type="radio" name="scope" checked={!partial} onChange={() => setPartial(false)} />Whole chapter</label><label className="flex items-center gap-2 text-sm"><input type="radio" name="scope" checked={partial} onChange={() => setPartial(true)} />Specific sections</label></div>{partial && <div className="grid gap-3 border-l-2 pl-4">{chapterSections(type, chapter).map(([key, s]) => <label key={key} className="flex items-start gap-3 text-sm"><input className="mt-1" type="checkbox" checked={selected.includes(key)} onChange={e => setSelected(prev => e.target.checked ? [...prev, key] : prev.filter(id => id !== key))} />{s.title}</label>)}</div>}</fieldset>
      <Button onClick={start} disabled={!!busy || !topic.trim() || (partial && !selected.length)}>{busy ? <Loader2 size={16} className="mr-2 animate-spin" /> : <FilePenLine size={16} className="mr-2" />}Start writing</Button>
    </section> : draft && section ? <>
      <p className="max-w-4xl break-words text-sm text-muted-foreground">{draft.topic}</p>
      <div className="chapter-work-grid">
        <aside className="min-w-0"><button className="flex w-full items-center justify-between border-y py-3 text-sm font-semibold lg:hidden" onClick={() => setChecklistOpen(v => !v)} aria-expanded={checklistOpen}>Sections<ChevronDown size={16} /></button><nav aria-label="Chapter sections" className={`${checklistOpen ? 'block' : 'hidden'} space-y-1 py-3 lg:block`}>{chapterSections(draft.documentType, draft.chapterKey).filter(([key]) => draft.selectedSectionIds.includes(key)).map(([key, s]) => <button key={key} disabled={!!busy} aria-current={key === id ? 'step' : undefined} onClick={() => changeSection(key)} className={`chapter-section-link ${key === id ? 'is-current' : ''}`}><span className="text-sm font-medium">{s.title}</span><span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">{draft.sections[key]?.status === 'reviewed' && <Check size={12} />}{statusLabels[draft.sections[key]?.status || 'not-started']}</span></button>)}</nav></aside>
        <section ref={editorPanel} className="min-w-0 scroll-mt-6 space-y-5">
          <details className="border-b pb-3"><summary className="cursor-pointer text-xs text-muted-foreground">Change research topic</summary><label className="mt-3 block space-y-2 text-sm">Research topic<Textarea disabled={!!busy} value={draft.topic} onChange={e => edit(changeWorkspaceContext(draft, { topic: e.target.value }))} /></label></details>
          <div><h2 className="text-xl font-semibold">{section.title}</h2><p className="mt-2 text-sm text-muted-foreground">{section.description}</p><details className="mt-3 text-sm"><summary className="cursor-pointer font-medium text-teal-700">UHPAB requirements</summary><ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">{section.requirements?.map(rule => <li key={rule}>{rule}</li>)}</ul></details></div>
          <ChapterStudyDetails workspace={draft} sectionId={id} disabled={!!busy} onChange={edit} />
          {(draft.chapterKey === 'chapter2' || ['background', 'statementOfProblem'].includes(id)) && <ChapterSources key={draft.id} workspace={draft} sectionId={id} disabled={!!busy} onChange={edit} onInsert={citation => setContent(`${content}<p>${sanitizeChapterHtml(citation)}</p>`)} />}
          {needs.length > 0 && <p className="text-sm text-amber-800" role="status">Before generating: {needs.join('; ')}. You can still write and save below.</p>}
          <div className="flex flex-wrap items-center gap-3"><Button variant="outline" disabled={!!busy || !!needs.length} onClick={generate}><Sparkles size={16} className="mr-2" />{hasContent ? 'Regenerate draft' : 'Generate draft'}</Button>{draft.sections[id]?.previousContent && <Button variant="ghost" disabled={!!busy} onClick={() => { const old = draft.sections[id]; edit({ ...draft, sections: { ...draft.sections, [id]: { ...old, content: old.previousContent!, previousContent: old.content, status: 'drafting' } } }); }}><Undo2 size={16} className="mr-2" />Undo replacement</Button>}<span className="text-xs text-muted-foreground">{plainChapterText(content).split(/\s+/).filter(Boolean).length} words</span></div>
          <div className="chapter-manuscript"><h3>{chapterStructure(draft.documentType, draft.chapterKey).title}</h3><h4>{section.title}</h4><RichTextEditor key={id} value={content} onChange={setContent} disabled={!!busy} placeholder="Write your section here" /></div>
          <label className="flex items-start gap-3 text-sm"><input className="mt-1" type="checkbox" disabled={!!busy || !hasContent} checked={draft.sections[id]?.status === 'reviewed'} onChange={e => markReviewed(e.target.checked)} />I have read this section and checked its facts and sources.</label>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4"><Button variant="outline" disabled={!!busy} onClick={() => save()}><Save size={16} className="mr-2" />Save</Button><span role="status" className="text-xs text-muted-foreground">{busy || (dirty ? 'Unsaved changes' : 'Saved')}</span><Button disabled={!!busy} onClick={async () => { const index = draft.selectedSectionIds.indexOf(id); const nextId = draft.selectedSectionIds[index + 1]; const result = await save(nextId ? { ...draft, activeSectionId: nextId } : draft); if (result) { toast.success(nextId ? 'Saved. Next section ready.' : 'Chapter saved.'); editorPanel.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }}>Save and {draft.selectedSectionIds.indexOf(id) === draft.selectedSectionIds.length - 1 ? 'finish' : 'next'}<ArrowRight size={16} className="ml-2" /></Button></div>
          {draft.chapterKey === 'chapter2' && id === 'body' && <p className="text-xs text-muted-foreground">Whole-chapter review: at least five pages and 20 in-text citations are required. Check source coverage, comparison and gaps before considering this finished.</p>}
          <details className="border-t pt-4" open={showTransfer} onToggle={e => setShowTransfer(e.currentTarget.open)}><summary className="cursor-pointer text-sm font-medium">Add this work to a full project</summary><div className="mt-4 space-y-4"><p className="text-xs text-muted-foreground">Save first. Only your projects with the same topic and document type are eligible. Existing sections are skipped unless you choose otherwise.</p><select aria-label="Transfer destination project" className={selectClass} value={transferId} disabled={dirty || !!busy} onChange={e => { setTransferId(e.target.value); setModes(Object.fromEntries(draft.selectedSectionIds.map(key => [key, 'skip']))); }}><option value="">Choose a project</option>{projects.filter(p => p.userId === user?.id && p.type === draft.documentType && p.title.trim().toLowerCase() === draft.topic.trim().toLowerCase()).map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select>{transferId && draft.selectedSectionIds.map(key => <label key={key} className="grid items-center gap-2 text-sm sm:grid-cols-[1fr_160px]">{chapterStructure(draft.documentType, draft.chapterKey).sections![key].title}<select className={selectClass} value={modes[key] || 'skip'} disabled={dirty || !!busy || !plainChapterText(draft.sections[key]?.content || '')} onChange={e => setModes(prev => ({ ...prev, [key]: e.target.value as TransferMode }))}><option value="skip">Skip</option><option value="append">Append</option><option value="replace">Replace</option></select></label>)}<Button variant="outline" disabled={!transferId || dirty || !!busy} onClick={transfer}>Confirm and add to project</Button></div></details>
          <Link className="inline-flex items-center gap-2 text-sm text-muted-foreground" to="/chapter-work"><ArrowLeft size={14} />All chapter drafts</Link>
        </section>
      </div>
    </> : null}
  </div></DashboardLayout>;
}
