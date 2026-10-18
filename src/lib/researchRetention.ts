export const defaultDocumentExpiry = (now = Date.now()) => new Date(now + 7 * 86400000).toISOString();
export const isResearchDocumentExpired = (record: { keepDocument?: boolean; expiresAt?: string | null; createdAt: string }, now = Date.now()) =>
  !record.keepDocument && new Date(record.expiresAt || defaultDocumentExpiry(new Date(record.createdAt).getTime())).getTime() <= now;
