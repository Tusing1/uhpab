import { supabase } from '@/integrations/supabase/client';
import { getKeyRevision, getResearchKeys, setResearchKeys, type ResearchKey } from './aiKeys';

export function parseResearchKeys(value: unknown): ResearchKey[] {
  if (!Array.isArray(value) || value.length > 5) throw new Error('Keep no more than five research keys.');
  const keys = value.map(item => {
    if (!item || typeof item.id !== 'string' || typeof item.label !== 'string' || typeof item.value !== 'string' || !item.value.trim()) throw new Error('The saved key list could not be read.');
    return { id: item.id, label: item.label.slice(0, 60), value: item.value.trim() };
  });
  if (new Set(keys.map(key => key.value)).size !== keys.length) throw new Error('This key is already saved.');
  if (new Set(keys.map(key => key.id)).size !== keys.length) throw new Error('Each saved key needs a distinct identifier.');
  return keys;
}

export async function loadResearchKeys(userId: string, legacy = '') {
  if (!supabase || !/^[0-9a-f-]{36}$/i.test(userId)) return getResearchKeys();
  const revision = getKeyRevision();
  const { data, error } = await supabase.from('research_keyrings').select('keys').eq('user_id', userId).maybeSingle();
  if (error) {
    if (['42P01', 'PGRST205'].includes(error.code)) {
      const keys = legacy ? [{ id: 'legacy', label: 'Primary key', value: legacy }] : [];
      if (revision === getKeyRevision()) setResearchKeys(keys);
      return keys;
    }
    throw new Error('Your saved research keys could not be loaded. Please sign in again.');
  }
  const keys = data ? parseResearchKeys(data.keys) : legacy ? [{ id: 'legacy', label: 'Primary key', value: legacy }] : [];
  if (revision === getKeyRevision()) setResearchKeys(keys);
  return keys;
}

export async function saveResearchKeys(userId: string, values: ResearchKey[]) {
  const keys = parseResearchKeys(values);
  const revision = getKeyRevision();
  if (supabase && /^[0-9a-f-]{36}$/i.test(userId)) {
    const { data, error } = await supabase.from('research_keyrings').upsert({ user_id: userId, keys, updated_at: new Date().toISOString() }).select('user_id').single();
    if (error || !data) throw new Error(['42P01', 'PGRST205'].includes(error?.code || '') ? 'Multiple-key storage is not enabled yet. Please contact support.' : 'The keys could not be saved to your account. Your previous keys are unchanged.');
  }
  if (revision !== getKeyRevision()) throw new Error('The signed-in account or key selection changed. Reload Settings before continuing.');
  setResearchKeys(keys);
  return keys;
}
