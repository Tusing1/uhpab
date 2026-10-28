import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, Download, FileText, Loader2, Pause, Play, Presentation, RotateCcw, Sparkles, Upload } from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { WorkspacePage } from '@/components/workspace/WorkspacePage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { OperationProgress } from '@/components/ui/operation-progress';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/contexts/ProjectContext';
import { cn } from '@/lib/utils';
import { sanitizeFileName, triggerBrowserDownload } from '@/lib/download';
import { DEFENCE_FACT_FIELDS, buildDefenceSlide, createDefenceDeck, emptyDefenceFacts, extractProjectDefenceFacts, extractTextDefenceFacts, missingDefenceFacts, validateDefenceDeck, type DefenceDeck, type DefenceFactKey, type DefenceFacts, type DefenceSlide } from '@/lib/defenceSlides';
import { listDefenceDecks, saveDefenceDeck } from '@/lib/defenceSlidesStore';
import { DEFENCE_LOGO_DATA, DEFENCE_SLIDE_LAYOUT, buildDefenceHandout, buildDefencePptx, defenceDeckIsWorkingDraft, defenceSlideLayout, defenceSlideLayoutIssues } from '@/lib/defenceSlidesExport';
import { DEFENCE_RULES_VERSION, getDefenceSectionRule, reviewDefenceRules, type DefenceRuleFinding } from '@/lib/defenceSectionRules';
import { defenceWordCount, draftDefenceFacts, missingDefenceDraftKeys, type DefenceDraftProgress, type DefenceDraftResult } from '@/lib/defenceSlidesDraft';
import { getResearchKeys } from '@/lib/aiKeys';
import { createDefenceDraftCheckpoint, DEFENCE_DRAFT_STAGE_LABELS, DEFENCE_DRAFT_STAGES, nextDefenceDraftStage } from '@/lib/defenceDraftCheckpoint';
import { DefenceDraftConflictError, defenceDraftSessionMatches, discardDefenceDraftSession, loadDefenceDraftSession, saveDefenceDraftSession, withDefenceDraftLock, type DefenceDraftSession } from '@/lib/defenceDraftStore';
import { researchRetryAt } from '@/lib/researchServiceError';
import { DefenceEvidenceReview } from '@/components/defence/DefenceEvidenceReview';
import { readDefenceEvidence, type DefenceEvidence } from '@/lib/defenceEvidence';
import { captureDefenceSource, readDefenceSourceSnapshot, type DefenceSourceSnapshot } from '@/lib/defenceConsistency';
import { DefenceConsistencyReview } from '@/components/defence/DefenceConsistencyReview';

type SourceMode = 'project' | 'upload' | 'topic';
type Step = 'source' | 'facts' | 'slides';

function RuleFindings({ findings, onSuggestion }: { findings: DefenceRuleFinding[]; onSuggestion?: (finding: DefenceRuleFinding) => void }) {
  if (!findings.length) return null;
  return <section className="space-y-3 border-l-4 border-amber-500 bg-amber-50 p-4 text-amber-950" aria-label="Section rule findings">
    <h2 className="font-semibold">Section rules need attention</h2>
    <ul className="space-y-4">{findings.map((finding, i) => <li key={`${finding.key}-${i}`}>
      <p className="text-sm font-semibold">{finding.title}</p><p className="mt-1 text-sm leading-6">{finding.detail}</p>
      {finding.suggestion && onSuggestion && <div className="mt-2 space-y-2"><p className="whitespace-pre-wrap text-sm leading-6">{finding.suggestion}</p><Button size="sm" variant="outline" onClick={() => onSuggestion(finding)}>Use suggested wording</Button></div>}
    </li>)}</ul>
  </section>;
}

