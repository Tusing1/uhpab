import React, { lazy, Suspense, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import type { FeedbackContext as ReportContext } from '@/lib/testerFeedback';
import { FeedbackContext } from '@/contexts/feedbackContextValue';

const FeedbackDialog = lazy(() => import('@/components/feedback/FeedbackDialog'));

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const [request, setRequest] = useState<{ owner: string; pathname: string; context: ReportContext } | null>(null);
  return <FeedbackContext.Provider value={context => {
    if (user) setRequest({ owner: user.id, pathname: location.pathname, context: context || {} });
  }}>
    {children}
    {request && request.owner === user?.id && <Suspense fallback={null}><FeedbackDialog key={request.owner} userId={request.owner} pathname={request.pathname} context={request.context} onClose={() => setRequest(null)} /></Suspense>}
  </FeedbackContext.Provider>;
}
