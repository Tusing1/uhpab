import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { feedbackSubmissionSchema, type FeedbackEvent, type FeedbackReport, type FeedbackStatus, type FeedbackSubmission } from './testerFeedback';

const db = supabase as SupabaseClient | null;
const columns = 'id,category,description,diagnostic,status,response,created_at,updated_at,expires_at,has_screenshot';
export const feedbackCloudAvailable = (userId?: string) => Boolean(db && userId && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(userId));
function client() {
  if (!db) throw new Error('Feedback requires an online account.');
  return db;
}
export async function submitTesterFeedback(report: FeedbackSubmission) {
  const parsed = feedbackSubmissionSchema.parse(report);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const { data, error } = await client().rpc('submit_tester_feedback', { p_report: parsed }).abortSignal(controller.signal);
    if (error) throw error;
    return z.object({ id: z.string().uuid(), createdAt: z.string(), duplicate: z.boolean() }).parse(data);
  } finally { clearTimeout(timeout); }
}
export async function feedbackReviewerAccess() {
  const { data, error } = await client().rpc('is_feedback_reviewer');
  if (error) throw error;
  return data === true;
}
export async function listTesterFeedback(userId: string, scope: 'mine' | 'support', before?: Pick<FeedbackReport, 'id' | 'created_at'>) {
  let query = client().from('tester_feedback').select(columns).order('created_at', { ascending: false }).order('id', { ascending: false }).limit(30);
  if (scope === 'mine') query = query.eq('owner_id', userId);
  if (before) {
    const id = z.string().uuid().parse(before.id);
    const timestamp = z.string().datetime({ offset: true }).parse(before.created_at);
    query = query.or(`created_at.lt.${timestamp},and(created_at.eq.${timestamp},id.lt.${id})`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data as FeedbackReport[];
}
export async function feedbackScreenshot(id: string) {
  const { data, error } = await client().from('tester_feedback_attachments').select('png_base64').eq('feedback_id', id).maybeSingle();
  if (error) throw error;
  return data?.png_base64 as string | undefined;
}
export async function feedbackEvents(id: string) {
  const { data, error } = await client().from('tester_feedback_events').select('id,status,note,created_at').eq('feedback_id', id).order('created_at', { ascending: false }).limit(50);
  if (error) throw error;
  return data as FeedbackEvent[];
}
export async function triageTesterFeedback(report: FeedbackReport, status: FeedbackStatus, response: string, note: string) {
  const { error } = await client().rpc('triage_tester_feedback', { p_id: report.id, p_expected_updated_at: report.updated_at, p_status: status, p_response: response.trim(), p_note: note.trim() });
  if (error) throw error;
}
export async function deleteMyTesterFeedback(id: string) {
  const { data, error } = await client().rpc('delete_my_tester_feedback', { p_id: id });
  if (error) throw error;
  if (data !== true) throw new Error('Report unavailable.');
}
