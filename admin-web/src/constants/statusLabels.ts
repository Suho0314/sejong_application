import { ContentStatus } from '../types/domain';

// Question status business meaning:
// draft: 아직 검수되지 않은 문제이며 문제집에 포함되지 않음
// published: 사용 가능한 문제이며 문제집에 포함 가능
// archived: 보관된 문제이며 신규 문제집에는 추가 불가
export const QuestionStatusLabel: Record<ContentStatus, string> = {
  draft: '작성중',
  published: '사용중',
  archived: '보관',
};

export const QuestionStatusDescription: Record<ContentStatus, string> = {
  draft: '아직 검수되지 않은 문제이며 문제집에 포함되지 않음',
  published: '사용 가능한 문제이며 문제집에 포함 가능',
  archived: '보관된 문제이며 신규 문제집에는 추가 불가',
};

export const QuestionStatusOptions = [
  { value: 'draft', label: QuestionStatusLabel.draft },
  { value: 'published', label: QuestionStatusLabel.published },
  { value: 'archived', label: QuestionStatusLabel.archived },
] satisfies Array<{ value: ContentStatus; label: string }>;

export const WorkbookStatusLabel: Record<ContentStatus, string> = {
  draft: '작성중',
  published: '사용중',
  archived: '보관',
};

export const WorkbookStatusOptions = [
  { value: 'draft', label: WorkbookStatusLabel.draft },
  { value: 'published', label: WorkbookStatusLabel.published },
  { value: 'archived', label: WorkbookStatusLabel.archived },
] satisfies Array<{ value: ContentStatus; label: string }>;
