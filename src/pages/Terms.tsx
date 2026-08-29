import { ArrowLeft, FileCheck2 } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

const Terms = () => (
  <main className="min-h-screen bg-muted/30 px-4 py-10 sm:py-16">
    <article className="mx-auto max-w-3xl rounded-lg border bg-card p-6 shadow-sm sm:p-10">
      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
        <FileCheck2 className="h-5 w-5" />
      </div>
      <p className="mt-5 text-sm font-semibold text-primary">UHPAB Research Assistant</p>
      <h1 className="mt-2 text-3xl font-bold">Terms of use</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: 27 July 2026</p>

      <div className="mt-8 space-y-7 text-sm leading-7 text-muted-foreground">
        <section>
          <h2 className="text-lg font-semibold text-foreground">Academic support</h2>
          <p className="mt-1">
            The app supports research planning, writing review, marking-guide preparation, and
            originality review. Its output is guidance and does not replace a supervisor, examiner,
            institutional review committee, or UHPAB decision.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">Student responsibility</h2>
          <p className="mt-1">
            Students remain responsible for the accuracy of their work, the authenticity of their
            data, correct citations, ethical approval, and compliance with school requirements.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">Originality results</h2>
          <p className="mt-1">
            The current originality checker identifies writing patterns for review. It is not a
            search of every published source or a substitute for an institutional similarity
            database.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">Acceptable use</h2>
          <p className="mt-1">
            Do not use the service to fabricate research data, invent references, impersonate
            another student, or process confidential patient information.
          </p>
        </section>
      </div>

      <Button variant="outline" className="mt-8 gap-2" asChild>
        <Link to="/dashboard">
          <ArrowLeft className="h-4 w-4" />
          Return to dashboard
        </Link>
      </Button>
    </article>
  </main>
);

export default Terms;
