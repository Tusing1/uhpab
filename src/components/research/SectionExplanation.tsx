import { sectionGuidance } from '@/lib/sectionGuidance';
import type { UhpabWritingContext } from '@/lib/uhpabWritingEngine';
export default function SectionExplanation({ context }: {
    context: UhpabWritingContext;
}) {
    const guide = sectionGuidance(context);
    return <details className="mb-4 border-b pb-3 text-sm"><summary className="cursor-pointer font-medium">What belongs in this section?</summary><div className="mt-3 space-y-2 text-muted-foreground"><p>{guide.purpose}</p><p>{guide.length}</p><p>{guide.citationPolicy === 'none' ? 'No citations are expected here.' : guide.citationPolicy === 'evidence' ? 'Support factual claims with real sources.' : 'No citations are required by default. Cite only specific borrowed claims when needed.'}</p><p className="font-medium text-foreground">Example / guidance, not your study findings</p><p>{guide.example}</p></div></details>;
}
