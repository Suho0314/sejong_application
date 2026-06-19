import { createContext, type PropsWithChildren, useContext, useMemo, useState } from 'react';

import { mockSolveProgress } from '../mock/studentMockData';
import type { SolveProgress, SolveProgressStatus, StudentAnswer } from '../types/student';

type ActiveSolveProgressStatus = Exclude<SolveProgressStatus, 'submitted'>;

type SolveProgressContextValue = {
  progressList: SolveProgress[];
  getProgress: (workbookId: string) => SolveProgress | undefined;
  startProgress: (workbookId: string, status?: ActiveSolveProgressStatus) => void;
  saveProgress: (
    workbookId: string,
    currentQuestionIndex: number,
    answers: StudentAnswer[],
  ) => void;
  submitProgress: (workbookId: string, answers: StudentAnswer[]) => void;
};

const SolveProgressContext = createContext<SolveProgressContextValue | null>(null);

export function SolveProgressProvider({ children }: PropsWithChildren) {
  const [progressList, setProgressList] = useState<SolveProgress[]>(mockSolveProgress);

  const value = useMemo<SolveProgressContextValue>(() => ({
    progressList,
    getProgress: (workbookId) => progressList.find((item) => item.workbookId === workbookId),
    startProgress: (workbookId, status = 'inProgress') => {
      setProgressList((previous) => {
        const existing = previous.find((item) => item.workbookId === workbookId);

        if (existing?.status === 'inProgress' || existing?.status === 'retrying') {
          return previous;
        }

        const progress: SolveProgress = {
          workbookId,
          currentQuestionIndex: 0,
          answers: [],
          status,
          updatedAt: new Date().toISOString(),
        };

        return [progress, ...previous.filter((item) => item.workbookId !== workbookId)];
      });
    },
    saveProgress: (workbookId, currentQuestionIndex, answers) => {
      setProgressList((previous) => {
        const existing = previous.find((item) => item.workbookId === workbookId);
        const progress: SolveProgress = {
          workbookId,
          currentQuestionIndex,
          answers,
          status: existing?.status === 'retrying' ? 'retrying' : 'inProgress',
          updatedAt: new Date().toISOString(),
        };

        return [progress, ...previous.filter((item) => item.workbookId !== workbookId)];
      });
    },
    submitProgress: (workbookId, answers) => {
      const progress: SolveProgress = {
        workbookId,
        currentQuestionIndex: 0,
        answers,
        status: 'submitted',
        updatedAt: new Date().toISOString(),
      };

      setProgressList((previous) => [
        progress,
        ...previous.filter((item) => item.workbookId !== workbookId),
      ]);
    },
  }), [progressList]);

  return (
    <SolveProgressContext.Provider value={value}>
      {children}
    </SolveProgressContext.Provider>
  );
}

export function useSolveProgress() {
  const context = useContext(SolveProgressContext);

  if (!context) {
    throw new Error('useSolveProgress must be used inside SolveProgressProvider.');
  }

  return context;
}
