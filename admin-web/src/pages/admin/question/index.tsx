import { useCallback, useEffect, useMemo, useState } from 'react';
import { questionApi, QuestionApiItem, QuestionPayload } from '../../../api/questions';
import { Pagination } from '../../../components/admin/Pagination';
import { QuestionForm, QuestionFormValues } from '../../../components/admin/QuestionForm';
import { QuestionRow, QuestionTable } from '../../../components/admin/QuestionTable';
import { QuestionStatusOptions } from '../../../constants/statusLabels';
import { ContentStatus, Difficulty } from '../../../types/domain';

const PAGE_SIZE = 6;

type QuestionFilterOption = {
  subjects: string[];
  categories: string[];
};

type QuestionFilter = 'all' | string;
type DifficultyFilter = 'all' | Difficulty;
type StatusFilter = 'all' | ContentStatus;

const toRow = (question: QuestionApiItem): QuestionRow => ({
  id: question.id,
  subject: question.subject,
  category: question.category ?? undefined,
  difficulty: question.difficulty,
  type: 'multiple_choice',
  content: question.content,
  choices: question.choices.map((choice) => choice.text),
  correctAnswerIndex: question.correctAnswerIndex,
  status: question.status,
  createdAt: question.createdAt,
  updatedAt: question.updatedAt,
  deletedAt: null,
});

const toFormValues = (question: QuestionRow): QuestionFormValues => ({
  subject: question.subject,
  category: question.category ?? '',
  difficulty: question.difficulty,
  type: question.type,
  content: question.content,
  choices: question.choices,
  correctAnswerIndex: question.correctAnswerIndex,
  status: question.status,
});

const toPayload = (values: QuestionFormValues): QuestionPayload => ({
  subject: values.subject.trim(),
  category: values.category.trim() || null,
  difficulty: values.difficulty,
  type: 'multiple_choice',
  content: values.content.trim(),
  choices: values.choices.map((choice) => choice.trim()),
  correctAnswerIndex: values.correctAnswerIndex,
  status: values.status,
});

