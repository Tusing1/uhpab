import { Loader2 } from "lucide-react";

const RouteLoadingScreen = () => (
  <div
    className="grid min-h-[60vh] place-items-center bg-background"
    role="status"
    aria-live="polite"
    aria-label="Loading page"
  >
    <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
      Loading workspace...
    </div>
  </div>
);

export default RouteLoadingScreen;
