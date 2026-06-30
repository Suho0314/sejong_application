import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  PdfQuestionImportPreviewItem,
  questionApi,
  QuestionApiItem,
  QuestionPayload,
} from '../../../api/questions';
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

type EditablePdfImportQuestion = PdfQuestionImportPreviewItem & {
  included: boolean;
};

const importStatusLabels: Record<EditablePdfImportQuestion['status'], string> = {
  ready: '생성 가능',
  needs_review: '검토 필요',
  invalid: '생성 불가',
};

const DEFAULT_IMPORT_SUBJECT = 'PDF 가져오기';

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
  const [isPdfImportOpen, setIsPdfImportOpen] = useState(false);
  const [questionPdfFile, setQuestionPdfFile] = useState<File | null>(null);
  const [answerPdfFile, setAnswerPdfFile] = useState<File | null>(null);
  const [importQuestions, setImportQuestions] = useState<EditablePdfImportQuestion[]>([]);
  const [isParsingPdf, setIsParsingPdf] = useState(false);
  const [isCreatingDrafts, setIsCreatingDrafts] = useState(false);
  const [importErrorMessage, setImportErrorMessage] = useState('');
  const [importSuccessMessage, setImportSuccessMessage] = useState('');
  const [permissionConfirmed, setPermissionConfirmed] = useState(false);

  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const selectedImportQuestions = importQuestions.filter(
    (question) =>
      question.included &&
      question.status !== 'invalid' &&
      question.content.trim() &&
      question.choices.filter((choice) => choice.trim()).length >= 2 &&
      question.choices.filter((choice) => choice.trim()).length <= 5 &&
      question.correctAnswerIndex !== null &&
      question.correctAnswerIndex >= 0 &&
      question.correctAnswerIndex < question.choices.filter((choice) => choice.trim()).length,
  );

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

  const resetPdfImport = () => {
    setQuestionPdfFile(null);
    setAnswerPdfFile(null);
    setImportQuestions([]);
    setImportErrorMessage('');
    setImportSuccessMessage('');
    setPermissionConfirmed(false);
  };

  const handlePdfPreview = async () => {
    if (!questionPdfFile || !answerPdfFile) {
      setImportErrorMessage('문제지 PDF와 정답지 PDF를 모두 선택해주세요.');
      return;
    }

    setIsParsingPdf(true);
    setImportErrorMessage('');
    setImportSuccessMessage('');

    try {
      const response = await questionApi.previewPdfImport(questionPdfFile, answerPdfFile);
      setImportQuestions(
        response.data.items.map((item) => ({
          ...item,
          included: item.status === 'ready',
          subject: item.subject || DEFAULT_IMPORT_SUBJECT,
          category: item.category ?? '',
          correctAnswerIndex: item.correctAnswerIndex ?? 0,
        })),
      );
      setPermissionConfirmed(false);
    } catch (error) {
      setImportQuestions([]);
      setImportErrorMessage(error instanceof Error ? error.message : 'PDF를 파싱하지 못했습니다.');
    } finally {
      setIsParsingPdf(false);
    }
  };

  const updateImportQuestion = (
    index: number,
    updater: (question: EditablePdfImportQuestion) => EditablePdfImportQuestion,
  ) => {
    setImportQuestions((current) =>
      current.map((question, questionIndex) => (questionIndex === index ? updater(question) : question)),
    );
  };

  const updateImportChoice = (questionIndex: number, choiceIndex: number, value: string) => {
    updateImportQuestion(questionIndex, (question) => ({
      ...question,
      choices: question.choices.map((choice, index) => (index === choiceIndex ? value : choice)),
    }));
  };

  const addImportChoice = (questionIndex: number) => {
    updateImportQuestion(questionIndex, (question) => {
      if (question.choices.length >= 5) return question;

      return {
        ...question,
        choices: [...question.choices, ''],
      };
    });
  };

  const removeImportChoice = (questionIndex: number, choiceIndex: number) => {
    updateImportQuestion(questionIndex, (question) => {
      if (question.choices.length <= 2) return question;

      const nextChoices = question.choices.filter((_, index) => index !== choiceIndex);
      const nextCorrectAnswerIndex =
        question.correctAnswerIndex === choiceIndex
          ? 0
          : question.correctAnswerIndex !== null && question.correctAnswerIndex > choiceIndex
            ? question.correctAnswerIndex - 1
            : question.correctAnswerIndex;

      return {
        ...question,
        choices: nextChoices,
        correctAnswerIndex:
          nextCorrectAnswerIndex === null
            ? 0
            : Math.min(nextCorrectAnswerIndex, nextChoices.length - 1),
      };
    });
  };

  const handleCreatePdfDrafts = async () => {
    if (!permissionConfirmed) {
      setImportErrorMessage('문제 사용 권한 확인이 필요합니다.');
      return;
    }

    if (selectedImportQuestions.length === 0) {
      setImportErrorMessage('생성할 문항을 1개 이상 선택해주세요.');
      return;
    }

    setIsCreatingDrafts(true);
    setImportErrorMessage('');
    setImportSuccessMessage('');

    try {
      const response = await questionApi.confirmPdfImport(
        permissionConfirmed,
        selectedImportQuestions.map((question) => ({
          questionNumber: question.questionNumber,
          subject: question.subject.trim() || DEFAULT_IMPORT_SUBJECT,
          category: question.category?.trim() || null,
          difficulty: 'medium',
          content: question.content.trim(),
          choices: question.choices.map((choice) => choice.trim()).filter(Boolean),
          correctAnswerIndex: question.correctAnswerIndex ?? 0,
        })),
      );

      setImportSuccessMessage(`${response.data.createdCount}개 문제가 draft 상태로 생성되었습니다.`);
      setImportQuestions([]);
      setPermissionConfirmed(false);
      setPage(1);
      await Promise.all([loadQuestions(1), loadFilterOptions()]);
    } catch (error) {
      setImportErrorMessage(error instanceof Error ? error.message : 'PDF 문제 초안을 생성하지 못했습니다.');
    } finally {
      setIsCreatingDrafts(false);
    }
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
        <div className="form-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={() => {
              setIsPdfImportOpen((current) => !current);
              setIsCreating(false);
              setEditingQuestion(null);
            }}
          >
            PDF 문제 일괄 등록
          </button>
          <button className="primary-button" type="button" onClick={() => setIsCreating(true)}>
            문제 추가
          </button>
        </div>
      </section>

      {isPdfImportOpen ? (
        <section className="dashboard-panel">
          <div className="panel-header">
            <div>
              <h2>PDF 문제 일괄 등록</h2>
              <p>문제지 PDF와 정답지 PDF를 분석한 뒤, 선택한 문항만 문제은행 draft로 생성합니다.</p>
            </div>
            <button className="secondary-button" type="button" onClick={resetPdfImport}>
              초기화
            </button>
          </div>

          <div className="cohort-form">
            <div className="form-grid">
              <label>
                <span>문제지 PDF</span>
                <input
                  accept="application/pdf,.pdf"
                  disabled={isParsingPdf || isCreatingDrafts}
                  type="file"
                  onChange={(event) => setQuestionPdfFile(event.target.files?.[0] ?? null)}
                />
              </label>
              <label>
                <span>정답지 PDF</span>
                <input
                  accept="application/pdf,.pdf"
                  disabled={isParsingPdf || isCreatingDrafts}
                  type="file"
                  onChange={(event) => setAnswerPdfFile(event.target.files?.[0] ?? null)}
                />
              </label>
            </div>

            <div className="form-actions">
              <button
                className="primary-button"
                disabled={isParsingPdf || isCreatingDrafts}
                type="button"
                onClick={() => void handlePdfPreview()}
              >
                {isParsingPdf ? 'PDF 분석 중...' : '미리보기 생성'}
              </button>
              <span className="table-subtitle">
                텍스트 기반 PDF만 지원하며 원본 파일은 저장하지 않습니다.
              </span>
            </div>

            {importErrorMessage ? <p className="table-subtitle">{importErrorMessage}</p> : null}
            {importSuccessMessage ? <p className="table-subtitle">{importSuccessMessage}</p> : null}

            {importQuestions.length > 0 ? (
              <>
                <div className="panel-header">
                  <div>
                    <h2>파싱 결과 미리보기</h2>
                    <p>
                      생성 예정 {selectedImportQuestions.length}개 / 전체 {importQuestions.length}개
                    </p>
                  </div>
                </div>

                <div className="exam-list">
                  {importQuestions.map((question, questionIndex) => (
                    <article className="exam-item" key={`${question.questionNumber}-${questionIndex}`}>
                      <div style={{ width: '100%' }}>
                        <div className="panel-header" style={{ padding: 0, borderBottom: 0 }}>
                          <div>
                            <strong>문항 {question.questionNumber}</strong>
                            <p>
                              <span className={`status-pill status-${question.status}`}>
                                {importStatusLabels[question.status]}
                              </span>
                              {question.reasons.length > 0 ? ` ${question.reasons.join(' / ')}` : ''}
                            </p>
                          </div>
                          <label className="search-field">
                            <span>포함</span>
                            <input
                              checked={question.included}
                              disabled={question.status === 'invalid' || isCreatingDrafts}
                              type="checkbox"
                              onChange={(event) =>
                                updateImportQuestion(questionIndex, (current) => ({
                                  ...current,
                                  included: event.target.checked,
                                }))
                              }
                            />
                          </label>
                        </div>

                        <div className="form-grid">
                          <label>
                            <span>과목</span>
                            <input
                              value={question.subject}
                              onChange={(event) =>
                                updateImportQuestion(questionIndex, (current) => ({
                                  ...current,
                                  subject: event.target.value,
                                }))
                              }
                            />
                          </label>
                          <label>
                            <span>분류</span>
                            <input
                              value={question.category ?? ''}
                              onChange={(event) =>
                                updateImportQuestion(questionIndex, (current) => ({
                                  ...current,
                                  category: event.target.value,
                                }))
                              }
                            />
                          </label>
                        </div>

                        <label>
                          <span>문제 본문</span>
                          <textarea
                            value={question.content}
                            onChange={(event) =>
                              updateImportQuestion(questionIndex, (current) => ({
                                ...current,
                                content: event.target.value,
                              }))
                            }
                          />
                        </label>

                        <div className="form-grid">
                          {question.choices.map((choice, choiceIndex) => (
                            <label key={choiceIndex}>
                              <span>보기 {choiceIndex + 1}</span>
                              <input
                                value={choice}
                                onChange={(event) =>
                                  updateImportChoice(questionIndex, choiceIndex, event.target.value)
                                }
                              />
                              {question.choices.length > 2 ? (
                                <button
                                  className="text-button"
                                  type="button"
                                  onClick={() => removeImportChoice(questionIndex, choiceIndex)}
                                >
                                  보기 삭제
                                </button>
                              ) : null}
                            </label>
                          ))}
                        </div>

                        <div className="form-actions">
                          <button
                            className="secondary-button"
                            disabled={question.choices.length >= 5}
                            type="button"
                            onClick={() => addImportChoice(questionIndex)}
                          >
                            보기 추가
                          </button>
                          <label className="search-field">
                            <span>정답</span>
                            <select
                              value={question.correctAnswerIndex ?? 0}
                              onChange={(event) =>
                                updateImportQuestion(questionIndex, (current) => ({
                                  ...current,
                                  correctAnswerIndex: Number(event.target.value),
                                }))
                              }
                            >
                              {question.choices.map((choice, index) => (
                                <option key={index} value={index}>
                                  보기 {index + 1}
                                  {choice ? ` - ${choice}` : ''}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                <label>
                  <input
                    checked={permissionConfirmed}
                    disabled={isCreatingDrafts}
                    type="checkbox"
                    onChange={(event) => setPermissionConfirmed(event.target.checked)}
                  />{' '}
                  업로드한 문제를 사용할 권한이 있음을 확인합니다.
                </label>

                <div className="form-actions">
                  <button
                    className="primary-button"
                    disabled={isCreatingDrafts || selectedImportQuestions.length === 0}
                    type="button"
                    onClick={() => void handleCreatePdfDrafts()}
                  >
                    {isCreatingDrafts ? '초안 생성 중...' : `${selectedImportQuestions.length}개 draft 생성`}
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </section>
      ) : null}

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