export function QuestionPage() {
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [filterOptions, setFilterOptions] = useState<QuestionFilterOption>({
    subjects: [],
    categories: [],
  });
  const [keyword, setKeyword] = useState('');
  const [subject, setSubject] = useState<QuestionFilter>('all');
  const [category, setCategory] = useState<QuestionFilter>('all');
  const [difficulty, setDifficulty] = useState<DifficultyFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [editingQuestion, setEditingQuestion] = useState<QuestionRow | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const subjects = useMemo(
    () => Array.from(new Set([...filterOptions.subjects, ...questions.map((question) => question.subject)])).sort(),
    [filterOptions.subjects, questions],
  );
  const categories = useMemo(
    () =>
      Array.from(
        new Set([...filterOptions.categories, ...questions.map((question) => question.category).filter(Boolean)]),
      ).sort() as string[],
    [filterOptions.categories, questions],
  );

  const loadFilterOptions = useCallback(async () => {
    const response = await questionApi.list({
      page: 1,
      limit: 100,
      type: 'multiple_choice',
    });
    const rows = response.data.map(toRow);

    setFilterOptions({
      subjects: Array.from(new Set(rows.map((question) => question.subject))).sort(),
      categories: Array.from(new Set(rows.map((question) => question.category).filter(Boolean))).sort() as string[],
    });
  }, []);

  const loadQuestions = useCallback(async (nextPage = page) => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await questionApi.list({
        page: nextPage,
        limit: PAGE_SIZE,
        keyword,
        subject: subject === 'all' ? undefined : subject,
        category: category === 'all' ? undefined : category,
        difficulty: difficulty === 'all' ? undefined : difficulty,
        status: status === 'all' ? undefined : status,
        type: 'multiple_choice',
      });

      setQuestions(response.data.map(toRow));
      setTotalItems(response.meta.total);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '문제 목록을 불러오지 못했습니다.');
      setQuestions([]);
      setTotalItems(0);
    } finally {
      setIsLoading(false);
    }
  }, [category, difficulty, keyword, page, status, subject]);

  useEffect(() => {
    loadFilterOptions().catch((error) => {
      setErrorMessage(error instanceof Error ? error.message : '문제 필터 목록을 불러오지 못했습니다.');
    });
  }, [loadFilterOptions]);

  useEffect(() => {
    void loadQuestions();
  }, [loadQuestions]);

  const closeForm = () => {
    setEditingQuestion(null);
    setIsCreating(false);
  };

  const handleKeywordChange = (value: string) => {
    setKeyword(value);
    setPage(1);
  };

  const handleSubjectChange = (value: QuestionFilter) => {
    setSubject(value);
    setPage(1);
  };

  const handleCategoryChange = (value: QuestionFilter) => {
    setCategory(value);
    setPage(1);
  };

  const handleDifficultyChange = (value: DifficultyFilter) => {
    setDifficulty(value);
    setPage(1);
  };

  const handleStatusChange = (value: StatusFilter) => {
    setStatus(value);
    setPage(1);
  };

  const resetFilters = () => {
    setKeyword('');
    setSubject('all');
    setCategory('all');
    setDifficulty('all');
    setStatus('all');
    setPage(1);
  };

  const handleCreate = async (values: QuestionFormValues) => {
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await questionApi.create(toPayload(values));
      closeForm();
      setPage(1);
      await Promise.all([loadQuestions(1), loadFilterOptions()]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '문제를 생성하지 못했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (values: QuestionFormValues) => {
    if (!editingQuestion) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await questionApi.update(editingQuestion.id, toPayload(values));
      closeForm();
      await Promise.all([loadQuestions(), loadFilterOptions()]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '문제를 수정하지 못했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (questionId: string) => {
    const target = questions.find((question) => question.id === questionId);
    if (!target) return;

    const confirmed = window.confirm('선택한 문제를 삭제할까요?');
    if (!confirmed) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await questionApi.delete(questionId);
      setPage(1);
      await Promise.all([loadQuestions(1), loadFilterOptions()]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '문제를 삭제하지 못했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="cohort-page">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Question Bank</p>
          <h1>문제관리</h1>
        </div>
        <button className="primary-button" type="button" onClick={() => setIsCreating(true)}>
          문제 추가
        </button>
      </section>

      <section className="dashboard-panel">
        <div className="toolbar">
          <label className="search-field">
            <span>검색</span>
            <input
              value={keyword}
              onChange={(event) => handleKeywordChange(event.target.value)}
              placeholder="문제 내용, 과목, 카테고리, 난이도, 상태 검색"
            />
          </label>
          <label className="search-field">
            <span>과목</span>
            <select value={subject} onChange={(event) => handleSubjectChange(event.target.value)}>
              <option value="all">전체 과목</option>
              {subjects.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="search-field">
            <span>카테고리</span>
            <select value={category} onChange={(event) => handleCategoryChange(event.target.value)}>
              <option value="all">전체 카테고리</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="search-field">
            <span>난이도</span>
            <select
              value={difficulty}
              onChange={(event) => handleDifficultyChange(event.target.value as DifficultyFilter)}
            >
              <option value="all">전체 난이도</option>
              <option value="easy">쉬움</option>
              <option value="medium">보통</option>
              <option value="hard">어려움</option>
            </select>
          </label>
          <label className="search-field">
            <span>상태</span>
            <select
              value={status}
              onChange={(event) => handleStatusChange(event.target.value as StatusFilter)}
            >
              <option value="all">전체 상태</option>
              {QuestionStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button className="secondary-button" type="button" onClick={resetFilters}>
            초기화
          </button>
        </div>

        {errorMessage ? <p className="table-subtitle">{errorMessage}</p> : null}
        {isLoading ? <p className="table-subtitle">문제 목록을 불러오는 중입니다.</p> : null}

        <QuestionTable questions={questions} onDelete={handleDelete} onEdit={setEditingQuestion} />
        <Pagination
          currentPage={currentPage}
          totalItems={totalItems}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </section>

      {(isCreating || editingQuestion) && (
        <section className="dashboard-panel">
          <div className="panel-header">
            <div>
              <h2>{isCreating ? '문제 추가' : '문제 수정'}</h2>
              <p>객관식 문제는 보기 2~5개까지 관리할 수 있습니다. 저장 시 DB에 반영됩니다.</p>
            </div>
          </div>
          <QuestionForm
            disabled={isSubmitting}
            initialValues={editingQuestion ? toFormValues(editingQuestion) : undefined}
            mode={isCreating ? 'create' : 'edit'}
            onCancel={closeForm}
            onSubmit={isCreating ? handleCreate : handleUpdate}
          />
        </section>
      )}
    </div>
  );
}
