import { CSSProperties, DragEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { questionApi, QuestionApiItem } from '../../../api/questions';
import { workbookApi, WorkbookApiItem, WorkbookPayload, WorkbookQuestionApiItem } from '../../../api/workbooks';
import { Pagination } from '../../../components/admin/Pagination';
import { WorkbookForm, WorkbookFormValues } from '../../../components/admin/WorkbookForm';
import { WorkbookTable, WorkbookTableRow } from '../../../components/admin/WorkbookTable';
import { QuestionStatusLabel, WorkbookStatusLabel, WorkbookStatusOptions } from '../../../constants/statusLabels';
import { ContentStatus } from '../../../types/domain';

const WORKBOOK_PAGE_SIZE = 5;
const QUESTION_LIMIT = 100;
const QUESTION_CANDIDATE_STATUS: ContentStatus = 'published';
const WORKBOOK_TOTAL_SCORE = 100;

type QuestionRow = {
  id: string;
  subject: string;
  category?: string;
  type: 'multiple_choice';
  content: string;
  choices: string[];
  correctAnswerIndex: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
};

type WorkbookQuestionRow = {
  id: string;
  questionId: string;
  sequence: number;
  points: number;
  questionContent?: string;
};

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

const questionContentStyle: CSSProperties = {
  color: '#172033',
  display: '-webkit-box',
  fontSize: 15,
  fontWeight: 800,
  lineHeight: 1.45,
  marginBottom: 6,
  overflow: 'hidden',
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: 2,
  whiteSpace: 'normal',
};

const toQuestionRow = (question: QuestionApiItem): QuestionRow => ({
  id: question.id,
  subject: question.subject,
  category: question.category ?? undefined,
  type: 'multiple_choice',
  content: question.content,
  choices: question.choices.map((choice) => choice.text),
  correctAnswerIndex: question.correctAnswerIndex,
  status: question.status,
  createdAt: question.createdAt,
  updatedAt: question.updatedAt,
});

const toWorkbookTableRow = (workbook: WorkbookApiItem): WorkbookTableRow => ({
  id: workbook.id,
  title: workbook.title,
  description: workbook.description ?? '',
  status: workbook.status,
  passScore: workbook.passScore,
  questionCount: workbook.questionCount ?? 0,
  totalScore: WORKBOOK_TOTAL_SCORE,
  updatedAt: workbook.updatedAt,
});

const toWorkbookQuestionRow = (item: WorkbookQuestionApiItem): WorkbookQuestionRow => ({
  id: item.id,
  questionId: item.questionId,
  sequence: item.sequence,
  points: item.points,
  questionContent: item.question?.content,
});

const toWorkbookPayload = (values: WorkbookFormValues): WorkbookPayload => ({
  title: values.title.trim(),
  description: values.description.trim() || null,
  status: values.status,
  passScore: Math.min(100, Math.max(0, values.passScore)),
});

const getQuestionPreview = (content: string) => {
  const text = content.trim() || '문제 내용 없음';
  return text.length > 90 ? `${text.slice(0, 90)}...` : text;
};

const reindexQuestions = (items: WorkbookQuestionRow[]) =>
  items.map((item, index) => ({
    ...item,
    sequence: index + 1,
  }));

const distributePoints = (items: WorkbookQuestionRow[]) => {
  const count = items.length;
  if (count === 0) return items;

  const base = Math.floor(WORKBOOK_TOTAL_SCORE / count);
  const remainder = WORKBOOK_TOTAL_SCORE % count;

  return items.map((item, index) => ({
    ...item,
    points: index < remainder ? base + 1 : base,
  }));
};

export function WorkbookPage() {
  const [workbooks, setWorkbooks] = useState<WorkbookApiItem[]>([]);
  const [selectedWorkbook, setSelectedWorkbook] = useState<WorkbookApiItem | null>(null);
  const [selectedWorkbookId, setSelectedWorkbookId] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<WorkbookQuestionRow[]>([]);
  const [workbookKeyword, setWorkbookKeyword] = useState('');
  const [workbookStatus, setWorkbookStatus] = useState<ContentStatus | 'all'>('all');
  const [workbookPage, setWorkbookPage] = useState(1);
  const [workbookTotalItems, setWorkbookTotalItems] = useState(0);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [questionSubjects, setQuestionSubjects] = useState<string[]>([]);
  const [questionCategories, setQuestionCategories] = useState<string[]>([]);
  const [questionKeyword, setQuestionKeyword] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [editingWorkbookId, setEditingWorkbookId] = useState<string | null>(null);
  const [isWorkbookLoading, setIsWorkbookLoading] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isQuestionLoading, setIsQuestionLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const selectedQuestionIds = useMemo(
    () => new Set(selectedItems.map((item) => item.questionId)),
    [selectedItems],
  );
  const questionById = useMemo(() => new Map(questions.map((question) => [question.id, question])), [questions]);
  const selectedTotalScore = selectedItems.reduce((sum, item) => sum + item.points, 0);
  const hasSelectedQuestions = selectedItems.length > 0;
  const isSelectedTotalScoreValid = selectedTotalScore === WORKBOOK_TOTAL_SCORE;
  const workbookTotalPages = Math.max(1, Math.ceil(workbookTotalItems / WORKBOOK_PAGE_SIZE));
  const workbookCurrentPage = Math.min(workbookPage, workbookTotalPages);

  const workbookTableRows = useMemo(() => workbooks.map(toWorkbookTableRow), [workbooks]);

  const editingWorkbook = workbooks.find((workbook) => workbook.id === editingWorkbookId) ?? selectedWorkbook;
  const formInitialValues: WorkbookFormValues | undefined =
    formMode === 'edit' && editingWorkbook
      ? {
          title: editingWorkbook.title,
          description: editingWorkbook.description ?? '',
          status: editingWorkbook.status,
          passScore: editingWorkbook.passScore,
        }
      : undefined;

  const loadWorkbooks = useCallback(async (nextPage = workbookPage) => {
    setIsWorkbookLoading(true);
    setErrorMessage('');

    try {
      const response = await workbookApi.list({
        page: nextPage,
        limit: WORKBOOK_PAGE_SIZE,
        keyword: workbookKeyword,
        status: workbookStatus === 'all' ? undefined : workbookStatus,
      });

      setWorkbooks(response.data);
      setWorkbookTotalItems(response.meta.total);
      setSelectedWorkbookId((current) => current ?? response.data[0]?.id ?? null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '문제집 목록을 불러오지 못했습니다.');
      setWorkbooks([]);
      setWorkbookTotalItems(0);
    } finally {
      setIsWorkbookLoading(false);
    }
  }, [workbookKeyword, workbookPage, workbookStatus]);

  const loadWorkbookDetail = useCallback(async (workbookId: string) => {
    setIsDetailLoading(true);
    setErrorMessage('');

    try {
      const response = await workbookApi.get(workbookId);
      setSelectedWorkbook(response.data);
      setSelectedItems((response.data.questions ?? []).map(toWorkbookQuestionRow));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '문제집 상세를 불러오지 못했습니다.');
      setSelectedWorkbook(null);
      setSelectedItems([]);
    } finally {
      setIsDetailLoading(false);
    }
  }, []);

  const loadQuestions = useCallback(async () => {
    setIsQuestionLoading(true);
    setErrorMessage('');

    try {
      const response = await questionApi.list({
        page: 1,
        limit: QUESTION_LIMIT,
        keyword: questionKeyword,
        subject: subjectFilter === 'all' ? undefined : subjectFilter,
        category: categoryFilter === 'all' ? undefined : categoryFilter,
        status: QUESTION_CANDIDATE_STATUS,
        type: 'multiple_choice',
      });

      setQuestions(response.data.map(toQuestionRow));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '문제은행을 불러오지 못했습니다.');
      setQuestions([]);
    } finally {
      setIsQuestionLoading(false);
    }
  }, [categoryFilter, questionKeyword, subjectFilter]);

  const loadQuestionFilterOptions = useCallback(async () => {
    const response = await questionApi.listFilterOptions({ status: QUESTION_CANDIDATE_STATUS });

    setQuestionSubjects(response.data.subjects);
    setQuestionCategories(response.data.categories);
  }, []);

  useEffect(() => {
    void loadWorkbooks();
  }, [loadWorkbooks]);

  useEffect(() => {
    if (selectedWorkbookId) {
      void loadWorkbookDetail(selectedWorkbookId);
    } else {
      setSelectedWorkbook(null);
      setSelectedItems([]);
    }
  }, [loadWorkbookDetail, selectedWorkbookId]);

  useEffect(() => {
    void loadQuestions();
  }, [loadQuestions]);

  useEffect(() => {
    loadQuestionFilterOptions().catch((error) => {
      setErrorMessage(error instanceof Error ? error.message : '문제은행 필터 목록을 불러오지 못했습니다.');
    });
  }, [loadQuestionFilterOptions]);

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

  const submitWorkbook = async (values: WorkbookFormValues) => {
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      if (formMode === 'create') {
        const response = await workbookApi.create(toWorkbookPayload(values));
        closeForm();
        setWorkbookPage(1);
        setSelectedWorkbookId(response.data.id);
        await loadWorkbooks(1);
        return;
      }

      if (!editingWorkbookId) return;

      await workbookApi.update(editingWorkbookId, toWorkbookPayload(values));
      closeForm();
      await Promise.all([loadWorkbooks(), loadWorkbookDetail(editingWorkbookId)]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '문제집을 저장하지 못했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteWorkbook = async (workbookId: string) => {
    const target = workbooks.find((workbook) => workbook.id === workbookId);
    const confirmed = window.confirm(`${target?.title ?? '선택한 문제집'}을 삭제할까요?`);
    if (!confirmed) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await workbookApi.delete(workbookId);
      setSelectedWorkbookId((current) => (current === workbookId ? null : current));
      await loadWorkbooks(1);
      setWorkbookPage(1);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '문제집을 삭제하지 못했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addQuestion = (question: QuestionRow) => {
    if (!selectedWorkbook || selectedQuestionIds.has(question.id) || question.status !== 'published') return;

    setSelectedItems((current) => [
      ...current,
      {
        id: `draft-${question.id}`,
        questionId: question.id,
        sequence: current.length + 1,
        points: 10,
        questionContent: question.content,
      },
    ]);
  };

  const removeQuestion = (questionId: string) => {
    setSelectedItems((current) => reindexQuestions(current.filter((item) => item.questionId !== questionId)));
  };

  const moveQuestion = (questionId: string, direction: -1 | 1) => {
    setSelectedItems((current) => {
      const currentIndex = current.findIndex((item) => item.questionId === questionId);
      const nextIndex = currentIndex + direction;

      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= current.length) return current;

      const nextItems = [...current];
      const [target] = nextItems.splice(currentIndex, 1);
      nextItems.splice(nextIndex, 0, target);

      return reindexQuestions(nextItems);
    });
  };

  const updateQuestionConfig = (questionId: string, patch: Partial<Pick<WorkbookQuestionRow, 'points'>>) => {
    setSelectedItems((current) =>
      current.map((item) =>
        item.questionId === questionId
          ? {
              ...item,
              ...patch,
            }
          : item,
      ),
    );
  };

  const autoDistributePoints = () => {
    setSelectedItems((current) => distributePoints(current));
  };

  const saveWorkbookQuestions = async () => {
    if (!selectedWorkbookId) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await workbookApi.updateQuestions(selectedWorkbookId, {
        questions: selectedItems.map((item, index) => ({
          questionId: item.questionId,
          sequence: index + 1,
          points: item.points,
          isRequired: true,
        })),
      });
      await Promise.all([loadWorkbookDetail(selectedWorkbookId), loadWorkbooks()]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '문제집 문항 구성을 저장하지 못했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWorkbookKeywordChange = (value: string) => {
    setWorkbookKeyword(value);
    setWorkbookPage(1);
  };

  const handleWorkbookStatusChange = (value: ContentStatus | 'all') => {
    setWorkbookStatus(value);
    setWorkbookPage(1);
  };

  const handleQuestionKeywordChange = (value: string) => {
    setQuestionKeyword(value);
  };

  const handleDragStart = (event: DragEvent<HTMLElement>, questionId: string) => {
    event.dataTransfer.setData('text/plain', questionId);
    event.dataTransfer.effectAllowed = 'copy';
  };

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    const questionId = event.dataTransfer.getData('text/plain');
    const question = questions.find((item) => item.id === questionId);
    if (question) addQuestion(question);
  };

  const handleDragOver = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const resolveQuestionContent = (item: WorkbookQuestionRow) => {
    const question = questionById.get(item.questionId);
    return question?.content ?? item.questionContent ?? '문제 내용 없음';
  };

  return (
    <div className="workbook-page">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Workbook Management</p>
          <h1>문제집관리</h1>
        </div>
        <button className="primary-button" type="button" onClick={openCreateForm} disabled={isSubmitting}>
          문제집 추가
        </button>
      </section>

      {errorMessage ? <p className="table-subtitle">{errorMessage}</p> : null}

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
              disabled={isSubmitting}
              initialValues={formInitialValues}
              key={editingWorkbookId ?? 'create'}
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
              onChange={(event) => handleWorkbookKeywordChange(event.target.value)}
            />
          </label>
          <label className="search-field">
            <span>상태</span>
            <select
              value={workbookStatus}
              onChange={(event) => handleWorkbookStatusChange(event.target.value as ContentStatus | 'all')}
            >
              <option value="all">전체 상태</option>
              {WorkbookStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {isWorkbookLoading ? <p className="table-subtitle">문제집 목록을 불러오는 중입니다.</p> : null}
        <WorkbookTable
          selectedWorkbookId={selectedWorkbookId}
          workbooks={workbookTableRows}
          onDelete={deleteWorkbook}
          onEdit={openEditForm}
          onSelect={setSelectedWorkbookId}
        />
        <Pagination
          currentPage={workbookCurrentPage}
          totalItems={workbookTotalItems}
          totalPages={workbookTotalPages}
          onPageChange={setWorkbookPage}
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
                onChange={(event) => handleQuestionKeywordChange(event.target.value)}
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
                <option value="all">전체 카테고리</option>
                {questionCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {isQuestionLoading ? <p className="table-subtitle">문제은행을 불러오는 중입니다.</p> : null}
          <div className="question-list">
            {questions.map((question) => {
              const isSelected = selectedQuestionIds.has(question.id);
              const canAdd = Boolean(selectedWorkbook) && !isSelected && question.status === 'published';

              return (
                <article
                  className={`question-card ${isSelected ? 'is-selected' : ''}`}
                  draggable={canAdd}
                  key={question.id}
                  onDragStart={(event) => handleDragStart(event, question.id)}
                >
                  <div>
                    <div style={questionContentStyle}>{getQuestionPreview(question.content)}</div>
                    <span className="question-meta">
                      {question.subject} | {question.category ?? '미분류'} | {QuestionStatusLabel[question.status]}
                    </span>
                  </div>
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => addQuestion(question)}
                    disabled={!canAdd}
                  >
                    {isSelected ? '추가됨' : question.status === 'published' ? '추가' : '추가 불가'}
                  </button>
                </article>
              );
            })}
            {questions.length === 0 ? (
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
              {selectedWorkbook ? <span>합격 {selectedWorkbook.passScore}점</span> : null}
              {selectedWorkbook ? (
                <span className={`status-pill status-${selectedWorkbook.status}`}>
                  {WorkbookStatusLabel[selectedWorkbook.status]}
                </span>
              ) : null}
            </div>
          </div>

          {isDetailLoading ? <p className="table-subtitle">문제집 상세를 불러오는 중입니다.</p> : null}

          {selectedWorkbook ? (
            <div className="workbook-score-toolbar">
              <div>
                <strong className={isSelectedTotalScoreValid ? 'score-total-ok' : 'score-total-warning'}>
                  {isSelectedTotalScoreValid
                    ? `총점 정상: ${WORKBOOK_TOTAL_SCORE}점`
                    : `현재 총점: ${selectedTotalScore}점 / ${WORKBOOK_TOTAL_SCORE}점`}
                </strong>
                <p>
                  {hasSelectedQuestions
                    ? '자동 배분은 현재 포함된 문항 수를 기준으로 다시 계산합니다.'
                    : '문제를 먼저 추가해주세요.'}
                </p>
              </div>
              <button
                className="secondary-button"
                type="button"
                onClick={autoDistributePoints}
                disabled={!hasSelectedQuestions || isSubmitting}
              >
                100점 자동 배분
              </button>
            </div>
          ) : null}

          <div className="drop-zone">
            {!selectedWorkbook ? (
              <div className="empty-drop">
                <strong>편집할 문제집이 없습니다.</strong>
                <p>문제집을 생성하거나 목록에서 선택하세요.</p>
              </div>
            ) : selectedItems.length === 0 ? (
              <div className="empty-drop">
                <strong>문제를 여기에 놓으세요.</strong>
                <p>좌측 문제은행에서 사용중 문제를 드래그하거나 추가 버튼을 누르면 문제집에 포함됩니다.</p>
              </div>
            ) : (
              selectedItems.map((item, index) => {
                const question = questionById.get(item.questionId);

                return (
                  <article className="workbook-question" key={item.id}>
                    <div className="sequence-badge">{index + 1}</div>
                    <div className="workbook-question-body">
                      <div style={questionContentStyle}>{getQuestionPreview(resolveQuestionContent(item))}</div>
                      <span className="question-meta">
                        {question
                          ? `${question.subject} · ${question.category ?? '미분류'}`
                          : '상세 문제 정보는 문제은행 조회 후 표시됩니다.'}
                      </span>
                      <p>정답 보기 {question ? question.correctAnswerIndex + 1 : '-'}</p>
                    </div>
                    <div className="workbook-actions">
                      <label className="search-field">
                        <span>점수</span>
                        <input
                          min={0}
                          type="number"
                          value={item.points}
                          onChange={(event) =>
                            updateQuestionConfig(item.questionId, { points: Number(event.target.value) })
                          }
                        />
                      </label>
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

          {selectedWorkbook ? (
            <div className="form-actions">
              <button className="primary-button" type="button" onClick={saveWorkbookQuestions} disabled={isSubmitting}>
                {isSubmitting ? '저장 중...' : '문항 구성 저장'}
              </button>
            </div>
          ) : null}
        </main>
      </section>
    </div>
  );
}
