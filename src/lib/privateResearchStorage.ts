import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { StoredAnalysisRecord, DocumentFingerprint } from './documentAnalysisStore';
import type { AnalysisResult, DocumentType } from '@/utils/documentAnalysis';
import { isResearchDocumentExpired } from './researchRetention';
import { runtimeConfig } from './runtimeConfig';
export { defaultDocumentExpiry, isResearchDocumentExpired } from './researchRetention';

const BUCKET = 'research-private';
const db = supabase as SupabaseClient | null;
export const usesPrivateCloud = (userId: string) => /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(userId);
export const isPrivateResearchEnabled = (userId: string) => !usesPrivateCloud(userId) || Boolean(db && runtimeConfig.privateResearchReady);

type CloudRow = {
  id: string; user_id: string; file_name: string; file_type: string; file_size: number; file_last_modified: number;
  storage_path: string; sha256: string; page_count: number | null; document_type: DocumentType; component: string;
  result: AnalysisResult; engine_version: number; analysis_runs: number; cache_notes: string[];
  created_at: string; updated_at: string; expires_at: string | null; keep_document: boolean;
};
const recordFromRow = (row: CloudRow): StoredAnalysisRecord => ({
  id: row.id, userId: row.user_id, fileName: row.file_name, fileType: row.file_type, fileSize: row.file_size,
  fileLastModified: row.file_last_modified, contentHash: row.sha256, pageCount: row.page_count,
  documentType: row.document_type, component: row.component, result: row.result, engineVersion: row.engine_version,
  analysisRuns: row.analysis_runs, cacheNotes: row.cache_notes || [], createdAt: row.created_at, updatedAt: row.updated_at,
  file: new Blob(), storagePath: row.storage_path, expiresAt: row.expires_at, keepDocument: row.keep_document,
});
const fail = (error: unknown) => {
  if (error) throw new Error('Private document storage is unavailable. Your file has not been published. Please retry after the private-storage setup is completed.');
};

export const listPrivateResearchRecords = async (userId: string, limit: number) => {
  if (!isPrivateResearchEnabled(userId)) return [];
  const { data, error } = await db!.from('private_research_documents').select('*').eq('user_id', userId).order('updated_at', { ascending: false }).limit(limit);
  fail(error);
  return (data as CloudRow[]).map(recordFromRow);
};

export const getPrivateResearchRecord = async (id: string) => {
  if (!runtimeConfig.privateResearchReady) return null;
  if (!db) return null;
  const { data, error } = await db.from('private_research_documents').select('*').eq('id', id).maybeSingle();
  fail(error);
  return data ? recordFromRow(data as CloudRow) : null;
};

export const readPrivateResearchFile = async (record: StoredAnalysisRecord) => {
  if (isResearchDocumentExpired(record)) throw new Error('This document has reached its retention deadline. Upload it again to continue.');
  if (!record.storagePath) return record.file;
  const { data, error } = await db!.storage.from(BUCKET).download(record.storagePath);
  fail(error);
  return data!;
};

export const savePrivateResearchRecord = async (input: {
  userId: string; file: File; documentType: DocumentType; component: string; fingerprint: DocumentFingerprint;
  result: AnalysisResult; engineVersion: number; reusedFromId?: string; keepDocument?: boolean; cacheNotes?: string[];
}) => {
  if (!isPrivateResearchEnabled(input.userId)) throw new Error('Private marking is not available until secure storage and automatic cleanup are activated.');
  if (input.reusedFromId) {
    // Reading a cached result does not upload the file or extend its deadline.
    const record = await getPrivateResearchRecord(input.reusedFromId);
    if (record?.userId === input.userId) return record;
    throw new Error('The saved document is expired or unavailable. Run a fresh review.');
  }
  const ext = input.file.name.split('.').pop()?.toLowerCase();
  const mime = ext === 'pdf' ? 'application/pdf' : ext === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : ext === 'txt' ? 'text/plain' : '';
  if (!mime || input.file.size === 0 || input.file.size > 25 * 1024 * 1024) throw new Error('Private storage accepts PDF, DOCX or text files up to 25 MB.');
  const header = new Uint8Array(await input.file.slice(0, 5).arrayBuffer());
  if ((ext === 'pdf' && new TextDecoder().decode(header) !== '%PDF-') || (ext === 'docx' && (header[0] !== 80 || header[1] !== 75))) throw new Error('The file contents do not match its PDF or DOCX extension.');
  const id = crypto.randomUUID();
  const path = `${input.userId}/${id}/source.${ext}`;
  const { data, error } = await db!.from('private_research_documents').insert({
    id, user_id: input.userId, storage_path: path, file_name: input.file.name, file_type: mime, file_size: input.file.size,
    file_last_modified: input.file.lastModified, sha256: input.fingerprint.contentHash, page_count: input.fingerprint.pageCount,
    document_type: input.documentType, component: input.component, result: input.result, engine_version: input.engineVersion,
    cache_notes: input.cacheNotes || [], keep_document: input.keepDocument || false,
  }).select().single();
  fail(error);
  const { error: uploadError } = await db!.storage.from(BUCKET).upload(path, input.file, { contentType: mime, cacheControl: '0', upsert: false });
  if (uploadError) {
    await db!.storage.from(BUCKET).remove([path]);
    await db!.from('private_research_documents').delete().eq('id', id);
    fail(uploadError);
  }
  return recordFromRow(data as CloudRow);
};

export const keepPrivateResearchDocument = async (id: string, keep: boolean) => {
  const { data, error } = await db!.from('private_research_documents').update({ keep_document: keep }).eq('id', id).select().single();
  fail(error);
  return recordFromRow(data as CloudRow);
};

export const deletePrivateResearchDocument = async (id: string, userId: string) => {
  const record = await getPrivateResearchRecord(id);
  if (!record || record.userId !== userId) return false;
  const { error } = await db!.storage.from(BUCKET).remove([record.storagePath!]);
  fail(error);
  const { error: rowError } = await db!.from('private_research_documents').delete().eq('id', id);
  fail(rowError);
  return true;
};
