import { CSSProperties, DragEvent, useMemo, useState } from 'react';
import { WorkbookForm, WorkbookFormValues } from '../../../components/admin/WorkbookForm';
import { WorkbookTable, WorkbookTableRow } from '../../../components/admin/WorkbookTable';
import questionsData from '../../../mock/questions.json';
import workbookQuestionsData from '../../../mock/workbookQuestions.json';
import workbooksData from '../../../mock/workbooks.json';
import { ContentStatus, Difficulty } from '../../../types/domain';

type QuestionRow = {
  id: string;
  subject: string;
  category?: string;
  difficulty: Difficulty;
  type: 'multiple_choice';
  questionType?: 'multiple_choice';
  content: string;
  stem?: string;
  choices: string[];
  correctAnswerIndex: number;
  explanation?: string;
  status: ContentStatus;
  source?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

type WorkbookRow = {
  id: string;
  createdBy: string;
  title: string;
  description?: string;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

type WorkbookQuestionRow = {
  id: string;
  workbookId: string;
  questionId: string;
  orderIndex: number;
  score: number;
  createdAt: string;
  updatedAt: string;
};

const questions = questionsData as QuestionRow[];
const initialWorkbooks = workbooksData.map((workbook) => ({
  id: workbook.id,
  createdBy: workbook.createdBy,
  title: workbook.title,
  description: workbook.description,
  status: workbook.status as ContentStatus,
  createdAt: workbook.createdAt,
  updatedAt: workbook.updatedAt,
  deletedAt: workbook.deletedAt,
})) satisfies WorkbookRow[];

const initialWorkbookQuestions = workbookQuestionsData as WorkbookQuestionRow[];

const difficultyLabels: Record<Difficulty, string> = {
  easy: '쉬움',
  medium: '보통',
  hard: '어려움',
};

const statusLabels: Record<ContentStatus, string> = {
  draft: '초안',
  published: '게시',
  archived: '보관',
};

const getQuestionText = (question: QuestionRow) => question.content || question.stem || '';

const getQuestionTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    multiple_choice: '객관식',
  };

  return labels[type] ?? type;
};

const createTimestamp = () => new Date().toISOString();

const reindexWorkbookQuestions = (items: WorkbookQuestionRow[]) =>
  items.map((item, index) => ({
    ...item,
    orderIndex: index + 1,
  }));

const modalBackdropStyle: CSSProperties = {
  alignItems: 'center',
  background: 'rgba(15, 23, 42, 0.36)',
  display: 'flex',
  inset: 0,
  justifyContent: 'center',
  padding: 24,
  position: 'fixed',
  zIndex: 20,
};

const modalPanelStyle: CSSProperties = {
  maxHeight: 'calc(100vh - 48px)',
  maxWidth: 720,
  overflowY: 'auto',
  width: 'min(720px, 100%)',
};

