import { FormEvent, useEffect, useState } from 'react';
import { ContentStatus, Difficulty, QuestionType } from '../../types/domain';

export type QuestionFormValues = {
  subject: string;
  category: string;
  difficulty: Difficulty;
  type: QuestionType;
  content: string;
  choices: string[];
  correctAnswerIndex: number;
  explanation: string;
  status: ContentStatus;
};

type QuestionFormProps = {
  initialValues?: QuestionFormValues;
  mode: 'create' | 'edit';
  onCancel: () => void;
  onSubmit: (values: QuestionFormValues) => void;
};

const emptyValues: QuestionFormValues = {
  subject: '',
  category: '',
  difficulty: 'easy',
  type: 'multiple_choice',
  content: '',
  choices: ['', '', '', ''],
  correctAnswerIndex: 0,
  explanation: '',
  status: 'draft',
};

export function QuestionForm({ initialValues, mode, onCancel, onSubmit }: QuestionFormProps) {
  const [values, setValues] = useState<QuestionFormValues>(initialValues ?? emptyValues);

  useEffect(() => {
    setValues(initialValues ?? emptyValues);
  }, [initialValues]);

  const handleChoiceChange = (index: number, value: string) => {
    setValues((current) => ({
      ...current,
      choices: current.choices.map((choice, choiceIndex) => (choiceIndex === index ? value : choice)),
    }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit({
      ...values,
      choices: values.choices.map((choice) => choice.trim()),
    });
  };

  return (
    <form className="cohort-form" onSubmit={handleSubmit}>
      <div className="form-grid">
        <label>
          <span>과목</span>
          <input
            required
            value={values.subject}
            onChange={(event) => setValues((current) => ({ ...current, subject: event.target.value }))}
            placeholder="예: 기본간호학"
          />
        </label>
        <label>
          <span>카테고리</span>
          <input
            value={values.category}
            onChange={(event) => setValues((current) => ({ ...current, category: event.target.value }))}
            placeholder="예: 활력징후"
          />
        </label>
        <label>
          <span>난이도</span>
          <select
            value={values.difficulty}
            onChange={(event) => setValues((current) => ({ ...current, difficulty: event.target.value as Difficulty }))}
          >
            <option value="easy">쉬움</option>
            <option value="medium">보통</option>
            <option value="hard">어려움</option>
          </select>
        </label>
        <label>
          <span>상태</span>
          <select
            value={values.status}
            onChange={(event) => setValues((current) => ({ ...current, status: event.target.value as ContentStatus }))}
          >
            <option value="draft">초안</option>
            <option value="published">게시</option>
            <option value="archived">보관</option>
          </select>
        </label>
      </div>

      <label>
        <span>문제 내용</span>
        <textarea
          required
          value={values.content}
          onChange={(event) => setValues((current) => ({ ...current, content: event.target.value }))}
          placeholder="객관식 문제 내용을 입력하세요."
        />
      </label>

      <div className="form-grid">
        {values.choices.map((choice, index) => (
          <label key={index}>
            <span>보기 {index + 1}</span>
            <input
              required
              value={choice}
              onChange={(event) => handleChoiceChange(index, event.target.value)}
              placeholder={`보기 ${index + 1}`}
            />
          </label>
        ))}
      </div>

      <label>
        <span>정답</span>
        <select
          value={values.correctAnswerIndex}
          onChange={(event) =>
            setValues((current) => ({ ...current, correctAnswerIndex: Number(event.target.value) }))
          }
        >
          {values.choices.map((choice, index) => (
            <option key={index} value={index}>
              보기 {index + 1}
              {choice ? ` - ${choice}` : ''}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>해설</span>
        <textarea
          value={values.explanation}
          onChange={(event) => setValues((current) => ({ ...current, explanation: event.target.value }))}
          placeholder="정답 해설을 입력하세요."
        />
      </label>

      <div className="form-actions">
        <button className="secondary-button" type="button" onClick={onCancel}>
          취소
        </button>
        <button className="primary-button" type="submit">
          {mode === 'create' ? '추가' : '저장'}
        </button>
      </div>
    </form>
  );
}
