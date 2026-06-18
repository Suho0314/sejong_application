import { useMemo, useState } from 'react';
import { Pagination } from '../../../components/admin/Pagination';
import { QuestionForm, QuestionFormValues } from '../../../components/admin/QuestionForm';
import { QuestionRow, QuestionTable } from '../../../components/admin/QuestionTable';
import questionsData from '../../../mock/questions.json';
import { ContentStatus, Difficulty } from '../../../types/domain';

const PAGE_SIZE = 6;

const createId = (subject: string) =>
  `question-${subject
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-|-$/g, '')}-${Date.now()}`;

const normalizeQuestion = (question: (typeof questionsData)[number]): QuestionRow => ({
  id: question.id,
  subject: question.subject,
  category: question.category,
  difficulty: question.difficulty as Difficulty,
  type: 'multiple_choice',
  content: question.content,
  choices: question.choices,
  correctAnswerIndex: question.correctAnswerIndex,
  explanation: question.explanation,
  status: question.status as ContentStatus,
  createdAt: question.createdAt,
  updatedAt: question.updatedAt,
  deletedAt: question.deletedAt,
});

const toFormValues = (question: QuestionRow): QuestionFormValues => ({
  subject: question.subject,
  category: question.category ?? '',
  difficulty: question.difficulty,
  type: question.type,
  content: question.content,
  choices: question.choices,
  correctAnswerIndex: question.correctAnswerIndex,
  explanation: question.explanation ?? '',
  status: question.status,
});

export function QuestionPage() {
  const [questions, setQuestions] = useState<QuestionRow[]>(() => questionsData.map(normalizeQuestion));
  const [keyword, setKeyword] = useState('');
  const [subject, setSubject] = useState('all');
  const [category, setCategory] = useState('all');
  const [difficulty, setDifficulty] = useState<Difficulty | 'all'>('all');
  const [status, setStatus] = useState<ContentStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [editingQuestion, setEditingQuestion] = useState<QuestionRow | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const subjects = useMemo(() => Array.from(new Set(questions.map((question) => question.subject))).sort(), [questions]);
  const categories = useMemo(
    () => Array.from(new Set(questions.map((question) => question.category).filter(Boolean))).sort() as string[],
    [questions],
  );

  const filteredQuestions = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return questions.filter((question) => {
      const matchesKeyword =
        !normalizedKeyword ||
        [question.content, question.subject, question.category ?? '', question.explanation ?? ''].some((value) =>
          value.toLowerCase().includes(normalizedKeyword),
        );
      const matchesSubject = subject === 'all' || question.subject === subject;
      const matchesCategory = category === 'all' || question.category === category;
      const matchesDifficulty = difficulty === 'all' || question.difficulty === difficulty;
      const matchesStatus = status === 'all' || question.status === status;

      return matchesKeyword && matchesSubject && matchesCategory && matchesDifficulty && matchesStatus;
    });
  }, [category, difficulty, keyword, questions, status, subject]);

  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filteredQuestions.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const closeForm = () => {
    setEditingQuestion(null);
    setIsCreating(false);
  };

  const resetFilters = () => {
    setKeyword('');
    setSubject('all');
    setCategory('all');
    setDifficulty('all');
    setStatus('all');
    setPage(1);
  };

  const handleCreate = (values: QuestionFormValues) => {
    const now = new Date().toISOString();
    const nextQuestion: QuestionRow = {
      id: createId(values.subject),
      subject: values.subject,
      category: values.category,
      difficulty: values.difficulty,
      type: 'multiple_choice',
      content: values.content,
      choices: values.choices,
      correctAnswerIndex: values.correctAnswerIndex,
      explanation: values.explanation,
      status: values.status,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    setQuestions((current) => [nextQuestion, ...current]);
    setPage(1);
    closeForm();
  };

  const handleUpdate = (values: QuestionFormValues) => {
    if (!editingQuestion) return;

    setQuestions((current) =>
      current.map((question) =>
        question.id === editingQuestion.id
          ? {
              ...question,
              subject: values.subject,
              category: values.category,
              difficulty: values.difficulty,
              type: 'multiple_choice',
              content: values.content,
              choices: values.choices,
              correctAnswerIndex: values.correctAnswerIndex,
              explanation: values.explanation,
              status: values.status,
              updatedAt: new Date().toISOString(),
            }
          : question,
      ),
    );
    closeForm();
  };

  const handleDelete = (questionId: string) => {
    const target = questions.find((question) => question.id === questionId);
    if (!target) return;

    const confirmed = window.confirm('선택한 문제를 삭제할까요? Mock Data 화면에서만 제거됩니다.');
    if (!confirmed) return;

    setQuestions((current) => current.filter((question) => question.id !== questionId));
    setPage(1);
  };

  const handleFilterChange = (callback: () => void) => {
    callback();
    setPage(1);
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
              onChange={(event) => handleFilterChange(() => setKeyword(event.target.value))}
              placeholder="문제, 과목, 카테고리, 해설 검색"
            />
          </label>
          <label className="search-field">
            <span>과목</span>
            <select value={subject} onChange={(event) => handleFilterChange(() => setSubject(event.target.value))}>
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
            <select value={category} onChange={(event) => handleFilterChange(() => setCategory(event.target.value))}>
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
              onChange={(event) => handleFilterChange(() => setDifficulty(event.target.value as Difficulty | 'all'))}
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
              onChange={(event) => handleFilterChange(() => setStatus(event.target.value as ContentStatus | 'all'))}
            >
              <option value="all">전체 상태</option>
              <option value="draft">초안</option>
              <option value="published">게시</option>
              <option value="archived">보관</option>
            </select>
          </label>
          <button className="secondary-button" type="button" onClick={resetFilters}>
            초기화
          </button>
        </div>

        <QuestionTable questions={pageItems} onDelete={handleDelete} onEdit={setEditingQuestion} />
        <Pagination
          currentPage={currentPage}
          totalItems={filteredQuestions.length}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </section>

      {(isCreating || editingQuestion) && (
        <section className="dashboard-panel">
          <div className="panel-header">
            <div>
              <h2>{isCreating ? '문제 추가' : '문제 수정'}</h2>
              <p>객관식 4지선다 문제를 관리합니다. Mock Data 화면 상태에서만 반영됩니다.</p>
            </div>
          </div>
          <QuestionForm
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
