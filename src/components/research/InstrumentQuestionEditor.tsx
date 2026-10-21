import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { InstrumentQuestion } from '@/lib/researchInstrument';

export default function InstrumentQuestionEditor({question:q,index,objectiveCount,disabled,interview,onChange,onRemove}:{question:InstrumentQuestion;index:number;objectiveCount:number;disabled:boolean;interview:boolean;onChange:(patch:Partial<InstrumentQuestion>)=>void;onRemove:()=>void}) {
  return <div className="space-y-3 border-l-2 pl-3">
    <div className="flex items-center justify-between"><label htmlFor={`question-${q.id}`} className="text-sm">Question {index+1} <span className="text-red-600" aria-hidden="true">*</span></label><Button size="icon" variant="ghost" disabled={disabled} aria-label={`Remove question ${index+1} from objective ${q.objective}`} onClick={onRemove}><Trash2 size={16}/></Button></div>
    <Textarea id={`question-${q.id}`} aria-required="true" disabled={disabled} value={q.text} placeholder="Write one clear, neutral question for this objective." onChange={e=>onChange({text:e.target.value})}/>
    <div className="grid min-w-0 gap-3 sm:grid-cols-2">
      <label className="block min-w-0 space-y-2 text-sm">Objective<select disabled={disabled} className="min-h-11 w-full rounded-md border bg-background px-2" value={q.objective} onChange={e=>onChange({objective:Number(e.target.value)})}><option value="0">Respondent characteristics</option>{Array.from({length:objectiveCount},(_,i)=><option key={i} value={i+1}>Objective {i+1}</option>)}</select></label>
      <label className="block min-w-0 space-y-2 text-sm">Response type<select className="min-h-11 w-full rounded-md border bg-background px-2" disabled={disabled||interview} value={q.response} onChange={e=>onChange({response:e.target.value as typeof q.response,options:[]})}><option value="text">Open response</option><option value="number">Number</option><option value="single">Choose one</option><option value="multiple">Choose all that apply</option></select></label>
    </div>
    {['single','multiple'].includes(q.response)&&<label className="block space-y-2 text-sm">Options, one per line<Textarea disabled={disabled} value={q.options.join('\n')} placeholder="Never&#10;Sometimes&#10;Often" onChange={e=>onChange({options:e.target.value.split('\n')})}/></label>}
  </div>;
}
