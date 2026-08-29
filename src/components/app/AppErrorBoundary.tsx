import React from "react";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

type AppErrorBoundaryProps = {
  children: React.ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
};

class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    (window as any).__UHPAB_LAST_ERROR = {
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
    };
    if (import.meta.env.DEV) {
      console.error("Unhandled application error", error, info);
    }
  }

  private reload = () => {
    window.location.reload();
  };

  private goHome = () => {
    window.location.assign("/dashboard");
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="grid min-h-screen place-items-center bg-muted/30 px-4 py-10">
        <section className="w-full max-w-lg rounded-lg border bg-card p-6 shadow-lg sm:p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="mt-5 text-2xl font-bold">This page could not finish loading</h1>
          <p className="mt-2 leading-7 text-muted-foreground">
            Your saved work remains on this device. Reload the page to continue, or return to the
            dashboard and reopen the tool.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button className="gap-2" onClick={this.reload}>
              <RefreshCw className="h-4 w-4" />
              Reload page
            </Button>
            <Button variant="outline" className="gap-2" onClick={this.goHome}>
              <Home className="h-4 w-4" />
              Dashboard
            </Button>
          </div>
        </section>
      </main>
    );
  }
}

export default AppErrorBoundary;
