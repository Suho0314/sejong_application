export type CohortRow = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  starts_on: string | Date;
  ends_on: string | Date | null;
  is_active: boolean;
  student_count: string;
  created_at: Date;
  updated_at: Date;
};

export type CohortResponse = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  startsOn: string;
  endsOn: string | null;
  isActive: boolean;
  studentCount: number;
  createdAt: string;
  updatedAt: string;
};
