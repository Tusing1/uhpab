import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
const readable = (html: string) => html.replace(/<\/(?:p|div|li|h[1-6])>/gi, '\n\n').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
export default function DraftComparison({ open, current, proposed, title, onAccept, onDismiss }: {
    open: boolean;
    current: string;
    proposed: string;
    title: string;
    onAccept: () => void;
    onDismiss: () => void;
}) {
    return <Dialog open={open} onOpenChange={value => { if (!value)
        onDismiss(); }}><DialogContent className="max-h-[90dvh] max-w-5xl overflow-y-auto"><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>Your current writing stays unchanged until you choose the new draft.</DialogDescription></DialogHeader><div className="grid min-w-0 gap-5 md:grid-cols-2">{[{ label: 'Current version', html: current }, { label: 'New draft', html: proposed }].map(({ label, html }) => <section key={label} className="min-w-0"><h3 className="mb-2 text-sm font-semibold">{label} <span className="font-normal text-muted-foreground">· {readable(html).split(/\s+/).filter(Boolean).length} words</span></h3><div className="max-h-80 overflow-y-auto whitespace-pre-wrap break-words rounded-md border bg-background p-4 text-sm leading-7">{readable(html) || 'Empty section'}</div></section>)}</div><div className="flex flex-wrap justify-end gap-2"><Button variant="ghost" onClick={onDismiss}>Cancel</Button><Button variant="outline" onClick={onDismiss}>Keep current</Button><Button onClick={onAccept}>Use new draft</Button></div></DialogContent></Dialog>;
}
