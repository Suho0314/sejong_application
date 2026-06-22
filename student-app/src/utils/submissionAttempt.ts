import { ApiError } from '../api/client';
import type { Workbook } from '../types/student';

export const ATTEMPT_LIMIT_MESSAGE = '최대 제출 횟수를 초과했습니다.';

type ErrorResponse = {
  code?: unknown;
  error?: {
    code?: unknown;
  };
};

export function hasReachedAttemptLimit(workbook: Workbook) {
  return (
    typeof workbook.maxAttempts === 'number' &&
    typeof workbook.submittedCount === 'number' &&
    workbook.maxAttempts > 0 &&
    workbook.submittedCount >= workbook.maxAttempts
  );
}

export function isAttemptLimitExceededError(error: unknown) {
  if (!(error instanceof ApiError) || error.status !== 409) return false;

  const response = error.details as ErrorResponse | null;
  const code = response?.error?.code ?? response?.code;

  return code === 'MAX_ATTEMPTS_EXCEEDED';
}
