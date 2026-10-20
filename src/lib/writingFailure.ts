import { isResearchQuotaError, researchErrorInfo } from './researchServiceError';

export function writingFailure(error: unknown) {
  const { message: detail, status, code, retryAfter } = researchErrorInfo(error);
  if (status === 401 || status === 403 || /authentication|permission_denied/.test(code) || /api.key|credential|unauthori|\b401\b|\b403\b/i.test(detail)) return { title: 'Check your research key', message: 'Open Settings to check your Gemini key and its permissions. Your draft has not been replaced.', detail, retryable: false };
  if (isResearchQuotaError(error)) return {
    title: 'Google usage limit reached',
    message: `${retryAfter ? `Google asks you to wait ${Math.ceil(retryAfter)} seconds before retrying.` : 'Google has limited this request. Check your usage limits in Google AI Studio before retrying.'} A new key in the same Google project does not reset its limits. Your writing is safe.`,
    detail, retryable: true,
  };
  if (status === 402 || /payment_required|failed_precondition/.test(code) || /billing|credit balance|precondition/i.test(detail)) return { title: 'Check your Google project access', message: 'Google reports a billing or project-access requirement. Check the project in Google AI Studio. Your writing is safe.', detail, retryable: false };
  if (status === 404 || /model_not_found/.test(code)) return { title: 'Research connection needs updating', message: 'Google could not find the configured model or service. Changing your key may not fix this. Please contact support; your writing is safe.', detail, retryable: false };
  if (status >= 500 || /high demand|overload|temporar|unavailable|503|timeout|timed out|network|fetch failed|failed to fetch/i.test(detail)) return {
    title: 'Research service is temporarily unavailable',
    message: 'Your work is safe. Google is busy or the connection failed. This does not mean your key is exhausted. Wait a moment, then retry.',
    detail, retryable: true,
  };
  return { title: 'Draft needs attention', message: detail, detail, retryable: false };
}
