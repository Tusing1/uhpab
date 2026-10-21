import { useEffect, useState } from 'react';
import { Check, KeyRound, Loader2, Star, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getBrowserGeminiApiKey, getResearchKeys, type ResearchKey } from '@/lib/aiKeys';
import { loadResearchKeys, saveResearchKeys } from '@/lib/researchKeys';
import { getGeminiApiKeyIssue, verifyGeminiApiKey } from '@/lib/geminiApiKey';

export default function ResearchKeySettings({ userId, onStatus }: { userId: string; onStatus: (saved: boolean) => void }) {
  const [keys, setKeys] = useState<ResearchKey[]>(getResearchKeys);
  const [draft, setDraft] = useState('');
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    setLoaded(false); setError('');
    loadResearchKeys(userId, getBrowserGeminiApiKey()).then(values => {
      if (active) { setKeys(values); setLoaded(true); onStatus(values.length > 0); }
    }).catch(() => { if (active) setError('Saved keys could not be loaded. Retry before making changes.'); });
    return () => { active = false; };
  }, [userId, onStatus, reload]);
  const run = async (action: () => Promise<void>) => {
    if (busy || !loaded) return;
    setBusy(true); setError(''); setMessage('');
    try { await action(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'The key could not be saved. Please retry.'); }
    finally { setBusy(false); }
  };
  const persist = async (next: ResearchKey[]) => {
    const saved = await saveResearchKeys(userId, next);
    setKeys(saved); onStatus(saved.length > 0);
  };
  const add = () => run(async () => {
    const value = draft.trim(), issue = getGeminiApiKeyIssue(value);
    if (issue) throw new Error(issue);
    if (keys.length >= 5) throw new Error('You can save up to five keys.');
    if (keys.some(key => key.value === value)) throw new Error('This key is already saved.');
    await verifyGeminiApiKey(value);
    await persist([...keys, {id:crypto.randomUUID(),label:label.trim() || `Research key ${keys.length + 1}`,value}]);
    setDraft(''); setLabel(''); setMessage('Key verified and saved.');
  });
  return <div className="min-w-0 space-y-5" aria-busy={busy}>
    <p className="text-sm text-muted-foreground">The first key is primary. A backup is tried only if Google rejects that key's authentication, never to bypass quota or billing limits. Keys in the same Google project share limits.</p>
    {!/^[0-9a-f-]{36}$/i.test(userId) && <p className="text-sm text-muted-foreground">Local preview: keys stay in this browser session. Sign in to a real account to save them securely to your account.</p>}
    <ul className="divide-y">{keys.map((key, index) => <li key={key.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="min-w-0"><p className="break-words text-sm font-medium">{key.label} · {index === 0 ? 'Primary' : 'Backup'}</p><p className="text-xs text-muted-foreground">Ends in {key.value.slice(-4)}</p></div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" disabled={busy || !loaded} onClick={() => run(async () => { await verifyGeminiApiKey(key.value); setMessage(`${key.label}: Google accepted this key. Generation quota was not tested.`); })}><Check size={16} className="mr-1"/>Test</Button>
        {index > 0 && <Button variant="outline" size="sm" disabled={busy || !loaded} onClick={() => run(async () => { await persist([key,...keys.filter(item=>item.id!==key.id)]); setMessage('Primary key updated.'); })}><Star size={16} className="mr-1"/>Make primary</Button>}
        <Button variant="ghost" size="icon" aria-label={`Remove ${key.label}`} title={`Remove ${key.label}`} disabled={busy || !loaded} onClick={() => { if(window.confirm(`Remove ${key.label} from your account?${keys.length===1?' Generation will need another key.':''}`)) void run(async()=>{await persist(keys.filter(item=>item.id!==key.id));setMessage('Key removed.');}); }}><Trash2 size={16}/></Button>
      </div>
    </li>)}</ul>
    {keys.length < 5 && <form autoComplete="off" className="space-y-3" onSubmit={event=>{event.preventDefault();void add();}}>
      <label className="grid gap-2 text-sm">Key name (optional)<Input name="researchKeyLabel" autoComplete="off" value={label} maxLength={60} disabled={busy || !loaded} onChange={e=>setLabel(e.target.value)} placeholder="For example, my backup key"/></label>
      <label className="grid gap-2 text-sm">Google AI Studio key <span className="sr-only">required</span><Input name="googleResearchCredential" type="password" required autoComplete="new-password" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={draft} disabled={busy || !loaded} onChange={e=>setDraft(e.target.value)} placeholder="Paste the complete key; spaces at the ends are removed"/></label>
      <Button type="submit" disabled={busy || !loaded || !draft.trim()}>{busy?<Loader2 size={16} className="mr-2 animate-spin"/>:<KeyRound size={16} className="mr-2"/>}Verify and add key</Button>
    </form>}
    {error && <div role="alert" className="space-y-2 text-sm text-red-700 dark:text-red-300"><p>{error}</p>{!loaded&&<Button variant="outline" onClick={()=>setReload(value=>value+1)}>Retry loading keys</Button>}</div>}
    {message && <p role="status" className="text-sm text-teal-700 dark:text-teal-300">{message}</p>}
  </div>;
}
