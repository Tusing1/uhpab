import { Link } from 'react-router-dom';
import { AlertTriangle, BookOpen, FileText } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { WorkspacePage } from '@/components/workspace/WorkspacePage';
import { Button } from '@/components/ui/button';

export default function SchoolConnectionUnavailable() {
  return <DashboardLayout><WorkspacePage className="max-w-3xl space-y-6">
    <div className="flex items-start gap-4 border-b pb-6">
      <span className="rounded-md bg-amber-100 p-3 text-amber-800"><AlertTriangle size={22} /></span>
      <div><h1 className="text-2xl font-semibold">School collaboration is not connected yet</h1>
        <p className="mt-3 leading-7 text-muted-foreground">Candidate registration, assignments, submissions and supervisor comments are not currently shared between accounts. Please use your school's agreed method to send documents and feedback.</p></div>
    </div>
    <p className="text-sm leading-6 text-muted-foreground">Your existing research projects are still available. Any earlier school-workspace information saved on this device has not been deleted.</p>
    <div className="flex flex-wrap gap-3"><Button asChild className="gap-2"><Link to="/projects"><FileText size={16} />My research work</Link></Button><Button asChild variant="outline" className="gap-2"><Link to="/guidelines"><BookOpen size={16} />UHPAB guidelines</Link></Button></div>
  </WorkspacePage></DashboardLayout>;
}
