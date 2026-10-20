import { Textarea } from '@/components/ui/textarea';
import { changeWorkspaceContext, contextFields, generationNeeds, requiredContext, type ChapterWorkspace } from '@/lib/chapterWorkspace';

export default function ChapterStudyDetails({ workspace: w, sectionId, disabled, onChange }: {
  workspace: ChapterWorkspace; sectionId: string; disabled: boolean; onChange: (next: ChapterWorkspace) => void;
}) {
  const needs = generationNeeds(w, sectionId);
  const fields = [...new Set([...requiredContext(w, sectionId), ...(w.chapterKey === 'chapter1' && sectionId === 'specificObjectives' ? ['setting', 'population'] : [])])];
  const set = (key: string, value: string) => onChange(changeWorkspaceContext(w, { context: { ...w.context, [key]: value } }));
  return <details key={`${w.id}-${sectionId}`} open={needs.length > 0} className="chapter-details">
    <summary className="cursor-pointer text-sm font-medium">Study details{needs.length ? ` · ${needs.length} needed for generation` : ''}</summary>
    <div className="mt-4 space-y-4">
      {fields.map(key => <label key={key} className="block space-y-2 text-sm">{contextFields[key].label}
        <Textarea disabled={disabled} placeholder={contextFields[key].placeholder} value={w.context[key] || ''} onChange={e => set(key, e.target.value)} />
      </label>)}
      {['specificObjectives', 'researchQuestions'].includes(sectionId) && <label className="block space-y-2 text-sm">Number of objectives
        <select className="h-11 w-full rounded-md border bg-background px-3 text-sm" value={w.context.objectiveCount || '3'} disabled={disabled} onChange={e => set('objectiveCount', e.target.value)}>
          <option value="3">3 objectives</option><option value="2">2 objectives</option>
        </select>
      </label>}
      <label className="block space-y-2 text-sm">Additional confirmed facts
        <Textarea disabled={disabled} value={w.context.additional || ''} onChange={e => set('additional', e.target.value)} />
      </label>
    </div>
  </details>;
}
