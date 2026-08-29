
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, Sparkles, UserPlus } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import SchoolPicker from '@/components/forms/SchoolPicker';
import { findSchoolById } from '@/data/schools';
import { courseOptions, otherCourseOption } from '@/data/courses';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const isCustomSchool = (schoolValue: string) => schoolValue.startsWith('custom-school:') && schoolValue.replace('custom-school:', '').trim().length > 0;

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [className, setClassName] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [htin, setHtin] = useState('');
  const [researchTopic, setResearchTopic] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const { register, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!findSchoolById(schoolId) && !isCustomSchool(schoolId)) {
      setError('Please choose your school from the list or add it as a new school.');
      return;
    }

    if (!className.trim()) {
      setError('Please choose your course or type it under Other.');
      return;
    }

    try {
      await register(email, password, name, {
        schoolId,
        className,
        htin,
        researchTopic: researchTopic.trim() || undefined
      });
      navigate('/dashboard');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <AuthShell
      eyebrow="Student account"
      title="Create account"
      description="Set up your school details once, then start writing and reviewing your research work."
      icon={<UserPlus className="h-6 w-6" />}
      contentClassName="max-w-2xl"
      footer={
        <div className="text-center text-sm text-muted-foreground">
          <span>Already have an account? </span>
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </div>
      }
    >
      <div className="space-y-4">
        {error && (
          <Alert variant="destructive" className="bg-destructive/10 border-destructive/50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input 
                    id="name"
                    type="text" 
                    placeholder="John Doe" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email"
                    type="email" 
                    placeholder="name@example.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <SchoolPicker
                  value={schoolId}
                  onChange={setSchoolId}
                  label="School"
                  required
                  inputId="student-school"
                />
                <div className="space-y-2">
                  <Label htmlFor="className">Class / Course</Label>
                  <Select
                    value={selectedCourse}
                    onValueChange={(value) => {
                      setSelectedCourse(value);
                      setClassName(value === otherCourseOption ? '' : value);
                    }}
                    required
                  >
                    <SelectTrigger id="className">
                      <SelectValue placeholder="Choose your course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courseOptions.map((course) => (
                        <SelectItem key={course} value={course}>
                          {course}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedCourse === otherCourseOption && (
                  <div className="space-y-2">
                    <Label htmlFor="otherCourse">Type your course</Label>
                    <Input
                      id="otherCourse"
                      type="text"
                      placeholder="Enter your course name"
                      value={className}
                      onChange={(e) => setClassName(e.target.value)}
                      required
                    />
                  </div>
                )}
                {selectedCourse && selectedCourse !== otherCourseOption && (
                  <p className="-mt-2 text-xs text-muted-foreground">
                    Intake or cohort details can be added later in Settings if needed.
                  </p>
                )}
                <div className="space-y-2">
                  <Label htmlFor="htin">HTIN Number</Label>
                  <Input 
                    id="htin"
                    type="text" 
                    placeholder="e.g., JUL25/U094/DCM/071/2025" 
                    value={htin}
                    onChange={(e) => setHtin(e.target.value.toUpperCase())}
                    required
                  />
                </div>
                <div className="space-y-2 rounded-lg border bg-white/60 p-3 dark:bg-card/60">
                  <Label htmlFor="researchTopic">Research topic</Label>
                  <Textarea
                    id="researchTopic"
                    value={researchTopic}
                    onChange={(e) => setResearchTopic(e.target.value)}
                    placeholder="Paste your topic here if you already have one"
                    className="min-h-20"
                  />
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-muted-foreground">
                      Leave this blank if you came here to create a topic.
                    </p>
                    <Button type="button" variant="outline" size="sm" className="gap-2" asChild>
                      <Link to="/research-topic-generator">
                        <Sparkles className="h-4 w-4" />
                        Generate one
                      </Link>
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input 
                    id="password"
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input 
                    id="confirmPassword"
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </form>
      </div>
    </AuthShell>
  );
};

export default Register;
