import { FormEvent, useState } from 'react';
import { WorkbookStatusOptions } from '../../constants/statusLabels';
import { ContentStatus } from '../../types/domain';

export type WorkbookFormValues = {
  title: string;
  description: string;
  status: ContentStatus;
  passScore: number;
};

type WorkbookFormProps = {
  disabled?: boolean;
  initialValues?: WorkbookFormValues;
  mode: 'create' | 'edit';
  onCancel: () => void;
  onSubmit: (values: WorkbookFormValues) => void;
};

const defaultValues: WorkbookFormValues = {
  title: '',
  description: '',
  status: 'draft',
  passScore: 60,
};

export function WorkbookForm({ disabled = false, initialValues, mode, onCancel, onSubmit }: WorkbookFormProps) {
  const [values, setValues] = useState<WorkbookFormValues>(initialValues ?? defaultValues);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = values.title.trim();

    if (!title) return;

    onSubmit({
      ...values,
      title,
      description: values.description.trim(),
      passScore: values.passScore,
    });
  };

  return (
    <form className="cohort-form" onSubmit={handleSubmit}>
      <div className="form-grid">
        <label>
          <span>문제집명</span>
          <input
            disabled={disabled}
            value={values.title}
            onChange={(event) => setValues((current) => ({ ...current, title: event.target.value }))}
            placeholder="예: 기본간호학 핵심 문제집"
            required
          />
        </label>

        <label>
          <span>상태</span>
          <select
            disabled={disabled}
            value={values.status}
            onChange={(event) =>
              setValues((current) => ({ ...current, status: event.target.value as ContentStatus }))
            }
          >
            {WorkbookStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>합격점수</span>
          <input
            disabled={disabled}
            max={100}
            min={0}
            type="number"
            value={values.passScore}
            onChange={(event) =>
              setValues((current) => ({ ...current, passScore: Number(event.target.value) }))
            }
            required
          />
        </label>

        <label>
          <span>설명</span>
          <textarea
            disabled={disabled}
            value={values.description}
            onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
            placeholder="문제집 목적과 풀이 안내를 입력하세요."
            rows={3}
          />
        </label>
      </div>

      <div className="form-actions">
        <button className="secondary-button" type="button" onClick={onCancel} disabled={disabled}>
          취소
        </button>
        <button className="primary-button" type="submit" disabled={disabled}>
          {disabled ? '저장 중...' : mode === 'create' ? '문제집 생성' : '수정 저장'}
        </button>
      </div>
    </form>
  );
}
