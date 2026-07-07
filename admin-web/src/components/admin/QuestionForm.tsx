import { FormEvent, useEffect, useState } from 'react';
import { QuestionStatusOptions } from '../../constants/statusLabels';
import { ContentStatus, QuestionType } from '../../types/domain';

export type QuestionFormValues = {
  subject: string;
  category: string;
  type: QuestionType;
  content: string;
  choices: string[];
  correctAnswerIndex: number;
  status: ContentStatus;
};

type QuestionFormProps = {
  disabled?: boolean;
  initialValues?: QuestionFormValues;
  mode: 'create' | 'edit';
  onCancel: () => void;
  onSubmit: (values: QuestionFormValues) => void;
};

const emptyValues: QuestionFormValues = {
  subject: '',
  category: '',
  type: 'multiple_choice',
  content: '',
  choices: ['', '', '', '', ''],
  correctAnswerIndex: 0,
  status: 'draft',
};

const FIXED_CHOICE_COUNT = 5;

const normalizeMultilineText = (value: string) => value.replace(/\r\n/g, '\n').trim();

const normalizeChoices = (choices: string[]) =>
  Array.from({ length: FIXED_CHOICE_COUNT }, (_, index) => choices[index] ?? '');

const normalizeFormValues = (values: QuestionFormValues): QuestionFormValues => ({
  ...values,
  choices: normalizeChoices(values.choices),
  correctAnswerIndex: Math.min(Math.max(values.correctAnswerIndex, 0), FIXED_CHOICE_COUNT - 1),
});

export function QuestionForm({ disabled = false, initialValues, mode, onCancel, onSubmit }: QuestionFormProps) {
  const [values, setValues] = useState<QuestionFormValues>(() => normalizeFormValues(initialValues ?? emptyValues));

  useEffect(() => {
    setValues(normalizeFormValues(initialValues ?? emptyValues));
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
      content: normalizeMultilineText(values.content),
      choices: values.choices.map(normalizeMultilineText),
    });
  };

  return (
    <form className="cohort-form" onSubmit={handleSubmit}>
      <label>
        <span>문제 내용</span>
        <textarea
          required
          disabled={disabled}
          value={values.content}
          onChange={(event) => setValues((current) => ({ ...current, content: event.target.value }))}
        />
      </label>

      <div className="form-grid">
        <label>
          <span>과목</span>
          <input
            required
            disabled={disabled}
            value={values.subject}
            onChange={(event) => setValues((current) => ({ ...current, subject: event.target.value }))}
          />
        </label>
        <label>
          <span>카테고리</span>
          <input
            disabled={disabled}
            value={values.category}
            onChange={(event) => setValues((current) => ({ ...current, category: event.target.value }))}
          />
        </label>
      </div>

      <div className="form-grid">
        {values.choices.map((choice, index) => (
          <label key={index}>
            <span>보기 {index + 1}</span>
            <textarea
              required
              disabled={disabled}
              value={choice}
              onChange={(event) => handleChoiceChange(index, event.target.value)}
              rows={2}
            />
          </label>
        ))}
      </div>

      <label>
        <span>정답</span>
        <select
          disabled={disabled}
          value={values.correctAnswerIndex}
          onChange={(event) =>
            setValues((current) => ({ ...current, correctAnswerIndex: Number(event.target.value) }))
          }
        >
          {normalizeChoices(values.choices).map((choice, index) => (
            <option key={index} value={index}>
              보기 {index + 1}
              {choice ? ` - ${choice}` : ''}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>상태</span>
        <select
          disabled={disabled}
          value={values.status}
          onChange={(event) => setValues((current) => ({ ...current, status: event.target.value as ContentStatus }))}
        >
          {QuestionStatusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <div className="form-actions">
        <button className="secondary-button" type="button" onClick={onCancel} disabled={disabled}>
          취소
        </button>
        <button className="primary-button" type="submit" disabled={disabled}>
          {disabled ? '저장 중...' : mode === 'create' ? '추가' : '저장'}
        </button>
      </div>
    </form>
  );
}
