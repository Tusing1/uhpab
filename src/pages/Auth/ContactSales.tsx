import { Link } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/button';

export default function ContactSales() {
  return <AuthShell eyebrow="School partnership" title="School enquiries are not available yet" description="The enquiry form is not connected, so it cannot receive messages at present." icon={<Building2 className="h-6 w-6" />} sideTitle="Individual research tools" sideDescription="Students can continue using the available writing and document-review tools." sideItems={['Create a proposal or report', 'Review your own document', 'Download your work']}>
    <p className="text-sm leading-6 text-muted-foreground">School accounts, shared candidate records and supervisor submissions are still being prepared. No enquiry has been sent.</p>
    <div className="mt-5 flex flex-wrap gap-3"><Button asChild><Link to="/">Return to home</Link></Button><Button variant="outline" asChild><Link to="/login">Sign in</Link></Button></div>
  </AuthShell>;
}
