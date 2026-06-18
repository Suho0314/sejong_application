import { FormEvent, useEffect, useState } from 'react';

export type CohortStatus = 'planned' | 'active' | 'completed';

export type CohortFormValues = {
  name: string;
  code: string;
  description: string;
  startsOn: string;
  endsOn: string;
  status: CohortStatus;
  studentCount: number;
};

type CohortFormProps = {
  initialValues?: CohortFormValues;
  mode: 'create' | 'edit';
  onCancel: () => void;
  onSubmit: (values: CohortFormValues) => void;
};

const emptyValues: CohortFormValues = {
  name: '',
  code: '',
  description: '',
  startsOn: '',
  endsOn: '',
  status: 'planned',
  studentCount: 0,
};

export function CohortForm({ initialValues, mode, onCancel, onSubmit }: CohortFormProps) {
  const [values, setValues] = useState<CohortFormValues>(initialValues ?? emptyValues);

  useEffect(() => {
    setValues(initialValues ?? emptyValues);
  }, [initialValues]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(values);
  };

  return (
    <form className="cohort-form" onSubmit={handleSubmit}>
      <div className="form-grid">
        <label>
          <span>기수명</span>
          <input
            required
            value={values.name}
            onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
            placeholder="예: 2026년 1기"
          />
        </label>
        <label>
          <span>기수 코드</span>
          <input
            required
            value={values.code}
            onChange={(event) => setValues((current) => ({ ...current, code: event.target.value }))}
            placeholder="예: 2026-01"
          />
        </label>
        <label>
          <span>시작일</span>
          <input
            required
            type="date"
            value={values.startsOn}
            onChange={(event) => setValues((current) => ({ ...current, startsOn: event.target.value }))}
          />
        </label>
        <label>
          <span>종료일</span>
          <input
            type="date"
            value={values.endsOn}
            onChange={(event) => setValues((current) => ({ ...current, endsOn: event.target.value }))}
          />
        </label>
        <label>
          <span>상태</span>
          <select
            value={values.status}
            onChange={(event) =>
              setValues((current) => ({ ...current, status: event.target.value as CohortStatus }))
            }
          >
            <option value="planned">예정</option>
            <option value="active">진행중</option>
            <option value="completed">완료</option>
          </select>
        </label>
        <label>
          <span>학생수</span>
          <input
            min={0}
            type="number"
            value={values.studentCount}
            onChange={(event) =>
              setValues((current) => ({ ...current, studentCount: Number(event.target.value) }))
            }
          />
        </label>
      </div>
      <label>
        <span>설명</span>
        <textarea
          value={values.description}
          onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
          placeholder="기수 설명을 입력하세요."
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
