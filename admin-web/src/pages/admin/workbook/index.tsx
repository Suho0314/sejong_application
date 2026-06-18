import { DragEvent, useMemo, useState } from 'react';
import questions from '../../../mock/questions.json';
import workbooks from '../../../mock/workbooks.json';

type Question = (typeof questions)[number];

type WorkbookItem = {
  questionId: string;
  points: number;
};

const initialWorkbook = workbooks[0];

const getQuestionTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    multiple_choice: '객관식',
    short_answer: '주관식',
    essay: '서술형',
  };

  return labels[type] ?? type;
};

export function WorkbookPage() {
  const [keyword, setKeyword] = useState('');
  const [workbookItems, setWorkbookItems] = useState<WorkbookItem[]>(
    initialWorkbook.workbookQuestions.map((item) => ({
      questionId: item.questionId,
      points: item.points,
    })),
  );

  const selectedQuestionIds = useMemo(
    () => new Set(workbookItems.map((item) => item.questionId)),
    [workbookItems],
  );

  const filteredQuestions = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    if (!normalizedKeyword) return questions;

    return questions.filter((question) =>
      [question.stem, question.source, question.questionType].some((value) =>
        value.toLowerCase().includes(normalizedKeyword),
      ),
    );
  }, [keyword]);

  const totalPoints = workbookItems.reduce((sum, item) => sum + item.points, 0);

  const addQuestion = (questionId: string) => {
    setWorkbookItems((items) => {
      if (items.some((item) => item.questionId === questionId)) return items;
      return [...items, { questionId, points: 10 }];
    });
  };

  const removeQuestion = (questionId: string) => {
    setWorkbookItems((items) => items.filter((item) => item.questionId !== questionId));
  };

  const moveQuestion = (questionId: string, direction: -1 | 1) => {
    setWorkbookItems((items) => {
      const currentIndex = items.findIndex((item) => item.questionId === questionId);
      const nextIndex = currentIndex + direction;

      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= items.length) return items;

      const nextItems = [...items];
      const [target] = nextItems.splice(currentIndex, 1);
      nextItems.splice(nextIndex, 0, target);
      return nextItems;
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
          <p className="eyebrow">Workbook Builder</p>
          <h1>문제집관리</h1>
        </div>
        <button className="primary-button" type="button">
          문제집 저장
        </button>
      </section>

      <section className="workbook-builder">
        <aside className="question-bank dashboard-panel">
          <div className="panel-header">
            <div>
              <h2>문제은행</h2>
              <p>문제를 드래그해서 우측 문제집에 추가합니다.</p>
            </div>
          </div>

          <div className="toolbar">
            <label className="search-field">
              <span>검색</span>
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="문제, 출처, 유형 검색"
              />
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
                      {getQuestionTypeLabel(question.questionType)} · 난이도 {question.difficulty} · {question.source}
                    </span>
                    <strong>{question.stem}</strong>
                  </div>
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => addQuestion(question.id)}
                    disabled={isSelected}
                  >
                    {isSelected ? '추가됨' : '추가'}
                  </button>
                </article>
              );
            })}
          </div>
        </aside>

        <main className="workbook-canvas dashboard-panel" onDragOver={handleDragOver} onDrop={handleDrop}>
          <div className="panel-header">
            <div>
              <h2>{initialWorkbook.title}</h2>
              <p>{initialWorkbook.description}</p>
            </div>
            <div className="workbook-summary">
              <strong>{workbookItems.length}문항</strong>
              <span>{totalPoints}점</span>
            </div>
          </div>

          <div className="drop-zone">
            {workbookItems.length === 0 ? (
              <div className="empty-drop">
                <strong>문제를 여기에 놓으세요.</strong>
                <p>좌측 문제은행에서 문제를 드래그하거나 추가 버튼을 누르면 문제집에 포함됩니다.</p>
              </div>
            ) : (
              workbookItems.map((item, index) => {
                const question = questions.find((entry) => entry.id === item.questionId) as Question | undefined;
                if (!question) return null;

                return (
                  <article className="workbook-question" key={item.questionId}>
                    <div className="sequence-badge">{index + 1}</div>
                    <div className="workbook-question-body">
                      <span className="question-meta">
                        {getQuestionTypeLabel(question.questionType)} · {question.source}
                      </span>
                      <strong>{question.stem}</strong>
                      <p>{item.points}점</p>
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
                        disabled={index === workbookItems.length - 1}
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
