import { ContentStatus } from '../../types/domain';

export type WorkbookTableRow = {
  id: string;
  title: string;
  description?: string;
  status: ContentStatus;
  questionCount: number;
  totalScore: number;
  updatedAt: string;
};

type WorkbookTableProps = {
  selectedWorkbookId: string | null;
  workbooks: WorkbookTableRow[];
  onDelete: (workbookId: string) => void;
  onEdit: (workbook: WorkbookTableRow) => void;
  onSelect: (workbookId: string) => void;
};

const statusLabels: Record<ContentStatus, string> = {
  draft: '초안',
  published: '게시',
  archived: '보관',
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));

export function WorkbookTable({ selectedWorkbookId, workbooks, onDelete, onEdit, onSelect }: WorkbookTableProps) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>문제집</th>
            <th>상태</th>
            <th>문항수</th>
            <th>총점</th>
            <th>수정일</th>
            <th>편집</th>
            <th>삭제</th>
          </tr>
        </thead>
        <tbody>
          {workbooks.map((workbook) => (
            <tr key={workbook.id}>
              <td>
                <button className="text-button" type="button" onClick={() => onSelect(workbook.id)}>
                  <div className="table-title">{workbook.title}</div>
                </button>
                <span className="table-subtitle">
                  {selectedWorkbookId === workbook.id ? '선택됨 · ' : ''}
                  {workbook.description || '설명 없음'}
                </span>
              </td>
              <td>
                <span className={`status-pill status-${workbook.status}`}>{statusLabels[workbook.status]}</span>
              </td>
              <td>{workbook.questionCount.toLocaleString('ko-KR')}문항</td>
              <td>{workbook.totalScore.toLocaleString('ko-KR')}점</td>
              <td>{formatDate(workbook.updatedAt)}</td>
              <td>
                <button className="text-button" type="button" onClick={() => onEdit(workbook)}>
                  수정
                </button>
              </td>
              <td>
                <button className="danger-button" type="button" onClick={() => onDelete(workbook.id)}>
                  삭제
                </button>
              </td>
            </tr>
          ))}
          {workbooks.length === 0 ? (
            <tr>
              <td className="empty-cell" colSpan={7}>
                검색 결과가 없습니다.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
