import { FormEvent, useState } from 'react';
import { ContentStatus } from '../../types/domain';

export type WorkbookFormValues = {
  title: string;
  description: string;
  status: ContentStatus;
};

type WorkbookFormProps = {
  initialValues?: WorkbookFormValues;
  mode: 'create' | 'edit';
  onCancel: () => void;
  onSubmit: (values: WorkbookFormValues) => void;
};

const defaultValues: WorkbookFormValues = {
  title: '',
  description: '',
  status: 'draft',
};

export function WorkbookForm({ initialValues, mode, onCancel, onSubmit }: WorkbookFormProps) {
  const [values, setValues] = useState<WorkbookFormValues>(initialValues ?? defaultValues);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = values.title.trim();

    if (!title) return;

    onSubmit({
      ...values,
      title,
      description: values.description.trim(),
    });
  };

  return (
    <form className="cohort-form" onSubmit={handleSubmit}>
      <div className="form-grid">
        <label>
          <span>문제집명</span>
          <input
            value={values.title}
            onChange={(event) => setValues((current) => ({ ...current, title: event.target.value }))}
            placeholder="예: 기본간호학 핵심 문제집"
            required
          />
        </label>

        <label>
          <span>상태</span>
          <select
            value={values.status}
            onChange={(event) =>
              setValues((current) => ({ ...current, status: event.target.value as ContentStatus }))
            }
          >
            <option value="draft">초안</option>
            <option value="published">게시</option>
            <option value="archived">보관</option>
          </select>
        </label>

        <label>
          <span>설명</span>
          <textarea
            value={values.description}
            onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
            placeholder="문제집 목적과 풀이 안내를 입력하세요."
            rows={3}
          />
        </label>
      </div>

      <div className="form-actions">
        <button className="secondary-button" type="button" onClick={onCancel}>
          취소
        </button>
        <button className="primary-button" type="submit">
          {mode === 'create' ? '문제집 생성' : '수정 저장'}
        </button>
      </div>
    </form>
  );
}
