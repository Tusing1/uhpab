import { createContext, useContext } from 'react';
import type { FeedbackContext as ReportContext } from '@/lib/testerFeedback';

export const FeedbackContext = createContext<(context?: ReportContext) => void>(() => undefined);
export const useReportProblem = () => useContext(FeedbackContext);