function SlidePreview({ slide, index, draft, testData }: { slide: DefenceSlide; index: number; draft: boolean; testData?: boolean }) {
  const container = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const layout = defenceSlideLayout(slide, index);
  const geometry = DEFENCE_SLIDE_LAYOUT;
  const textStyle = (item: typeof layout.title): React.CSSProperties => ({
    position: 'absolute', left: item.x * 96, top: item.y * 96,
    width: item.w * 96, height: item.h * 96,
    fontSize: item.fontSize * 96 / 72, lineHeight: `${item.lineSpacing * 96 / 72}px`,
    fontWeight: item.bold ? 700 : 400, whiteSpace: 'pre-wrap',
    paddingLeft: item.bullet ? geometry.bulletIndent * 96 / 72 : 0,
  });
  useEffect(() => {
    const observer = new ResizeObserver(entries => setScale(entries[0].contentRect.width / 1280));
    if (container.current) observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  return <div ref={container} className="relative aspect-video w-full overflow-hidden border bg-white text-black shadow-sm" aria-label={`Slide ${index + 1} preview`}>
    <div className="absolute left-0 top-0 h-[720px] w-[1280px] origin-top-left bg-white font-[Arial] text-black" style={{ transform: `scale(${scale})` }}>
      <h2 style={textStyle(layout.title)} className="m-0">{slide.title}</h2>
      <img src={DEFENCE_LOGO_DATA} alt="UHPAB Study logo" className="absolute object-contain" style={{ left: layout.logo.x * 96, top: layout.logo.y * 96, width: layout.logo.w * 96, height: layout.logo.h * 96 }} />
      <div className="absolute h-px bg-teal-700" style={{ left: layout.divider.x * 96, top: layout.divider.y * 96, width: layout.divider.w * 96 }} />
      {layout.bullets.map((item, i) => <div key={i} style={textStyle(item)}>{item.bullet && <span aria-hidden="true" className="absolute left-0">{'\u2022'}</span>}{item.text}</div>)}
      <div className="absolute flex justify-between" style={{ left: geometry.marginX * 96, top: geometry.footerY * 96, width: (geometry.width - 2 * geometry.marginX) * 96, fontSize: geometry.footerFontSize * 96 / 72 }}><span>UHPAB Study{testData ? ' | TEST VERSION' : ''}{draft ? ' | WORKING DRAFT' : ''}</span><span>{index + 1} / 10</span></div>
    </div>
  </div>;
}

const timeLabel = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
const factSourceLabel = (source: string, label: string) => {
  if (/profile\./.test(source)) return 'Saved student profile';
  const chapter = source.match(/chapters\.(chapter[123]|references)/)?.[1];
  if (chapter) return `${({ chapter1: 'Chapter One', chapter2: 'Chapter Two', chapter3: 'Chapter Three', references: 'References' })[chapter]} / ${label}`;
  if (/Project [^:]+: title/.test(source)) return 'Saved proposal title';
  if (/chapters\._studyContext/.test(source)) return 'Saved study details';
  return source;
};

export default function DefenceSlides() {
  const { user } = useAuth();
  const { projects, isLoading } = useProjects();
  const location = useLocation();
  const [workspaceOwner, setWorkspaceOwner] = useState(user?.id);
  const [mode, setMode] = useState<SourceMode>('project');
  const [step, setStep] = useState<Step>('source');
  const [projectId, setProjectId] = useState('');
  const [topic, setTopic] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [facts, setFacts] = useState<DefenceFacts>(() => emptyDefenceFacts());
  const [evidence, setEvidence] = useState<DefenceEvidence[]>([]);
  const [sourceSnapshot, setSourceSnapshot] = useState<DefenceSourceSnapshot | null>(null);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [comparisonUndo, setComparisonUndo] = useState<DefenceDeck | null>(null);
  const [source, setSource] = useState({ name: '', projectId: undefined as string | undefined, version: undefined as string | undefined });
  const [duration, setDuration] = useState(10);
  const [testData, setTestData] = useState(false);
  const [deck, setDeck] = useState<DefenceDeck | null>(null);
  const [saved, setSaved] = useState<DefenceDeck[]>([]);
  const [slideIndex, setSlideIndex] = useState(0);
  const [undo, setUndo] = useState<{ index: number; slide: DefenceSlide } | null>(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [saveStatus, setSaveStatus] = useState('');
  const [rehearsing, setRehearsing] = useState(false);
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const elapsedSeconds = useRef(0);
  elapsedSeconds.current = seconds;
  const [editorTab, setEditorTab] = useState('content');
  const [ruleSuggestion, setRuleSuggestion] = useState<DefenceSlide | null>(null);
  const [draftMissing, setDraftMissing] = useState(true);
  const [draftProgress, setDraftProgress] = useState<DefenceDraftProgress | null>(null);
  const [pendingDraft, setPendingDraft] = useState<DefenceDraftResult | null>(null);
  const [storedDraftSession, setDraftSession] = useState<DefenceDraftSession | null>(null);
  const draftSession = storedDraftSession?.ownerId === user?.id ? storedDraftSession : null;
  const [recoveringDraft, setRecoveringDraft] = useState(true);
  const [storageWarning, setStorageWarning] = useState('');
  const [applyingDraft, setApplyingDraft] = useState(false);
  const [retryClock, setRetryClock] = useState(Date.now());
  const ownerId = useRef(user?.id);
  ownerId.current = user?.id;
  const draftRequest = useRef<AbortController | null>(null);
  const sourceReadRequest = useRef<symbol | null>(null);
  const handledRoute = useRef('');
  const latestDeck = useRef<{ ownerId?: string; deck: DefenceDeck | null }>({ ownerId: user?.id, deck: null });
  if (workspaceOwner === user?.id) latestDeck.current = { ownerId: user?.id, deck };
  const proposals = useMemo(() => projects.filter(p => p.type === 'proposal'), [projects]);
  const missing = missingDefenceFacts(facts);
  const draftable = missingDefenceDraftKeys(facts);
  const suggested = DEFENCE_FACT_FIELDS.filter(({ key }) => facts[key].draft);
  const selectedSlide = deck?.slides[slideIndex];
  const incomplete = deck ? defenceDeckIsWorkingDraft(deck) : true;
  const layoutIssues = useMemo(() => deck?.slides.flatMap((slide, i) => defenceSlideLayoutIssues(slide, i)) || [], [deck]);
  const contentIssues = useMemo(() => deck ? validateDefenceDeck(deck, { allowDraft: true, allowEditedNotes: true }) : [], [deck]);
  const visibleContentIssues = [...new Set([...contentIssues, ...layoutIssues])];
  const factFindings = useMemo(() => reviewDefenceRules(facts), [facts]);
  const deckFindings = useMemo(() => deck ? reviewDefenceRules(deck.facts, deck.slides) : [], [deck]);
  const blockingRuleFindings = deckFindings.filter(finding => finding.target === 'slide');
  const slidesNeedingRules = deck?.slides.map((slide, index) => ({ slide, index }))
    .filter(({ slide }) => blockingRuleFindings.some(finding => slide.sourceKeys.includes(finding.key))) || [];
  const selectedRules = selectedSlide?.sourceKeys.flatMap(key => {
    const rule = getDefenceSectionRule(key, deck!.facts);
    return rule ? [{ key, rule }] : [];
  }) || [];
  const projectChanged = deck?.projectId && projects.some(p => p.id === deck.projectId && p.updatedAt !== deck.sourceVersion);
  const latestProposalSnapshot = useMemo(() => {
    const project = projects.find(project => project.id === deck?.projectId && project.type === 'proposal');
    if (!project) return null;
    try { return captureDefenceSource(extractProjectDefenceFacts(project, user), { kind: 'project', name: project.title, projectId: project.id, sourceVersion: project.updatedAt }); }
    catch { return null; }
  }, [projects, deck?.projectId, user]);
  const sourceUnavailable = Boolean(deck?.projectId && !isLoading && !latestProposalSnapshot);
  const resumeMatches = Boolean(draftSession && defenceDraftSessionMatches(draftSession, facts, source, evidence));
  const retrySeconds = Math.max(0, Math.ceil(((draftSession?.retryAt || 0) - retryClock) / 1000));
  const openStudy = useCallback((next: DefenceFacts, info: { name: string; projectId?: string; version?: string }, kind: DefenceSourceSnapshot['kind']) => {
    const snapshot = captureDefenceSource(next, { kind, name: info.name, ...(info.projectId ? { projectId: info.projectId } : {}), ...(info.version ? { sourceVersion: info.version } : {}) });
    setFacts(next); setSource({ name: info.name, projectId: info.projectId, version: info.version }); setSourceSnapshot(snapshot); setEvidence([]); setComparisonUndo(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setSaved([]); setDeck(null); setStep('source'); setSaveStatus('');
    setWorkspaceOwner(user?.id);
    setFacts(emptyDefenceFacts()); setSource({ name: '', projectId: undefined, version: undefined }); setTopic(''); setProjectId(''); setFile(null);
    setEvidence([]);
    setSourceSnapshot(null); setComparisonOpen(false); setComparisonUndo(null);
    setDraftSession(null); setStorageWarning(''); setRecoveringDraft(true); setApplyingDraft(false); setDuration(10); setTestData(false);
    if (user?.id) listDefenceDecks(user.id).then(items => { if (!cancelled) setSaved(items); }).catch(e => { if (!cancelled) setError(e.message); });
    if (user?.id) loadDefenceDraftSession(user.id).then(session => { if (!cancelled) setDraftSession(session); })
      .catch(e => { if (!cancelled) setStorageWarning(e.message); }).finally(() => { if (!cancelled) setRecoveringDraft(false); });
    else setRecoveringDraft(false);
    return () => { cancelled = true; };
  }, [user?.id]);

  useEffect(() => {
    setPendingDraft(null); setDraftProgress(null); setBusy(false);
    return () => { draftRequest.current?.abort(); draftRequest.current = null; sourceReadRequest.current = null; };
  }, [user?.id, location.key]);

  useEffect(() => {
    setRetryClock(Date.now());
    if (!draftSession?.retryAt || draftSession.retryAt <= Date.now()) return;
    const timer = window.setInterval(() => setRetryClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [draftSession?.retryAt]);

  useEffect(() => {
    if (isLoading || !user?.id) return;
    const routeProject = new URLSearchParams(location.search).get('project');
    const incoming = (location.state as { defenceSource?: { text?: string; name?: string } } | null)?.defenceSource;
    const routeKey = `${user.id}:${location.key}`;
    if (handledRoute.current === routeKey) return;
    if (routeProject) {
      const project = proposals.find(p => p.id === routeProject);
      if (!project) { setError('This proposal is unavailable. Choose one of your saved proposals below.'); handledRoute.current = routeKey; return; }
      try { openStudy(extractProjectDefenceFacts(project, user), { name: project.title, projectId: project.id, version: project.updatedAt }, 'project'); setProjectId(project.id); setStep('facts'); }
      catch (error) { setError(error instanceof Error ? error.message : 'The proposal could not be opened.'); }
    } else if (incoming?.text) {
      try { openStudy(extractTextDefenceFacts(incoming.text, incoming.name || 'Reviewed proposal'), { name: incoming.name || 'Reviewed proposal' }, 'handoff'); setStep('facts'); }
      catch (error) { setError(error instanceof Error ? error.message : 'The proposal could not be opened.'); }
    }
    handledRoute.current = routeKey;
  }, [isLoading, proposals, user, location.key, location.search, location.state, openStudy]);

  useEffect(() => {
    if (!deck || !user?.id || workspaceOwner !== user.id) return;
    let active = true;
    setSaveStatus('Saving changes...');
    const timer = window.setTimeout(() => {
      saveDefenceDeck(user.id, deck).then(() => {
        if (!active) return;
        setSaveStatus('Saved on this device');
        setSaved(current => [deck, ...current.filter(d => d.id !== deck.id)]);
      }).catch(e => { if (active) { setSaveStatus('Changes not saved'); setError(e.message); } });
    }, 500);
    return () => { active = false; window.clearTimeout(timer); };
  }, [deck, user?.id, workspaceOwner]);

  useEffect(() => () => {
    const snapshot = latestDeck.current;
    if (snapshot.deck && snapshot.ownerId === user?.id && user?.id) saveDefenceDeck(user.id, snapshot.deck).catch(() => toast.error('The presentation could not be saved before leaving. Return to the slides and download a copy.'));
  }, [user?.id]);

  useEffect(() => {
    if (!running || !rehearsing) return;
    const start = Date.now() - elapsedSeconds.current * 1000;
    const interval = window.setInterval(() => setSeconds(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => window.clearInterval(interval);
  }, [running, rehearsing]);

  useEffect(() => {
    const protect = (e: BeforeUnloadEvent) => { if (saveStatus === 'Saving changes...' || saveStatus === 'Changes not saved') { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', protect);
    return () => window.removeEventListener('beforeunload', protect);
  }, [saveStatus]);

  const changeFact = (key: DefenceFactKey, value: string) => {
    setComparisonUndo(null);
    setFacts(current => ({ ...current, [key]: { value, source: current[key].draft ? 'Student-edited suggested draft - not confirmed' : 'Entered by student', status: value.trim() ? 'confirmed' : 'missing', ...(current[key].draft && value.trim() ? { draft: true } : {}) } }));
  };

  const readSource = async () => {
    const account = user?.id, readId = Symbol('proposal-read'); sourceReadRequest.current = readId;
    setError(''); setBusy(true);
    setEvidence([]);
    try {
      if (mode === 'project') {
        const project = proposals.find(p => p.id === projectId);
        if (!project) throw new Error('Choose a proposal first.');
        openStudy(extractProjectDefenceFacts(project, user), { name: project.title, projectId: project.id, version: project.updatedAt }, 'project');
      } else if (mode === 'upload') {
        if (!file) throw new Error('Choose a PDF, DOCX or TXT proposal.');
        if (file.size > 25 * 1024 * 1024) throw new Error('Choose a document smaller than 25 MB.');
        const { extractDocumentText } = await import('@/lib/documentTextExtraction');
        const extracted = await extractDocumentText(file);
        if (ownerId.current !== account || readId !== sourceReadRequest.current) return;
        if (extracted.wordCount < 30) throw new Error('Very little readable text was found. Use a text-based PDF, DOCX or TXT document.');
        if ((extracted.pageCount || 0) > 100) throw new Error('Choose a proposal with no more than 100 pages.');
        openStudy(extractTextDefenceFacts(extracted.text, file.name), { name: file.name }, 'upload');
      } else {
        if (topic.trim().length < 12) throw new Error('Enter your full research topic first.');
        const next = emptyDefenceFacts();
        next.topic = { value: topic.trim(), status: 'confirmed', source: 'Entered by student' };
        if (user && !['school-admin', 'school-supervisor'].includes(user.role)) {
          const identity: Partial<Record<DefenceFactKey, string>> = { candidate: user.name, htin: user.htin || user.studentId, school: user.schoolName, course: user.className, supervisor: user.supervisorName };
          Object.entries(identity).forEach(([key, value]) => { if (value?.trim()) next[key as DefenceFactKey] = { value, source: `profile.${key}`, status: 'found' }; });
        }
        openStudy(next, { name: topic.trim() }, 'topic');
      }
      setStep('facts');
    } catch (e) { if (ownerId.current === account && readId === sourceReadRequest.current) setError(e instanceof Error ? e.message : 'The proposal could not be opened. Please retry.'); }
    finally { if (ownerId.current === account && readId === sourceReadRequest.current) setBusy(false); }
  };

  const makeDeck = (nextFacts: DefenceFacts, warnings?: string[], records = evidence) => createDefenceDeck(nextFacts, { sourceName: source.name || nextFacts.topic.value, projectId: source.projectId, sourceVersion: source.version, durationMinutes: duration, testData, generationWarnings: warnings, evidence: records, sourceSnapshot: sourceSnapshot || undefined });
  const createSlides = (next: DefenceDeck) => {
    setFacts(next.facts); setDeck(next); setSlideIndex(0); setUndo(null); setStep('slides'); setError('');
    setEvidence(readDefenceEvidence(next.evidence));
    setSourceSnapshot(readDefenceSourceSnapshot(next.sourceSnapshot)); setComparisonOpen(false); setComparisonUndo(null);
    toast.success('Ten defence slides created', { description: next.generationWarnings?.length ? 'Suggested content is labelled as a working draft. Review it with your supervisor.' : 'Review the slide content and speaker notes before presenting.' });
  };

  const discardProgress = async (session = draftSession) => {
    if (!session || !window.confirm('Discard this saved draft progress? Your original study details and saved presentations will stay unchanged.')) return;
    try {
      await withDefenceDraftLock(session.ownerId, () => discardDefenceDraftSession(session.ownerId, session.id));
      if (ownerId.current === session.ownerId) { setDraftSession(null); setPendingDraft(null); }
    } catch (e) { setStorageWarning(e instanceof Error ? e.message : 'Saved draft progress could not be cleared.'); }
  };

  const applyPendingDraft = async () => {
    if (!pendingDraft || !user?.id || applyingDraft) return;
    const account = user.id, session = draftSession;
    setApplyingDraft(true);
    try {
      const records = [...pendingDraft.evidence, ...evidence.filter(source => !pendingDraft.evidence.some(item => item.url === source.url))];
      const next = makeDeck(pendingDraft.facts, pendingDraft.warnings, records);
      let cleared = !session;
      await withDefenceDraftLock(account, async () => {
        try { await saveDefenceDeck(account, next); }
        catch {
          if (ownerId.current === account) setStorageWarning('The presentation is available in this page but could not be saved on this device. Download a copy before leaving. Draft recovery has been kept.');
          return;
        }
        if (session) {
          try { await discardDefenceDraftSession(account, session.id); cleared = true; }
          catch { if (ownerId.current === account) setStorageWarning('The presentation is saved, but earlier recovery progress could not be cleared.'); }
        }
      });
      if (ownerId.current !== account) return;
      createSlides(next); setPendingDraft(null);
      if (cleared) setDraftSession(null);
    } catch (e) { toast.error('Draft progress has been kept', { description: e instanceof Error ? e.message : 'The presentation could not be saved.' }); }
    finally { if (ownerId.current === account) setApplyingDraft(false); }
  };

  const generate = async (savedSession?: DefenceDraftSession) => {
    if (busy || recoveringDraft || !user?.id || draftRequest.current) return;
    const input = savedSession?.checkpoint.inputFacts || facts;
    if (!input.topic.value.trim()) { setError('Add the research topic before creating your slides.'); return; }
    if (!savedSession && (!draftMissing || !draftable.length)) { createSlides(makeDeck(facts, deck?.generationWarnings)); return; }
    const previous = savedSession || (resumeMatches ? draftSession : null);
    if (previous?.ownerId && previous.ownerId !== user.id) return;
    if (previous?.source.projectId) {
      const latest = proposals.find(project => project.id === previous.source.projectId);
      if (isLoading) { setError('Wait for your proposals to load before resuming this draft.'); return; }
      if (!latest || latest.updatedAt !== previous.source.version) { setError('This proposal has changed or is unavailable. Choose its latest version and start a new draft; older generated sections will not be reused.'); return; }
    }
    if ((!previous || nextDefenceDraftStage(previous.checkpoint)) && draftSession?.retryAt && draftSession.retryAt > Date.now()) { setError('Google asked us to wait before retrying. Your completed stages are saved.'); return; }
    if ((!previous || nextDefenceDraftStage(previous.checkpoint)) && !getResearchKeys().length) { setError('Add your Gemini API key in Settings to generate the missing sections. Your saved progress is unchanged.'); return; }
    if (!previous && draftSession && !window.confirm('Start a new draft from the current study details? This replaces earlier saved generation progress. Saved presentations are unchanged.')) return;
    if (savedSession && step === 'facts' && !resumeMatches && !window.confirm('Open this saved study instead? Current unsaved study-detail edits will not be included. Saved presentations are unchanged.')) return;
    let activeSession: DefenceDraftSession = previous ? { ...previous, durationMinutes: savedSession ? previous.durationMinutes : duration, testData: savedSession ? previous.testData : testData, retryAt: previous.retryAt && previous.retryAt > Date.now() ? previous.retryAt : undefined } : { id: crypto.randomUUID(), ownerId: user.id, source: { ...source }, sourceSnapshot: sourceSnapshot || undefined, durationMinutes: duration, testData, checkpoint: createDefenceDraftCheckpoint(input, evidence), updatedAt: new Date().toISOString() };
    if (savedSession) { setFacts(savedSession.checkpoint.inputFacts); setSourceSnapshot(savedSession.sourceSnapshot || null); setEvidence(savedSession.checkpoint.inputEvidence); setSource({ name: savedSession.source.name, projectId: savedSession.source.projectId, version: savedSession.source.version }); setDuration(savedSession.durationMinutes); setTestData(savedSession.testData); }
    setStep('facts');
    const controller = new AbortController();
    draftRequest.current = controller; setBusy(true); setError('');
    const account = user.id;
    const isCurrent = () => draftRequest.current === controller && ownerId.current === account;
    const persist = async (replace = false) => {
      if (!isCurrent()) return;
      activeSession = { ...activeSession, updatedAt: new Date().toISOString() };
      setDraftSession(activeSession);
      try { await saveDefenceDraftSession(activeSession, replace); if (isCurrent()) setStorageWarning(''); }
      catch (e) {
        if (e instanceof DefenceDraftConflictError) throw e;
        if (isCurrent()) setStorageWarning(e instanceof Error ? e.message : 'Device recovery is unavailable. Keep this page open.');
      }
    };
    const notice = toast.loading(previous ? 'Resuming your saved draft' : 'Drafting your defence presentation');
    try {
      const result = await withDefenceDraftLock(account, async () => {
        controller.signal.throwIfAborted();
        await persist(!previous);
        return draftDefenceFacts(input, { signal: controller.signal, checkpoint: activeSession.checkpoint,
          onProgress: progress => { if (isCurrent()) setDraftProgress(progress); },
          onCheckpoint: async checkpoint => { activeSession = { ...activeSession, checkpoint }; await persist(); },
        });
      });
      if (!isCurrent() || controller.signal.aborted) return;
      setPendingDraft(result);
      toast.success('Draft ready to review', { id: notice, description: 'Your existing study details and presentation have not been replaced.' });
    } catch (e) {
      if (!isCurrent()) return;
      activeSession = { ...activeSession, retryAt: controller.signal.aborted ? undefined : researchRetryAt(e) };
      if (e instanceof DefenceDraftConflictError) {
        const latest = await loadDefenceDraftSession(account).catch(() => null);
        if (isCurrent()) setDraftSession(latest);
      } else await persist().catch(() => undefined);
      if (controller.signal.aborted) toast.info('Draft generation stopped', { id: notice, description: 'Completed stages have been kept. Your presentation is unchanged.' });
      else {
        const message = e instanceof Error ? e.message : 'Draft generation failed. Your existing work is unchanged.';
        setError(message); toast.error('The draft could not be completed', { id: notice, description: message });
      }
    } finally {
      if (draftRequest.current === controller) { draftRequest.current = null; setBusy(false); setDraftProgress(null); }
      else toast.dismiss(notice);
    }
  };

  const editSlide = (patch: Partial<DefenceSlide>) => {
    setComparisonUndo(null);
    setDeck(current => current ? { ...current, updatedAt: new Date().toISOString(), slides: current.slides.map((slide, i) => i === slideIndex ? { ...slide, ...patch } : slide) } : null);
  };

  const resetSlide = () => {
    if (!selectedSlide || !deck || !window.confirm('Replace this slide with content from the reviewed study details? Your other nine slides will stay as they are.')) return;
    setUndo({ index: slideIndex, slide: selectedSlide });
    editSlide(buildDefenceSlide(slideIndex, deck.facts));
    toast.success('Slide restored from study details');
  };

  const applyRuleUpdate = () => {
    if (!ruleSuggestion || !selectedSlide || !deck) return;
    setUndo({ index: slideIndex, slide: selectedSlide });
    editSlide(ruleSuggestion);
    setRuleSuggestion(null);
    toast.success('Slide updated against the section rules');
  };

  const exportFile = async (kind: 'pptx' | 'notes') => {
    if (!deck || exporting) return;
    setExporting(true); setError('');
    const notice = toast.loading(kind === 'pptx' ? 'Preparing PowerPoint' : 'Preparing speaker notes');
    try {
      const issues = kind === 'pptx' ? validateDefenceDeck(deck, { allowDraft: true, allowEditedNotes: true }) : [];
      if (issues.length) throw new Error(issues[0]);
      if (kind === 'pptx' && blockingRuleFindings.length) throw new Error(blockingRuleFindings[0].detail);
      const blob = kind === 'pptx' ? await buildDefencePptx(deck) : new Blob([buildDefenceHandout(deck)], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const name = `${sanitizeFileName(deck.facts.topic.value).slice(0, 80)}${deck.testData ? '-TEST' : ''}${incomplete ? '-DRAFT' : ''}-defence.${kind === 'pptx' ? 'pptx' : 'txt'}`;
      triggerBrowserDownload(url, name, { notify: false });
      window.setTimeout(() => URL.revokeObjectURL(url), 300000);
      toast.success('Download started', { id: notice, description: name });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'The export could not be prepared. Please retry.';
      setError(message); toast.error('Download could not start', { id: notice, description: message });
    } finally { setExporting(false); }
  };

  const resume = (id: string) => {
    const existing = saved.find(d => d.id === id);
    if (!existing) return;
    setDeck(existing); setFacts(existing.facts); setDuration(existing.durationMinutes); setTestData(Boolean(existing.testData));
    setEvidence(readDefenceEvidence(existing.evidence));
    setSourceSnapshot(readDefenceSourceSnapshot(existing.sourceSnapshot)); setComparisonOpen(false); setComparisonUndo(null);
    setSource({ name: existing.sourceName, projectId: existing.projectId, version: existing.sourceVersion });
    setSlideIndex(0); setUndo(null); setStep('slides'); setError('');
  };

  if (workspaceOwner !== user?.id) return <DashboardLayout><WorkspacePage><p role="status">Loading your presentation workspace...</p></WorkspacePage></DashboardLayout>;
  return <DashboardLayout><WorkspacePage width="wide" className="space-y-6 pb-28">
    <header className="flex flex-wrap items-start justify-between gap-4 border-b pb-5">
      <div><p className="mb-2 flex items-center gap-2 text-sm text-muted-foreground"><Presentation size={16} />Proposal presentation</p><h1 className="text-2xl font-bold sm:text-3xl">Defence slides</h1></div>
      {deck && <div className="flex flex-wrap items-center gap-2"><span className="text-xs text-muted-foreground" role="status">{saveStatus}</span><Button variant="outline" disabled={busy} onClick={() => { setStep('source'); setError(''); }}><FileText size={16} className="mr-2" />New presentation</Button></div>}
    </header>
    <nav aria-label="Presentation steps" className="flex flex-wrap gap-1 border-b pb-3">
      {(['source', 'facts', 'slides'] as Step[]).map((item, i) => <Button key={item} variant={step === item ? 'secondary' : 'ghost'} disabled={busy || (item === 'facts' && !source.name) || (item === 'slides' && !deck)} onClick={() => { setStep(item); setError(''); }} className="gap-2"><span className="text-xs text-muted-foreground">{i + 1}.</span>{['Choose proposal', 'Review study details', 'Edit slides'][i]}</Button>)}
    </nav>
    {error && <Alert variant="destructive"><AlertTitle>Something needs attention</AlertTitle><AlertDescription>{error}{/key|401|403|quota|billing/i.test(error) && <Link to="/settings" className="ml-2 font-medium underline">Open Settings</Link>}</AlertDescription></Alert>}
    {storageWarning && <Alert className="border-amber-300"><AlertTitle>Device recovery needs attention</AlertTitle><AlertDescription>{storageWarning}</AlertDescription></Alert>}
    {recoveringDraft && <p role="status" className="text-sm text-muted-foreground">Checking saved draft progress...</p>}
    {draftSession && !busy && !pendingDraft && step !== 'slides' && <section aria-label="Saved draft progress" className="space-y-4 border-y py-5">
      <div><h2 className="font-semibold">Saved draft progress</h2><p className="mt-1 break-words text-sm leading-6">{draftSession.checkpoint.inputFacts.topic.value}</p><p className="mt-1 text-xs text-muted-foreground">{draftSession.checkpoint.completedStages.length} of 4 stages kept. {storageWarning ? 'Available in this open page.' : 'Saved on this device.'} Your presentation has not been replaced.</p></div>
      <ul className="grid gap-2 text-sm sm:grid-cols-2">{DEFENCE_DRAFT_STAGES.map(stage => <li key={stage} className="flex items-center gap-2">{draftSession.checkpoint.completedStages.includes(stage) ? <Check size={16} className="shrink-0 text-emerald-700" /> : <span className="h-4 w-4 shrink-0 rounded-full border" aria-hidden="true" />}<span>{DEFENCE_DRAFT_STAGE_LABELS[stage]}</span></li>)}</ul>
      {retrySeconds > 0 && nextDefenceDraftStage(draftSession.checkpoint) && <p role="status" className="text-sm text-amber-900">Google asked us to wait. Retry available in {retrySeconds} seconds. No request will be sent automatically.</p>}
      <div className="flex flex-wrap gap-3"><Button className="gap-2" disabled={recoveringDraft || retrySeconds > 0 && Boolean(nextDefenceDraftStage(draftSession.checkpoint))} onClick={() => generate(draftSession)}><RotateCcw size={16} />{nextDefenceDraftStage(draftSession.checkpoint) ? 'Resume saved draft' : 'Review completed draft'}</Button><Button variant="ghost" onClick={() => discardProgress()}>Discard progress</Button></div>
    </section>}

    {step === 'source' && <section className="max-w-3xl space-y-6">
      {saved.length > 0 && <div className="space-y-2 border-b pb-6"><Label htmlFor="saved-defence">Continue a saved presentation</Label><select id="saved-defence" className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm" value="" onChange={e => resume(e.target.value)}><option value="">Choose a presentation</option>{saved.map(d => <option key={d.id} value={d.id}>{d.testData ? 'Test: ' : ''}{d.facts.topic.value} - {new Date(d.updatedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</option>)}</select></div>}
      <Tabs value={mode} onValueChange={v => { setMode(v as SourceMode); setError(''); }}><TabsList className="grid h-auto w-full grid-cols-3"><TabsTrigger value="project" className="min-h-10 whitespace-normal">Saved proposal</TabsTrigger><TabsTrigger value="upload" className="min-h-10">Upload</TabsTrigger><TabsTrigger value="topic" className="min-h-10">Topic only</TabsTrigger></TabsList></Tabs>
      {mode === 'project' && <div className="space-y-3"><Label htmlFor="defence-project">Your research proposal</Label><select id="defence-project" className="flex h-12 w-full rounded-md border border-input bg-background px-3 text-sm" value={projectId} onChange={e => setProjectId(e.target.value)} disabled={isLoading}><option value="">{isLoading ? 'Loading proposals...' : 'Choose a saved proposal'}</option>{proposals.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select>{!isLoading && !proposals.length && <p className="text-sm text-muted-foreground">No saved proposals yet. <Link className="font-medium text-primary underline" to="/projects/new?type=proposal">Start a proposal</Link>, upload an existing one, or use a topic.</p>}</div>}
      {mode === 'upload' && <div className="space-y-3"><Label htmlFor="defence-upload">Proposal document</Label><div className="rounded-md border border-dashed p-5"><Upload size={22} className="mb-3 text-muted-foreground" /><Input id="defence-upload" type="file" accept=".pdf,.docx,.txt" onChange={e => setFile(e.target.files?.[0] || null)} className="h-auto py-3" /><p className="mt-3 text-xs text-muted-foreground">PDF, DOCX or TXT. Up to 25 MB and 100 pages. Your document is read on this device.</p></div></div>}
      {mode === 'topic' && <div className="space-y-3"><Label htmlFor="defence-topic">Research topic</Label><Textarea id="defence-topic" rows={5} value={topic} onChange={e => setTopic(e.target.value)} placeholder="Enter your full research topic" /><p className="text-sm text-muted-foreground">You can add your objectives and planned methods in the next step.</p></div>}
      <Button onClick={readSource} disabled={busy || isLoading || (mode === 'project' && !projectId) || (mode === 'upload' && !file) || (mode === 'topic' && !topic.trim())} className="gap-2">{busy ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}{busy ? 'Reading proposal...' : 'Review study details'}</Button>
      <p className="border-t pt-4 text-sm leading-6 text-muted-foreground">Ten slides for a proposal defence. Follow your school's required format where it differs.</p>
    </section>}

    {step === 'facts' && <section className="space-y-6" aria-busy={busy}>
      {draftProgress && <div className="space-y-3"><OperationProgress title="Drafting defence slides" stage={draftProgress.message} value={draftProgress.completed} activeStep={DEFENCE_DRAFT_STAGES.indexOf(draftProgress.stage)} steps={DEFENCE_DRAFT_STAGES.map(stage => DEFENCE_DRAFT_STAGE_LABELS[stage])} /><Button variant="outline" onClick={() => draftRequest.current?.abort()}>Stop and keep progress</Button></div>}
      {!draftProgress && <fieldset disabled={busy} className="min-w-0 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><h2 className="text-xl font-semibold">Review your study details</h2><p className="mt-1 max-w-3xl break-words text-sm text-muted-foreground">{source.name}</p></div><div className="flex items-center gap-3"><Label htmlFor="defence-duration">Duration</Label><select id="defence-duration" className="h-10 rounded-md border bg-background px-3 text-sm" value={duration} onChange={e => setDuration(Number(e.target.value))}>{[5, 8, 10, 12, 15, 20].map(n => <option key={n} value={n}>{n} minutes</option>)}</select></div></div>
      <div className="flex items-center gap-3 border-b pb-4"><Checkbox id="defence-test-data" checked={testData} onCheckedChange={value => setTestData(value === true)} /><Label htmlFor="defence-test-data">Test presentation</Label></div>
      {draftable.length > 0 && <div className="flex items-start gap-3 border-y py-4"><Checkbox id="defence-draft-missing" checked={draftMissing} onCheckedChange={value => setDraftMissing(value === true)} /><div className="space-y-2"><Label htmlFor="defence-draft-missing">Draft missing sections with Gemini</Label><p className="max-w-3xl text-sm leading-6 text-muted-foreground">{draftable.length} sections can be drafted. Existing writing stays unchanged. New methods are suggestions for your review, not approved study facts. Your Gemini key is used for generation. <Link to="/settings" className="font-medium text-primary underline">Research key settings</Link></p></div></div>}
      {suggested.length > 0 && <p className="border-l-4 border-sky-500 bg-sky-50 p-4 text-sm text-sky-950">{suggested.length} suggested details still need your review. Confirm each only after checking it against your planned study and sources.</p>}
      {missing.length > 0 && <Alert className="border-amber-300 bg-amber-50 text-amber-950"><AlertTitle>{missing.length} details still needed</AlertTitle><AlertDescription>{missing.map(f => f.label).join(', ')}. You can continue with a working draft.</AlertDescription></Alert>}
      <RuleFindings findings={factFindings} onSuggestion={finding => { if (finding.suggestion) changeFact(finding.key, finding.suggestion); }} />
      <div className="space-y-7">
        {(['Identity', 'Study focus', 'Methods', 'Sources'] as const).map(group => <section key={group} className="border-b pb-6">
          <h3 className="mb-4 text-base font-semibold">{group}</h3>
          <div className="grid min-w-0 gap-x-6 gap-y-5 md:grid-cols-2">
            {DEFENCE_FACT_FIELDS.filter(f => f.group === group).map(field => <div key={field.key} className={cn('min-w-0 space-y-2', ['topic', 'objectives', 'questions', 'references'].includes(field.key) && 'md:col-span-2')}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor={`fact-${field.key}`}>{field.label}{field.required && <span className="ml-1 text-amber-700">*</span>}</Label>
                <span className={cn('text-xs', facts[field.key].status === 'missing' ? 'text-amber-800' : 'text-muted-foreground')}>
                  {facts[field.key].draft ? 'Suggested draft' : facts[field.key].status === 'missing' ? facts[field.key].value.trim() ? 'Needs completion' : 'Not supplied' : facts[field.key].status === 'confirmed' ? 'Your entry' : 'From proposal'}
                </span>
              </div>
              {field.multiline ? <Textarea id={`fact-${field.key}`} rows={field.key === 'references' ? 6 : 4} value={facts[field.key].value} onChange={e => changeFact(field.key, e.target.value)} /> : <Input id={`fact-${field.key}`} value={facts[field.key].value} onChange={e => changeFact(field.key, e.target.value)} />}
              {facts[field.key].source && <p className="break-words text-xs text-muted-foreground">{factSourceLabel(facts[field.key].source, field.label)}</p>}
              {facts[field.key].draft && <Button type="button" size="sm" variant="outline" className="gap-2" onClick={() => setFacts(current => ({ ...current, [field.key]: { ...current[field.key], draft: false, status: 'confirmed', source: `Reviewed by student; ${current[field.key].source}` } }))}><Check size={14} />Confirm reviewed detail</Button>}
            </div>)}
          </div>
        </section>)}
      </div>
      <DefenceEvidenceReview key={`${user?.id}:${source.name}:${source.version || ''}`} facts={facts} records={evidence} onChange={(next, records) => { setFacts(next); setEvidence(records); }} onReview={field => { if (field) document.getElementById(`fact-${field}`)?.focus(); }} />
      <div className="sticky bottom-3 z-20 flex flex-wrap items-center justify-between gap-3 rounded-md border bg-background/95 p-4 shadow-lg backdrop-blur"><p className="text-sm text-muted-foreground">{missing.length || suggested.length ? 'Working draft for review' : 'Study details ready'}<span className="block text-xs">{resumeMatches ? 'Completed stages will be reused.' : 'Saved on this device when slides are created.'}</span></p><Button className="gap-2" disabled={busy || recoveringDraft || draftMissing && draftable.length > 0 && retrySeconds > 0 && !(resumeMatches && draftSession && !nextDefenceDraftStage(draftSession.checkpoint))} onClick={() => generate()}>{busy ? <Loader2 size={16} className="animate-spin" /> : draftMissing && draftable.length ? <Sparkles size={16} /> : <Presentation size={16} />}{busy ? 'Drafting...' : draftMissing && draftable.length ? resumeMatches && draftSession ? nextDefenceDraftStage(draftSession.checkpoint) ? 'Resume draft' : 'Review completed draft' : 'Generate draft slides' : deck ? 'Create new version' : 'Create 10 slides'}</Button></div>
      </fieldset>}
    </section>}

    {step === 'slides' && deck && selectedSlide && <section className="space-y-5">
      {deck.testData && <p className="border-l-4 border-sky-500 bg-sky-50 px-4 py-3 text-sm text-sky-950">Test version. Demonstration details are not for academic submission.</p>}
      {selectedSlide.rulesVersion !== DEFENCE_RULES_VERSION && <Alert className="border-sky-300 bg-sky-50 text-sky-950"><AlertTitle>This slide uses earlier wording</AlertTitle><AlertDescription className="space-y-3"><p>Review the updated wording against the current section requirements.</p><Button variant="outline" size="sm" onClick={() => setRuleSuggestion(buildDefenceSlide(slideIndex, deck.facts))}>Review updated wording</Button></AlertDescription></Alert>}
      {projectChanged && <Alert className="border-amber-300"><AlertTitle>The saved proposal has changed</AlertTitle><AlertDescription className="space-y-3"><p>This presentation uses an earlier proposal version. Compare the latest fields before choosing which slides to update.</p><Button type="button" size="sm" variant="outline" onClick={() => setComparisonOpen(true)}>Compare with latest proposal</Button></AlertDescription></Alert>}
      {sourceUnavailable && <Alert className="border-amber-300"><AlertTitle>The linked proposal is unavailable</AlertTitle><AlertDescription>Your saved presentation and source fields are kept. Reopen the proposal or compare another version before updating the slides.</AlertDescription></Alert>}
      {incomplete && <div className="flex flex-wrap items-center justify-between gap-3 border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-950"><span>{Object.values(deck.facts).some(fact => fact.draft) ? 'Working draft: review and confirm the suggested study details and sources.' : missingDefenceFacts(deck.facts).length ? `Working draft: ${missingDefenceFacts(deck.facts).length} study details need completion.` : 'Working draft: review section findings and unresolved slide wording.'}</span><Button size="sm" variant="outline" onClick={() => { setFacts(deck.facts); setStep('facts'); }}>Review details</Button></div>}
      {deck.generationWarnings?.length ? <details className="border-b py-3 text-sm"><summary className="cursor-pointer font-semibold">Draft review notes</summary><ul className="mt-3 list-disc space-y-2 pl-5 leading-6">{deck.generationWarnings.map((warning, i) => <li key={i}>{warning}</li>)}</ul></details> : null}
      <DefenceConsistencyReview key={`consistency:${user?.id}:${deck.id}`} deck={deck} latest={latestProposalSnapshot} sourceUnavailable={sourceUnavailable} open={comparisonOpen} onOpenChange={setComparisonOpen} canUndo={Boolean(comparisonUndo)} onUndo={() => { if (!comparisonUndo) return; const previous = { ...comparisonUndo, updatedAt: new Date().toISOString() }; setDeck(previous); setFacts(previous.facts); setSource({ name: previous.sourceName, projectId: previous.projectId, version: previous.sourceVersion }); setComparisonUndo(null); toast.success('Comparison update undone'); }} onApply={next => { setComparisonUndo(deck); setUndo(null); setDeck(next); setFacts(next.facts); setSource({ name: next.sourceName, projectId: next.projectId, version: next.sourceVersion }); }} onEdit={index => { setSlideIndex(index); setEditorTab('content'); setComparisonOpen(false); window.setTimeout(() => document.getElementById('defence-slide-bullets')?.focus(), 0); }} />
      <DefenceEvidenceReview key={`evidence:${user?.id}:${deck.id}`} facts={deck.facts} records={readDefenceEvidence(deck.evidence)} slides={deck.slides} onChange={(next, records) => { setComparisonUndo(null); setFacts(next); setEvidence(records); setDeck(current => current ? { ...current, facts: next, evidence: records, updatedAt: new Date().toISOString() } : current); }} onReview={(field, index) => { if (index !== undefined) { setSlideIndex(index); setEditorTab('content'); document.getElementById('defence-slide-bullets')?.focus(); } else { setFacts(deck.facts); setStep('facts'); window.setTimeout(() => document.getElementById(`fact-${field || 'references'}`)?.focus(), 0); } }} />
      {visibleContentIssues.length > 0 && <Alert className="border-amber-300"><AlertTitle>Review these slides before downloading</AlertTitle><AlertDescription><ul className="list-disc pl-4">{visibleContentIssues.map((issue, i) => <li key={i}>{issue}</li>)}</ul>Keep key points on the slide and move supporting detail to speaker notes.</AlertDescription></Alert>}
      <RuleFindings findings={deckFindings.filter(finding => selectedSlide.sourceKeys.includes(finding.key))} />
      {slidesNeedingRules.some(({ index }) => index !== slideIndex) && <div className="flex flex-wrap items-center gap-3 border-b pb-4 text-sm"><span>Before downloading, review:</span>{slidesNeedingRules.filter(({ index }) => index !== slideIndex).map(({ slide, index }) => <Button key={slide.id} size="sm" variant="outline" className="gap-2" onClick={() => { setSlideIndex(index); setEditorTab('content'); }}>Slide {index + 1}: {slide.title}<ArrowRight size={14} /></Button>)}</div>}
      <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><Button size="icon" variant="outline" aria-label="Previous slide" title="Previous slide" disabled={!slideIndex} onClick={() => setSlideIndex(i => i - 1)}><ChevronLeft size={18} /></Button><span className="w-24 text-center text-sm">Slide {slideIndex + 1} of 10</span><Button size="icon" variant="outline" aria-label="Next slide" title="Next slide" disabled={slideIndex === 9} onClick={() => setSlideIndex(i => i + 1)}><ChevronRight size={18} /></Button></div><Button variant="outline" onClick={() => { setRehearsing(true); setRunning(false); }} className="gap-2"><Play size={16} />Rehearse</Button></div>
      <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[190px_minmax(0,1fr)]">
        <nav aria-label="Slides" className="flex gap-2 overflow-x-auto pb-2 xl:flex-col xl:overflow-visible">{deck.slides.map((slide, i) => <button key={slide.id} aria-current={i === slideIndex ? 'step' : undefined} onClick={() => { setSlideIndex(i); setEditorTab('content'); }} className={cn('flex min-h-12 w-40 shrink-0 items-start gap-3 rounded-md border px-3 py-3 text-left text-sm xl:w-full', i === slideIndex ? 'border-primary bg-primary/5 font-medium' : 'border-transparent hover:bg-muted')}><span className="mt-0.5 w-5 shrink-0 text-xs text-muted-foreground">{String(i + 1).padStart(2, '0')}</span><span className="min-w-0 break-words">{i === 0 ? 'Title and candidate' : slide.title}</span></button>)}</nav>
        <div className="min-w-0 space-y-5"><SlidePreview slide={selectedSlide} index={slideIndex} draft={incomplete} testData={deck.testData} />
          <div className="flex items-center justify-end gap-3"><Label htmlFor="defence-text-size">Text size</Label><select id="defence-text-size" className="h-10 rounded-md border bg-background px-3 text-sm" value={selectedSlide.bodyFontSize || 'auto'} onChange={e => editSlide({ bodyFontSize: e.target.value === 'auto' ? undefined : Number(e.target.value) as DefenceSlide['bodyFontSize'] })}><option value="auto">Auto ({defenceSlideLayout(selectedSlide, slideIndex).bodyFontSize} pt)</option>{[24, 22, 20, 18].map(size => <option key={size} value={size}>{size} pt</option>)}</select></div>
          {selectedRules.length > 0 && <details className="border-y py-4"><summary className="cursor-pointer text-sm font-semibold">Section requirements</summary><div className="mt-4 space-y-5">{selectedRules.map(({ key, rule }) => <section key={key}><h3 className="text-sm font-semibold">{DEFENCE_FACT_FIELDS.find(field => field.key === key)?.label}</h3><p className="mt-1 text-sm leading-6">{rule.purpose}</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">{rule.requirements.map((requirement, i) => <li key={i}>{requirement}</li>)}</ul></section>)}</div></details>}
          <section className="min-w-0 border-y py-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><Tabs value={editorTab} onValueChange={setEditorTab}><TabsList><TabsTrigger value="content">Slide content</TabsTrigger><TabsTrigger value="notes">Speaker notes</TabsTrigger><TabsTrigger value="source">Source text</TabsTrigger></TabsList></Tabs><div className="flex gap-2">{undo?.index === slideIndex && <Button size="sm" variant="ghost" onClick={() => { editSlide(undo.slide); setUndo(null); }}>Undo slide change</Button>}<Button size="sm" variant="outline" onClick={resetSlide} className="gap-2"><RotateCcw size={14} />Restore slide</Button></div></div>
            {editorTab === 'content' && <div className="space-y-4">
              <div className="space-y-2"><Label htmlFor="defence-slide-title">Slide title</Label><Textarea id="defence-slide-title" rows={slideIndex === 0 ? 3 : 2} value={selectedSlide.title} onChange={e => editSlide({ title: e.target.value })} /></div>
              {['objectives', 'questions-scope'].includes(selectedSlide.role) && <div className="flex items-start gap-3 rounded-md border p-3">
                <Checkbox id="defence-concise-approval" checked={Boolean(selectedSlide.approvedShortening)} onCheckedChange={value => editSlide({ approvedShortening: value === true })} />
                <div><Label htmlFor="defence-concise-approval">Use my shorter presentation wording</Label><p className="mt-1 text-xs leading-5 text-muted-foreground">Each objective and question must still retain the exact study issue, population, ages and setting. Full source wording stays in PowerPoint notes.</p></div>
              </div>}
              <div className="space-y-2"><Label htmlFor="defence-slide-bullets">Key points</Label><Textarea id="defence-slide-bullets" rows={8} value={selectedSlide.bullets.join('\n')} onChange={e => editSlide({ bullets: e.target.value.split('\n') })} /><p className="text-xs text-muted-foreground">One point per line</p></div>
            </div>}
            {editorTab === 'notes' && <div className="space-y-2"><Label htmlFor="defence-slide-notes">Speaker notes</Label><Textarea id="defence-slide-notes" rows={13} value={selectedSlide.notes} onChange={e => editSlide({ notes: e.target.value })} /></div>}
            {editorTab === 'source' && <div className="space-y-4">{selectedSlide.sourceKeys.map(key => <div key={key}><h3 className="text-sm font-semibold">{DEFENCE_FACT_FIELDS.find(f => f.key === key)?.label}</h3><p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6">{deck.facts[key].value || 'Not supplied'}</p><p className="mt-1 text-xs text-muted-foreground">{factSourceLabel(deck.facts[key].source, key)}</p></div>)}</div>}
          </section>
        </div>
      </div>
      <section className="border-b py-4"><h2 className="text-base font-semibold">Prepare for questions</h2><ul className="mt-3 grid gap-3 text-sm leading-6 md:grid-cols-2"><li>Why is this problem worth studying in your chosen setting?</li><li>How does each objective connect to your questions and data collection tools?</li><li>Why do the design, sample size and sampling method fit this study?</li><li>How will you protect participants and handle limitations?</li></ul></section>
      <div className="sticky bottom-3 z-20 flex flex-wrap items-center justify-between gap-3 rounded-md border bg-background/95 p-4 shadow-lg backdrop-blur"><div className="text-sm"><span className="font-medium">{incomplete ? 'Working draft' : 'Ten-slide presentation'}</span><span className="block text-xs text-muted-foreground">{deck.durationMinutes} minutes | {saveStatus || 'Saving...'}</span></div><div className="flex flex-wrap gap-2"><Button variant="outline" disabled={exporting} onClick={() => exportFile('notes')} className="gap-2"><FileText size={16} />Speaker notes</Button><Button disabled={exporting || layoutIssues.length > 0 || contentIssues.length > 0 || blockingRuleFindings.length > 0} onClick={() => exportFile('pptx')} className="gap-2">{exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}{incomplete ? 'Download draft PPTX' : 'Download PowerPoint'}</Button></div></div>
    </section>}

    <Dialog open={Boolean(pendingDraft && draftSession)} onOpenChange={open => { if (!open && !applyingDraft) setPendingDraft(null); }}>
      <DialogContent className="max-h-[90dvh] max-w-4xl overflow-y-auto">
        <DialogHeader><DialogTitle>Review your generated draft</DialogTitle></DialogHeader>
        {pendingDraft && <>
          <p className="text-sm leading-6 text-muted-foreground">Only missing sections were drafted. Your original details are unchanged. These suggestions are not confirmed research facts.</p>
          <ul className="list-disc space-y-2 border-y py-4 pl-5 text-sm leading-6">{pendingDraft.warnings.map((warning, i) => <li key={i}>{warning}</li>)}</ul>
          <div className="space-y-5">{pendingDraft.generatedKeys.map(key => <section key={key} className="border-b pb-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{DEFENCE_FACT_FIELDS.find(field => field.key === key)?.label}</h3><span className="text-xs text-muted-foreground">{defenceWordCount(pendingDraft.facts[key].value)} words</span></div><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{pendingDraft.facts[key].value}</p></section>)}</div>
          <div className="sticky -bottom-6 flex flex-wrap justify-end gap-3 border-t bg-background py-4"><Button variant="outline" disabled={applyingDraft} onClick={() => discardProgress()}>Discard draft</Button><Button disabled={applyingDraft} onClick={applyPendingDraft}>{applyingDraft ? 'Saving presentation...' : 'Use draft and create slides'}</Button></div>
        </>}
      </DialogContent>
    </Dialog>
    <Dialog open={rehearsing} onOpenChange={value => { setRehearsing(value); if (!value) setRunning(false); }}>
      <DialogContent className="max-h-[95dvh] w-[calc(100%-1rem)] max-w-6xl overflow-y-auto p-4 sm:p-6">
        <DialogHeader><DialogTitle>Defence rehearsal</DialogTitle></DialogHeader>
        {deck && selectedSlide && <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span role="timer" className={cn('w-28 font-mono text-lg tabular-nums', seconds >= duration * 60 && 'text-red-700')}>{timeLabel(seconds)}</span>
            <Button size="icon" variant="outline" title={running ? 'Pause timer' : 'Start timer'} aria-label={running ? 'Pause timer' : 'Start timer'} onClick={() => setRunning(v => !v)}>{running ? <Pause size={16} /> : <Play size={16} />}</Button>
            <Button size="icon" variant="ghost" title="Reset timer" aria-label="Reset timer" onClick={() => { setRunning(false); setSeconds(0); }}><RotateCcw size={16} /></Button>
            <span className="text-sm text-muted-foreground">{duration}-minute presentation</span>
          </div>
          <SlidePreview slide={selectedSlide} index={slideIndex} draft={incomplete} testData={deck.testData} />
          <div className="flex items-center justify-between gap-3"><Button variant="outline" disabled={!slideIndex} onClick={() => setSlideIndex(i => i - 1)}><ArrowLeft size={16} className="mr-2" />Previous</Button><span className="text-sm">{slideIndex + 1} / 10</span><Button variant="outline" disabled={slideIndex === 9} onClick={() => setSlideIndex(i => i + 1)}>Next<ArrowRight size={16} className="ml-2" /></Button></div>
          <div className="border-t pt-4"><h3 className="mb-2 font-semibold">Speaker notes</h3><p className="whitespace-pre-wrap break-words text-sm leading-6">{selectedSlide.notes}</p></div>
        </div>}
      </DialogContent>
    </Dialog>
    <Dialog open={Boolean(ruleSuggestion)} onOpenChange={value => { if (!value) setRuleSuggestion(null); }}>
      <DialogContent className="max-h-[90dvh] max-w-5xl overflow-y-auto">
        <DialogHeader><DialogTitle>Review the updated slide wording</DialogTitle></DialogHeader>
        {ruleSuggestion && selectedSlide && <>
          <div className="grid gap-6 md:grid-cols-2">
            <section><h3 className="mb-3 font-semibold">Current wording</h3><ul className="list-disc space-y-3 pl-5 text-sm leading-6">{selectedSlide.bullets.map((point, i) => <li key={i}>{point}</li>)}</ul></section>
            <section><h3 className="mb-3 font-semibold">Against the section rules</h3><ul className="list-disc space-y-3 pl-5 text-sm leading-6">{ruleSuggestion.bullets.map((point, i) => <li key={i}>{point}</li>)}</ul></section>
          </div>
          <div className="flex flex-wrap justify-end gap-3 border-t pt-4"><Button variant="outline" onClick={() => setRuleSuggestion(null)}>Keep current wording</Button><Button onClick={applyRuleUpdate}>Apply updated wording</Button></div>
        </>}
      </DialogContent>
    </Dialog>
  </WorkspacePage></DashboardLayout>;
}
