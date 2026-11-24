import type {
  Announcement,
  AttendanceRecord,
  BatchRecord,
  ClientLicense,
  CoursePackage,
  ExamAttempt,
  ExamPaper,
  InstituteSettings,
  LicensePlan,
  PaymentRecord,
  PublicLicenseSummary,
  QuestionItem,
  StudentRecord,
  StudyMaterial,
  TeacherRecord,
  TestFolder,
  TestSeriesPackage,
} from '../types/portal';

// Bearer token kept strictly in memory (never localStorage or sessionStorage)
let memoryAuthToken = '';

export function setAuthToken(token: string): void {
  memoryAuthToken = token;
}

export function getAuthToken(): string {
  return memoryAuthToken;
}

async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (memoryAuthToken) {
    headers.set('Authorization', `Bearer ${memoryAuthToken}`);
  }
  const res = await fetch(url, { ...options, headers });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export interface PublicBootstrapResponse {
  settings: InstituteSettings;
  courses: CoursePackage[];
  testSeries: TestSeriesPackage[];
  batches: BatchRecord[];
  folders: TestFolder[];
  liveExams: ExamPaper[];
  license?: PublicLicenseSummary;
  stats: { examCount: number; questionCount: number };
}

export interface StudentWorkspaceResponse {
  settings: InstituteSettings;
  student: StudentRecord;
  exams: ExamPaper[];
  folders: TestFolder[];
  attempts: ExamAttempt[];
  announcements: Announcement[];
  materials: StudyMaterial[];
  courses: CoursePackage[];
  testSeries: TestSeriesPackage[];
  payments: PaymentRecord[];
  license?: PublicLicenseSummary;
}

export interface AdminWorkspaceResponse {
  settings: InstituteSettings;
  students: StudentRecord[];
  teachers: TeacherRecord[];
  batches: BatchRecord[];
  folders: TestFolder[];
  questions: QuestionItem[];
  exams: ExamPaper[];
  attempts: ExamAttempt[];
  attendance: AttendanceRecord[];
  materials: StudyMaterial[];
  announcements: Announcement[];
  courses: CoursePackage[];
  testSeries: TestSeriesPackage[];
  payments: PaymentRecord[];
  license?: PublicLicenseSummary;
}

export interface OwnerWorkspaceResponse {
  ownerUsername: string;
  plans: LicensePlan[];
  clients: ClientLicense[];
  portalStats: { studentsCount: number; examsCount: number };
}

