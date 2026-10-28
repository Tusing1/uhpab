import { z } from 'zod';

declare const __APP_RELEASE__: string;
export const FEEDBACK_RELEASE = typeof __APP_RELEASE__ === 'string' ? __APP_RELEASE__ : '2026.10.28-feedback.1';
export const FEEDBACK_TOOLS = ['dashboard', 'defence-slides', 'document-analysis', 'plagiarism-checker', 'content-improvement', 'humanizer', 'research-topic-generator', 'chapter-work', 'projects', 'student-workspace', 'school-dashboard', 'supervisor-workspace', 'settings', 'getting-started', 'other'] as const;
export const FEEDBACK_STAGES = ['general', 'upload', 'sources', 'focus', 'methods', 'checks', 'generate', 'save', 'export'] as const;
export const FEEDBACK_CODES = ['none', 'authentication', 'rate-limit', 'provider-unavailable', 'invalid-response', 'storage-unavailable', 'extraction-failed', 'export-failed', 'unknown'] as const;
export const FEEDBACK_CATEGORIES = { problem: 'Something is not working', output: 'Incorrect or unclear output', usability: 'Difficult to use', suggestion: 'Suggestion' } as const;
export const FEEDBACK_STATUSES = { new: 'Received', reviewing: 'Under review', needs_info: 'More information needed', resolved: 'Resolved' } as const;
export const feedbackDiagnosticSchema = z.object({
  tool: z.enum(FEEDBACK_TOOLS), release: z.literal(FEEDBACK_RELEASE),
  stage: z.enum(FEEDBACK_STAGES), errorCode: z.enum(FEEDBACK_CODES),
  browser: z.enum(['Chrome', 'Edge', 'Firefox', 'Safari', 'Other']),
  device: z.enum(['mobile', 'tablet', 'desktop']),
}).strict();
export const feedbackSubmissionSchema = z.object({
  requestId: z.string().uuid(), category: z.enum(['problem', 'output', 'usability', 'suggestion']),
  description: z.string().trim().min(20).max(4000), diagnostic: feedbackDiagnosticSchema.nullable(),
  screenshot: z.string().max(1398104).nullable(), consent: z.literal(true),
}).strict();
export type FeedbackDiagnostic = z.infer<typeof feedbackDiagnosticSchema>;
export type FeedbackSubmission = z.infer<typeof feedbackSubmissionSchema>;
export type FeedbackContext = Partial<Pick<FeedbackDiagnostic, 'tool' | 'stage' | 'errorCode'>>;
export type FeedbackStatus = keyof typeof FEEDBACK_STATUSES;
export type FeedbackReport = {
  id: string; category: keyof typeof FEEDBACK_CATEGORIES; description: string; diagnostic: FeedbackDiagnostic | null;
  status: FeedbackStatus; response: string; created_at: string; updated_at: string; expires_at: string;
  has_screenshot: boolean;
};
export type FeedbackEvent = { id: number; status: FeedbackStatus; note: string; created_at: string };

