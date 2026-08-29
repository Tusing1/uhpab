import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FeaturesSection } from '@/components/home/FeaturesSection';
import PricingSection from '@/components/home/PricingSection';
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  FileText,
  GraduationCap,
  MessageSquareText,
  SearchCheck,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const studentPaths = [
  {
    title: 'I am starting my topic',
    text: 'Get a clear research title and understand what section comes next.',
    icon: Sparkles,
    color: 'bg-amber-100 text-amber-800',
  },
  {
    title: 'I have a draft',
    text: 'Upload your work and check it against UHPAB expectations.',
    icon: SearchCheck,
    color: 'bg-sky-100 text-sky-800',
  },
  {
    title: 'I need better wording',
    text: 'Improve paragraphs while keeping your own meaning and academic tone.',
    icon: MessageSquareText,
    color: 'bg-violet-100 text-violet-800',
  },
];

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  return (
    <div className="study-surface min-h-screen text-foreground">
      <header className="sticky top-0 z-30 border-b bg-white/80 backdrop-blur-xl">
        <div className="container flex min-h-16 items-center justify-between gap-4 py-2">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-to-br from-primary to-emerald-400 text-sm font-bold text-white shadow-sm">
              US
            </div>
            <div>
              <p className="font-bold leading-tight text-primary">UHPAB Study</p>
              <p className="hidden text-xs text-muted-foreground sm:block">Research help for nursing students</p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link to="/register">
              <Button className="gap-2">
                Start Free
                <ArrowRight size={16} />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="container grid gap-8 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-16">
          <div className="animate-fade-up space-y-6">
            <span className="soft-marker bg-emerald-100 text-emerald-800">
              Made for student nurses and midwives
            </span>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
                Build your research work with less stress and more confidence.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
                A focused research workspace for UHPAB proposals and reports. Start a project, follow the roadmap, check your draft, and improve your writing one step at a time.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link to="/register">
                <Button size="lg" className="gap-2 animate-soft-pulse">
                  Create my free account
                  <ArrowRight size={18} />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="gap-2 bg-white/80">
                  <FileText size={18} />
                  Continue my work
                </Button>
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {['Start simple', 'Check before submit', 'Keep improving'].map((item) => (
                <div key={item} className="flex items-center gap-2 rounded-md bg-white/70 p-3 text-sm shadow-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="animate-fade-up rounded-xl border bg-white/88 p-4 shadow-xl backdrop-blur [animation-delay:90ms]">
            <div className="rounded-lg bg-slate-950 p-5 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/70">Today’s study plan</p>
                  <h2 className="mt-1 text-2xl font-bold">Research roadmap</h2>
                </div>
                <GraduationCap className="h-9 w-9 text-amber-300" />
              </div>
              <div className="mt-5 grid gap-3">
                {[
                  ['1', 'Choose proposal or report', 'Start with the right template'],
                  ['2', 'Fill one section at a time', 'Use UHPAB guidance'],
                  ['3', 'Check and improve', 'Polish before submission'],
                ].map(([step, title, text]) => (
                  <div key={step} className="flex gap-3 rounded-md bg-white/10 p-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white text-sm font-bold text-slate-950">
                      {step}
                    </div>
                    <div>
                      <p className="font-semibold">{title}</p>
                      <p className="text-sm text-white/65">{text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              <div className="rounded-md border bg-sky-50 p-4">
                <BookOpenCheck className="mb-2 h-5 w-5 text-sky-700" />
                <p className="font-semibold">UHPAB guide</p>
                <p className="text-sm text-muted-foreground">Know what each chapter needs.</p>
              </div>
              <div className="rounded-md border bg-amber-50 p-4">
                <SearchCheck className="mb-2 h-5 w-5 text-amber-700" />
                <p className="font-semibold">Draft checker</p>
                <p className="text-sm text-muted-foreground">Catch gaps early.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="container pb-8">
          <div className="grid gap-4 md:grid-cols-3">
            {studentPaths.map((path, index) => {
              const Icon = path.icon;
              return (
                <div
                  key={path.title}
                  className="study-card animate-fade-up rounded-lg p-5"
                  style={{ animationDelay: `${index * 70}ms` }}
                >
                  <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-md ${path.color}`}>
                    <Icon size={22} />
                  </div>
                  <h3 className="text-lg font-semibold">{path.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{path.text}</p>
                </div>
              );
            })}
          </div>
        </section>
        
        <FeaturesSection />
        <PricingSection />
      </main>

      <footer className="border-t bg-white/80 py-8 backdrop-blur">
        <div className="container flex flex-col gap-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} UHPAB Study. All rights reserved.</p>
          <p className="max-w-xl">
            Built to help Diploma Nursing and Midwifery students in Uganda create research proposals and reports with UHPAB guidance.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
