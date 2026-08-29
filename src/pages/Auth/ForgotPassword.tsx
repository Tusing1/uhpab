import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, MailCheck } from "lucide-react";

import { AuthShell } from "@/components/auth/AuthShell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      if (!supabase) {
        throw new Error("Password reset is not configured for this deployment.");
      }

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/login`,
      });

      if (resetError) throw resetError;
      setMessage("Check your email for the secure reset link.");
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Password reset could not be started.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Reset password"
      description="Enter your account email and we will send a secure reset link."
      icon={<MailCheck className="h-6 w-6" />}
      backTo="/login"
      backLabel="Back to sign in"
      footer={
        <div className="text-center text-sm text-muted-foreground">
          <Link to="/login" className="font-medium text-primary hover:underline">
            I remember my password
          </Link>
        </div>
      }
    >
      <div className="space-y-4">
        {error && (
          <Alert variant="destructive" className="bg-destructive/10">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {message && (
          <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
            <MailCheck className="h-4 w-4" />
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Sending reset link..." : "Send reset link"}
          </Button>
        </form>
      </div>
    </AuthShell>
  );
};

export default ForgotPassword;
