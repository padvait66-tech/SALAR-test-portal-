import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Activity,
  Award,
  BarChart3,
  Bell,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  CheckSquare,
  ChevronRight,
  Copy,
  CreditCard,
  Download,
  FileText,
  FolderPlus,
  GraduationCap,
  HelpCircle,
  ImagePlus,
  IndianRupee,
  Layers,
  LayoutDashboard,
  Link2,
  ListChecks,
  LogOut,
  Menu,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Settings,
  Share2,
  ShieldCheck,
  Trash2,
  Upload,
  Users,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import type {
  Announcement,
  AttendanceRecord,
  BatchRecord,
  CoursePackage,
  ExamAttempt,
  ExamPaper,
  ExamSubject,
  InstituteSettings,
  PaymentRecord,
  PublicLicenseSummary,
  QuestionItem,
  StudentRecord,
  StudyMaterial,
  TeacherRecord,
  TestFolder,
  TestSeriesPackage,
} from '../types/portal';
import { MathText } from './MathText';
import { ConfirmDialog } from './ConfirmDialog';
import { ShareExamModal } from './ShareExamModal';
import {
  BulkImagesModal,
  CreateExamFolderModal,
  CreateQuestionModal,
  ExamQuestionsModal,
  ImportPdfModal,
} from './ExamModals';
import { buildShortExamUrl, encodeHydratedBundle } from '../utils/shareLinks';

export type AdminTab =
  | 'dashboard'
  | 'students'
  | 'teachers'
  | 'batches'
  | 'questions'
  | 'exams'
  | 'create-exam'
  | 'attendance'
  | 'materials'
  | 'notifications'
  | 'results'
  | 'evaluation'
  | 'payments'
  | 'courses'
  | 'test-series'
  | 'settings';

interface AdminPortalViewProps {
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
  onRefreshWorkspace: () => Promise<void>;
  onUpdateSettings: (next: InstituteSettings) => Promise<void>;
  onChangePasscode: (currentPasscode: string, newPasscode: string) => Promise<void>;
  onAddStudent: (s: Partial<StudentRecord>) => Promise<void>;
  onDeleteStudent: (id: string) => Promise<void>;
  onAddTeacher: (t: Partial<TeacherRecord>) => Promise<void>;
  onDeleteTeacher: (id: string) => Promise<void>;
  onAddBatch: (b: Partial<BatchRecord>) => Promise<void>;
  onCreateFolderAndExam: (payload: {
    folder: Partial<TestFolder>;
    createExam?: Partial<ExamPaper>;
  }) => Promise<{ folder: TestFolder; exam: ExamPaper | null } | void>;
  onDeleteFolder: (id: string) => Promise<void>;
  onAddQuestion: (q: Partial<QuestionItem> & { attachToExamId?: string }) => Promise<void>;
  onBulkImportQuestions: (items: Partial<QuestionItem>[], attachToExamId?: string) => Promise<void>;
  onDeleteQuestion: (id: string) => Promise<void>;
  onCreateExam: (e: Partial<ExamPaper>) => Promise<void>;
  onUpdateExamQuestions: (examId: string, questionIds: string[]) => Promise<void>;
  onToggleExamStatus: (id: string) => Promise<void>;
  onDeleteExam: (id: string) => Promise<void>;
  onSaveAttendance: (rec: Partial<AttendanceRecord>) => Promise<void>;
  onAddMaterial: (m: Partial<StudyMaterial>) => Promise<void>;
  onDownloadMaterial: (m: StudyMaterial) => void;
  onAddAnnouncement: (a: Partial<Announcement>) => Promise<void>;
  onViewAttemptResult: (att: ExamAttempt) => void;
  onDeleteAttempt: (id: string) => Promise<void>;
  onApplyScoreAdjustment: (attemptId: string, adjustment: number, note: string) => Promise<void>;
  onUpdatePaymentStatus: (id: string, status: PaymentRecord['status']) => Promise<void>;
  onDeletePayment: (id: string) => Promise<void>;
  onRestoreDemoPayments: () => Promise<void>;
  onAddCourse: (c: Partial<CoursePackage>) => Promise<void>;
  onDeleteCourse: (id: string) => Promise<void>;
  onAddTestSeries: (ts: Partial<TestSeriesPackage>) => Promise<void>;
  onDeleteTestSeries: (id: string) => Promise<void>;
  onLaunchExamPreview: (exam: ExamPaper) => void;
  onOpenSharedExam: (examId: string) => void;
  onSwitchToStudent: () => void;
  onLogout: () => void;
}

