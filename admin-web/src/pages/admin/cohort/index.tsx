import { useMemo, useState } from 'react';
import cohorts from '../../../mock/cohorts.json';

const PAGE_SIZE = 2;

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));

export function CohortPage() {
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);

  const filteredCohorts = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    if (!normalizedKeyword) return cohorts;

    return cohorts.filter((cohort) =>
      [cohort.name, cohort.code, cohort.description].some((value) =>
        value.toLowerCase().includes(normalizedKeyword),
      ),
    );
  }, [keyword]);

  const totalPages = Math.max(1, Math.ceil(filteredCohorts.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filteredCohorts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleSearchChange = (value: string) => {
    setKeyword(value);
    setPage(1);
  };

  return (
    <div className="cohort-page">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Cohort Management</p>
          <h1>기수관리</h1>
        </div>
        <button className="primary-button" type="button">
          기수 추가
        </button>
      </section>

      <section className="dashboard-panel">
        <div className="toolbar">
          <label className="search-field">
            <span>검색</span>
            <input
              value={keyword}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder="기수명, 코드, 설명 검색"
            />
          </label>
          <button className="secondary-button" type="button" onClick={() => handleSearchChange('')}>
            초기화
          </button>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>기수명</th>
                <th>학생수</th>
                <th>생성일</th>
                <th>수정</th>
                <th>삭제</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((cohort) => (
                <tr key={cohort.id}>
                  <td>
                    <div className="table-title">{cohort.name}</div>
                    <span className="table-subtitle">{cohort.code}</span>
                  </td>
                  <td>{cohort.studentCount}명</td>
                  <td>{formatDate(cohort.createdAt)}</td>
                  <td>
                    <button className="text-button" type="button">
                      수정
                    </button>
                  </td>
                  <td>
                    <button className="danger-button" type="button">
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
              {pageItems.length === 0 ? (
                <tr>
                  <td className="empty-cell" colSpan={5}>
                    검색 결과가 없습니다.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="pagination">
          <span>
            총 {filteredCohorts.length}개 · {currentPage}/{totalPages} 페이지
          </span>
          <div>
            <button
              className="secondary-button"
              type="button"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={currentPage === 1}
            >
              이전
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              disabled={currentPage === totalPages}
            >
              다음
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