export function WorkbookPage() {
  const [workbooks, setWorkbooks] = useState<WorkbookRow[]>(initialWorkbooks);
  const [workbookQuestions, setWorkbookQuestions] = useState<WorkbookQuestionRow[]>(initialWorkbookQuestions);
  const [selectedWorkbookId, setSelectedWorkbookId] = useState<string | null>(initialWorkbooks[0]?.id ?? null);
  const [workbookKeyword, setWorkbookKeyword] = useState('');
  const [questionKeyword, setQuestionKeyword] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState<Difficulty | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<ContentStatus | 'all'>('all');
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [editingWorkbookId, setEditingWorkbookId] = useState<string | null>(null);

  const selectedWorkbook = useMemo(
    () => workbooks.find((workbook) => workbook.id === selectedWorkbookId) ?? null,
    [selectedWorkbookId, workbooks],
  );

  const selectedItems = useMemo(
    () =>
      workbookQuestions
        .filter((item) => item.workbookId === selectedWorkbookId)
        .sort((first, second) => first.orderIndex - second.orderIndex),
    [selectedWorkbookId, workbookQuestions],
  );

  const selectedQuestionIds = useMemo(
    () => new Set(selectedItems.map((item) => item.questionId)),
    [selectedItems],
  );

  const workbookTableRows = useMemo<WorkbookTableRow[]>(() => {
    const normalizedKeyword = workbookKeyword.trim().toLowerCase();

    return workbooks
      .map((workbook) => {
        const items = workbookQuestions.filter((item) => item.workbookId === workbook.id);
        const totalScore = items.reduce((sum, item) => sum + item.score, 0);

        return {
          ...workbook,
          questionCount: items.length,
          totalScore,
        };
      })
      .filter((workbook) => {
        if (!normalizedKeyword) return true;

        return [workbook.title, workbook.description ?? '', workbook.status]
          .join(' ')
          .toLowerCase()
          .includes(normalizedKeyword);
      });
  }, [workbookKeyword, workbookQuestions, workbooks]);

  const questionSubjects = useMemo(
    () => Array.from(new Set(questions.map((question) => question.subject))).sort(),
    [],
  );

  const questionCategories = useMemo(
    () => Array.from(new Set(questions.map((question) => question.category).filter(Boolean) as string[])).sort(),
    [],
  );

  const filteredQuestions = useMemo(() => {
    const normalizedKeyword = questionKeyword.trim().toLowerCase();

    return questions.filter((question) => {
      const matchesKeyword =
        !normalizedKeyword ||
        [getQuestionText(question), question.subject, question.category ?? '', question.explanation ?? '']
          .join(' ')
          .toLowerCase()
          .includes(normalizedKeyword);
      const matchesSubject = subjectFilter === 'all' || question.subject === subjectFilter;
      const matchesCategory = categoryFilter === 'all' || question.category === categoryFilter;
      const matchesDifficulty = difficultyFilter === 'all' || question.difficulty === difficultyFilter;
      const matchesStatus = statusFilter === 'all' || question.status === statusFilter;

      return matchesKeyword && matchesSubject && matchesCategory && matchesDifficulty && matchesStatus;
    });
  }, [categoryFilter, difficultyFilter, questionKeyword, statusFilter, subjectFilter]);

  const selectedTotalScore = selectedItems.reduce((sum, item) => sum + item.score, 0);
  const editingWorkbook = workbooks.find((workbook) => workbook.id === editingWorkbookId) ?? null;
  const formInitialValues: WorkbookFormValues | undefined = editingWorkbook
    ? {
        title: editingWorkbook.title,
        description: editingWorkbook.description ?? '',
        status: editingWorkbook.status,
      }
    : undefined;

  const openCreateForm = () => {
    setEditingWorkbookId(null);
    setFormMode('create');
  };

  const openEditForm = (workbook: WorkbookTableRow) => {
    setEditingWorkbookId(workbook.id);
    setFormMode('edit');
  };

  const closeForm = () => {
    setEditingWorkbookId(null);
    setFormMode(null);
  };

  const submitWorkbook = (values: WorkbookFormValues) => {
    const now = createTimestamp();

    if (formMode === 'create') {
      const workbookId = `workbook-${now.replace(/[-:.TZ]/g, '').slice(0, 14)}`;
      const nextWorkbook: WorkbookRow = {
        id: workbookId,
        createdBy: 'user-teacher-1',
        title: values.title,
        description: values.description,
        status: values.status,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };

      setWorkbooks((current) => [nextWorkbook, ...current]);
      setSelectedWorkbookId(workbookId);
      closeForm();
      return;
    }

    if (!editingWorkbookId) return;

    setWorkbooks((current) =>
      current.map((workbook) =>
        workbook.id === editingWorkbookId
          ? {
              ...workbook,
              title: values.title,
              description: values.description,
              status: values.status,
              updatedAt: now,
            }
          : workbook,
      ),
    );
    closeForm();
  };

  const deleteWorkbook = (workbookId: string) => {
    setWorkbooks((current) => current.filter((workbook) => workbook.id !== workbookId));
    setWorkbookQuestions((current) => current.filter((item) => item.workbookId !== workbookId));
    setSelectedWorkbookId((current) => {
      if (current !== workbookId) return current;
      return workbooks.find((workbook) => workbook.id !== workbookId)?.id ?? null;
    });
  };

  const addQuestion = (questionId: string) => {
    if (!selectedWorkbookId) return;

    setWorkbookQuestions((current) => {
      const currentItems = current
        .filter((item) => item.workbookId === selectedWorkbookId)
        .sort((first, second) => first.orderIndex - second.orderIndex);

      if (currentItems.some((item) => item.questionId === questionId)) return current;

      const now = createTimestamp();
      const nextItem: WorkbookQuestionRow = {
        id: `wq-${selectedWorkbookId}-${questionId}-${currentItems.length + 1}`,
        workbookId: selectedWorkbookId,
        questionId,
        orderIndex: currentItems.length + 1,
        score: 10,
        createdAt: now,
        updatedAt: now,
      };

      return [...current, nextItem];
    });
  };

  const removeQuestion = (questionId: string) => {
    if (!selectedWorkbookId) return;

    setWorkbookQuestions((current) => {
      const otherItems = current.filter((item) => item.workbookId !== selectedWorkbookId);
      const nextItems = current.filter(
        (item) => item.workbookId === selectedWorkbookId && item.questionId !== questionId,
      );

      return [...otherItems, ...reindexWorkbookQuestions(nextItems)];
    });
  };

  const moveQuestion = (questionId: string, direction: -1 | 1) => {
    if (!selectedWorkbookId) return;

    setWorkbookQuestions((current) => {
      const otherItems = current.filter((item) => item.workbookId !== selectedWorkbookId);
      const currentItems = current
        .filter((item) => item.workbookId === selectedWorkbookId)
        .sort((first, second) => first.orderIndex - second.orderIndex);
      const currentIndex = currentItems.findIndex((item) => item.questionId === questionId);
      const nextIndex = currentIndex + direction;

      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= currentItems.length) return current;

      const nextItems = [...currentItems];
      const [target] = nextItems.splice(currentIndex, 1);
      nextItems.splice(nextIndex, 0, target);

      return [...otherItems, ...reindexWorkbookQuestions(nextItems)];
    });
  };

  const handleDragStart = (event: DragEvent<HTMLElement>, questionId: string) => {
    event.dataTransfer.setData('text/plain', questionId);
    event.dataTransfer.effectAllowed = 'copy';
  };

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    const questionId = event.dataTransfer.getData('text/plain');
    if (questionId) addQuestion(questionId);
  };

  const handleDragOver = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  return (
    <div className="workbook-page">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Workbook Management</p>
          <h1>문제집관리</h1>
        </div>
        <button className="primary-button" type="button" onClick={openCreateForm}>
          문제집 추가
        </button>
      </section>

      {formMode ? (
        <div aria-modal="true" role="dialog" style={modalBackdropStyle}>
          <section className="dashboard-panel" style={modalPanelStyle}>
            <div className="panel-header">
              <div>
                <h2>{formMode === 'create' ? '문제집 생성' : '문제집 수정'}</h2>
                <p>문제집 기본 정보와 공개 상태를 관리합니다.</p>
              </div>
            </div>
            <WorkbookForm
              key={editingWorkbookId ?? 'create'}
              initialValues={formInitialValues}
              mode={formMode}
              onCancel={closeForm}
              onSubmit={submitWorkbook}
            />
          </section>
        </div>
      ) : null}

      <section className="dashboard-panel">
        <div className="panel-header">
          <div>
            <h2>문제집 목록</h2>
            <p>문제집을 선택하면 아래 편집 영역에서 문항을 구성할 수 있습니다.</p>
          </div>
        </div>
        <div className="toolbar">
          <label className="search-field">
            <span>검색</span>
            <input
              value={workbookKeyword}
              onChange={(event) => setWorkbookKeyword(event.target.value)}
              placeholder="문제집명, 설명, 상태 검색"
            />
          </label>
        </div>
        <WorkbookTable
          selectedWorkbookId={selectedWorkbookId}
          workbooks={workbookTableRows}
          onDelete={deleteWorkbook}
          onEdit={openEditForm}
          onSelect={setSelectedWorkbookId}
        />
      </section>

      <section className="workbook-builder">
        <aside className="question-bank dashboard-panel">
          <div className="panel-header">
            <div>
              <h2>문제은행</h2>
              <p>검색과 필터로 문제를 찾고 우측 문제집에 추가합니다.</p>
            </div>
          </div>

          <div className="toolbar">
            <label className="search-field">
              <span>검색</span>
              <input
                value={questionKeyword}
                onChange={(event) => setQuestionKeyword(event.target.value)}
                placeholder="문제, 과목, 카테고리 검색"
              />
            </label>
            <label className="search-field">
              <span>과목</span>
              <select value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)}>
                <option value="all">전체</option>
                {questionSubjects.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </label>
            <label className="search-field">
              <span>카테고리</span>
              <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                <option value="all">전체</option>
                {questionCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <label className="search-field">
              <span>난이도</span>
              <select
                value={difficultyFilter}
                onChange={(event) => setDifficultyFilter(event.target.value as Difficulty | 'all')}
              >
                <option value="all">전체</option>
                <option value="easy">쉬움</option>
                <option value="medium">보통</option>
                <option value="hard">어려움</option>
              </select>
            </label>
            <label className="search-field">
              <span>상태</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as ContentStatus | 'all')}
              >
                <option value="all">전체</option>
                <option value="draft">초안</option>
                <option value="published">게시</option>
                <option value="archived">보관</option>
              </select>
            </label>
          </div>

          <div className="question-list">
            {filteredQuestions.map((question) => {
              const isSelected = selectedQuestionIds.has(question.id);

              return (
                <article
                  className={`question-card ${isSelected ? 'is-selected' : ''}`}
                  draggable
                  key={question.id}
                  onDragStart={(event) => handleDragStart(event, question.id)}
                >
                  <div>
                    <span className="question-meta">
                      {getQuestionTypeLabel(question.type)} · {question.subject} ·{' '}
                      {question.category ?? '미분류'} · {difficultyLabels[question.difficulty]}
                    </span>
                    <strong>{getQuestionText(question)}</strong>
                    <p>{question.explanation}</p>
                  </div>
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => addQuestion(question.id)}
                    disabled={!selectedWorkbook || isSelected}
                  >
                    {isSelected ? '추가됨' : '추가'}
                  </button>
                </article>
              );
            })}
            {filteredQuestions.length === 0 ? (
              <div className="empty-drop">
                <strong>조건에 맞는 문제가 없습니다.</strong>
                <p>검색어 또는 필터를 변경해보세요.</p>
              </div>
            ) : null}
          </div>
        </aside>

        <main className="workbook-canvas dashboard-panel" onDragOver={handleDragOver} onDrop={handleDrop}>
          <div className="panel-header">
            <div>
              <h2>{selectedWorkbook?.title ?? '문제집을 선택하세요'}</h2>
              <p>{selectedWorkbook?.description ?? '목록에서 편집할 문제집을 선택하면 문항 구성을 시작할 수 있습니다.'}</p>
            </div>
            <div className="workbook-summary">
              <strong>{selectedItems.length}문항 선택</strong>
              <span>{selectedTotalScore}점</span>
              {selectedWorkbook ? (
                <span className={`status-pill status-${selectedWorkbook.status}`}>
                  {statusLabels[selectedWorkbook.status]}
                </span>
              ) : null}
            </div>
          </div>

          <div className="drop-zone">
            {!selectedWorkbook ? (
              <div className="empty-drop">
                <strong>편집할 문제집이 없습니다.</strong>
                <p>문제집을 생성하거나 목록에서 선택하세요.</p>
              </div>
            ) : selectedItems.length === 0 ? (
              <div className="empty-drop">
                <strong>문제를 여기에 놓으세요.</strong>
                <p>좌측 문제은행에서 문제를 드래그하거나 추가 버튼을 누르면 문제집에 포함됩니다.</p>
              </div>
            ) : (
              selectedItems.map((item, index) => {
                const question = questions.find((entry) => entry.id === item.questionId);
                if (!question) return null;

                return (
                  <article className="workbook-question" key={item.id}>
                    <div className="sequence-badge">{index + 1}</div>
                    <div className="workbook-question-body">
                      <span className="question-meta">
                        {question.subject} · {question.category ?? '미분류'} ·{' '}
                        {difficultyLabels[question.difficulty]}
                      </span>
                      <strong>{getQuestionText(question)}</strong>
                      <p>{item.score}점 · 정답 보기 {question.correctAnswerIndex + 1}</p>
                    </div>
                    <div className="workbook-actions">
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() => moveQuestion(item.questionId, -1)}
                        disabled={index === 0}
                      >
                        위
                      </button>
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() => moveQuestion(item.questionId, 1)}
                        disabled={index === selectedItems.length - 1}
                      >
                        아래
                      </button>
                      <button className="danger-button" type="button" onClick={() => removeQuestion(item.questionId)}>
                        제거
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </main>
      </section>
    </div>
  );
}
