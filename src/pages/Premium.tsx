import React from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WorkspacePage, WorkspacePageHeader } from "@/components/workspace/WorkspacePage";
import { WorkspaceStatusNote } from "@/components/workspace/WorkspaceWorkflow";
import { useAuth } from "@/contexts/AuthContext";
import { studentPremiumPricing } from "@/data/pricing";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpenCheck,
  Check,
  FileDown,
  MessageSquareText,
  SearchCheck,
  Shield,
  Sparkles,
} from "lucide-react";

const benefits = [
  {
    title: "Section writing support",
    text: "Get guided help for background, problem statement, objectives, literature review, and methodology.",
    icon: BookOpenCheck,
  },
  {
    title: "Powerful document checks",
    text: "Review structure, formatting, missing sections, and unclear academic wording before submission.",
    icon: SearchCheck,
  },
  {
    title: "Clearer academic language",
    text: "Improve paragraphs so they are easier to read while keeping your original meaning.",
    icon: MessageSquareText,
  },
  {
    title: "Downloadable reports",
    text: "Export review feedback so you can discuss corrections with a tutor or supervisor.",
    icon: FileDown,
  },
];

const included = [
  "UHPAB-focused writing guidance",
  "Document review and improvement tools",
  "Research title and section assistance",
  "Cancel anytime",
];

const PremiumPage = () => {
  const { isPremium } = useAuth();
  const navigate = useNavigate();
  const hasPremiumAccess = isPremium();

  return (
    <DashboardLayout>
      <WorkspacePage width="wide">
        <WorkspacePageHeader
          eyebrow={hasPremiumAccess ? "Premium active" : "Premium tools"}
          tone={hasPremiumAccess ? "success" : "info"}
          icon={<Shield size={14} />}
          title="More powerful help for serious UHPAB research work"
          description="Premium support gives stronger guidance for writing, document checks, wording corrections, human review, and downloadable reports you can use while improving your work."
          actions={
            <>
              <Button
                className="gap-2"
                onClick={() => navigate(hasPremiumAccess ? "/document-analysis" : "/contact-sales")}
              >
                {hasPremiumAccess ? "Open premium tools" : "Contact support to activate"}
                <ArrowRight size={16} />
              </Button>
              <Button variant="outline" className="gap-2 bg-white/80" onClick={() => navigate("/getting-started")}>
                View roadmap
                <Sparkles size={16} />
              </Button>
            </>
          }
          aside={
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Badge className={hasPremiumAccess ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" : "bg-blue-100 text-blue-800 hover:bg-blue-100"}>
                    {hasPremiumAccess ? "Active plan" : "Student plan"}
                  </Badge>
                  <div className="mt-3 flex items-end gap-1">
                    <span className="text-3xl font-bold">{studentPremiumPricing.monthly.amount}</span>
                    <span className="pb-1 text-sm text-muted-foreground">{studentPremiumPricing.monthly.cadence}</span>
                  </div>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Shield className="h-5 w-5" />
                </div>
              </div>
              <div className="space-y-2">
                {included.map((item) => (
                  <div key={item} className="flex gap-3 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          }
        />

        <section className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <Card
                key={benefit.title}
                className="animate-fade-up transition-all duration-200 hover:-translate-y-1 hover:border-primary/30 hover:shadow-md"
                style={{ animationDelay: `${index * 70}ms` }}
              >
                <CardHeader className="space-y-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon size={20} />
                  </div>
                  <CardTitle className="text-lg">{benefit.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-6 text-muted-foreground">{benefit.text}</p>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <WorkspaceStatusNote
          tone="info"
          icon={<Shield className="h-4 w-4" />}
          title="Use Advanced Researcher responsibly"
          description="Premium tools help you plan, review, and improve your work. You remain responsible for your research content and should follow your tutor's guidance and UHPAB requirements."
          className="mt-8"
        />
      </WorkspacePage>
    </DashboardLayout>
  );
};

export default PremiumPage;