export function feedbackTool(pathname: string): FeedbackDiagnostic['tool'] {
  const first = pathname.split(/[/?#]/).filter(Boolean)[0];
  if (first?.startsWith('supervisor-')) return 'supervisor-workspace';
  return FEEDBACK_TOOLS.includes(first as FeedbackDiagnostic['tool']) ? first as FeedbackDiagnostic['tool'] : 'other';
}

export function feedbackErrorCode(error: unknown, fallback: FeedbackDiagnostic['errorCode'] = 'unknown'): FeedbackDiagnostic['errorCode'] {
  const record = error && typeof error === 'object' ? error as Record<string, unknown> : {};
  const status = typeof record.status === 'number' ? record.status : 0;
  const code = typeof record.code === 'string' ? record.code.toLowerCase() : '';
  if (status === 429 || ['resource_exhausted', 'rate_limit_exceeded', 'quota_exceeded'].includes(code)) return 'rate-limit';
  if (status === 401 || status === 403 || ['api_key_invalid', 'permission_denied', 'unauthenticated', 'missing_key'].includes(code)) return 'authentication';
  if (status >= 500 || ['unavailable', 'upstream_connection_failed', 'deadline_exceeded'].includes(code)) return 'provider-unavailable';
  return fallback;
}

export function feedbackDiagnostic(pathname: string, context: FeedbackContext = {}, agent = '', width = 1024): FeedbackDiagnostic {
  return feedbackDiagnosticSchema.parse({
    tool: FEEDBACK_TOOLS.includes(context.tool!) ? context.tool : feedbackTool(pathname), release: FEEDBACK_RELEASE,
    stage: FEEDBACK_STAGES.includes(context.stage!) ? context.stage : 'general',
    errorCode: FEEDBACK_CODES.includes(context.errorCode!) ? context.errorCode : 'none',
    browser: /Edg\//.test(agent) ? 'Edge' : /Firefox\//.test(agent) ? 'Firefox' : /Chrome\//.test(agent) ? 'Chrome' : /Safari\//.test(agent) ? 'Safari' : 'Other',
    device: width < 640 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop',
  });
}

// Redact pasted secrets before preview; never include error messages or browser state.
export function redactFeedbackText(text: string) {
  return text.replace(/AIza[A-Za-z0-9_-]{20,}|AQ\.[A-Za-z0-9._-]{20,}|sk-[A-Za-z0-9_-]{16,}|sb_(?:secret|publishable)_[A-Za-z0-9_-]+/g, '[key removed]')
    .replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, '[token removed]')
    .replace(/\bBearer\s+[^\s,;]+/gi, '[token removed]')
    .replace(/\b(api[_ -]?key|password|access[_ -]?token|refresh[_ -]?token|authorization)\s*[:=]\s*(?:"[^"\n]*"|'[^'\n]*'|[^\s,;]+)/gi, '$1: [secret removed]')
    .replace(/https?:\/\/[^\s<>"']+/gi, '[link removed]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[email removed]')
    .replace(/\b[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\b/gi, '[identifier removed]')
    .replace(/\b[A-Z]:\\[^\n]+/gi, '[local path removed]')
    .split('').filter(char => char.charCodeAt(0) >= 32 || ['\t', '\r', '\n'].includes(char)).join('').trim();
}

export function screenshotDimensions(bytes: Uint8Array, mime: string) {
  if (mime === 'image/png' && bytes.length >= 33 && [137,80,78,71,13,10,26,10].every((v, i) => bytes[i] === v) && String.fromCharCode(...bytes.slice(12, 16)) === 'IHDR') {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (mime === 'image/jpeg' && bytes[0] === 255 && bytes[1] === 216) {
    let at = 2;
    while (at + 8 < bytes.length) {
      if (bytes[at++] !== 255) break;
      while (bytes[at] === 255) at++;
      const marker = bytes[at++];
      if (marker === 217 || marker === 218) break;
      const length = bytes[at] * 256 + bytes[at + 1];
      if (length < 2 || at + length > bytes.length) break;
      if ([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)) return { height: bytes[at + 3] * 256 + bytes[at + 4], width: bytes[at + 5] * 256 + bytes[at + 6] };
      at += length;
    }
  }
  throw new Error('Choose a valid PNG or JPEG image. SVG and other file types are not accepted.');
}

export async function prepareFeedbackScreenshot(file: File): Promise<string> {
  if (!['image/png', 'image/jpeg'].includes(file.type) || !file.size || file.size > 5 * 1024 * 1024) throw new Error('Choose a PNG or JPEG screenshot up to 5 MB.');
  const dimensions = screenshotDimensions(new Uint8Array(await file.arrayBuffer()), file.type);
  if (!dimensions.width || !dimensions.height || Math.max(dimensions.width, dimensions.height) > 8192 || dimensions.width * dimensions.height > 12000000) throw new Error('Crop the screenshot to at most 12 megapixels and 8192 pixels per side.');
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width !== dimensions.width || bitmap.height !== dimensions.height) {
      // Camera JPEG orientation can change decoded dimensions; still enforce the decoded bound.
      if (bitmap.width * bitmap.height > 12000000) throw new Error('This image is too large.');
    }
    let scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    for (let attempt = 0; attempt < 5; attempt++, scale *= 0.7) {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Your browser could not prepare this image. Submit without an attachment.');
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const base64 = canvas.toDataURL('image/png').split(',')[1];
      if (base64?.length <= 1398104) return base64;
    }
    throw new Error('Crop the screenshot to a smaller area before attaching it.');
  } finally { bitmap.close(); }
}

export function feedbackFailure(error: unknown) {
  const code = error && typeof error === 'object' ? String((error as Record<string, unknown>).message || '') : '';
  if (code.includes('FEEDBACK_RATE_LIMIT')) return 'Too many reports have been sent from this account. Please wait an hour and try again.';
  if (code.includes('FEEDBACK_FORBIDDEN')) return 'This account does not have access to the support inbox.';
  if (code.includes('FEEDBACK_CONFLICT')) return 'This report changed in another session. Refresh it before saving again.';
  if (code.includes('FEEDBACK_INVALID')) return 'Check the description, consent and screenshot before retrying.';
  return 'Feedback could not be reached. Check your connection and retry. A report is only confirmed received when its reference is shown.';
}