export const api = {
  getPublicBootstrap: () => apiFetch<PublicBootstrapResponse>('/api/public/bootstrap'),

  getPublicExam: (examId: string) =>
    apiFetch<{
      exam: ExamPaper;
      folder: TestFolder | null;
      questionCount: number;
      subjects: string[];
      settings: InstituteSettings;
    }>(`/api/public/exams/${encodeURIComponent(examId)}`),

  hydratePublicExam: (payload: {
    exam: ExamPaper;
    questions: QuestionItem[];
    folder: TestFolder | null;
  }) =>
    apiFetch<{
      exam: ExamPaper;
      folder: TestFolder | null;
      questionCount: number;
      subjects: string[];
      settings: InstituteSettings;
    }>('/api/public/exams/hydrate', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  quickJoinExam: (payload: {
    name: string;
    phone: string;
    collegeName: string;
    targetClass: string;
    rollNo?: string;
    examId: string;
  }) =>
    apiFetch<{
      token: string;
      student: StudentRecord;
      exam: ExamPaper;
      questions: QuestionItem[];
    }>('/api/public/quick-join', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getPublicScorecard: (attemptId: string) =>
    apiFetch<{
      attempt: ExamAttempt;
      exam: ExamPaper | null;
      questions: QuestionItem[];
      settings: InstituteSettings;
    }>(`/api/public/scorecard/${encodeURIComponent(attemptId)}`),

  getAdminAuthStatus: () =>
    apiFetch<{ configured: boolean; email: string }>('/api/auth/admin/status'),

  setupAdmin: (email: string, passcode: string) =>
    apiFetch<{ token: string; role: 'admin'; email: string }>('/api/auth/admin/setup', {
      method: 'POST',
      body: JSON.stringify({ email, passcode }),
    }),

  loginAdmin: (email: string, passcode: string) =>
    apiFetch<{ token: string; role: 'admin'; email: string }>('/api/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, passcode }),
    }),

  changeAdminPasscode: (currentPasscode: string, newPasscode: string, email?: string) =>
    apiFetch<{ ok: boolean }>('/api/auth/admin/change-passcode', {
      method: 'POST',
      body: JSON.stringify({ currentPasscode, newPasscode, email }),
    }),

  loginStudent: (identifier: string, password?: string) =>
    apiFetch<{ token: string; role: 'student'; student: StudentRecord }>(
      '/api/auth/student/login',
      {
        method: 'POST',
        body: JSON.stringify({ identifier, password }),
      }
    ),

  signupStudent: (payload: {
    name: string;
    phone: string;
    email?: string;
    password?: string;
    batchId: string;
    collegeName?: string;
  }) =>
    apiFetch<{ token: string; role: 'student'; student: StudentRecord }>(
      '/api/auth/student/signup',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  logout: () => apiFetch<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),

  getStudentWorkspace: (studentId?: string) =>
    apiFetch<StudentWorkspaceResponse>(
      studentId
        ? `/api/student/workspace?studentId=${encodeURIComponent(studentId)}`
        : '/api/student/workspace'
    ),

  getExamQuestionsForRunner: (examId: string) =>
    apiFetch<{ exam: ExamPaper; questions: QuestionItem[] }>(
      `/api/student/exams/${encodeURIComponent(examId)}/questions`
    ),

  submitAttempt: (payload: {
    examId: string;
    studentId?: string;
    answers: Record<string, string>;
    markedForReview: string[];
    tabSwitches: number;
    timeTakenMinutes: number;
  }) =>
    apiFetch<{ attempt: ExamAttempt; exam: ExamPaper; questions: QuestionItem[] }>(
      '/api/attempts',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  getAttemptSolutions: (attemptId: string) =>
    apiFetch<{ attempt: ExamAttempt; exam: ExamPaper | null; questions: QuestionItem[] }>(
      `/api/attempts/${encodeURIComponent(attemptId)}/solutions`
    ),

  updateStudentProfile: (payload: { name: string; phone: string; targetExam: string }) =>
    apiFetch<{ student: StudentRecord }>('/api/student/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  recordMaterialDownload: (id: string) =>
    apiFetch<{ material: StudyMaterial }>(`/api/materials/${encodeURIComponent(id)}/download`, {
      method: 'POST',
    }),

  submitPayment: (payload: {
    itemName: string;
    itemType: PaymentRecord['itemType'];
    amount: number;
    utr: string;
    paymentMode: PaymentRecord['paymentMode'];
    studentName: string;
    rollNo: string;
  }) =>
    apiFetch<{ payment: PaymentRecord }>('/api/payments', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Admin APIs
  getAdminWorkspace: () => apiFetch<AdminWorkspaceResponse>('/api/admin/workspace'),

  updateSettings: (settings: InstituteSettings) =>
    apiFetch<{ settings: InstituteSettings }>('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),

  addStudent: (student: Partial<StudentRecord>) =>
    apiFetch<{ student: StudentRecord }>('/api/admin/students', {
      method: 'POST',
      body: JSON.stringify(student),
    }),

  deleteStudent: (id: string) =>
    apiFetch<{ ok: boolean }>(`/api/admin/students/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  addTeacher: (teacher: Partial<TeacherRecord>) =>
    apiFetch<{ teacher: TeacherRecord }>('/api/admin/teachers', {
      method: 'POST',
      body: JSON.stringify(teacher),
    }),

  deleteTeacher: (id: string) =>
    apiFetch<{ ok: boolean }>(`/api/admin/teachers/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  addBatch: (batch: Partial<BatchRecord>) =>
    apiFetch<{ batch: BatchRecord }>('/api/admin/batches', {
      method: 'POST',
      body: JSON.stringify(batch),
    }),

  addFolder: (folder: Partial<TestFolder>) =>
    apiFetch<{ folder: TestFolder }>('/api/admin/folders', {
      method: 'POST',
      body: JSON.stringify(folder),
    }),

  deleteFolder: (id: string) =>
    apiFetch<{ ok: boolean }>(`/api/admin/folders/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  addQuestion: (question: Partial<QuestionItem> & { attachToExamId?: string }) =>
    apiFetch<{ question: QuestionItem; updatedExam: ExamPaper | null }>('/api/admin/questions', {
      method: 'POST',
      body: JSON.stringify(question),
    }),

  bulkImportQuestions: (items: Partial<QuestionItem>[], attachToExamId?: string) =>
    apiFetch<{ questions: QuestionItem[]; updatedExam: ExamPaper | null }>(
      '/api/admin/questions/bulk',
      {
        method: 'POST',
        body: JSON.stringify({ items, attachToExamId }),
      }
    ),

  deleteQuestion: (id: string) =>
    apiFetch<{ ok: boolean }>(`/api/admin/questions/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  createExam: (exam: Partial<ExamPaper>) =>
    apiFetch<{ exam: ExamPaper }>('/api/admin/exams', {
      method: 'POST',
      body: JSON.stringify(exam),
    }),

  updateExam: (id: string, patch: Partial<ExamPaper>) =>
    apiFetch<{ exam: ExamPaper }>(`/api/admin/exams/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(patch),
    }),

  toggleExamStatus: (id: string) =>
    apiFetch<{ exam: ExamPaper }>(`/api/admin/exams/${encodeURIComponent(id)}/toggle`, {
      method: 'PATCH',
    }),

  deleteExam: (id: string) =>
    apiFetch<{ ok: boolean }>(`/api/admin/exams/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  saveAttendance: (record: Partial<AttendanceRecord>) =>
    apiFetch<{ record: AttendanceRecord }>('/api/admin/attendance', {
      method: 'POST',
      body: JSON.stringify(record),
    }),

  addMaterial: (material: Partial<StudyMaterial>) =>
    apiFetch<{ material: StudyMaterial }>('/api/admin/materials', {
      method: 'POST',
      body: JSON.stringify(material),
    }),

  addAnnouncement: (ann: Partial<Announcement>) =>
    apiFetch<{ announcement: Announcement }>('/api/admin/announcements', {
      method: 'POST',
      body: JSON.stringify(ann),
    }),

  evaluateAttempt: (attemptId: string, manualAdjustment: number, adjustmentNote: string) =>
    apiFetch<{ attempt: ExamAttempt }>(`/api/admin/attempts/${encodeURIComponent(attemptId)}/evaluate`, {
      method: 'PATCH',
      body: JSON.stringify({ manualAdjustment, adjustmentNote }),
    }),

  deleteAttempt: (id: string) =>
    apiFetch<{ ok: boolean }>(`/api/admin/attempts/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  updatePaymentStatus: (id: string, status: PaymentRecord['status']) =>
    apiFetch<{ payment: PaymentRecord }>(`/api/admin/payments/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  deletePayment: (id: string) =>
    apiFetch<{ ok: boolean }>(`/api/admin/payments/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  restoreDemoPayments: () =>
    apiFetch<{ payments: PaymentRecord[] }>('/api/admin/payments/restore-demo', {
      method: 'POST',
    }),

  addCourse: (course: Partial<CoursePackage>) =>
    apiFetch<{ course: CoursePackage }>('/api/admin/courses', {
      method: 'POST',
      body: JSON.stringify(course),
    }),

  deleteCourse: (id: string) =>
    apiFetch<{ ok: boolean }>(`/api/admin/courses/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  addTestSeries: (series: Partial<TestSeriesPackage>) =>
    apiFetch<{ testSeries: TestSeriesPackage }>('/api/admin/test-series', {
      method: 'POST',
      body: JSON.stringify(series),
    }),

  deleteTestSeries: (id: string) =>
    apiFetch<{ ok: boolean }>(`/api/admin/test-series/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  // Owner (SALAR Tech) hidden licensing endpoints
  loginOwner: (username: string, password: string) =>
    apiFetch<{ token: string; role: 'owner'; username: string }>('/api/auth/owner/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  getOwnerWorkspace: () => apiFetch<OwnerWorkspaceResponse>('/api/owner/workspace'),

  createLicensePlan: (plan: Partial<LicensePlan>) =>
    apiFetch<{ plan: LicensePlan }>('/api/owner/plans', {
      method: 'POST',
      body: JSON.stringify(plan),
    }),

  updateLicensePlan: (id: string, patch: Partial<LicensePlan>) =>
    apiFetch<{ plan: LicensePlan }>(`/api/owner/plans/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(patch),
    }),

  deleteLicensePlan: (id: string) =>
    apiFetch<{ ok: boolean }>(`/api/owner/plans/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  createClientLicense: (client: Partial<ClientLicense>) =>
    apiFetch<{ client: ClientLicense }>('/api/owner/clients', {
      method: 'POST',
      body: JSON.stringify(client),
    }),

  updateClientLicense: (id: string, patch: Partial<ClientLicense>) =>
    apiFetch<{ client: ClientLicense }>(`/api/owner/clients/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(patch),
    }),

  deleteClientLicense: (id: string) =>
    apiFetch<{ ok: boolean }>(`/api/owner/clients/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  changeOwnerPassword: (currentPassword: string, newPassword: string, username?: string) =>
    apiFetch<{ ok: boolean }>('/api/owner/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword, username }),
    }),
};
