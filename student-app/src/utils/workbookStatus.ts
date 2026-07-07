import type { SolveProgress, Workbook, WorkbookStatus } from '../types/student';

export const workbookStatusLabel: Record<WorkbookStatus, string> = {
  notStarted: '풀이 전',
  inProgress: '풀이 중',
  retrying: '다시 푸는 중',
  submitted: '완료',
};

export function resolveWorkbookStatus(
  workbook: Workbook,
  progress?: SolveProgress,
): WorkbookStatus {
  return progress?.status ?? workbook.status;
}

export function getWorkbookActionLabel(status: WorkbookStatus) {
  if (status === 'submitted') {
    return '다시 풀기';
  }

  if (status === 'inProgress' || status === 'retrying') {
    return '풀이 이어하기';
  }

  return '풀이 시작';
}

export function getStartProgressStatus(status: WorkbookStatus): 'inProgress' | 'retrying' {
  return status === 'submitted' ? 'retrying' : status === 'retrying' ? 'retrying' : 'inProgress';
}

export function isActiveWorkbookStatus(status: WorkbookStatus) {
  return status === 'inProgress' || status === 'retrying';
}
