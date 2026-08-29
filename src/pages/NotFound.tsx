import { ArrowLeft, Home } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  return (
    <main className="grid min-h-screen place-items-center bg-muted/30 px-4 py-10">
      <section className="w-full max-w-xl rounded-lg border bg-card p-6 text-center shadow-lg sm:p-10">
        <p className="text-sm font-semibold uppercase text-primary">Page not found</p>
        <h1 className="mt-3 text-5xl font-bold">404</h1>
        <p className="mt-4 text-lg font-medium">We could not find this page.</p>
        <p className="mx-auto mt-2 max-w-md break-words text-sm leading-6 text-muted-foreground">
          The address <span className="font-mono text-foreground">{location.pathname}</span> may be
          outdated or incomplete.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild className="gap-2">
            <Link to="/dashboard">
              <Home className="h-4 w-4" />
              Go to dashboard
            </Link>
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4" />
            Go back
          </Button>
        </div>
      </section>
    </main>
  );
};

export default NotFound;
