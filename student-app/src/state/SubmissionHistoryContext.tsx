import { createContext, type PropsWithChildren, useContext, useMemo, useState } from 'react';

import type { SubmissionRecord, SubmissionResult } from '../types/student';

type SubmissionHistoryContextValue = {
  submissions: SubmissionRecord[];
  addSubmission: (result: SubmissionResult) => SubmissionRecord;
};

const SubmissionHistoryContext = createContext<SubmissionHistoryContextValue | null>(null);

export function SubmissionHistoryProvider({ children }: PropsWithChildren) {
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);

  const value = useMemo<SubmissionHistoryContextValue>(() => ({
    submissions,
    addSubmission: (result) => {
      const record: SubmissionRecord = {
        id: `submission-${Date.now()}`,
        submittedAt: new Date().toISOString(),
        result,
      };

      setSubmissions((previous) => [record, ...previous]);
      return record;
    },
  }), [submissions]);

  return (
    <SubmissionHistoryContext.Provider value={value}>
      {children}
    </SubmissionHistoryContext.Provider>
  );
}

export function useSubmissionHistory() {
  const context = useContext(SubmissionHistoryContext);

  if (!context) {
    throw new Error('useSubmissionHistory must be used inside SubmissionHistoryProvider.');
  }

  return context;
}
