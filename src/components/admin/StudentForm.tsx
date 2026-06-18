import { FormEvent, useEffect, useState } from 'react';
import { StudentStatus } from '../../types/domain';

export type StudentFormCohort = {
  id: string;
  name: string;
};

export type StudentFormValues = {
  name: string;
  email: string;
  phone: string;
  studentNo: string;
  cohortId: string;
  birthDate: string;
  status: StudentStatus;
  enrolledOn: string;
};

type StudentFormProps = {
  cohorts: StudentFormCohort[];
  initialValues?: StudentFormValues;
  mode: 'create' | 'edit';
  onCancel: () => void;
  onSubmit: (values: StudentFormValues) => void;
};

const emptyValues: StudentFormValues = {
  name: '',
  email: '',
  phone: '',
  studentNo: '',
  cohortId: '',
  birthDate: '',
  status: 'active',
  enrolledOn: '',
};

export function StudentForm({ cohorts, initialValues, mode, onCancel, onSubmit }: StudentFormProps) {
  const [values, setValues] = useState<StudentFormValues>(initialValues ?? emptyValues);

  useEffect(() => {
    setValues(initialValues ?? { ...emptyValues, cohortId: cohorts[0]?.id ?? '' });
  }, [cohorts, initialValues]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(values);
  };

  return (
    <form className="cohort-form" onSubmit={handleSubmit}>
      <div className="form-grid">
        <label>
          <span>이름</span>
          <input
            required
            value={values.name}
            onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
            placeholder="학생 이름"
          />
        </label>
        <label>
          <span>이메일</span>
          <input
            required
            type="email"
            value={values.email}
            onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))}
            placeholder="student@example.com"
          />
        </label>
        <label>
          <span>연락처</span>
          <input
            value={values.phone}
            onChange={(event) => setValues((current) => ({ ...current, phone: event.target.value }))}
            placeholder="010-0000-0000"
          />
        </label>
        <label>
          <span>학생 번호</span>
          <input
            required
            value={values.studentNo}
            onChange={(event) => setValues((current) => ({ ...current, studentNo: event.target.value }))}
            placeholder="S-2026-001"
          />
        </label>
        <label>
          <span>소속 기수</span>
          <select
            required
            value={values.cohortId}
            onChange={(event) => setValues((current) => ({ ...current, cohortId: event.target.value }))}
          >
            {cohorts.map((cohort) => (
              <option key={cohort.id} value={cohort.id}>
                {cohort.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>상태</span>
          <select
            value={values.status}
            onChange={(event) =>
              setValues((current) => ({ ...current, status: event.target.value as StudentStatus }))
            }
          >
            <option value="active">재원</option>
            <option value="inactive">비활성</option>
            <option value="graduated">수료</option>
          </select>
        </label>
        <label>
          <span>생년월일</span>
          <input
            type="date"
            value={values.birthDate}
            onChange={(event) => setValues((current) => ({ ...current, birthDate: event.target.value }))}
          />
        </label>
        <label>
          <span>등록일</span>
          <input
            required
            type="date"
            value={values.enrolledOn}
            onChange={(event) => setValues((current) => ({ ...current, enrolledOn: event.target.value }))}
          />
        </label>
      </div>
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
