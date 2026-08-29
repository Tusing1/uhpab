
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, KeyRound, Sparkles, UserPlus } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import SchoolPicker from '@/components/forms/SchoolPicker';
import { findSchoolById } from '@/data/schools';
import { courseOptions, otherCourseOption } from '@/data/courses';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const isCustomSchool = (schoolValue: string) => schoolValue.startsWith('custom-school:') && schoolValue.replace('custom-school:', '').trim().length > 0;
const registrationDraftKey = 'uhpab:registration-draft';
type TopicMode = 'have-topic' | 'generate-topic';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [className, setClassName] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [htin, setHtin] = useState('');
  const [researchTopic, setResearchTopic] = useState('');
  const [topicMode, setTopicMode] = useState<TopicMode>('have-topic');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [draftReady, setDraftReady] = useState(false);
  const [error, setError] = useState('');
  const { register, isLoading } = useAuth();
  const navigate = useNavigate();
  const updateFromInput =
    (setter: React.Dispatch<React.SetStateAction<string>>, transform: (value: string) => string = (value) => value) =>
    (event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setter(transform(event.currentTarget.value));
    };

  useEffect(() => {
    try {
      const savedDraft = window.sessionStorage.getItem(registrationDraftKey);
      if (!savedDraft) {
        setDraftReady(true);
        return;
      }

      const parsed = JSON.parse(savedDraft) as {
        name?: string;
        email?: string;
        schoolId?: string;
        className?: string;
        selectedCourse?: string;
        htin?: string;
        researchTopic?: string;
        topicMode?: TopicMode;
      };

      setName(parsed.name || '');
      setEmail(parsed.email || '');
      setSchoolId(parsed.schoolId || '');
      setClassName(parsed.className || '');
      setSelectedCourse(parsed.selectedCourse || '');
      setHtin(parsed.htin || '');
      setResearchTopic(parsed.researchTopic || '');
      if (parsed.topicMode === 'generate-topic') setTopicMode('generate-topic');
    } catch {
      window.sessionStorage.removeItem(registrationDraftKey);
    } finally {
      setDraftReady(true);
    }
  }, []);

  useEffect(() => {
    if (!draftReady) return;

    const draft = {
      name,
      email,
      schoolId,
      className,
      selectedCourse,
      htin,
      researchTopic,
      topicMode,
    };

    try {
      window.sessionStorage.setItem(registrationDraftKey, JSON.stringify(draft));
    } catch {
      // Losing a draft should not block signup.
    }
  }, [className, draftReady, email, htin, name, researchTopic, schoolId, selectedCourse, topicMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const submittedForm = new FormData(e.currentTarget as HTMLFormElement);
    const submittedEmail = String(submittedForm.get('email') || email).trim();
    const submittedPassword = String(submittedForm.get('new-password') || password);
    const submittedConfirmPassword = String(submittedForm.get('confirm-password') || confirmPassword);

    if (submittedPassword !== submittedConfirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submittedEmail)) {
      setError('Please enter a valid email address.');
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

    if (!geminiApiKey.trim()) {
      setError('Please paste your Gemini API key. It powers topic generation, writing help, and document checks.');
      return;
    }

    try {
      await register(submittedEmail, submittedPassword, name, {
        schoolId,
        className,
        htin,
        researchTopic: topicMode === 'have-topic' ? researchTopic.trim() || undefined : undefined,
        geminiApiKey: geminiApiKey.trim() || undefined,
      });
      window.sessionStorage.removeItem(registrationDraftKey);
      navigate(topicMode === 'generate-topic' ? '/research-topic-generator?from=signup&type=proposal' : '/getting-started');
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
        {draftReady && <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input 
                    id="name"
                    name="name"
                    type="text" 
                    autoComplete="name"
                    placeholder="John Doe" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onInput={updateFromInput(setName)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email"
                    name="email"
                    type="text"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="name@example.com" 
                    defaultValue={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onInput={updateFromInput(setEmail)}
                    required
                  />
                </div>
                <SchoolPicker
                  value={schoolId}
                  onChange={setSchoolId}
                  label="School"
                  required
                  inputId="student-school"
                  placeholder="Click to choose or type your school"
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
                    onInput={updateFromInput(setClassName)}
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
                    name="htin"
                    type="text" 
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="e.g., JUL25/U094/DCM/071/2025" 
                    value={htin}
                    onChange={(e) => setHtin(e.target.value.toUpperCase())}
                    onInput={updateFromInput(setHtin, (value) => value.toUpperCase())}
                    required
                  />
                </div>
                <div className="space-y-3 rounded-lg border bg-emerald-50/70 p-3 text-emerald-950">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
                      <KeyRound className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1 space-y-2">
                      <Label htmlFor="geminiApiKey">Gemini API key</Label>
                      <Input
                        id="geminiApiKey"
                        name="geminiApiKey"
                        type="password"
                        autoComplete="off"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        placeholder="Paste your Google AI Studio key"
                    defaultValue={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    onInput={updateFromInput(setGeminiApiKey)}
                        className="bg-white/90"
                      />
                      <p className="text-xs leading-5 text-emerald-800">
                        Required for AI tools such as topic generation, writing help, and document checks. It is saved to your UHPAB profile.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3 rounded-lg border bg-white/60 p-3 dark:bg-card/60">
                  <Label htmlFor="researchTopic">Research topic</Label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button
                      type="button"
                      variant={topicMode === 'have-topic' ? 'default' : 'outline'}
                      className="justify-start gap-2"
                      onClick={() => setTopicMode('have-topic')}
                    >
                      I already have a topic
                    </Button>
                    <Button
                      type="button"
                      variant={topicMode === 'generate-topic' ? 'default' : 'outline'}
                      className="justify-start gap-2"
                      onClick={() => setTopicMode('generate-topic')}
                    >
                      <Sparkles className="h-4 w-4" />
                      Help me generate one
                    </Button>
                  </div>
                  {topicMode === 'have-topic' ? (
                    <Textarea
                    id="researchTopic"
                    name="researchTopic"
                      value={researchTopic}
                      onChange={(e) => setResearchTopic(e.target.value)}
                      onInput={updateFromInput(setResearchTopic)}
                      placeholder="Paste your topic here if you already have one"
                      className="min-h-20"
                    />
                  ) : (
                    <div className="rounded-md border border-sky-200 bg-sky-50 p-3 text-sm leading-6 text-sky-950">
                      Create your account first, then we will take you straight to the topic builder. Your name, school, course, and HTIN stay saved on this form.
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Topic generation opens after signup so your work is saved under your student account.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input 
                    id="password"
                    name="new-password"
                    type="password" 
                    autoComplete="new-password"
                    defaultValue={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onInput={updateFromInput(setPassword)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input 
                    id="confirmPassword"
                    name="confirm-password"
                    type="password" 
                    autoComplete="new-password"
                    defaultValue={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onInput={updateFromInput(setConfirmPassword)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </form>}
      </div>
    </AuthShell>
  );
};

export default Register;
