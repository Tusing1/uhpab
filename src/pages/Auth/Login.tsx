
import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, LogIn } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { isDemoAuthEnabled } from '@/lib/runtimeConfig';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = typeof location.state?.from === "string" ? location.state.from : "/dashboard";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await login(email, password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <AuthShell
      eyebrow="Secure access"
      title="Sign in"
      description="Continue your proposal, report, review history, and school workspace."
      icon={<LogIn className="h-6 w-6" />}
      footer={
        <div className="space-y-4 text-center">
          <div className="text-sm text-muted-foreground">
            <span>Do not have an account? </span>
            <Link to="/register" className="font-medium text-primary hover:underline">
              Sign up
            </Link>
          </div>
          {isDemoAuthEnabled && (
            <div className="rounded-lg border bg-muted/40 p-3 text-xs leading-5 text-muted-foreground">
              <p className="font-medium text-foreground">Local demo accounts</p>
              <p>Free: demo@uhpab.edu / password</p>
              <p>Premium: premium@uhpab.edu / password</p>
              <p>School: school@example.edu / password</p>
              <p>Supervisor: akello@school.example / password</p>
              <p>Student: anitah@student.example / password</p>
            </div>
          )}
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
        <form onSubmit={handleSubmit} className="space-y-4">
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link to="/forgot-password" className="text-sm font-medium text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
      </div>
    </AuthShell>
  );
};

export default Login;
