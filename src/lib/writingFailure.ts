export function writingFailure(error: unknown) {
  const detail = error instanceof Error ? error.message : 'The request could not be completed.';
  if (/high demand|overload|temporar|unavailable|503|429|rate.limit|quota|timeout|timed out|network|fetch failed/i.test(detail)) return {
    title: 'Research service is temporarily unavailable',
    message: 'Your work is safe. The provider is busy or its usage limit was reached. Wait a moment, then retry; no need to change your objectives.',
    detail, retryable: true,
  };
  if (/api.key|credential|unauthori|401|403/i.test(detail)) return { title: 'Check your research key', message: 'Open Settings to check your Gemini key. Your draft has not been replaced.', detail, retryable: false };
  return { title: 'Draft needs attention', message: detail, detail, retryable: false };
}
