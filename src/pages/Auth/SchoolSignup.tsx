import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { School } from 'lucide-react';
import { toast } from 'sonner';

import { AuthShell } from '@/components/auth/AuthShell';
import SchoolPicker from '@/components/forms/SchoolPicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { findSchoolById } from '@/data/schools';

const customSchoolPrefix = 'custom-school:';
const getCustomSchoolName = (schoolValue: string) =>
  schoolValue.startsWith(customSchoolPrefix) ? schoolValue.replace(customSchoolPrefix, '').trim() : '';

const SchoolSignup: React.FC = () => {
  const navigate = useNavigate();
  const { registerSchool } = useAuth();
  const [formData, setFormData] = useState({
    schoolId: '',
    email: '',
    numberOfStudents: '',
    password: '',
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      const selectedSchool = findSchoolById(formData.schoolId);
      const customSchoolName = getCustomSchoolName(formData.schoolId);
      if (!selectedSchool && !customSchoolName) {
        throw new Error('Please choose your school from the list or add it as a new school.');
      }

      const studentLimit = Number(formData.numberOfStudents) || 50;
      await registerSchool(
        formData.email,
        formData.password,
        selectedSchool?.id || formData.schoolId,
        selectedSchool?.name || customSchoolName,
        studentLimit
      );
      toast.success('School account created');
      navigate('/school-dashboard');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="School workspace"
      title="Create school account"
      description="Register your school so administrators can monitor cohorts and support student progress."
      icon={<School className="h-6 w-6" />}
      sideTitle="A clearer view of student research"
      sideDescription="School accounts are designed for cohort monitoring, student progress follow-up, and organized research support."
      sideItems={[
        'Track student projects and review activity',
        'Support proposal and report completion',
        'Keep school-wide research work easier to monitor',
      ]}
      footer={
        <div className="space-y-2 text-center">
          <p className="text-sm text-muted-foreground">Already have an account?</p>
          <Button variant="outline" asChild className="w-full">
            <Link to="/login">Sign in</Link>
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <SchoolPicker
          value={formData.schoolId}
          onChange={(schoolId) => setFormData(prev => ({ ...prev, schoolId }))}
          label="School"
          required
          inputId="owner-school"
        />

        <div className="space-y-1">
          <Label htmlFor="email">School Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="school@example.com"
            required
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="numberOfStudents">Approximate Number of Students</Label>
          <Input
            id="numberOfStudents"
            name="numberOfStudents"
            type="number"
            value={formData.numberOfStudents}
            onChange={handleChange}
            placeholder="e.g., 500"
            required
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Create a password"
            required
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Creating school account...' : 'Create school account'}
        </Button>
      </form>
    </AuthShell>
  );
};

export default SchoolSignup;
