import { z } from 'zod';
import { readDefenceDraftCheckpoint, sameDefenceDraftInput, type DefenceDraftCheckpoint } from './defenceDraftCheckpoint';
import type { DefenceFacts } from './defenceSlides';

const sourceSchema = z.object({ name: z.string().min(1).max(1000), projectId: z.string().max(200).optional(), version: z.string().max(200).optional() }).strict();
const sessionSchema = z.object({
  id: z.string().min(1).max(200), ownerId: z.string().min(1).max(200), source: sourceSchema,
  durationMinutes: z.number().positive().max(120), testData: z.boolean(), retryAt: z.number().finite().nonnegative().optional(),
  updatedAt: z.string().datetime(), checkpoint: z.unknown(),
}).strict();
export interface DefenceDraftSession {
  id: string;
  ownerId: string;
  source: { name: string; projectId?: string; version?: string };
  durationMinutes: number;
  testData: boolean;
  updatedAt: string;
  retryAt?: number;
  checkpoint: DefenceDraftCheckpoint;
}
export class DefenceDraftConflictError extends Error {}

export function readDefenceDraftSession(value: unknown, ownerId: string): DefenceDraftSession | null {
  const parsed = sessionSchema.safeParse(value);
  if (!parsed.success || parsed.data.ownerId !== ownerId) return null;
  const checkpoint = readDefenceDraftCheckpoint(parsed.data.checkpoint);
  return checkpoint ? { ...parsed.data, source: { name: parsed.data.source.name, projectId: parsed.data.source.projectId, version: parsed.data.source.version }, id: parsed.data.id, ownerId: parsed.data.ownerId, durationMinutes: parsed.data.durationMinutes, testData: parsed.data.testData, updatedAt: parsed.data.updatedAt, checkpoint } : null;
}

export const defenceDraftSessionMatches = (session: DefenceDraftSession, facts: DefenceFacts, source: DefenceDraftSession['source']) =>
  sameDefenceDraftInput(facts, session.checkpoint.inputFacts) && source.name === session.source.name && source.projectId === session.source.projectId && source.version === session.source.version;

const openDb = () => new Promise<IDBDatabase>((resolve, reject) => {
  if (typeof indexedDB === 'undefined') { reject(new Error('Device recovery is unavailable. Progress will remain in this open page only.')); return; }
  const request = indexedDB.open('uhpab-defence-draft-recovery', 1);
  request.onupgradeneeded = () => request.result.createObjectStore('sessions', { keyPath: 'ownerId' });
  request.onerror = () => reject(new Error('Draft progress could not be saved on this device. Keep this page open to resume.'));
  request.onblocked = () => reject(new Error('Close other draft tabs to enable device recovery. Keep this page open.'));
  request.onsuccess = () => resolve(request.result);
});

export async function loadDefenceDraftSession(ownerId: string): Promise<DefenceDraftSession | null> {
  if (!ownerId) return null;
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction('sessions').objectStore('sessions').get(ownerId);
      request.onsuccess = () => {
        const saved = request.result === undefined ? null : readDefenceDraftSession(request.result, ownerId);
        if (request.result !== undefined && !saved) reject(new Error('Earlier draft progress is incompatible or damaged. Your saved presentations are unchanged; start a new draft.'));
        else resolve(saved);
      };
      request.onerror = () => reject(new Error('Saved draft progress could not be opened.'));
    });
  } finally { db.close(); }
}

export async function saveDefenceDraftSession(session: DefenceDraftSession, replace = false): Promise<void> {
  if (!readDefenceDraftSession(session, session.ownerId)) throw new Error('Invalid draft recovery data. Nothing was saved.');
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('sessions', 'readwrite'), store = tx.objectStore('sessions');
      let conflict = false;
      const current = store.get(session.ownerId);
      current.onsuccess = () => {
        const saved = current.result;
        const staleStage = saved?.id === session.id && saved.checkpoint?.completedStages?.length > session.checkpoint.completedStages.length;
        const coolingDown = saved?.retryAt > Date.now() && (session.retryAt || 0) < saved.retryAt;
        if (saved && (saved.id !== session.id && !replace || saved.id === session.id && saved.updatedAt > session.updatedAt || staleStage || coolingDown)) { conflict = true; tx.abort(); return; }
        if (!current.result || current.result.id !== session.id || current.result.updatedAt <= session.updatedAt) store.put(session);
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error('Draft progress could not be saved. Keep this page open to resume.'));
      tx.onabort = () => reject(conflict ? new DefenceDraftConflictError('Newer draft progress or a retry delay is saved in another tab. Reopen it before continuing.') : new Error('Saving draft progress was interrupted. Keep this page open.'));
    });
  } finally { db.close(); }
}

export async function discardDefenceDraftSession(ownerId: string, sessionId: string): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('sessions', 'readwrite'), store = tx.objectStore('sessions');
      const request = store.get(ownerId);
      request.onsuccess = () => { if (request.result?.id === sessionId) store.delete(ownerId); };
      tx.oncomplete = () => resolve();
      tx.onerror = tx.onabort = () => reject(new Error('Saved draft progress could not be cleared.'));
    });
  } finally { db.close(); }
}

export async function withDefenceDraftLock<T>(ownerId: string, work: () => Promise<T>): Promise<T> {
  if (typeof navigator === 'undefined' || !navigator.locks) return work();
  return navigator.locks.request(`uhpab-defence-draft:${ownerId}`, { ifAvailable: true }, lock => {
    if (!lock) throw new DefenceDraftConflictError('Draft generation is already running in another tab. Continue there or wait for it to finish.');
    return work();
  });
}
