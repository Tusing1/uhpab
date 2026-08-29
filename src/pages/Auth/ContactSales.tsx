import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Send } from 'lucide-react';
import { toast } from 'sonner';

import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const ContactSales = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    school: '',
    role: '',
    numberOfStudents: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success("Your request has been submitted. We will contact you shortly.");
      navigate('/');
    } catch {
      toast.error('Failed to submit your request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="School partnership"
      title="Contact sales"
      description="Tell us about your school and cohort size. We will help you choose the right setup."
      icon={<Building2 className="h-6 w-6" />}
      contentClassName="max-w-2xl"
      sideTitle="Built for school-wide research support"
      sideDescription="Give administrators a clearer way to monitor student research progress and support weaker sections before final submission."
      sideItems={[
        'School account setup for administrators',
        'Student progress visibility by cohort',
        'Workflow support for proposal, report, review, and exports',
      ]}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="school">School name</Label>
            <Input
              id="school"
              name="school"
              value={formData.school}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Your role</Label>
            <Input
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="numberOfStudents">Number of students</Label>
            <Input
              id="numberOfStudents"
              name="numberOfStudents"
              value={formData.numberOfStudents}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="message">Additional information</Label>
          <Textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            rows={4}
          />
        </div>

        <Button type="submit" className="w-full gap-2" disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Contact sales'}
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </AuthShell>
  );
};

export default ContactSales;
