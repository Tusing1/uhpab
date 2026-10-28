export function markingPassage(criterion: { evidenceSnippet?: string | null }): string | null {
  return criterion.evidenceSnippet?.trim() || null;
}
