import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

const Privacy = () => (
  <main className="min-h-screen bg-muted/30 px-4 py-10 sm:py-16">
    <article className="mx-auto max-w-3xl rounded-lg border bg-card p-6 shadow-sm sm:p-10">
      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
        <ShieldCheck className="h-5 w-5" />
      </div>
      <p className="mt-5 text-sm font-semibold text-primary">UHPAB Research Assistant</p>
      <h1 className="mt-2 text-3xl font-bold">Privacy notice</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: 28 October 2026</p>

      <div className="mt-8 space-y-7 text-sm leading-7 text-muted-foreground">
        <section>
          <h2 className="text-lg font-semibold text-foreground">Research documents and results</h2>
          <p className="mt-1">
            Some tools, including saved defence presentations and draft recovery, keep work in this browser.
            Online projects and chapter workspaces use account-protected cloud storage. When private
            document analysis is enabled, uploaded files and results use private cloud storage with
            the retention choice shown in that tool. Browser-only records do not automatically
            synchronize to another device.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">Your responsibility</h2>
          <p className="mt-1">
            Keep original research files in a secure location and download workspace backups
            regularly. Clearing browser data may remove locally stored work.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">Sensitive information</h2>
          <p className="mt-1">
            Do not upload participant names, clinical identifiers, passwords, or confidential
            patient records. Use anonymized research material whenever possible.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">Tester feedback</h2>
          <p className="mt-1">
            Reporting a problem is optional. You preview the description, any optional screenshot,
            and optional technical context before consenting to send. Reports are linked to your
            signed-in account and visible only to you and authorised platform support, not automatically
            to your school or supervisor. Technical context is limited to tool, app release, stage,
            a general error category, browser family and screen-size category. We do not automatically
            attach research, prompts, keys, page URLs, logs or browser storage. Common pasted secrets,
            email addresses and links are removed from descriptions; this cannot identify every
            private detail. Images are resized and re-encoded without original metadata, but visible
            names, writing and keys are not automatically redacted: crop them out first. Reports and
            attachments expire after 90 days and are removed by scheduled cleanup. Delete them earlier
            from Feedback and support. Support replies appear there; internal triage notes are not
            shown to testers. Reports are not sent to an AI service.
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

export default Privacy;
