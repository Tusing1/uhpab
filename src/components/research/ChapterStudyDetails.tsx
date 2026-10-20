import { Textarea } from '@/components/ui/textarea';
import RequiredMark from './RequiredMark';
import { changeWorkspaceContext, contextFields, generationNeeds, requiredContext, type ChapterWorkspace } from '@/lib/chapterWorkspace';

export default function ChapterStudyDetails({ workspace: w, sectionId, disabled, onChange, embedded = false, showErrors = false }: {
  workspace: ChapterWorkspace; sectionId: string; disabled: boolean; onChange: (next: ChapterWorkspace) => void; embedded?: boolean; showErrors?: boolean;
}) {
  const needs = generationNeeds(w, sectionId);
  const required = requiredContext(w, sectionId);
  const fields = [...new Set([...required, ...(w.chapterKey === 'chapter1' && sectionId === 'specificObjectives' ? ['setting', 'population'] : [])])];
  const set = (key: string, value: string) => onChange(changeWorkspaceContext(w, { context: { ...w.context, [key]: value } }));
  const body = <div className="space-y-4">
      {fields.map(key => <label key={key} className="block space-y-2 text-sm"><span>{contextFields[key].label}{required.includes(key) ? <RequiredMark /> : <span className="ml-1 text-muted-foreground">(optional)</span>}</span>
        <Textarea className="min-h-36 sm:min-h-28 aria-[invalid=true]:border-red-600" aria-invalid={showErrors && required.includes(key) && !w.context[key]?.trim()} required={required.includes(key)} aria-required={required.includes(key)} disabled={disabled} placeholder={contextFields[key].placeholder} value={w.context[key] || ''} onChange={e => set(key, e.target.value)} />
      </label>)}
      {['specificObjectives', 'researchQuestions'].includes(sectionId) && <label className="block space-y-2 text-sm">Number of objectives
        <select className="h-11 w-full rounded-md border bg-background px-3 text-sm" value={w.context.objectiveCount || '3'} disabled={disabled} onChange={e => set('objectiveCount', e.target.value)}>
          <option value="3">3 objectives</option><option value="2">2 objectives</option>
        </select>
      </label>}
      <label className="block space-y-2 text-sm">Additional confirmed facts <span className="text-muted-foreground">(optional)</span>
        <Textarea disabled={disabled} placeholder="Add any other facts this section should use. Include where each fact came from; leave blank if you have nothing else to add." value={w.context.additional || ''} onChange={e => set('additional', e.target.value)} />
      </label>
    </div>;
  return embedded ? body : <details key={`${w.id}-${sectionId}`} open={needs.length > 0} className="chapter-details">
    <summary className="cursor-pointer text-sm font-medium">Study details{needs.length ? ` · ${needs.length} needed for generation` : ''}</summary>
    <div className="mt-4">{body}</div>
  </details>;
}
