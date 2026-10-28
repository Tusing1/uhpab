export class ResearchServiceError extends Error {
  constructor(message: string, public status: number, public code = '', public retryAfter?: number) {
    super(message);
    this.name = 'ResearchServiceError';
  }
}

export function researchErrorInfo(error: unknown) {
  const value = error && typeof error === 'object' ? error as Record<string, unknown> : {};
  return {
    message: error instanceof Error ? error.message : 'The request could not be completed.',
    status: typeof value.status === 'number' ? value.status : 0,
    code: typeof value.code === 'string' ? value.code : '',
    retryAfter: typeof value.retryAfter === 'number' && value.retryAfter > 0 ? value.retryAfter : undefined,
  };
}

export function isResearchQuotaError(error: unknown) {
  const { status, code, message } = researchErrorInfo(error);
  return status === 429 || /quota_exceeded|rate_limit_exceeded|too_many_requests|resource_exhausted/i.test(code) || /\b429\b|quota|rate.limit|resource.exhausted/i.test(message);
}

export function researchRetryAfter(value: string | null | undefined, now = Date.now()): number | undefined {
  if (!value?.trim()) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return seconds > 0 ? seconds : undefined;
  const date = Date.parse(value);
  return Number.isFinite(date) && date > now ? Math.ceil((date - now) / 1000) : undefined;
}

export function researchRetryAt(error: unknown, now = Date.now()): number | undefined {
  const { status, retryAfter } = researchErrorInfo(error);
  const seconds = Number.isFinite(retryAfter) ? retryAfter : undefined;
  const delay = seconds || (status === 429 ? 30 : status === 503 ? 15 : 0);
  return delay ? now + delay * 1000 : undefined;
}
