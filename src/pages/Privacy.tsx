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
      <p className="mt-2 text-sm text-muted-foreground">Last updated: 27 July 2026</p>

      <div className="mt-8 space-y-7 text-sm leading-7 text-muted-foreground">
        <section>
          <h2 className="text-lg font-semibold text-foreground">Research documents and results</h2>
          <p className="mt-1">
            Document-analysis files, writing reviews, originality results, and human-review results
            are currently stored in the browser on the device where they were created. They are not
            automatically synchronized to another device.
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
          <h2 className="text-lg font-semibold text-foreground">Service changes</h2>
          <p className="mt-1">
            When cloud accounts or school synchronization are introduced, this notice must be
            updated before that data collection is enabled.
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
