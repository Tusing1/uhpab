import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { ChapterWorkspace } from './chapterWorkspace';
import { validateChapterWorkspace } from './chapterWorkspace';

const remoteUser = (id: string) => /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id);
const dbClient = () => {
  if (!supabase) throw new Error('Cloud storage is not configured. Your draft has not been saved.');
  return supabase as SupabaseClient;
};
async function localDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('uhpab-chapter-drafts', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('drafts', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Browser storage is unavailable. Your draft has not been saved.'));
  });
}
export async function listChapterWorkspaces(userId: string): Promise<ChapterWorkspace[]> {
  if (remoteUser(userId)) {
    const { data, error } = await dbClient().from('chapter_workspaces').select('payload,version,updated_at').eq('user_id', userId).order('updated_at', { ascending: false });
    if (error) throw new Error(`Chapter drafts could not be loaded. ${error.message}`);
    return (data || []).map(row => ({ ...row.payload, version: row.version, updatedAt: row.updated_at }));
  }
  const db = await localDb();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction('drafts').objectStore('drafts').getAll();
      request.onsuccess = () => resolve((request.result as ChapterWorkspace[]).filter(w => w.userId === userId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
      request.onerror = () => reject(new Error('Could not read browser drafts.'));
    });
  } finally { db.close(); }
}
export async function saveChapterWorkspace(w: ChapterWorkspace): Promise<ChapterWorkspace> {
  validateChapterWorkspace(w);
  const next = { ...w, version: w.version + 1, updatedAt: new Date().toISOString() };
  if (remoteUser(w.userId)) {
    const { data, error } = await dbClient().rpc('save_chapter_workspace', { p_id: w.id, p_expected_version: w.version, p_payload: w });
    if (error) throw new Error(`Draft not saved. ${error.message}`);
    return { ...data.payload, version: data.version, updatedAt: data.updated_at };
  }
  const db = await localDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('drafts', 'readwrite');
      const store = tx.objectStore('drafts');
      let reason = 'Could not save to browser storage.';
      const request = store.get(w.id);
      request.onsuccess = () => {
        const current = request.result as ChapterWorkspace | undefined;
        if ((current && (current.userId !== w.userId || current.version !== w.version)) || (!current && w.version !== 0)) {
          reason = 'This draft changed in another tab. Download your current text before reloading.'; tx.abort(); return;
        }
        store.put(next);
      };
      tx.oncomplete = () => resolve();
      tx.onabort = tx.onerror = () => reject(new Error(reason));
    });
    return next;
  } finally { db.close(); }
}
export async function deleteChapterWorkspace(w: ChapterWorkspace) {
  if (remoteUser(w.userId)) {
    const { data, error } = await dbClient().from('chapter_workspaces').delete().eq('id', w.id).eq('user_id', w.userId).eq('version', w.version).select('id');
    if (error || !data?.length) throw new Error(error?.message || 'Draft changed. Reload before deleting.');
    return;
  }
  const db = await localDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('drafts', 'readwrite');
      const store = tx.objectStore('drafts');
      const req = store.get(w.id);
      req.onsuccess = () => {
        if (req.result?.userId !== w.userId || req.result?.version !== w.version) tx.abort();
        else store.delete(w.id);
      };
      tx.oncomplete = () => resolve(); tx.onabort = tx.onerror = () => reject(new Error('Draft changed or could not be deleted. Reload and try again.'));
    });
  } finally { db.close(); }
}
export type TransferMode = 'skip' | 'append' | 'replace';
export async function transferChapterWorkspace(w: ChapterWorkspace, projectId: string, updatedAt: string, modes: Record<string, TransferMode>) {
  const { error } = await dbClient().rpc('transfer_chapter_workspace', { p_workspace_id: w.id, p_workspace_version: w.version, p_project_id: projectId, p_project_updated_at: updatedAt, p_modes: modes });
  if (error) throw new Error(`Project unchanged. ${error.message}`);
}
