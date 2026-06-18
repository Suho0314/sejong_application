type PaginationProps = {
  currentPage: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export function Pagination({ currentPage, totalItems, totalPages, onPageChange }: PaginationProps) {
  return (
    <div className="pagination">
      <span>
        총 {totalItems.toLocaleString('ko-KR')}개 · {currentPage}/{totalPages} 페이지
      </span>
      <div>
        <button
          className="secondary-button"
          disabled={currentPage === 1}
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        >
          이전
        </button>
        <button
          className="secondary-button"
          disabled={currentPage === totalPages}
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        >
          다음
        </button>
      </div>
    </div>
  );
}
