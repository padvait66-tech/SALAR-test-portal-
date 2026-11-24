export type UserRole = 'student' | 'admin' | 'owner';

export type QuestionType = 'single_choice' | 'numerical';

export interface QuestionOption {
  id: string;
  label: 'A' | 'B' | 'C' | 'D';
  text: string;
}

export interface QuestionItem {
  id: string;
  code: string;
  subject: 'Mathematics' | 'Physics' | 'Chemistry' | 'Biology';
  topic: string;
  type: QuestionType;
  difficulty: 'Foundation' | 'Moderate' | 'Advanced IIT';
  targetClass: '11th' | '12th' | 'MHT-CET' | 'Foundation';
  questionText: string;
  imageDataUrl?: string;
  formulaNote: string;
  options: QuestionOption[];
  correctAnswer: string;
  marksPositive: number;
  marksNegative: number;
  explanation: string;
  createdAt: string;
}

export type ExamSubject = 'Physics' | 'Chemistry' | 'Mathematics' | 'PCM' | 'Biology';

export interface TestFolder {
  id: string;
  name: string;
  description: string;
  category: string;
  subject?: string;
  targetClass?: string;
  createdAt: string;
}

export interface ExamPaper {
  id: string;
  title: string;
  code: string;
  folderId: string;
  subject?: ExamSubject;
  examTag?: string;
  targetClass: '11th' | '12th' | 'MHT-CET' | 'All';
  durationMinutes: number;
  passingMarks?: number;
  allowedTabSwitches?: number;
  webcamRequired?: boolean;
  randomizeQuestions?: boolean;
  status: 'Live' | 'Draft';
  questionIds: string[];
  marksPositive: number;
  marksNegative: number;
  instructions: string[];
  startTime: string;
  endTime: string;
  createdAt: string;
}

export interface StudentRecord {
  id: string;
  rollNo: string;
  username: string;
  name: string;
  batchId: string;
  batchName: string;
  targetExam: string;
  phone: string;
  email: string;
  collegeName?: string;
  isQuickJoin?: boolean;
  assignedExamId?: string;
  assignedExamTitle?: string;
  joinedDate: string;
}

export interface TeacherRecord {
  id: string;
  name: string;
  role: string;
  qualification: string;
  specialization: string;
  phone: string;
  assignedBatchIds: string[];
}

export interface BatchRecord {
  id: string;
  code: string;
  name: string;
  targetExam: string;
  schedule: string;
  status: 'Active' | 'Archived';
  description: string;
  startDate: string;
}

export interface ExamAttempt {
  id: string;
  examId: string;
  examTitle: string;
  examCode: string;
  studentId: string;
  studentName: string;
  rollNo: string;
  answers: Record<string, string>;
  markedForReview: string[];
  score: number;
  maxScore: number;
  manualAdjustment: number;
  adjustmentNote?: string;
  correctCount: number;
  incorrectCount: number;
  unattemptedCount: number;
  accuracy: number;
  tabSwitches: number;
  timeTakenMinutes: number;
  status: 'Evaluated' | 'Submitted';
  submittedAt: string;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  batchId: string;
  batchName: string;
  statuses: Record<string, 'Present' | 'Absent' | 'Late'>;
  savedAt: string;
}

export interface StudyMaterial {
  id: string;
  title: string;
  subject: 'Mathematics' | 'Physics' | 'Chemistry' | 'Biology';
  materialType: 'Class Notes' | 'Formula Sheet' | 'DPP' | 'Reference PDF';
  topic: string;
  description: string;
  uploadedBy: string;
  uploadedAt: string;
  downloadCount: number;
  contentSummary: string;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  priority: 'Urgent' | 'High' | 'Normal';
  audience: string;
  postedBy: string;
  postedAt: string;
}

export interface CoursePackage {
  id: string;
  title: string;
  subjectTag: string;
  duration: string;
  price: number;
  status: 'LIVE' | 'DRAFT';
  enrolledCount: number;
  description: string;
  highlights: string[];
  image?: string;
}

export interface TestSeriesPackage {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  mockCount: number;
  price: number;
  status: 'Active' | 'Archived';
  highlights: string[];
}

export interface PaymentRecord {
  id: string;
  studentId: string;
  studentName: string;
  rollNo: string;
  itemName: string;
  itemType: 'Course' | 'Test Series';
  amount: number;
  utr: string;
  paymentMode: 'UPI' | 'Bank Transfer';
  status: 'Pending' | 'Verified' | 'Rejected';
  submittedAt: string;
}

export interface InstituteSettings {
  instituteName: string;
  tagline: string;
  heroTitle: string;
  heroSubtitle: string;
  primaryCta: string;
  secondaryCta: string;
  email: string;
  phone: string;
  address: string;
  upiId: string;
  bankName: string;
  accountNo: string;
  ifsc: string;
}

export type LicenseBillingCycle = 'Monthly' | 'Quarterly' | 'Yearly' | 'Lifetime';
export type ClientLicenseStatus = 'Active' | 'Trial' | 'Grace Period' | 'Suspended' | 'Expired';

export interface LicensePlan {
  id: string;
  name: string;
  price: number;
  billingCycle: LicenseBillingCycle;
  maxStudents: number;
  maxExams: number;
  description: string;
  features: string[];
  isRecommended?: boolean;
}

export interface ClientLicense {
  id: string;
  clientName: string;
  instituteEmail: string;
  contactPhone: string;
  licenseKey: string;
  planId: string;
  planName: string;
  customPrice: number;
  billingCycle: LicenseBillingCycle;
  maxStudents: number;
  status: ClientLicenseStatus;
  issuedAt: string;
  expiresAt: string;
  isPrimaryPortal: boolean;
  notes: string;
}

export interface PublicLicenseSummary {
  licensedTo: string;
  licensor: string;
  licenseKey: string;
  planName: string;
  price: number;
  billingCycle: LicenseBillingCycle;
  status: ClientLicenseStatus;
  expiresAt: string;
  maxStudents: number;
  plans: LicensePlan[];
}

export type AppView =
  | 'landing'
  | 'login'
  | 'shared-exam'
  | 'student'
  | 'admin'
  | 'owner-login'
  | 'owner'
  | 'exam-runner'
  | 'result-view'
  | 'parent-scorecard';
