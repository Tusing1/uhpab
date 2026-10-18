type Operation = { error: unknown };
export interface CleanupClient {
  rpc(name: string, args: Record<string, unknown>): PromiseLike<{ data: Array<{ id: string; storage_path: string }> | null; error: unknown }>;
  storage: { from(bucket: string): { remove(paths: string[]): PromiseLike<Operation> } };
}

export const createResearchCleanupHandler = (secret: string | undefined, createClient: () => CleanupClient) => async (request: Request) => {
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) return new Response('Unauthorized', { status: 401 });
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  try {
    const client = createClient();
    const { data: due, error } = await client.rpc('claim_expired_research_documents', { batch_size: 100 });
    if (error) return Response.json({ error: 'Could not claim expired documents.' }, { status: 500 });
    let deleted = 0;
    let failed = 0;
    for (const item of due || []) {
      try {
        const { error: removeError } = await client.storage.from('research-private').remove([item.storage_path]);
        if (removeError) { failed++; continue; }
        const { error: rowError } = await client.rpc('complete_research_document_deletion', { document_id: item.id });
        if (rowError) failed++; else deleted++;
      } catch { failed++; }
    }
    return Response.json({ deleted, failed }, { status: failed ? 503 : 200, headers: { 'Cache-Control': 'no-store' } });
  } catch { return Response.json({ error: 'Document cleanup failed; retry is required.' }, { status: 500 }); }
};