export function AdminPortalView({
  settings,
  students,
  teachers,
  batches,
  folders,
  questions,
  exams,
  attempts,
  attendance,
  materials,
  announcements,
  courses,
  testSeries,
  payments,
  license,
  onRefreshWorkspace,
  onUpdateSettings,
  onChangePasscode,
  onAddStudent,
  onDeleteStudent,
  onAddTeacher,
  onDeleteTeacher,
  onAddBatch,
  onCreateFolderAndExam,
  onDeleteFolder,
  onAddQuestion,
  onBulkImportQuestions,
  onDeleteQuestion,
  onCreateExam,
  onUpdateExamQuestions,
  onToggleExamStatus,
  onDeleteExam,
  onSaveAttendance,
  onAddMaterial,
  onDownloadMaterial,
  onAddAnnouncement,
  onViewAttemptResult,
  onDeleteAttempt,
  onApplyScoreAdjustment,
  onUpdatePaymentStatus,
  onDeletePayment,
  onRestoreDemoPayments,
  onAddCourse,
  onDeleteCourse,
  onAddTestSeries,
  onDeleteTestSeries,
  onLaunchExamPreview,
  onOpenSharedExam,
  onSwitchToStudent,
  onLogout,
}: AdminPortalViewProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Control Room sync & revenue state
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [secondsSinceSync, setSecondsSinceSync] = useState(2);
  const [copiedExamId, setCopiedExamId] = useState<string | null>(null);
  const [revenueWindow, setRevenueWindow] = useState<7 | 14 | 30>(14);

  // Modals state
  const [shareModalExam, setShareModalExam] = useState<ExamPaper | null>(null);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [questionsModalExamId, setQuestionsModalExamId] = useState<string | null>(null);
  const [createQuestionOpen, setCreateQuestionOpen] = useState(false);
  const [createQuestionTargetExamId, setCreateQuestionTargetExamId] = useState<string | null>(null);
  const [importPdfOpen, setImportPdfOpen] = useState(false);
  const [bulkImagesOpen, setBulkImagesOpen] = useState(false);
  const [toasts, setToasts] = useState<{ id: string; text: string }[]>([]);

  const pushToast = (text: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev.slice(-3), { id, text }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  };
  const [confirmState, setConfirmState] = useState<{
    title: string;
    message: string;
    onConfirm: () => Promise<void> | void;
  } | null>(null);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = window.setInterval(() => {
      setSecondsSinceSync((prev) => {
        if (prev >= 8) {
          onRefreshWorkspace().catch(() => {});
          return 0;
        }
        return prev + 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [autoRefresh, onRefreshWorkspace]);

  // Students tab state
  const [studentSearch, setStudentSearch] = useState('');
  const [studentFilterTab, setStudentFilterTab] = useState<'all' | 'quick_join' | 'enrolled'>('all');
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentPhone, setNewStudentPhone] = useState('');
  const [newStudentBatchId, setNewStudentBatchId] = useState(batches[0]?.id ?? '');

  // Teachers tab state
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherRole, setNewTeacherRole] = useState('Faculty — Mathematics');
  const [newTeacherQual, setNewTeacherQual] = useState('');

  // Batches state
  const [newBatchName, setNewBatchName] = useState('');
  const [newBatchTarget, setNewBatchTarget] = useState('');
  const [newBatchSchedule, setNewBatchSchedule] = useState('');

  // Courses & Test Series state
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCourseSubject, setNewCourseSubject] = useState('PCM · JEE & Boards');
  const [newCourseDuration, setNewCourseDuration] = useState('12 Months');
  const [newCoursePrice, setNewCoursePrice] = useState('3999');
  const [newCourseDesc, setNewCourseDesc] = useState('');

  const [newSeriesTitle, setNewSeriesTitle] = useState('');
  const [newSeriesCategory, setNewSeriesCategory] = useState('IIT-JEE');
  const [newSeriesMocks, setNewSeriesMocks] = useState('25');
  const [newSeriesPrice, setNewSeriesPrice] = useState('799');
  const [newSeriesSubtitle, setNewSeriesSubtitle] = useState('');

  // Question Bank state
  const [qSearch, setQSearch] = useState('');
  const [qSubjectFilter, setQSubjectFilter] = useState('All');
  const [qClassFilter, setQClassFilter] = useState('All');

  // Exam Management filter
  const [examFolderFilter, setExamFolderFilter] = useState<string>('all');
  const [examSubjectFilter, setExamSubjectFilter] = useState<string>('all');

  // Create Exam state
  const [exTitle, setExTitle] = useState('');
  const [exCode, setExCode] = useState('');
  const [exFolderId, setExFolderId] = useState(folders[0]?.id ?? '');
  const [exSubject, setExSubject] = useState<ExamSubject>('Physics');
  const [exClass, setExClass] = useState<ExamPaper['targetClass']>('11th');
  const [exDuration, setExDuration] = useState('60');
  const [exPos, setExPos] = useState('4');
  const [exNeg, setExNeg] = useState('-1');
  const [exBankSubjectFilter, setExBankSubjectFilter] = useState<string>('All');
  const [selectedQIds, setSelectedQIds] = useState<string[]>([]);
  const [examMessage, setExamMessage] = useState('');

  // Attendance state
  const [attDate, setAttDate] = useState(new Date().toISOString().slice(0, 10));
  const [attBatchId, setAttBatchId] = useState(batches[0]?.id ?? '');
  const [attMap, setAttMap] = useState<Record<string, 'Present' | 'Absent' | 'Late'>>({});
  const [attSavedMsg, setAttSavedMsg] = useState('');

  // Study Material state
  const [matTitle, setMatTitle] = useState('');
  const [matSubject, setMatSubject] = useState<StudyMaterial['subject']>('Mathematics');
  const [matType, setMatType] = useState<StudyMaterial['materialType']>('Formula Sheet');
  const [matTopic, setMatTopic] = useState('');
  const [matDesc, setMatDesc] = useState('');

  // Notifications state
  const [annTitle, setAnnTitle] = useState('');
  const [annMsg, setAnnMsg] = useState('');
  const [annPriority, setAnnPriority] = useState<Announcement['priority']>('High');
  const [annAudience, setAnnAudience] = useState('All Students');

  // Results & Evaluation state
  const [resSearch, setResSearch] = useState('');
  const [selectedEvalAttemptId, setSelectedEvalAttemptId] = useState<string>(attempts[0]?.id ?? '');
  const [evalDelta, setEvalDelta] = useState('0');
  const [evalNote, setEvalNote] = useState('');
  const [evalSavedMsg, setEvalSavedMsg] = useState('');

  // Payments filter
  const [paymentFilter, setPaymentFilter] = useState<'All' | PaymentRecord['status']>('All');

  // Settings draft & passcode change
  const [settingsDraft, setSettingsDraft] = useState<InstituteSettings>(settings);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [passMsg, setPassMsg] = useState('');

  useEffect(() => {
    setSettingsDraft(settings);
  }, [settings]);

  const liveExams = useMemo(() => exams.filter((e) => e.status === 'Live'), [exams]);
  const publishedCourses = useMemo(() => courses.filter((c) => c.status === 'LIVE'), [courses]);
  const verifiedPayments = useMemo(
    () => payments.filter((p) => p.status === 'Verified'),
    [payments]
  );
  const pendingPaymentsCount = payments.filter((p) => p.status === 'Pending').length;

  const totalVerifiedRevenue = useMemo(
    () => verifiedPayments.reduce((sum, p) => sum + p.amount, 0),
    [verifiedPayments]
  );

  const revenueInWindow = useMemo(() => {
    const now = new Date();
    const cutoff = new Date(now.getTime() - revenueWindow * 24 * 60 * 60 * 1000);
    return verifiedPayments.filter((p) => {
      const d = new Date(p.submittedAt);
      return !Number.isNaN(d.getTime()) && d >= cutoff;
    });
  }, [verifiedPayments, revenueWindow]);

  const windowRevenueTotal = useMemo(
    () => revenueInWindow.reduce((sum, p) => sum + p.amount, 0),
    [revenueInWindow]
  );

  const questionsModalExam = useMemo(
    () => exams.find((e) => e.id === questionsModalExamId) ?? null,
    [exams, questionsModalExamId]
  );

  // Exact 15-item sidebar matching screenshot
  const navItems: { id: AdminTab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'teachers', label: 'Teachers', icon: GraduationCap },
    { id: 'batches', label: 'Batches', icon: Layers },
    { id: 'questions', label: 'Question Bank', icon: HelpCircle },
    { id: 'exams', label: 'Exams', icon: FileText },
    { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
    { id: 'materials', label: 'Study Material', icon: BookOpen },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'results', label: 'Results & Recording', icon: BarChart3 },
    { id: 'evaluation', label: 'Evaluation', icon: CheckSquare },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'courses', label: 'Courses', icon: BookOpen },
    { id: 'test-series', label: 'Test Series', icon: Award },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      const subjMatch = qSubjectFilter === 'All' || q.subject === qSubjectFilter;
      const clsMatch = qClassFilter === 'All' || q.targetClass === qClassFilter;
      const query = qSearch.trim().toLowerCase();
      const textMatch =
        !query ||
        q.questionText.toLowerCase().includes(query) ||
        q.topic.toLowerCase().includes(query) ||
        q.code.toLowerCase().includes(query);
      return subjMatch && clsMatch && textMatch;
    });
  }, [questions, qSubjectFilter, qClassFilter, qSearch]);

  const quickJoinStudents = useMemo(
    () => students.filter((s) => s.isQuickJoin || s.batchName.includes('Quick Join')),
    [students]
  );
  const enrolledStudents = useMemo(
    () => students.filter((s) => !s.isQuickJoin && !s.batchName.includes('Quick Join')),
    [students]
  );

  const visibleStudents = useMemo(() => {
    const base =
      studentFilterTab === 'quick_join'
        ? quickJoinStudents
        : studentFilterTab === 'enrolled'
        ? enrolledStudents
        : students;
    const q = studentSearch.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.rollNo.toLowerCase().includes(q) ||
        s.phone.toLowerCase().includes(q) ||
        (s.collegeName || '').toLowerCase().includes(q)
    );
  }, [students, quickJoinStudents, enrolledStudents, studentFilterTab, studentSearch]);

  const batchStudentsForAttendance = useMemo(
    () => students.filter((s) => s.batchId === attBatchId),
    [students, attBatchId]
  );

  const selectedEvalAttempt =
    attempts.find((a) => a.id === selectedEvalAttemptId) ?? attempts[0] ?? null;

  const handleCopyExamLink = (exam: ExamPaper) => {
    const shortUrl = buildShortExamUrl(exam, 'overview', true);
    const examQuestions = exam.questionIds
      .map((id) => questions.find((q) => q.id === id))
      .filter((q): q is QuestionItem => Boolean(q));
    const folder = folders.find((f) => f.id === exam.folderId) ?? null;

    navigator.clipboard?.writeText(shortUrl);
    setCopiedExamId(exam.id);
    window.setTimeout(() => setCopiedExamId(null), 2000);

    void encodeHydratedBundle({ exam, questions: examQuestions, folder }).then((token) => {
      if (token) {
        navigator.clipboard?.writeText(`${shortUrl}#hydrate=${token}`);
      }
    });
  };

  const handleCreateStudent = async (e: FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;
    const batch = batches.find((b) => b.id === newStudentBatchId) ?? batches[0];
    await onAddStudent({
      name: newStudentName.trim(),
      phone: newStudentPhone.trim() || '9800000000',
      batchId: batch?.id ?? 'batch-jee-main',
      batchName: batch?.name ?? 'JEE Main Target 2026',
      targetExam: batch?.targetExam ?? 'JEE Main 2026',
    });
    setNewStudentName('');
    setNewStudentPhone('');
  };

  const handleCreateTeacher = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTeacherName.trim()) return;
    await onAddTeacher({
      name: newTeacherName.trim(),
      role: newTeacherRole.trim() || 'Faculty',
      qualification: newTeacherQual.trim() || 'M.Sc. / B.Tech',
      specialization: 'Core Subject Mentoring',
      phone: '+91 98000 00000',
    });
    setNewTeacherName('');
    setNewTeacherQual('');
  };

  const handleCreateBatch = async (e: FormEvent) => {
    e.preventDefault();
    if (!newBatchName.trim()) return;
    await onAddBatch({
      name: newBatchName.trim(),
      targetExam: newBatchTarget.trim() || 'JEE / NEET',
      schedule: newBatchSchedule.trim() || '04:00 PM – 06:30 PM (Mon–Sat)',
      status: 'Active',
      description: 'Academic coaching batch.',
    });
    setNewBatchName('');
    setNewBatchTarget('');
    setNewBatchSchedule('');
  };

  const handleCreateCourseSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newCourseTitle.trim()) return;
    await onAddCourse({
      title: newCourseTitle.trim(),
      subjectTag: newCourseSubject.trim() || 'PCM · JEE/Boards',
      duration: newCourseDuration.trim() || '12 Months',
      price: Number(newCoursePrice) || 3999,
      status: 'LIVE',
      description:
        newCourseDesc.trim() || 'Structured classroom & digital course for Gurukul Classes.',
    });
    setNewCourseTitle('');
    setNewCourseDesc('');
  };

  const handleCreateSeriesSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newSeriesTitle.trim()) return;
    await onAddTestSeries({
      title: newSeriesTitle.trim(),
      subtitle:
        newSeriesSubtitle.trim() || 'Full-length + chapterwise CBT mock assessments.',
      category: newSeriesCategory.trim() || 'IIT-JEE',
      mockCount: Number(newSeriesMocks) || 25,
      price: Number(newSeriesPrice) || 799,
      status: 'Active',
    });
    setNewSeriesTitle('');
    setNewSeriesSubtitle('');
  };

  const handleCreateExamSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!exTitle.trim()) {
      setExamMessage('Please provide an examination title.');
      return;
    }
    if (selectedQIds.length === 0) {
      setExamMessage('Please select at least 1 question from the Question Bank.');
      return;
    }
    await onCreateExam({
      title: exTitle.trim(),
      code: exCode.trim() || `GC-${exSubject.slice(0, 4).toUpperCase()}-${exams.length + 1}`,
      folderId: exFolderId || folders[0]?.id || 'folder-1',
      subject: exSubject,
      targetClass: exClass,
      durationMinutes: Number(exDuration) || 60,
      status: 'Live',
      questionIds: selectedQIds,
      marksPositive: Number(exPos) || 4,
      marksNegative: Number(exNeg) || 0,
    });
    setExTitle('');
    setExCode('');
    setSelectedQIds([]);
    setExamMessage('Exam published live to database.');
    window.setTimeout(() => {
      setExamMessage('');
      setActiveTab('exams');
    }, 800);
  };

  const handleSaveAttendanceSubmit = async () => {
    const batch = batches.find((b) => b.id === attBatchId);
    const statuses: Record<string, 'Present' | 'Absent' | 'Late'> = {};
    batchStudentsForAttendance.forEach((s) => {
      statuses[s.id] = attMap[s.id] ?? 'Present';
    });
    await onSaveAttendance({
      date: attDate,
      batchId: attBatchId,
      batchName: batch?.name ?? 'Batch',
      statuses,
    });
    setAttSavedMsg('Attendance record saved to database.');
    window.setTimeout(() => setAttSavedMsg(''), 2500);
  };

  const handleCreateMaterial = async (e: FormEvent) => {
    e.preventDefault();
    if (!matTitle.trim()) return;
    await onAddMaterial({
      title: matTitle.trim(),
      subject: matSubject,
      materialType: matType,
      topic: matTopic.trim() || 'General',
      description: matDesc.trim() || 'Classroom material authored by Gurukul Classes faculty.',
      uploadedBy: teachers[0]?.name ?? 'Gurukul Faculty',
      contentSummary: `${matTitle.trim()}\nTopic: ${matTopic.trim() || 'Core Syllabus'}\n\n${matDesc.trim()}`,
    });
    setMatTitle('');
    setMatTopic('');
    setMatDesc('');
  };

  const handleBroadcastAnnouncement = async (e: FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annMsg.trim()) return;
    await onAddAnnouncement({
      title: annTitle.trim(),
      message: annMsg.trim(),
      priority: annPriority,
      audience: annAudience,
      postedBy: teachers[0]?.name ?? 'Admin Desk',
    });
    setAnnTitle('');
    setAnnMsg('');
  };

  const formatActivityTime = (iso: string) => iso.replace('T', ' ').slice(0, 19);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-900">
      {/* Crisp White Left Sidebar matching Reference Screenshot */}
      <aside className="hidden lg:flex lg:w-60 lg:flex-col bg-white border-r border-slate-200 shrink-0">
        <div className="px-4 py-4 border-b border-slate-200 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#0F3CC9] text-white flex items-center justify-center shrink-0">
            <LayoutDashboard className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold tracking-tight text-slate-900 uppercase truncate">
              {settings.instituteName.split(' ')[0]}
            </p>
            <p className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
              Admin Console
            </p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              activeTab === item.id || (item.id === 'exams' && activeTab === 'create-exam');
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-[13px] font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-[#0F3CC9] text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-2.5 truncate">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </span>
                {isActive ? (
                  <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-90" />
                ) : item.id === 'payments' && pendingPaymentsCount > 0 ? (
                  <span className="text-[11px] font-mono font-semibold text-amber-700 tabular-nums">
                    {pendingPaymentsCount}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-200 space-y-2.5">
          {license && (
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`w-full text-left px-2.5 py-2 rounded border text-[11px] transition-colors ${
                license.status === 'Suspended' || license.status === 'Expired'
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
              }`}
            >
              <div className="flex items-center justify-between gap-1 font-semibold">
                <span className="truncate">{license.licensor} License</span>
                <span
                  className={`font-mono text-[10px] ${
                    license.status === 'Active' ? 'text-emerald-700' : 'text-amber-700'
                  }`}
                >
                  {license.status}
                </span>
              </div>
              <p className="font-mono text-[10px] text-slate-500 mt-0.5 truncate">
                ₹{new Intl.NumberFormat('en-IN').format(license.price)}/{license.billingCycle} ·{' '}
                {license.planName}
              </p>
            </button>
          )}
          <p className="text-[11px] font-mono text-slate-500 truncate px-1">{settings.email}</p>
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 rounded hover:bg-slate-100"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>

          <div className="flex items-center justify-between gap-2 pt-1 px-1">
            <span className="text-[11px] text-slate-500 whitespace-nowrap">Portal View:</span>
            <div className="inline-flex items-center gap-0.5 p-0.5 bg-slate-100 rounded">
              <button
                type="button"
                className="px-2 py-1 text-[11px] font-medium rounded bg-blue-50 text-[#0F3CC9]"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={onSwitchToStudent}
                className="px-2 py-1 text-[11px] font-medium rounded text-slate-600 hover:text-slate-900"
              >
                Student
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden bg-slate-950/50 flex"
          onClick={() => setSidebarOpen(false)}
        >
          <div
            className="w-64 bg-white h-full flex flex-col border-r border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3.5 flex items-center justify-between border-b border-slate-200">
              <span className="text-sm font-bold uppercase text-slate-900">
                {settings.instituteName}
              </span>
              <button type="button" onClick={() => setSidebarOpen(false)} className="p-1.5">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg ${
                      isActive ? 'bg-[#0F3CC9] text-white' : 'text-slate-600'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="p-3 border-t border-slate-200 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={onSwitchToStudent}
                className="flex-1 py-2 text-xs font-medium bg-slate-100 rounded text-slate-700"
              >
                Student View
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="px-3 py-2 text-xs font-medium text-slate-600"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
            className="p-2 rounded border border-slate-200 text-slate-700"
          >
            <Menu className="w-4 h-4" />
          </button>
          <span className="text-sm font-bold text-slate-900">{settings.instituteName}</span>
          <button
            type="button"
            onClick={onSwitchToStudent}
            className="text-xs font-medium text-[#0F3CC9]"
          >
            Student View
          </button>
        </header>

        <main className="flex-1 p-5 sm:p-8 max-w-[1320px] w-full mx-auto space-y-6">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-mono font-semibold tracking-wider text-slate-400 uppercase">
                    // ADMIN CONSOLE · {settings.instituteName}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                      Control Room
                    </h1>
                    <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded border border-blue-200 bg-blue-50 text-[#0F3CC9] uppercase">
                      • LIVE
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
                    Auto-refresh every 8s · last sync {secondsSinceSync}s ago ·{' '}
                    <span className="text-emerald-600">● Database synced</span>
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setAutoRefresh((v) => !v)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-50"
                  >
                    {autoRefresh ? (
                      <>
                        <Pause className="w-3.5 h-3.5" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        Resume
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSecondsSinceSync(0);
                      onRefreshWorkspace().catch(() => {});
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-50"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Refresh
                  </button>
                </div>
              </div>

              {license && (
                <div
                  className={`rounded-lg border px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                    license.status === 'Suspended' || license.status === 'Expired'
                      ? 'bg-rose-50 border-rose-200 text-rose-900'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-2.5">
                    <ShieldCheck
                      className={`w-4 h-4 shrink-0 mt-0.5 sm:mt-0 ${
                        license.status === 'Suspended' || license.status === 'Expired'
                          ? 'text-rose-600'
                          : 'text-[#0F3CC9]'
                      }`}
                    />
                    <div>
                      <span className="font-bold text-slate-900">
                        Licensed Portal ({license.licensor})
                      </span>
                      <span className="text-slate-500"> · Plan: </span>
                      <span className="font-semibold text-slate-800">{license.planName}</span>
                      <span className="text-slate-500"> · Fee: </span>
                      <span className="font-mono font-bold text-slate-900">
                        ₹{new Intl.NumberFormat('en-IN').format(license.price)} /{' '}
                        {license.billingCycle}
                      </span>
                      <span className="text-slate-500"> · Valid Until: </span>
                      <span className="font-mono">{license.expiresAt}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <span
                      className={`px-2 py-0.5 text-[11px] font-mono font-semibold rounded border ${
                        license.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : license.status === 'Suspended' || license.status === 'Expired'
                          ? 'bg-rose-100 text-rose-800 border-rose-300'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      {license.status}
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('settings')}
                      className="text-xs font-semibold text-[#0F3CC9] hover:underline"
                    >
                      License &amp; Pricing →
                    </button>
                  </div>
                </div>
              )}

              {/* 6-Card KPI Row matching Reference Screenshot */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <button
                  type="button"
                  onClick={() => setActiveTab('students')}
                  className="bg-white border border-slate-200 hover:border-slate-300 rounded-lg p-4 text-left transition-colors"
                >
                  <div className="flex items-center justify-between text-slate-400">
                    <Users className="w-4 h-4 text-[#0F3CC9]" />
                    <span className="text-[10px] font-semibold tracking-wider uppercase">
                      Students
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-3">
                    {students.length}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{students.length} active</p>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('exams')}
                  className="bg-white border border-slate-200 hover:border-slate-300 rounded-lg p-4 text-left transition-colors"
                >
                  <div className="flex items-center justify-between text-slate-400">
                    <GraduationCap className="w-4 h-4 text-[#0F3CC9]" />
                    <span className="text-[10px] font-semibold tracking-wider uppercase">
                      Total Exams
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-3">
                    {exams.length}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{liveExams.length} live</p>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('courses')}
                  className="bg-white border border-slate-200 hover:border-slate-300 rounded-lg p-4 text-left transition-colors"
                >
                  <div className="flex items-center justify-between text-slate-400">
                    <BookOpen className="w-4 h-4 text-[#0F3CC9]" />
                    <span className="text-[10px] font-semibold tracking-wider uppercase">
                      Courses
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-3">
                    {courses.length}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{publishedCourses.length} published</p>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('results')}
                  className="bg-white border border-blue-400 rounded-lg p-4 text-left transition-colors"
                >
                  <div className="flex items-center justify-between text-slate-400">
                    <Activity className="w-4 h-4 text-[#0F3CC9]" />
                    <span className="text-[10px] font-semibold tracking-wider uppercase">
                      Attempts
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-3">
                    {attempts.length}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-slate-500">all-time</span>
                    <span className="text-xs font-medium text-[#0F3CC9]">View →</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('payments')}
                  className="bg-white border border-slate-200 hover:border-slate-300 rounded-lg p-4 text-left transition-colors"
                >
                  <div className="flex items-center justify-between text-slate-400">
                    <IndianRupee className="w-4 h-4 text-[#0F3CC9]" />
                    <span className="text-[10px] font-semibold tracking-wider uppercase">
                      Revenue
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-3">
                    ₹{new Intl.NumberFormat('en-IN').format(totalVerifiedRevenue)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{verifiedPayments.length} verified</p>
                </button>

                <div className="bg-white border border-slate-200 rounded-lg p-4 text-left">
                  <div className="flex items-center justify-between text-slate-400">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span className="text-[10px] font-semibold tracking-wider uppercase">
                      Live Now
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-3">
                    0
                  </p>
                  <p className="text-xs text-slate-500 mt-1">attempts in progress</p>
                </div>
              </div>

              {/* Live Examinations — Quick Student Links */}
              <section className="bg-white border border-slate-200 rounded-lg p-5 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <Link2 className="w-4 h-4 text-[#0F3CC9] mt-1 shrink-0" />
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">
                        Live Examinations — Quick Student Links
                      </h2>
                      <p className="text-xs text-slate-500">
                        Copy self-hydrating student CBT links or generate scannable QR codes.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('exams')}
                    className="text-xs font-semibold text-[#0F3CC9] hover:underline self-start sm:self-auto"
                  >
                    Manage All Exams →
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {liveExams.slice(0, 3).map((ex) => (
                    <div
                      key={ex.id}
                      className="border border-slate-200 rounded-lg p-4 bg-white space-y-3"
                    >
                      <div>
                        <button
                          type="button"
                          onClick={() => onLaunchExamPreview(ex)}
                          className="text-sm font-bold text-slate-900 hover:text-[#0F3CC9] text-left line-clamp-1"
                        >
                          {ex.title}
                        </button>
                        <p className="text-xs font-mono text-slate-500 mt-1 tabular-nums">
                          {ex.code} · {ex.subject || 'PCM'} · Class {ex.targetClass} ·{' '}
                          {ex.questionIds.length} Qs · {ex.durationMinutes}m
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopyExamLink(ex)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-[#0F3CC9] rounded hover:bg-blue-800 transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          {copiedExamId === ex.id ? 'Copied Link' : 'Copy Link'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShareModalExam(ex)}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          Share
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Bottom 2-Column Row: Revenue Chart + Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                <section className="lg:col-span-8 bg-white border border-slate-200 rounded-lg p-5 sm:p-6 flex flex-col justify-between space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <h2 className="text-xs font-bold tracking-wider uppercase text-slate-900">
                        Revenue (Last {revenueWindow} Days)
                      </h2>
                      <span className="text-xs font-mono text-slate-500 tabular-nums">
                        Total: ₹{new Intl.NumberFormat('en-IN').format(windowRevenueTotal)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="inline-flex items-center gap-0.5 p-0.5 bg-slate-100 rounded border border-slate-200">
                        {([7, 14, 30] as const).map((days) => (
                          <button
                            key={days}
                            type="button"
                            onClick={() => setRevenueWindow(days)}
                            className={`px-2.5 py-1 text-[11px] font-mono font-semibold rounded transition-colors ${
                              revenueWindow === days
                                ? 'bg-white text-[#0F3CC9] shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {days}D
                          </button>
                        ))}
                      </div>
                      <span className="text-[11px] font-mono font-semibold text-[#0F3CC9] uppercase">
                        • LIVE
                      </span>
                    </div>
                  </div>

                  {revenueInWindow.length === 0 ? (
                    <div className="h-56 border-t border-slate-100 flex flex-col items-center justify-center text-center text-slate-400 space-y-2">
                      <Wallet className="w-6 h-6 text-slate-300" />
                      <p className="text-xs text-slate-500">
                        No verified collections recorded within last {revenueWindow} days
                      </p>
                    </div>
                  ) : (
                    <div className="h-56 pt-4 border-t border-slate-100 flex flex-col justify-between">
                      <div className="flex-1 flex items-end gap-4 px-2 pb-2">
                        {revenueInWindow.map((p) => {
                          const maxAmt = Math.max(...revenueInWindow.map((x) => x.amount), 1000);
                          const heightPct = Math.max(14, Math.round((p.amount / maxAmt) * 100));
                          return (
                            <div
                              key={p.id}
                              className="flex-1 flex flex-col items-center justify-end gap-1.5 h-full"
                            >
                              <span className="text-[11px] font-mono text-slate-700 tabular-nums">
                                ₹{p.amount}
                              </span>
                              <div
                                className="w-full max-w-[44px] bg-[#0F3CC9] rounded-t transition-all"
                                style={{ height: `${heightPct}%` }}
                              />
                              <span className="text-[10px] font-mono text-slate-500 truncate max-w-full">
                                {p.submittedAt.slice(5)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </section>

                <section className="lg:col-span-4 bg-white border border-slate-200 rounded-lg p-5 sm:p-6 flex flex-col space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-xs font-bold tracking-wider uppercase text-slate-900">
                      Recent Activity
                    </h2>
                    <button
                      type="button"
                      onClick={() => setActiveTab('results')}
                      className="text-xs font-semibold text-[#0F3CC9] hover:underline"
                    >
                      All submissions ({attempts.length})
                    </button>
                  </div>

                  <div className="divide-y divide-slate-100 flex-1">
                    {attempts.slice(0, 5).map((att) => (
                      <button
                        key={att.id}
                        type="button"
                        onClick={() => onViewAttemptResult(att)}
                        className="w-full py-3 text-left hover:bg-slate-50/80 transition-colors block"
                      >
                        <p className="text-xs text-slate-900 leading-snug">
                          <span className="font-semibold">{att.studentName}</span> submitted{' '}
                          <span className="font-medium">‘{att.examCode}’</span> —{' '}
                          <span className="font-mono font-semibold tabular-nums">
                            {(att.score + att.manualAdjustment).toFixed(1)}/{att.maxScore.toFixed(1)}
                          </span>
                        </p>
                        <p className="text-[11px] font-mono text-slate-400 mt-1 tabular-nums">
                          {formatActivityTime(att.submittedAt)}
                        </p>
                      </button>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          )}

          {activeTab === 'students' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-mono uppercase tracking-widest text-[#0F3CC9]">
                    // ROSTER &amp; CANDIDATES
                  </p>
                  <h1 className="text-2xl font-bold text-slate-900">
                    Student Management ({students.length})
                  </h1>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    {students.length} total · {quickJoinStudents.length} Quick Join public candidates ·{' '}
                    {enrolledStudents.length} enrolled in batches
                  </p>
                </div>
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Search student, roll no, mobile, college..."
                  className="px-3.5 py-2 text-xs bg-white border border-slate-300 rounded w-full sm:w-72"
                />
              </div>

              <div className="flex items-center border-b border-slate-200 gap-2 text-xs">
                {[
                  { id: 'all', label: `All Students (${students.length})` },
                  { id: 'quick_join', label: `Quick Join Candidates (${quickJoinStudents.length})` },
                  { id: 'enrolled', label: `Enrolled Batches (${enrolledStudents.length})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStudentFilterTab(tab.id as typeof studentFilterTab)}
                    className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors ${
                      studentFilterTab === tab.id
                        ? 'border-[#0F3CC9] text-[#0F3CC9]'
                        : 'border-transparent text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <form
                onSubmit={handleCreateStudent}
                className="bg-white border border-slate-200 rounded-lg p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end text-xs"
              >
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Student Name</label>
                  <input
                    type="text"
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                    placeholder="Full name"
                    className="w-full px-3 py-2 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={newStudentPhone}
                    onChange={(e) => setNewStudentPhone(e.target.value)}
                    placeholder="98XXXXXXXX"
                    className="w-full px-3 py-2 border border-slate-300 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Batch</label>
                  <select
                    value={newStudentBatchId}
                    onChange={(e) => setNewStudentBatchId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded bg-white"
                  >
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-[#0F3CC9] rounded hover:bg-blue-800"
                >
                  + Add Student
                </button>
              </form>

              <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-mono uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-4">Roll No</th>
                      <th className="py-3 px-4">Candidate / Student</th>
                      <th className="py-3 px-4">Batch / Origin</th>
                      <th className="py-3 px-4">Mobile</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {visibleStudents.map((s) => (
                      <tr key={s.id}>
                        <td className="py-3 px-4 font-mono text-slate-700">{s.rollNo}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">{s.name}</span>
                            {s.isQuickJoin && (
                              <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200 rounded">
                                QUICK JOIN
                              </span>
                            )}
                          </div>
                          {s.collegeName && (
                            <p className="text-[11px] text-slate-500 mt-0.5">{s.collegeName}</p>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{s.batchName}</td>
                        <td className="py-3 px-4 font-mono text-slate-600">{s.phone}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmState({
                                title: 'Remove Student',
                                message: `Remove ${s.name} (${s.rollNo}) from the roster?`,
                                onConfirm: () => onDeleteStudent(s.id),
                              })
                            }
                            className="p-1.5 text-slate-400 hover:text-rose-700"
                            title="Remove student"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'teachers' && (
            <div className="space-y-5">
              <h1 className="text-2xl font-bold text-slate-900">
                Teachers &amp; Faculty ({teachers.length})
              </h1>

              <form
                onSubmit={handleCreateTeacher}
                className="bg-white border border-slate-200 rounded-lg p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end text-xs"
              >
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Faculty Name</label>
                  <input
                    type="text"
                    value={newTeacherName}
                    onChange={(e) => setNewTeacherName(e.target.value)}
                    placeholder="Prof. Name"
                    className="w-full px-3 py-2 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Role</label>
                  <input
                    type="text"
                    value={newTeacherRole}
                    onChange={(e) => setNewTeacherRole(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Qualification</label>
                  <input
                    type="text"
                    value={newTeacherQual}
                    onChange={(e) => setNewTeacherQual(e.target.value)}
                    placeholder="M.Sc. / IIT"
                    className="w-full px-3 py-2 border border-slate-300 rounded"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-[#0F3CC9] rounded hover:bg-blue-800"
                >
                  + Add Faculty
                </button>
              </form>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {teachers.map((t) => (
                  <div
                    key={t.id}
                    className="bg-white border border-slate-200 rounded-lg p-4 flex items-start justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <h2 className="text-sm font-bold text-slate-900">{t.name}</h2>
                      <p className="text-xs font-medium text-[#0F3CC9]">{t.role}</p>
                      <p className="text-xs text-slate-600">{t.qualification}</p>
                      <p className="text-xs font-mono text-slate-500 pt-1">{t.phone}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setConfirmState({
                          title: 'Remove Faculty Member',
                          message: `Delete ${t.name} from faculty directory?`,
                          onConfirm: () => onDeleteTeacher(t.id),
                        })
                      }
                      className="p-1.5 text-slate-400 hover:text-rose-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'batches' && (
            <div className="space-y-5">
              <h1 className="text-2xl font-bold text-slate-900">Batches ({batches.length})</h1>

              <form
                onSubmit={handleCreateBatch}
                className="bg-white border border-slate-200 rounded-lg p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end text-xs"
              >
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Batch Name</label>
                  <input
                    type="text"
                    value={newBatchName}
                    onChange={(e) => setNewBatchName(e.target.value)}
                    placeholder="e.g. Class 12 Weekend"
                    className="w-full px-3 py-2 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Exam</label>
                  <input
                    type="text"
                    value={newBatchTarget}
                    onChange={(e) => setNewBatchTarget(e.target.value)}
                    placeholder="JEE / NEET"
                    className="w-full px-3 py-2 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Timings</label>
                  <input
                    type="text"
                    value={newBatchSchedule}
                    onChange={(e) => setNewBatchSchedule(e.target.value)}
                    placeholder="04:00 PM – 06:30 PM"
                    className="w-full px-3 py-2 border border-slate-300 rounded"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-[#0F3CC9] rounded"
                >
                  + Add Batch
                </button>
              </form>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {batches.map((b) => (
                  <div key={b.id} className="bg-white border border-slate-200 rounded-lg p-4 space-y-1.5">
                    <p className="text-[11px] font-mono text-slate-500">
                      {b.code} · {b.status} · {b.schedule}
                    </p>
                    <h2 className="text-sm font-bold text-slate-900">{b.name}</h2>
                    <p className="text-xs text-slate-600">{b.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'questions' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                    // REPOSITORY
                  </p>
                  <h1 className="text-2xl font-bold text-slate-900">Question Bank</h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {questions.length} questions stored permanently · Supports KaTeX &amp; image
                    uploads
                  </p>
                </div>

                {/* Exact Action Bar matching Reference Screenshots */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setImportPdfOpen(true)}
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded text-xs font-medium text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5 text-slate-500" />
                    <span>Import PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateFolderOpen(true)}
                    className="px-3 py-1.5 bg-[#0B192C] hover:bg-slate-900 text-white rounded text-xs font-medium inline-flex items-center gap-1.5"
                  >
                    <FolderPlus className="w-3.5 h-3.5 text-blue-400" />
                    <span>Create Exam Folder</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkImagesOpen(true)}
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded text-xs font-medium text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5"
                  >
                    <ImagePlus className="w-3.5 h-3.5 text-slate-500" />
                    <span>Bulk Images</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('exams')}
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded text-xs font-medium text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5"
                  >
                    <Zap className="w-3.5 h-3.5 text-slate-500" />
                    <span>Quick Assign</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCreateQuestionTargetExamId(exams[0]?.id ?? null);
                      setCreateQuestionOpen(true);
                    }}
                    className="px-3.5 py-1.5 bg-[#0F3CC9] hover:bg-blue-800 text-white font-semibold rounded text-xs inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Question</span>
                  </button>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                    Target Class
                  </label>
                  <select
                    value={qClassFilter}
                    onChange={(e) => setQClassFilter(e.target.value)}
                    className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded"
                  >
                    <option value="All">All Classes</option>
                    <option value="11th">Class 11th</option>
                    <option value="12th">Class 12th</option>
                    <option value="MHT-CET">MHT-CET</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                    Subject
                  </label>
                  <select
                    value={qSubjectFilter}
                    onChange={(e) => setQSubjectFilter(e.target.value)}
                    className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded"
                  >
                    <option value="All">All</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Physics">Physics</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Biology">Biology</option>
                  </select>
                </div>
                <div className="flex-1 min-w-[220px]">
                  <input
                    type="text"
                    value={qSearch}
                    onChange={(e) => setQSearch(e.target.value)}
                    placeholder="Search text, topic, code, or folder..."
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setQSearch('');
                    setQSubjectFilter('All');
                    setQClassFilter('All');
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded hover:bg-slate-200"
                >
                  Reset
                </button>
              </div>

              <div className="space-y-4">
                {filteredQuestions.map((q, qIdx) => (
                  <div
                    key={q.id}
                    className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 rounded">
                          {q.subject}
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-semibold bg-[#0F3CC9] text-white rounded">
                          {q.targetClass}
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-mono bg-slate-50 text-slate-600 border border-slate-200 rounded">
                          {q.code}
                        </span>
                        {q.imageDataUrl && (
                          <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-blue-50 text-[#0F3CC9] border border-blue-200 rounded">
                            IMAGE QUESTION (IMAGE)
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmState({
                            title: 'Delete Question',
                            message: `Delete question ${q.code} permanently from Question Bank?`,
                            onConfirm: () => onDeleteQuestion(q.id),
                          })
                        }
                        className="p-1 text-slate-400 hover:text-rose-700 shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-bold text-slate-500 font-mono mt-0.5">
                          Q{qIdx + 1}.
                        </span>
                        <div className="space-y-2.5 flex-1">
                          {q.questionText && (
                            <div className="text-sm text-slate-900">
                              <MathText text={q.questionText} />
                            </div>
                          )}
                          {q.imageDataUrl && (
                            <div className="border border-slate-200 rounded p-2 bg-white inline-block">
                              <img
                                src={q.imageDataUrl}
                                alt={q.code}
                                className="max-h-64 w-auto object-contain rounded"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {q.type === 'single_choice' && q.options.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {q.options.map((opt) => {
                            const isCorrect = opt.label === q.correctAnswer;
                            return (
                              <div
                                key={opt.id}
                                className={`px-3 py-2 rounded border text-xs flex items-center justify-between gap-2 ${
                                  isCorrect
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                                    : 'bg-slate-50/70 border-slate-200 text-slate-700'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold">{opt.label}</span>
                                  <MathText text={opt.text} />
                                </div>
                                {isCorrect && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs font-mono text-emerald-700">
                          Numerical Answer Key: <strong>{q.correctAnswer}</strong>
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'exams' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">
                    Exam Management ({exams.length})
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Organized by Examination Folders · Inspect Questions, Share QR, or Launch CBT.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCreateFolderOpen(true)}
                    className="px-3.5 py-2 bg-[#0B192C] hover:bg-slate-900 text-white rounded text-xs font-semibold inline-flex items-center gap-1.5"
                  >
                    <FolderPlus className="w-3.5 h-3.5 text-blue-400" />
                    <span>Create Exam Folder</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('create-exam')}
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#0F3CC9] rounded hover:bg-blue-800 inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Online Exam</span>
                  </button>
                </div>
              </div>

              {/* Subject Filter Chips */}
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: 'all', label: 'All Subjects' },
                  { id: 'Physics', label: 'Physics Tests' },
                  { id: 'Chemistry', label: 'Chemistry Tests' },
                  { id: 'Mathematics', label: 'Maths Tests' },
                  { id: 'PCM', label: 'Combined PCM' },
                ].map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setExamSubjectFilter(sub.id)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded border ${
                      examSubjectFilter === sub.id
                        ? 'bg-[#0B192C] text-white border-[#0B192C]'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>

              {/* Folder Filter Chips */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setExamFolderFilter('all')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded border ${
                    examFolderFilter === 'all'
                      ? 'bg-[#0F3CC9] text-white border-[#0F3CC9]'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  All Folders ({exams.length})
                </button>
                {folders.map((folder) => {
                  const count = exams.filter(
                    (e) =>
                      e.folderId === folder.id &&
                      (examSubjectFilter === 'all' || (e.subject || 'PCM') === examSubjectFilter)
                  ).length;
                  return (
                    <button
                      key={folder.id}
                      type="button"
                      onClick={() => setExamFolderFilter(folder.id)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded border ${
                        examFolderFilter === folder.id
                          ? 'bg-[#0F3CC9] text-white border-[#0F3CC9]'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {folder.name} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Folder Sections */}
              <div className="space-y-5">
                {folders
                  .filter((f) => examFolderFilter === 'all' || f.id === examFolderFilter)
                  .map((folder) => {
                    const folderExams = exams.filter(
                      (e) =>
                        e.folderId === folder.id &&
                        (examSubjectFilter === 'all' || (e.subject || 'PCM') === examSubjectFilter)
                    );
                    return (
                      <section
                        key={folder.id}
                        className="bg-white border border-slate-200 rounded-lg overflow-hidden"
                      >
                        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h2 className="text-sm font-bold text-slate-900">{folder.name}</h2>
                              <span className="px-2 py-0.5 text-[10px] font-mono bg-white border border-slate-200 rounded text-slate-600">
                                {folder.category}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">{folder.description}</p>
                          </div>
                          {folderExams.length === 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmState({
                                  title: 'Delete Exam Folder',
                                  message: `Delete empty folder "${folder.name}"?`,
                                  onConfirm: () => onDeleteFolder(folder.id),
                                })
                              }
                              className="p-1.5 text-slate-400 hover:text-rose-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {folderExams.length === 0 ? (
                          <div className="p-5 text-xs text-slate-500 flex items-center justify-between">
                            <span>No examinations created in this folder yet.</span>
                            <button
                              type="button"
                              onClick={() => {
                                setExFolderId(folder.id);
                                setActiveTab('create-exam');
                              }}
                              className="text-xs font-semibold text-[#0F3CC9] hover:underline"
                            >
                              + Add Exam to Folder
                            </button>
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-200">
                            {folderExams.map((ex) => (
                              <div
                                key={ex.id}
                                className="p-4 sm:px-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                              >
                                <div>
                                  <p className="text-[11px] font-mono text-slate-500 tabular-nums">
                                    {ex.code} · {ex.subject || 'PCM'} · Class {ex.targetClass} ·{' '}
                                    {ex.questionIds.length} Qs · {ex.durationMinutes} min ·{' '}
                                    <span
                                      className={
                                        ex.status === 'Live'
                                          ? 'text-emerald-700 font-bold'
                                          : 'text-amber-700 font-bold'
                                      }
                                    >
                                      {ex.status}
                                    </span>
                                  </p>
                                  <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                                    {ex.title}
                                  </h3>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => setQuestionsModalExamId(ex.id)}
                                    className="px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded hover:bg-slate-50 inline-flex items-center gap-1.5"
                                  >
                                    <ListChecks className="w-3.5 h-3.5 text-[#0F3CC9]" />
                                    <span>Questions ({ex.questionIds.length})</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setShareModalExam(ex)}
                                    className="px-3 py-1.5 text-xs font-semibold text-[#0F3CC9] bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 inline-flex items-center gap-1.5"
                                  >
                                    <Share2 className="w-3.5 h-3.5" />
                                    <span>Share</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onLaunchExamPreview(ex)}
                                    className="px-3 py-1.5 text-xs font-semibold text-white bg-[#0F3CC9] rounded hover:bg-blue-800"
                                  >
                                    Start CBT
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onToggleExamStatus(ex.id)}
                                    className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded text-slate-700 hover:bg-slate-50"
                                  >
                                    {ex.status === 'Live' ? 'Draft' : 'Publish'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setConfirmState({
                                        title: 'Delete Examination',
                                        message: `Delete "${ex.title}" (${ex.code}) permanently?`,
                                        onConfirm: () => onDeleteExam(ex.id),
                                      })
                                    }
                                    className="p-1.5 text-slate-400 hover:text-rose-700"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </section>
                    );
                  })}
              </div>
            </div>
          )}

          {activeTab === 'create-exam' && (
            <form onSubmit={handleCreateExamSubmit} className="space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">
                    Create Online Examination (CBT)
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure marking scheme and select questions from Question Bank.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('exams')}
                  className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded"
                >
                  Back to Exams
                </button>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Examination Title
                  </label>
                  <input
                    type="text"
                    value={exTitle}
                    onChange={(e) => setExTitle(e.target.value)}
                    placeholder="e.g. 12th Mathematics Integration & Calculus Unit Test"
                    className="w-full px-3 py-2 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Exam Code</label>
                  <input
                    type="text"
                    value={exCode}
                    onChange={(e) => setExCode(e.target.value)}
                    placeholder="GC-MATH-2026"
                    className="w-full px-3 py-2 border border-slate-300 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Subject</label>
                  <select
                    value={exSubject}
                    onChange={(e) => {
                      const nextSub = e.target.value as ExamSubject;
                      setExSubject(nextSub);
                      setExBankSubjectFilter(nextSub === 'PCM' ? 'All' : nextSub);
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded bg-white"
                  >
                    <option value="Physics">Physics</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="PCM">Combined PCM</option>
                    <option value="Biology">Biology</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Folder</label>
                  <select
                    value={exFolderId}
                    onChange={(e) => setExFolderId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded bg-white"
                  >
                    {folders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Class</label>
                  <select
                    value={exClass}
                    onChange={(e) => setExClass(e.target.value as ExamPaper['targetClass'])}
                    className="w-full px-3 py-2 border border-slate-300 rounded bg-white"
                  >
                    <option value="11th">Class 11th</option>
                    <option value="12th">Class 12th</option>
                    <option value="MHT-CET">MHT-CET</option>
                    <option value="All">All Classes</option>
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:col-span-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Mins</label>
                    <input
                      type="number"
                      value={exDuration}
                      onChange={(e) => setExDuration(e.target.value)}
                      className="w-full px-2.5 py-2 border border-slate-300 rounded font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">+Marks</label>
                    <input
                      type="number"
                      value={exPos}
                      onChange={(e) => setExPos(e.target.value)}
                      className="w-full px-2.5 py-2 border border-slate-300 rounded font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">-Marks</label>
                    <input
                      type="number"
                      value={exNeg}
                      onChange={(e) => setExNeg(e.target.value)}
                      className="w-full px-2.5 py-2 border border-slate-300 rounded font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-bold text-slate-900">
                    Select Questions from Bank ({selectedQIds.length} selected)
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={exBankSubjectFilter}
                      onChange={(e) => setExBankSubjectFilter(e.target.value)}
                      className="px-2.5 py-1.5 font-medium bg-white border border-slate-300 rounded"
                    >
                      <option value="All">All Subjects</option>
                      <option value="Physics">Physics</option>
                      <option value="Chemistry">Chemistry</option>
                      <option value="Mathematics">Mathematics</option>
                      <option value="Biology">Biology</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        const pool =
                          exSubject === 'PCM'
                            ? questions.filter((q) =>
                                ['Physics', 'Chemistry', 'Mathematics'].includes(q.subject)
                              )
                            : questions.filter((q) => q.subject === exSubject);
                        setSelectedQIds((pool.length ? pool : questions).slice(0, 5).map((q) => q.id));
                      }}
                      className="px-3 py-1.5 font-medium bg-slate-100 text-slate-700 rounded hover:bg-slate-200"
                    >
                      Auto-Pick {exSubject} Questions
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedQIds([])}
                      className="px-3 py-1.5 font-medium text-slate-600 hover:text-slate-900"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-slate-200 max-h-80 overflow-y-auto border border-slate-200 rounded">
                  {questions
                    .filter((q) => exBankSubjectFilter === 'All' || q.subject === exBankSubjectFilter)
                    .map((q) => {
                    const checked = selectedQIds.includes(q.id);
                    return (
                      <label
                        key={q.id}
                        className="flex items-start gap-3 p-3 hover:bg-slate-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setSelectedQIds((prev) =>
                              checked ? prev.filter((id) => id !== q.id) : [...prev, q.id]
                            )
                          }
                          className="mt-1"
                        />
                        <div className="space-y-0.5">
                          <p className="font-mono text-[11px] text-slate-500">
                            {q.code} · {q.subject} · {q.targetClass} · {q.topic}
                          </p>
                          <div className="text-xs text-slate-900">
                            <MathText text={q.questionText} />
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <p className="font-medium text-[#0F3CC9]">{examMessage}</p>
                  <button
                    type="submit"
                    className="px-5 py-2 font-semibold text-white bg-[#0F3CC9] rounded hover:bg-blue-800"
                  >
                    Save &amp; Publish Exam
                  </button>
                </div>
              </div>
            </form>
          )}

          {activeTab === 'attendance' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-slate-900">
                  Daily Classroom &amp; Test Attendance
                </h1>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="date"
                    value={attDate}
                    onChange={(e) => setAttDate(e.target.value)}
                    className="px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded"
                  />
                  <select
                    value={attBatchId}
                    onChange={(e) => setAttBatchId(e.target.value)}
                    className="px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded"
                  >
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600 uppercase text-[10px]">
                      <th className="py-3 px-4">Roll No</th>
                      <th className="py-3 px-4">Student Name</th>
                      <th className="py-3 px-4">Batch</th>
                      <th className="py-3 px-4">Attendance Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {batchStudentsForAttendance.map((st) => {
                      const current = attMap[st.id] ?? 'Present';
                      return (
                        <tr key={st.id}>
                          <td className="py-3 px-4 font-mono text-slate-600">{st.rollNo}</td>
                          <td className="py-3 px-4 font-semibold text-slate-900">{st.name}</td>
                          <td className="py-3 px-4 text-slate-600">{st.batchName}</td>
                          <td className="py-3 px-4">
                            <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded">
                              {(['Present', 'Absent', 'Late'] as const).map((status) => (
                                <button
                                  key={status}
                                  type="button"
                                  onClick={() =>
                                    setAttMap((prev) => ({ ...prev, [st.id]: status }))
                                  }
                                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                                    current === status
                                      ? status === 'Present'
                                        ? 'bg-emerald-700 text-white'
                                        : status === 'Absent'
                                        ? 'bg-rose-700 text-white'
                                        : 'bg-amber-600 text-white'
                                      : 'text-slate-600'
                                  }`}
                                >
                                  {status}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-emerald-700">{attSavedMsg}</p>
                <button
                  type="button"
                  onClick={handleSaveAttendanceSubmit}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#0F3CC9] rounded hover:bg-blue-800"
                >
                  Save Attendance Record
                </button>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-2">
                <h2 className="text-sm font-bold text-slate-900">
                  Saved Attendance Logs ({attendance.length})
                </h2>
                <div className="divide-y divide-slate-200 text-xs">
                  {attendance.map((rec) => {
                    const presentCount = Object.values(rec.statuses).filter(
                      (v) => v === 'Present'
                    ).length;
                    return (
                      <div key={rec.id} className="py-2.5 flex justify-between">
                        <span className="font-medium text-slate-800">
                          {rec.date} · {rec.batchName}
                        </span>
                        <span className="font-mono text-slate-600 tabular-nums">
                          {presentCount} / {Object.keys(rec.statuses).length} Present
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'materials' && (
            <div className="space-y-5">
              <h1 className="text-2xl font-bold text-slate-900">
                Study Material &amp; Formula Books ({materials.length})
              </h1>

              <form
                onSubmit={handleCreateMaterial}
                className="bg-white border border-slate-200 rounded-lg p-5 space-y-3 text-xs"
              >
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <input
                    type="text"
                    value={matTitle}
                    onChange={(e) => setMatTitle(e.target.value)}
                    placeholder="Document Title (e.g. Definite Integrals Booklet)"
                    className="sm:col-span-2 px-3 py-2 border border-slate-300 rounded"
                  />
                  <select
                    value={matSubject}
                    onChange={(e) => setMatSubject(e.target.value as StudyMaterial['subject'])}
                    className="px-3 py-2 border border-slate-300 rounded bg-white"
                  >
                    <option value="Mathematics">Mathematics</option>
                    <option value="Physics">Physics</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Biology">Biology</option>
                  </select>
                  <select
                    value={matType}
                    onChange={(e) => setMatType(e.target.value as StudyMaterial['materialType'])}
                    className="px-3 py-2 border border-slate-300 rounded bg-white"
                  >
                    <option value="Formula Sheet">Formula Sheet</option>
                    <option value="Class Notes">Class Notes</option>
                    <option value="DPP">DPP (Daily Practice Problem)</option>
                    <option value="Reference PDF">Reference PDF</option>
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                  <input
                    type="text"
                    value={matTopic}
                    onChange={(e) => setMatTopic(e.target.value)}
                    placeholder="Chapter / Topic"
                    className="px-3 py-2 border border-slate-300 rounded"
                  />
                  <input
                    type="text"
                    value={matDesc}
                    onChange={(e) => setMatDesc(e.target.value)}
                    placeholder="Summary or reading instructions..."
                    className="px-3 py-2 border border-slate-300 rounded"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 font-semibold text-white bg-[#0F3CC9] rounded"
                  >
                    Upload Material
                  </button>
                </div>
              </form>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {materials.map((m) => (
                  <div
                    key={m.id}
                    className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <p className="text-[11px] font-mono text-slate-500">
                        {m.subject} · {m.materialType} · {m.downloadCount} downloads
                      </p>
                      <h2 className="text-sm font-bold text-slate-900 truncate mt-0.5">
                        {m.title}
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDownloadMaterial(m)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-slate-100 rounded text-slate-700 hover:bg-slate-200 shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-5">
              <h1 className="text-2xl font-bold text-slate-900">
                Announcements &amp; Student Notifications
              </h1>

              <form
                onSubmit={handleBroadcastAnnouncement}
                className="bg-white border border-slate-200 rounded-lg p-5 space-y-3 text-xs"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    value={annTitle}
                    onChange={(e) => setAnnTitle(e.target.value)}
                    placeholder="Title / Subject"
                    className="px-3 py-2 border border-slate-300 rounded"
                  />
                  <select
                    value={annPriority}
                    onChange={(e) => setAnnPriority(e.target.value as Announcement['priority'])}
                    className="px-3 py-2 border border-slate-300 rounded bg-white"
                  >
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                  <select
                    value={annAudience}
                    onChange={(e) => setAnnAudience(e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded bg-white"
                  >
                    <option value="All Students">All Students</option>
                    {batches.map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <textarea
                  rows={2}
                  value={annMsg}
                  onChange={(e) => setAnnMsg(e.target.value)}
                  placeholder="Write clear instructions or schedule notice for students..."
                  className="w-full px-3 py-2 border border-slate-300 rounded"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-5 py-2 font-semibold text-white bg-[#0F3CC9] rounded"
                  >
                    Broadcast Announcement
                  </button>
                </div>
              </form>

              <div className="divide-y divide-slate-200 bg-white border border-slate-200 rounded-lg">
                {announcements.map((a) => (
                  <div key={a.id} className="p-4 space-y-1">
                    <p className="text-[11px] font-mono text-slate-500">
                      <span
                        className={
                          a.priority === 'Urgent'
                            ? 'text-rose-700 font-bold'
                            : a.priority === 'High'
                            ? 'text-amber-700 font-bold'
                            : 'text-slate-600'
                        }
                      >
                        {a.priority}
                      </span>{' '}
                      · Audience: {a.audience} · Posted by {a.postedBy} · {a.postedAt}
                    </p>
                    <h2 className="text-sm font-bold text-slate-900">{a.title}</h2>
                    <p className="text-xs text-slate-600">{a.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'results' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-slate-900">
                  Results &amp; Recording ({attempts.length})
                </h1>
                <input
                  type="text"
                  value={resSearch}
                  onChange={(e) => setResSearch(e.target.value)}
                  placeholder="Search student or exam..."
                  className="px-3.5 py-2 text-xs bg-white border border-slate-300 rounded w-full sm:w-64"
                />
              </div>

              <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600 uppercase text-[10px]">
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Exam</th>
                      <th className="py-3 px-4">Score</th>
                      <th className="py-3 px-4">Tab Violations</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {attempts
                      .filter(
                        (a) =>
                          a.studentName.toLowerCase().includes(resSearch.toLowerCase()) ||
                          a.examTitle.toLowerCase().includes(resSearch.toLowerCase())
                      )
                      .map((att) => (
                        <tr key={att.id}>
                          <td className="py-3 px-4">
                            <p className="font-semibold text-slate-900">{att.studentName}</p>
                            <p className="text-[11px] font-mono text-slate-500">{att.rollNo}</p>
                          </td>
                          <td className="py-3 px-4">
                            <p className="text-slate-900 font-medium">{att.examTitle}</p>
                            <p className="text-[11px] font-mono text-slate-500">{att.examCode}</p>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-900 tabular-nums">
                            {att.score + att.manualAdjustment} / {att.maxScore}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600 tabular-nums">
                            {att.tabSwitches}/30 alerts
                          </td>
                          <td className="py-3 px-4 font-semibold text-emerald-700">{att.status}</td>
                          <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => onViewAttemptResult(att)}
                              className="px-3 py-1.5 text-xs font-medium text-[#0F3CC9] bg-blue-50 border border-blue-200 rounded"
                            >
                              Scorecard
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmState({
                                  title: 'Delete Exam Attempt',
                                  message: `Delete ${att.studentName}'s attempt for ${att.examCode}?`,
                                  onConfirm: () => onDeleteAttempt(att.id),
                                })
                              }
                              className="p-1.5 text-slate-400 hover:text-rose-700"
                            >
                              <Trash2 className="w-4 h-4 inline" />
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'evaluation' && (
            <div className="space-y-5">
              <h1 className="text-2xl font-bold text-slate-900">
                Manual Evaluation &amp; Submission Review
              </h1>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className="lg:col-span-4 bg-white border border-slate-200 rounded-lg divide-y divide-slate-200">
                  {attempts.map((att) => (
                    <button
                      key={att.id}
                      type="button"
                      onClick={() => {
                        setSelectedEvalAttemptId(att.id);
                        setEvalDelta(String(att.manualAdjustment));
                        setEvalNote(att.adjustmentNote ?? '');
                      }}
                      className={`w-full text-left p-4 transition-colors ${
                        selectedEvalAttempt?.id === att.id ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      <p className="text-xs font-bold text-slate-900">{att.studentName}</p>
                      <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                        {att.examCode} · {att.score + att.manualAdjustment}/{att.maxScore}
                      </p>
                    </button>
                  ))}
                </div>

                <div className="lg:col-span-8 bg-white border border-slate-200 rounded-lg p-5 space-y-5">
                  {selectedEvalAttempt ? (
                    <>
                      <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200">
                        <div>
                          <h2 className="text-base font-bold text-slate-900">
                            {selectedEvalAttempt.studentName} ({selectedEvalAttempt.rollNo})
                          </h2>
                          <p className="text-xs font-mono text-slate-500">
                            {selectedEvalAttempt.examTitle} · Base Score: {selectedEvalAttempt.score}
                          </p>
                        </div>
                        <span className="text-xl font-bold font-mono text-[#0F3CC9] tabular-nums">
                          {selectedEvalAttempt.score + selectedEvalAttempt.manualAdjustment} /{' '}
                          {selectedEvalAttempt.maxScore}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end bg-slate-50 border border-slate-200 rounded p-4 text-xs">
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            Score Adjustment (+ / −)
                          </label>
                          <input
                            type="number"
                            value={evalDelta}
                            onChange={(e) => setEvalDelta(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded font-mono bg-white"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            Evaluation Note
                          </label>
                          <input
                            type="text"
                            value={evalNote}
                            onChange={(e) => setEvalNote(e.target.value)}
                            placeholder="Grace marks / key update"
                            className="w-full px-3 py-2 border border-slate-300 rounded bg-white"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            await onApplyScoreAdjustment(
                              selectedEvalAttempt.id,
                              Number(evalDelta) || 0,
                              evalNote
                            );
                            setEvalSavedMsg('Score adjustment saved to database.');
                            window.setTimeout(() => setEvalSavedMsg(''), 2000);
                          }}
                          className="px-4 py-2 font-semibold text-white bg-[#0F3CC9] rounded hover:bg-blue-800"
                        >
                          Apply Adjustment
                        </button>
                      </div>
                      {evalSavedMsg && (
                        <p className="text-xs font-semibold text-emerald-700">{evalSavedMsg}</p>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Select a submission on the left to evaluate.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Payment Approvals</h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Verify student UTR references and approve within 1 hour to unlock course access.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRestoreDemoPayments()}
                  className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50"
                >
                  Restore Demo Payments
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded self-start w-fit">
                {(['All', 'Pending', 'Verified', 'Rejected'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setPaymentFilter(st)}
                    className={`px-3 py-1.5 text-xs font-medium rounded ${
                      paymentFilter === st ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600 uppercase text-[10px]">
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Item</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">UTR</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {payments
                      .filter((p) => paymentFilter === 'All' || p.status === paymentFilter)
                      .map((p) => (
                        <tr key={p.id}>
                          <td className="py-3 px-4">
                            <p className="font-semibold text-slate-900">{p.studentName}</p>
                            <p className="text-[11px] font-mono text-slate-500">{p.rollNo}</p>
                          </td>
                          <td className="py-3 px-4 text-slate-700">{p.itemName}</td>
                          <td className="py-3 px-4 font-mono tabular-nums text-slate-900">
                            ₹{new Intl.NumberFormat('en-IN').format(p.amount)}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600">{p.utr}</td>
                          <td className="py-3 px-4 font-semibold">
                            <span
                              className={
                                p.status === 'Verified'
                                  ? 'text-emerald-700'
                                  : p.status === 'Rejected'
                                  ? 'text-rose-700'
                                  : 'text-amber-700'
                              }
                            >
                              {p.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                            {p.status !== 'Verified' && (
                              <button
                                type="button"
                                onClick={() => onUpdatePaymentStatus(p.id, 'Verified')}
                                className="px-2.5 py-1 text-xs font-medium text-white bg-emerald-700 rounded hover:bg-emerald-800"
                              >
                                Approve
                              </button>
                            )}
                            {p.status !== 'Rejected' && (
                              <button
                                type="button"
                                onClick={() => onUpdatePaymentStatus(p.id, 'Rejected')}
                                className="px-2.5 py-1 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded"
                              >
                                Reject
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmState({
                                  title: 'Delete Payment Record',
                                  message: `Delete payment UTR ${p.utr} by ${p.studentName}?`,
                                  onConfirm: () => onDeletePayment(p.id),
                                })
                              }
                              className="p-1.5 text-slate-400 hover:text-rose-700"
                            >
                              <Trash2 className="w-4 h-4 inline" />
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'courses' && (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Course Management ({courses.length})
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manage live academic courses published to the student portal and homepage.
                </p>
              </div>

              <form
                onSubmit={handleCreateCourseSubmit}
                className="bg-white border border-slate-200 rounded-lg p-5 space-y-3 text-xs"
              >
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <input
                    type="text"
                    value={newCourseTitle}
                    onChange={(e) => setNewCourseTitle(e.target.value)}
                    placeholder="Course Title (e.g. 12th Full Syllabus)"
                    className="sm:col-span-2 px-3 py-2 border border-slate-300 rounded"
                  />
                  <input
                    type="text"
                    value={newCourseSubject}
                    onChange={(e) => setNewCourseSubject(e.target.value)}
                    placeholder="Subject Tag"
                    className="px-3 py-2 border border-slate-300 rounded"
                  />
                  <input
                    type="number"
                    value={newCoursePrice}
                    onChange={(e) => setNewCoursePrice(e.target.value)}
                    placeholder="Fee (INR)"
                    className="px-3 py-2 border border-slate-300 rounded font-mono"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
                  <input
                    type="text"
                    value={newCourseDuration}
                    onChange={(e) => setNewCourseDuration(e.target.value)}
                    placeholder="Duration (e.g. 6 Months)"
                    className="px-3 py-2 border border-slate-300 rounded"
                  />
                  <input
                    type="text"
                    value={newCourseDesc}
                    onChange={(e) => setNewCourseDesc(e.target.value)}
                    placeholder="Course description..."
                    className="sm:col-span-2 px-3 py-2 border border-slate-300 rounded"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 font-semibold text-white bg-[#0F3CC9] rounded hover:bg-blue-800"
                  >
                    + New Course
                  </button>
                </div>
              </form>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {courses.map((c) => (
                  <div
                    key={c.id}
                    className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono text-slate-500">
                          {c.subjectTag} · {c.duration}
                        </span>
                        <span className="text-xs font-semibold text-emerald-700">{c.status}</span>
                      </div>
                      <h2 className="text-sm font-bold text-slate-900">{c.title}</h2>
                      <p className="text-xs text-slate-600">{c.description}</p>
                    </div>
                    <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-900">
                        ₹{new Intl.NumberFormat('en-IN').format(c.price)}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmState({
                            title: 'Delete Course',
                            message: `Delete course "${c.title}"?`,
                            onConfirm: () => onDeleteCourse(c.id),
                          })
                        }
                        className="p-1.5 text-slate-400 hover:text-rose-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'test-series' && (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Test Series Packages ({testSeries.length})
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Create and publish mock test bundles for JEE, NEET, MHT-CET &amp; Boards.
                </p>
              </div>

              <form
                onSubmit={handleCreateSeriesSubmit}
                className="bg-white border border-slate-200 rounded-lg p-5 space-y-3 text-xs"
              >
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <input
                    type="text"
                    value={newSeriesTitle}
                    onChange={(e) => setNewSeriesTitle(e.target.value)}
                    placeholder="Test Series Title"
                    className="sm:col-span-2 px-3 py-2 border border-slate-300 rounded"
                  />
                  <input
                    type="text"
                    value={newSeriesCategory}
                    onChange={(e) => setNewSeriesCategory(e.target.value)}
                    placeholder="Category (e.g. IIT-JEE)"
                    className="px-3 py-2 border border-slate-300 rounded"
                  />
                  <input
                    type="number"
                    value={newSeriesPrice}
                    onChange={(e) => setNewSeriesPrice(e.target.value)}
                    placeholder="Price (INR)"
                    className="px-3 py-2 border border-slate-300 rounded font-mono"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
                  <input
                    type="number"
                    value={newSeriesMocks}
                    onChange={(e) => setNewSeriesMocks(e.target.value)}
                    placeholder="Number of Mocks"
                    className="px-3 py-2 border border-slate-300 rounded font-mono"
                  />
                  <input
                    type="text"
                    value={newSeriesSubtitle}
                    onChange={(e) => setNewSeriesSubtitle(e.target.value)}
                    placeholder="Subtitle / Description..."
                    className="sm:col-span-2 px-3 py-2 border border-slate-300 rounded"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 font-semibold text-white bg-[#0F3CC9] rounded hover:bg-blue-800"
                  >
                    + New Test Series
                  </button>
                </div>
              </form>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {testSeries.map((ts) => (
                  <div
                    key={ts.id}
                    className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <p className="text-[11px] font-mono text-slate-500">
                        {ts.category} · {ts.mockCount} mocks · {ts.status}
                      </p>
                      <h2 className="text-sm font-bold text-slate-900">{ts.title}</h2>
                      <p className="text-xs text-slate-600">{ts.subtitle}</p>
                    </div>
                    <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-900">
                        ₹{new Intl.NumberFormat('en-IN').format(ts.price)}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmState({
                            title: 'Delete Test Series',
                            message: `Delete test series "${ts.title}"?`,
                            onConfirm: () => onDeleteTestSeries(ts.id),
                          })
                        }
                        className="p-1.5 text-slate-400 hover:text-rose-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6 max-w-3xl">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await onUpdateSettings(settingsDraft);
                  setSettingsSaved(true);
                  window.setTimeout(() => setSettingsSaved(false), 2500);
                }}
                className="bg-white border border-slate-200 rounded-lg p-6 space-y-5 text-xs"
              >
                <h1 className="text-2xl font-bold text-slate-900">
                  Institute Settings &amp; Branding
                </h1>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Institute Name
                    </label>
                    <input
                      type="text"
                      value={settingsDraft.instituteName}
                      onChange={(e) =>
                        setSettingsDraft((s) => ({ ...s, instituteName: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Tagline</label>
                    <input
                      type="text"
                      value={settingsDraft.tagline}
                      onChange={(e) =>
                        setSettingsDraft((s) => ({ ...s, tagline: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      value={settingsDraft.email}
                      onChange={(e) => setSettingsDraft((s) => ({ ...s, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Phone</label>
                    <input
                      type="text"
                      value={settingsDraft.phone}
                      onChange={(e) => setSettingsDraft((s) => ({ ...s, phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">UPI ID</label>
                    <input
                      type="text"
                      value={settingsDraft.upiId}
                      onChange={(e) => setSettingsDraft((s) => ({ ...s, upiId: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={settingsDraft.bankName}
                      onChange={(e) =>
                        setSettingsDraft((s) => ({ ...s, bankName: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={settingsDraft.accountNo}
                      onChange={(e) =>
                        setSettingsDraft((s) => ({ ...s, accountNo: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">IFSC Code</label>
                    <input
                      type="text"
                      value={settingsDraft.ifsc}
                      onChange={(e) => setSettingsDraft((s) => ({ ...s, ifsc: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                  {settingsSaved ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                      <CheckCircle2 className="w-4 h-4" />
                      Settings persisted to database.
                    </span>
                  ) : (
                    <span />
                  )}
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-semibold text-white bg-[#0F3CC9] rounded hover:bg-blue-800"
                  >
                    Save Settings
                  </button>
                </div>
              </form>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setPassMsg('');
                  try {
                    await onChangePasscode(currentPass, newPass);
                    setCurrentPass('');
                    setNewPass('');
                    setPassMsg('Admin passcode updated securely.');
                  } catch (err) {
                    setPassMsg(err instanceof Error ? err.message : 'Unable to update passcode.');
                  }
                }}
                className="bg-white border border-slate-200 rounded-lg p-6 space-y-4 text-xs"
              >
                <h2 className="text-sm font-bold text-slate-900">
                  Admin Console Security Passcode
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Current Passcode
                    </label>
                    <input
                      type="password"
                      value={currentPass}
                      onChange={(e) => setCurrentPass(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      New Passcode (min 6 chars)
                    </label>
                    <input
                      type="password"
                      value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs font-medium text-[#0F3CC9]">{passMsg}</span>
                  <button
                    type="submit"
                    className="px-4 py-2 font-semibold text-white bg-slate-900 rounded hover:bg-slate-800"
                  >
                    Update Passcode
                  </button>
                </div>
              </form>

              {license && (
                <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-5 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                        {license.licensor} · Commercial License &amp; Pricing
                      </p>
                      <h2 className="text-base font-bold text-slate-900 mt-0.5">
                        Portal Software License Details
                      </h2>
                    </div>
                    <span
                      className={`px-2.5 py-1 text-[11px] font-mono font-bold rounded border self-start sm:self-auto ${
                        license.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : license.status === 'Suspended' || license.status === 'Expired'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      Status: {license.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <div>
                      <p className="text-[11px] text-slate-500">Licensed Institute</p>
                      <p className="font-bold text-slate-900 mt-0.5">{license.licensedTo}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-500">License Key</p>
                      <p className="font-mono font-semibold text-slate-900 mt-0.5">
                        {license.licenseKey}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-500">Owner-Decided Fee</p>
                      <p className="font-mono font-bold text-[#0F3CC9] text-sm mt-0.5">
                        ₹{new Intl.NumberFormat('en-IN').format(license.price)} /{' '}
                        {license.billingCycle}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-500">Valid Until · Capacity</p>
                      <p className="font-mono font-semibold text-slate-900 mt-0.5">
                        {license.expiresAt} · {license.maxStudents} seats
                      </p>
                    </div>
                  </div>

                  {license.plans.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Available {license.licensor} License Pricing Tiers
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {license.plans.map((plan) => {
                          const isCurrent = plan.name === license.planName;
                          return (
                            <div
                              key={plan.id}
                              className={`border rounded-lg p-4 space-y-2 ${
                                isCurrent
                                  ? 'border-[#0F3CC9] bg-blue-50/30'
                                  : 'border-slate-200 bg-white'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-slate-900">{plan.name}</span>
                                {isCurrent && (
                                  <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-[#0F3CC9] text-white rounded">
                                    CURRENT
                                  </span>
                                )}
                              </div>
                              <p className="text-lg font-bold font-mono text-slate-900">
                                ₹{new Intl.NumberFormat('en-IN').format(plan.price)}{' '}
                                <span className="text-xs font-normal text-slate-500">
                                  / {plan.billingCycle}
                                </span>
                              </p>
                              <p className="text-[11px] text-slate-600">{plan.description}</p>
                              <ul className="space-y-1 pt-2 border-t border-slate-100">
                                {plan.features.map((f) => (
                                  <li
                                    key={f}
                                    className="text-[11px] text-slate-700 flex items-start gap-1.5"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5 text-[#0F3CC9] shrink-0 mt-0.5" />
                                    <span>{f}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </section>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Exact Reference Modals */}
      <ShareExamModal
        exam={shareModalExam}
        settings={settings}
        questions={questions}
        folder={folders.find((f) => f.id === shareModalExam?.folderId) ?? null}
        onClose={() => setShareModalExam(null)}
        onOpenSharedLanding={(examId) => onOpenSharedExam(examId)}
      />

      <CreateExamFolderModal
        open={createFolderOpen}
        questions={questions}
        students={students}
        onClose={() => setCreateFolderOpen(false)}
        onCreateFolderAndExam={onCreateFolderAndExam}
        onCreatedGoToQuestions={(createdFolder, createdExam) => {
          pushToast(`Exam folder "${createdFolder.name}" created.`);
          if (createdExam) {
            pushToast(`Exam "${createdExam.title}" created successfully!`);
          }
          pushToast(
            `Exam folder "${createdFolder.name}" (Class ${createdFolder.targetClass || '11th'}) created! Now upload or type your questions.`
          );
          setCreateQuestionTargetExamId(createdExam?.id ?? null);
          setCreateQuestionOpen(true);
        }}
      />

      <ExamQuestionsModal
        exam={questionsModalExam}
        allQuestions={questions}
        onClose={() => setQuestionsModalExamId(null)}
        onUpdateExamQuestions={onUpdateExamQuestions}
        onOpenAddQuestionForExam={(ex) => {
          setCreateQuestionTargetExamId(ex.id);
          setCreateQuestionOpen(true);
        }}
        onStartExamPreview={onLaunchExamPreview}
      />

      <CreateQuestionModal
        open={createQuestionOpen}
        exams={exams}
        folders={folders}
        defaultExamId={createQuestionTargetExamId}
        onClose={() => {
          setCreateQuestionOpen(false);
          setCreateQuestionTargetExamId(null);
        }}
        onSaveQuestion={async (q) => {
          await onAddQuestion(q);
          pushToast('Question saved to Question Bank & Exam.');
        }}
        onFinishAndShare={(ex) => setShareModalExam(ex)}
      />

      <BulkImagesModal
        open={bulkImagesOpen}
        exams={exams}
        onClose={() => setBulkImagesOpen(false)}
        onBulkImport={async (items, examId) => {
          await onBulkImportQuestions(items, examId);
          pushToast(`${items.length} image questions saved to Question Bank.`);
        }}
      />

      <ImportPdfModal
        open={importPdfOpen}
        exams={exams}
        onClose={() => setImportPdfOpen(false)}
        onBulkImport={async (items, examId) => {
          await onBulkImportQuestions(items, examId);
          pushToast(`${items.length} questions imported successfully.`);
        }}
      />

      <ConfirmDialog
        open={Boolean(confirmState)}
        title={confirmState?.title ?? ''}
        message={confirmState?.message ?? ''}
        onCancel={() => setConfirmState(null)}
        onConfirm={async () => {
          if (confirmState) {
            await confirmState.onConfirm();
          }
          setConfirmState(null);
        }}
      />

      {/* Bottom-right Toast Stack matching Screenshot */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
          {toasts.map((t) => (
            <div
              key={t.id}
              className="pointer-events-auto bg-[#0F172A] text-white border border-slate-700 rounded-md px-4 py-3 shadow-xl flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-medium leading-snug">{t.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
                className="text-slate-400 hover:text-white shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
