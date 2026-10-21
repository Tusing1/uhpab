import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, Download, Plus, Sparkles } from 'lucide-react';
import InstrumentQuestionEditor from './InstrumentQuestionEditor';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { confirmStudyProfile, consistencyChecks, fieldConfirmed, profileImpact, readinessChecks, studyFields, studyProfile, studySection, updateStudyProfile, type StudyCheck } from '@/lib/researchStudyTools';
import { buildInstrumentDocx, instrumentChecks, instrumentFromProject, instrumentHtml, instrumentPrompt, instrumentSignature, parseInstrument, type ResearchInstrument } from '@/lib/researchInstrument';
import { triggerBrowserDownload } from '@/lib/download';
import { generateContent } from '@/integrations/gemini';
import { writingFailure } from '@/lib/writingFailure';
import { readResearchList } from '@/lib/researchFormulation';
import type { WritingForm } from '@/lib/projectWritingFlow';
import DraftComparison from './DraftComparison';
const labels = { 'needs-attention': 'Needs attention', manual: 'Check manually', passed: 'Passed' };
function CheckList({ items, onNavigate, disabled, onOpenTool, navigable=true }: {
    items: StudyCheck[];
    onNavigate: (section: string, id: string) => void;
    disabled: boolean;
    onOpenTool?:()=>void;
    navigable?:boolean;
}) {
    const [filter, setFilter] = useState('all');
    const compact=items.length>0 && items.every(item=>item.id.startsWith('instrument-')) && !onOpenTool;
    const content=<div className="space-y-3"><label className="block text-sm">Show<select className="ml-2 min-h-11 rounded-md border bg-background px-3" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All checks</option><option value="needs-attention">Needs attention</option><option value="manual">Check manually</option><option value="passed">Passed</option></select></label><ul className="divide-y">{items.filter(item => filter === 'all' || item.status === filter).map(item => <li key={item.id} className="space-y-2 py-3"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-semibold">{item.title}</span><span className={`text-xs ${item.status === 'needs-attention' ? 'text-red-700 dark:text-red-300' : item.status === 'passed' ? 'text-teal-700 dark:text-teal-300' : 'text-muted-foreground'}`}>{labels[item.status]}</span></div><p className="text-sm text-muted-foreground">{item.detail}</p>{navigable&&!compact&&<Button size="sm" variant="outline" disabled={disabled} onClick={() => item.id.startsWith('instrument-')&&onOpenTool?onOpenTool():onNavigate(item.section,item.component)}>{item.id.startsWith('instrument-')&&onOpenTool?'Open tool':'Open section'}</Button>}</li>)}</ul></div>;
    return compact?<details className="border-y py-3"><summary className="cursor-pointer text-sm font-medium">Tool checks · {items.filter(item=>item.status==='needs-attention').length} need attention</summary><div className="mt-3">{content}</div></details>:content;
}
export default function ResearchProjectTools({ form, type, disabled, onChange, onNavigate: navigateToSection, onBusy, onOpenChange, initialTab = 'profile', chapterScope, selectedIds }: {
    form: WritingForm;
    type: 'proposal' | 'report';
    disabled: boolean;
    onChange: (form: WritingForm) => void;
    onNavigate: (section: string, id: string) => void;
    onBusy: (busy: boolean) => void;
    onOpenChange?: (open: boolean) => void;
    initialTab?: string;
    chapterScope?: string;
    selectedIds?: string[];
}) {
    const [tab, setTab] = useState(initialTab);
    const detailsRef = useRef<HTMLDetailsElement>(null);
    const closeTools = () => { if (detailsRef.current) detailsRef.current.open = false; onOpenChange?.(false); };
    const onNavigate = (section: string, id: string) => { closeTools(); navigateToSection(section, id); };
    const [error, setError] = useState('');
    const [working, setWorking] = useState(false);
    const [impact, setImpact] = useState('');
    const [kind, setKind] = useState<ResearchInstrument['kind']>('questionnaire');
    const [candidate, setCandidate] = useState<ResearchInstrument | null>(null);
    const [insertPreview, setInsertPreview] = useState(false);
    const latest = useRef(form);
    latest.current = form;
    const request = useRef(0);
    useEffect(() => () => { request.current++; }, []);
    const profile = studyProfile(form, type);
    const instrument = instrumentFromProject(form);
    const checks = instrumentChecks(instrument, form, type);
    const locked = disabled || working;
    const store = (next: ResearchInstrument, remember = false) => onChange({ ...latest.current, chapters: { ...latest.current.chapters, ...(remember ? { _researchInstrumentPrevious: instrumentFromProject(latest.current) } : {}), _researchInstrument: next } });
    const generate = async () => {
        if (locked)
            return;
        setError('');
        const snapshot = latest.current, signature = instrumentSignature(snapshot, type), token = ++request.current;
        try {
            const prompt = instrumentPrompt(snapshot, type, kind);
            setWorking(true);
            onBusy(true);
            const raw = await generateContent(prompt);
            if (token !== request.current || instrumentSignature(latest.current, type) !== signature)
                return;
            const next = parseInstrument(raw, snapshot, type, kind);
            if (instrument)
                setCandidate(next);
            else
                store(next);
        }
        catch (error) {
            if (token === request.current) {
                const failure = writingFailure(error);
                setError(`${failure.title}: ${failure.message}`);
            }
        }
        finally {
            if (token === request.current) {
                setWorking(false);
                onBusy(false);
            }
        }
    };
    const instrumentChecksWithAppendix = [...checks];
    if (instrument && studySection(form, 'appendices').tools && instrumentHtml(instrument, readResearchList(profile.objectives)).replace(/\s+/g, ' ') !== studySection(form, 'appendices').tools.replace(/\s+/g, ' '))
        instrumentChecksWithAppendix.push({ id: 'appendix-outdated', status: 'manual', title: 'Builder and appendix differ', detail: 'The saved appendix differs from this builder. Review the appendix before replacing it; manual edits may be intentional.', section: 'appendices', component: 'tools' });
    const questionEdit = (id: string, patch: Partial<NonNullable<typeof instrument>['questions'][number]>) => { if (instrument)
        store({ ...instrument, questions: instrument.questions.map(q => q.id === id ? { ...q, ...patch } : q) }); };
    return <details ref={detailsRef} onToggle={e => onOpenChange?.(e.currentTarget.open)} className="my-4 border-y py-3"><summary className="cursor-pointer text-sm font-semibold">Study tools</summary><div className="mt-4 min-w-0 space-y-4">
    <Tabs value={tab} onValueChange={setTab}><TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-4"><TabsTrigger value="profile">Study profile</TabsTrigger><TabsTrigger value="alignment">Consistency</TabsTrigger><TabsTrigger value="instrument">Questionnaire / guide</TabsTrigger><TabsTrigger value="readiness">Readiness</TabsTrigger></TabsList>
      <TabsContent value="profile" className="space-y-4"><p className="break-words text-sm font-medium">{form.title}</p>
        <label className="block space-y-2 text-sm">Number of specific objectives<select disabled={locked} className="min-h-11 w-full rounded-md border bg-background px-3" value={form.chapters._objectiveCount===2?'2':'3'} onChange={e=>onChange(updateStudyProfile(form,type,{},Number(e.target.value) as 2|3))}><option value="3">3 objectives</option><option value="2">2 objectives</option></select></label>
        {studyFields.map(field => <label key={field.key} className="block space-y-2 text-sm"><span className="flex flex-wrap items-center gap-2">{field.label}<span className="text-xs text-muted-foreground">{fieldConfirmed(form, type, field.key) ? 'Confirmed by you' : 'Suggested / needs confirmation'}</span></span><Textarea disabled={locked} value={profile[field.key] || ''} placeholder={field.placeholder} onChange={e => { setImpact(`${field.label} changed. Review: ${profileImpact(field.key)}. Existing writing has not been rewritten.`); onChange(updateStudyProfile(form,type,{[field.key]:e.target.value})); }}/></label>)}{impact && <p role="status" className="text-sm text-amber-800 dark:text-amber-300">{impact}</p>}<Button disabled={locked} onClick={() => { try {
        onChange(confirmStudyProfile(form, type));
        setError('');
    }
    catch (error) {
        setError((error as Error).message);
    } }}><Check size={16} className="mr-2"/>Confirm these details</Button></TabsContent>
      <TabsContent value="alignment"><CheckList items={[...consistencyChecks(form, type), ...instrumentChecksWithAppendix].filter(check => !chapterScope || check.section === chapterScope && (!selectedIds || selectedIds.includes(check.component)))} onNavigate={onNavigate} onOpenTool={()=>setTab('instrument')} disabled={locked}/></TabsContent>
      <TabsContent value="readiness" className="space-y-3"><p className="text-sm text-muted-foreground">{chapterScope ? 'Selected chapter sections only. ' : ''}Structural checks, not a predicted grade, plagiarism certificate or official approval. Final layout and research quality need manual review.</p><CheckList items={[...readinessChecks(form, type), ...instrumentChecksWithAppendix].filter(check => !chapterScope || check.section === chapterScope && (!selectedIds || selectedIds.includes(check.component)))} onNavigate={onNavigate} onOpenTool={()=>setTab('instrument')} disabled={locked}/></TabsContent>
      <TabsContent value="instrument" className="space-y-4"><label className="block space-y-2 text-sm">Data collection tool<select disabled={locked} className="min-h-11 w-full rounded-md border bg-background px-3" value={kind} onChange={e => setKind(e.target.value as typeof kind)}><option value="questionnaire">Questionnaire</option><option value="interview">Interview guide</option></select></label><p className="text-sm text-muted-foreground">Confirm your objectives and design first. Review the draft with your supervisor and pretest it before collecting responses. Do not collect direct patient identifiers.</p><Button disabled={locked} onClick={generate}><Sparkles size={16} className="mr-2"/>{working ? 'Preparing tool…' : instrument ? 'Generate another version' : 'Generate tool draft'}</Button>
      {instrument && <><label className="block space-y-2 text-sm">Respondent instructions<Textarea disabled={locked} value={instrument.instructions} onChange={e => store({ ...instrument, instructions: e.target.value })}/></label>{[0, ...readResearchList(profile.objectives).map((_, i) => i + 1)].map(objective => <details key={objective} open={objective===1} className="space-y-3 border-t pt-4"><summary className="cursor-pointer break-words text-sm font-semibold">{objective === 0 ? 'Optional respondent characteristics' : `Objective ${objective}: ${readResearchList(profile.objectives)[objective - 1]}`}</summary>{instrument.questions.filter(q => q.objective === objective).map((q, i) => <InstrumentQuestionEditor key={q.id} question={q} index={i} objectiveCount={readResearchList(profile.objectives).length} disabled={locked} interview={instrument.kind==='interview'} onChange={patch=>questionEdit(q.id,patch)} onRemove={()=>store({...instrument,questions:instrument.questions.filter(item=>item.id!==q.id)})}/>)}<Button variant="outline" disabled={locked || instrument.questions.length >= 30} onClick={() => store({ ...instrument, questions: [...instrument.questions, { id: crypto.randomUUID(), objective, text: '', response: 'text', options: [] }] })}><Plus size={16} className="mr-2"/>Add question</Button></details>)}<CheckList items={checks} onNavigate={onNavigate} disabled={locked}/>{instrument.objectiveSignature !== instrumentSignature(form, type) && <Button variant="outline" disabled={locked} onClick={() => { if (window.confirm('Have you checked every question against the changed topic, objectives and design? This does not validate the instrument.'))
        store({ ...instrument, objectiveSignature: instrumentSignature(form, type) }); }}>I checked the changed study details</Button>}<Button disabled={locked || checks.some(c => c.status === 'needs-attention')} onClick={() => setInsertPreview(true)}>Review and add to Appendix 1</Button></>}
      </TabsContent>
    </Tabs>
    {tab === 'instrument' && <Button variant="outline" disabled={locked} onClick={() => { try {
        instrumentPrompt(form, type, kind);
        const next: ResearchInstrument = { version: 1, kind, instructions: 'Participation is voluntary. Do not write your name.', questions: readResearchList(profile.objectives).map((_, i) => ({ id: crypto.randomUUID(), objective: i + 1, text: '', response: 'text', options: [] })), objectiveSignature: instrumentSignature(form, type) };
        if (instrument)
            setCandidate(next);
        else
            store(next);
        setError('');
    }
    catch (error) {
        setError((error as Error).message);
    } }}><Plus size={16} className="mr-2"/>Start a blank tool</Button>}
    {tab === 'instrument' && form.chapters._researchInstrumentPrevious && <Button variant="outline" disabled={locked} onClick={() => { const previous = instrumentFromProject({ ...form, chapters: { ...form.chapters, _researchInstrument: form.chapters._researchInstrumentPrevious } }); if (previous && window.confirm('Restore the previous tool draft? Your current tool will be kept for another undo.'))
        store(previous, true); }}>Undo tool replacement</Button>}
    {tab === 'instrument' && instrument && <Button variant="outline" disabled={locked || checks.some(c => c.status === 'needs-attention')} onClick={async () => { try {
        setWorking(true);
        onBusy(true);
        const blob = await buildInstrumentDocx(instrument, readResearchList(profile.objectives));
        const url = URL.createObjectURL(blob);
        triggerBrowserDownload(url, `${instrument.kind}-draft.docx`);
        window.setTimeout(() => URL.revokeObjectURL(url), 300000);
    }
    catch (error) {
        setError((error as Error).message);
    }
    finally {
        setWorking(false);
        onBusy(false);
    } }}><Download size={16} className="mr-2"/>Download tool DOCX</Button>}
    {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
    {candidate && <DraftComparison open title="Compare data collection tools" current={instrument ? instrumentHtml(instrument, readResearchList(profile.objectives)) : ''} proposed={instrumentHtml(candidate, readResearchList(profile.objectives))} onDismiss={() => setCandidate(null)} onAccept={() => { if (candidate.objectiveSignature !== instrumentSignature(latest.current, type)) {
        setError('Study details changed. Generate another draft.');
        setCandidate(null);
        return;
    } store(candidate, true); setCandidate(null); }}/>}
    {instrument && <DraftComparison open={insertPreview} title="Review Appendix 1" current={studySection(form, 'appendices').tools || ''} proposed={instrumentHtml(instrument, readResearchList(profile.objectives))} onDismiss={() => setInsertPreview(false)} onAccept={() => { if (instrumentChecks(instrument, latest.current, type).some(c => c.status === 'needs-attention')) {
        setError('Resolve the tool checks before adding the appendix.');
        return;
    } const current = latest.current; onChange({ ...current, chapters: { ...current.chapters, appendices: { ...studySection(current, 'appendices'), tools: instrumentHtml(instrument, readResearchList(studyProfile(current, type).objectives)) } } }); setInsertPreview(false); }}/>}
    <div className="border-t pt-3"><Button variant="outline" disabled={locked} onClick={() => { closeTools(); detailsRef.current?.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}); }}><ArrowLeft size={16} className="mr-2"/>Back to writing</Button></div>
  </div></details>;
}
