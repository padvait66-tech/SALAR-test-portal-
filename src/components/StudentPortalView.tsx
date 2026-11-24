import { useMemo, useState, type FormEvent } from 'react';
import {
  ArrowRight,
  Award,
  Bell,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Download,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  Search,
  Share2,
  Target,
  Trophy,
  User,
  X,
} from 'lucide-react';
import type {
  Announcement,
  CoursePackage,
  ExamAttempt,
  ExamPaper,
  InstituteSettings,
  PaymentRecord,
  StudentRecord,
  StudyMaterial,
  TestFolder,
  TestSeriesPackage,
} from '../types/portal';

// Exact 6-item sidebar matching reference Student Portal:
// Dashboard, Exams, Courses, Test Series, My Purchases, Profile
type StudentTab = 'dashboard' | 'exams' | 'courses' | 'test-series' | 'purchases' | 'profile';

interface StudentPortalViewProps {
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
  isAdminSession?: boolean;
  onStartExam: (exam: ExamPaper) => void;
  onViewResult: (attempt: ExamAttempt) => void;
  onDownloadMaterial: (material: StudyMaterial) => void;
  onStartCheckout: (item: { name: string; type: PaymentRecord['itemType']; amount: number }) => void;
  onUpdateProfile: (payload: { name: string; phone: string; targetExam: string }) => Promise<void>;
  onShareExam: (exam: ExamPaper) => void;
  onSwitchToAdmin?: () => void;
  onLogout: () => void;
}

export function StudentPortalView({
  settings,
  student,
  exams,
  folders,
  attempts,
  announcements,
  materials,
  courses,
  testSeries,
  payments,
  isAdminSession = false,
  onStartExam,
  onViewResult,
  onDownloadMaterial,
  onStartCheckout,
  onUpdateProfile,
  onShareExam,
  onSwitchToAdmin,
  onLogout,
}: StudentPortalViewProps) {
  const [activeTab, setActiveTab] = useState<StudentTab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Exam filters
  const [examSearch, setExamSearch] = useState('');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [folderFilter, setFolderFilter] = useState<string>('all');

  // Material subject filter (displayed cleanly inside Dashboard / Exams study section)
  const [materialSubject, setMaterialSubject] = useState<string>('All');

  // Profile form state
  const [profileName, setProfileName] = useState(student.name);
  const [profilePhone, setProfilePhone] = useState(student.phone);
  const [profileTarget, setProfileTarget] = useState(student.targetExam);
  const [profileSaved, setProfileSaved] = useState(false);

  const liveExams = useMemo(() => exams.filter((e) => e.status === 'Live'), [exams]);

  const studentAttempts = useMemo(
    () => attempts.filter((a) => a.studentId === student.id || a.rollNo === student.rollNo),
    [attempts, student.id, student.rollNo]
  );

  const studentPayments = useMemo(
    () =>
      payments.filter(
        (p) => p.studentId === student.id || p.rollNo.toLowerCase() === student.rollNo.toLowerCase()
      ),
    [payments, student.id, student.rollNo]
  );

  const filteredExams = useMemo(() => {
    return liveExams.filter((e) => {
      const matchesClass =
        classFilter === 'all' || e.targetClass === classFilter || e.targetClass === 'All';
      const examSubj = e.subject || 'PCM';
      const matchesSubject = subjectFilter === 'all' || examSubj === subjectFilter;
      const matchesFolder = folderFilter === 'all' || e.folderId === folderFilter;
      const q = examSearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        e.title.toLowerCase().includes(q) ||
        e.code.toLowerCase().includes(q) ||
        examSubj.toLowerCase().includes(q);
      return matchesClass && matchesSubject && matchesFolder && matchesSearch;
    });
  }, [liveExams, classFilter, subjectFilter, folderFilter, examSearch]);

  const filteredMaterials = useMemo(() => {
    if (materialSubject === 'All') return materials;
    return materials.filter((m) => m.subject === materialSubject);
  }, [materials, materialSubject]);

  const avgAccuracy = useMemo(() => {
    if (studentAttempts.length === 0) return 0;
    const sum = studentAttempts.reduce((acc, a) => acc + a.accuracy, 0);
    return Math.round(sum / studentAttempts.length);
  }, [studentAttempts]);

  const avgScore = useMemo(() => {
    if (studentAttempts.length === 0) return 0;
    const sum = studentAttempts.reduce((acc, a) => acc + a.score + a.manualAdjustment, 0);
    return Math.round(sum / studentAttempts.length);
  }, [studentAttempts]);

  const totalCorrect = useMemo(
    () => studentAttempts.reduce((acc, a) => acc + a.correctCount, 0),
    [studentAttempts]
  );

  const navItems: { id: StudentTab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'exams', label: 'Exams', icon: FileText },
    { id: 'courses', label: 'Courses', icon: BookOpen },
    { id: 'test-series', label: 'Test Series', icon: Award },
    { id: 'purchases', label: 'My Purchases', icon: Receipt },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const handleSaveProfile = async (event: FormEvent) => {
    event.preventDefault();
    await onUpdateProfile({
      name: profileName.trim() || student.name,
      phone: profilePhone.trim() || student.phone,
      targetExam: profileTarget.trim() || student.targetExam,
    });
    setProfileSaved(true);
    window.setTimeout(() => setProfileSaved(false), 2500);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-900">
      {/* Crisp White Sidebar matching Reference */}
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
              Student Portal
            </p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
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
                {isActive && <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-90" />}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-200 space-y-2">
          <div className="px-1">
            <p className="text-[11px] font-mono text-slate-600 truncate">
              {student.email || student.username || student.rollNo}
            </p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 rounded hover:bg-slate-100"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>

          {isAdminSession && onSwitchToAdmin && (
            <div className="flex items-center justify-between gap-2 pt-1 px-1">
              <span className="text-[11px] text-slate-500">Portal View:</span>
              <div className="inline-flex items-center gap-0.5 p-0.5 bg-slate-100 rounded">
                <button
                  type="button"
                  onClick={onSwitchToAdmin}
                  className="px-2 py-1 text-[11px] font-medium rounded text-slate-600 hover:text-slate-900"
                >
                  Admin
                </button>
                <button
                  type="button"
                  className="px-2 py-1 text-[11px] font-medium rounded bg-blue-50 text-[#0F3CC9]"
                >
                  Student
                </button>
              </div>
            </div>
          )}
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
            <nav className="flex-1 p-3 space-y-0.5">
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
            <div className="p-3 border-t border-slate-200 flex items-center justify-between">
              {isAdminSession && onSwitchToAdmin && (
                <button
                  type="button"
                  onClick={onSwitchToAdmin}
                  className="px-3 py-1.5 text-xs font-medium bg-slate-100 rounded text-slate-700"
                >
                  Admin View
                </button>
              )}
              <button
                type="button"
                onClick={onLogout}
                className="px-3 py-1.5 text-xs font-medium text-slate-600"
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
          <button type="button" onClick={onLogout} className="text-xs font-medium text-slate-600">
            Sign Out
          </button>
        </header>

        <main className="flex-1 p-5 sm:p-8 max-w-[1280px] w-full mx-auto space-y-6">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div>
                <p className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#0F3CC9]">
                  // WELCOME BACK
                </p>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                  Hello, {student.name}.
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Enrollment #{student.rollNo} • {student.batchName} • Ready for today&apos;s mock tests.
                </p>
              </div>

              {/* 4 Stat Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <GraduationCap className="w-4 h-4 text-[#0F3CC9]" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      EXAMS TAKEN
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900 tabular-nums mt-3">
                    {studentAttempts.length}
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      AVG SCORE
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900 tabular-nums mt-3">
                    {avgScore}
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <Target className="w-4 h-4 text-indigo-600" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      ACCURACY
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900 tabular-nums mt-3">
                    {avgAccuracy}%
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <BookOpen className="w-4 h-4 text-[#0F3CC9]" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      CORRECT
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900 tabular-nums mt-3">
                    {totalCorrect}
                  </p>
                </div>
              </div>

              {/* Asymmetric Middle Grid: Available Exams (left 8 cols) + Recent Submissions (right 4 cols) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                <section className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                        AVAILABLE EXAMINATIONS ({liveExams.length})
                      </h2>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Computer-Based Tests assigned to your curriculum
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('exams')}
                      className="text-xs font-semibold text-[#0F3CC9] hover:underline shrink-0"
                    >
                      View All →
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {liveExams.slice(0, 6).map((exam) => {
                      const prevAttempt = studentAttempts.find((a) => a.examId === exam.id);
                      const maxMarks = exam.questionIds.length * (exam.marksPositive || 4);
                      return (
                        <div
                          key={exam.id}
                          className="border border-slate-200 rounded-lg px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 transition-colors"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-bold text-slate-900">{exam.title}</p>
                              <span className="px-2 py-0.5 text-[10px] font-mono font-semibold text-[#0F3CC9] bg-blue-50 border border-blue-200 rounded">
                                {exam.code}
                              </span>
                              <span className="px-2 py-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded">
                                Class {exam.targetClass}
                              </span>
                              {exam.subject && (
                                <span className="px-2 py-0.5 text-[10px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 rounded">
                                  {exam.subject}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-1 tabular-nums">
                              {exam.durationMinutes} min • {maxMarks} Marks •{' '}
                              {prevAttempt
                                ? `Score: ${prevAttempt.score + prevAttempt.manualAdjustment}/${prevAttempt.maxScore}`
                                : 'Not Attempted'}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => onStartExam(exam)}
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0F3CC9] rounded-md hover:bg-blue-800 shrink-0"
                          >
                            <span>{prevAttempt ? 'Retake Exam' : 'Start Exam'}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                  <div>
                    <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                      RECENT SUBMISSIONS ({studentAttempts.length})
                    </h2>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Performance history &amp; scores
                    </p>
                  </div>

                  {studentAttempts.length === 0 ? (
                    <div className="border border-dashed border-slate-200 rounded-lg p-5 text-center text-xs text-slate-500">
                      No exam attempts recorded yet.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {studentAttempts.slice(0, 5).map((att) => {
                        const finalScore = att.score + att.manualAdjustment;
                        return (
                          <div
                            key={att.id}
                            className="border border-slate-200 rounded-lg p-3.5 space-y-1.5"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs font-bold text-slate-900 truncate">
                                {att.examTitle}
                              </p>
                              <span className="text-xs font-bold font-mono text-emerald-600 tabular-nums shrink-0">
                                {finalScore}/{att.maxScore}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-slate-500">
                              <span>Accuracy: {att.accuracy}%</span>
                              <span className="font-mono">{att.submittedAt.slice(0, 10)}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => onViewResult(att)}
                              className="text-[11px] font-semibold text-[#0F3CC9] hover:underline inline-flex items-center gap-1 pt-0.5"
                            >
                              <span>View Solutions &amp; Analysis →</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>

              {/* Bottom 2-Column Equal Grid: Announcements + Study Materials */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
                <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-3.5">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-slate-700" />
                    <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                      INSTITUTE ANNOUNCEMENTS ({announcements.length})
                    </h2>
                  </div>

                  <div className="space-y-2.5">
                    {announcements.slice(0, 4).map((ann) => (
                      <div key={ann.id} className="border border-slate-200 rounded-lg p-3.5 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-xs font-bold text-slate-900">{ann.title}</h3>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded shrink-0 ${
                              ann.priority === 'Urgent'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : ann.priority === 'High'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-blue-50 text-[#0F3CC9] border border-blue-200'
                            }`}
                          >
                            {ann.priority}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">{ann.message}</p>
                        <p className="text-[10px] font-mono text-slate-400 pt-0.5">
                          {ann.audience} • {ann.postedAt}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-700" />
                      <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                        STUDY MATERIALS &amp; FORMULA SHEETS ({filteredMaterials.length})
                      </h2>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {['All', 'Physics', 'Chemistry', 'Mathematics'].map((subj) => (
                        <button
                          key={subj}
                          type="button"
                          onClick={() => setMaterialSubject(subj)}
                          className={`px-2 py-0.5 text-[10px] font-semibold rounded border ${
                            materialSubject === subj
                              ? 'bg-[#0F3CC9] text-white border-[#0F3CC9]'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {subj}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {filteredMaterials.map((mat) => (
                      <div
                        key={mat.id}
                        className="border border-slate-200 rounded-lg p-3.5 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">{mat.title}</p>
                          <p className="text-[11px] font-mono text-slate-500 mt-0.5 truncate">
                            {mat.subject} • {mat.topic} • {mat.materialType}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onDownloadMaterial(mat)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-md hover:bg-slate-100 shrink-0"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          )}

          {activeTab === 'exams' && (
            <div className="space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Examinations</h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Showing {filteredExams.length} live papers organized by class &amp; folder
                  </p>
                </div>
                <div className="relative w-full md:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={examSearch}
                    onChange={(e) => setExamSearch(e.target.value)}
                    placeholder="Search test name or code..."
                    className="w-full pl-9 pr-3.5 py-2 text-xs bg-white border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded">
                    {[
                      { id: 'all', label: 'All Subjects' },
                      { id: 'Physics', label: 'Physics' },
                      { id: 'Chemistry', label: 'Chemistry' },
                      { id: 'Mathematics', label: 'Mathematics' },
                      { id: 'PCM', label: 'PCM Mock' },
                    ].map((sub) => (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => setSubjectFilter(sub.id)}
                        className={`px-3 py-1.5 text-xs font-medium rounded ${
                          subjectFilter === sub.id ? 'bg-[#0F3CC9] text-white shadow-xs' : 'text-slate-600'
                        }`}
                      >
                        {sub.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded">
                    {[
                      { id: 'all', label: 'All Classes' },
                      { id: '11th', label: 'Class 11th' },
                      { id: '12th', label: 'Class 12th' },
                      { id: 'MHT-CET', label: 'MHT-CET' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setClassFilter(tab.id)}
                        className={`px-3 py-1.5 text-xs font-medium rounded ${
                          classFilter === tab.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                <select
                  value={folderFilter}
                  onChange={(e) => setFolderFilter(e.target.value)}
                  className="px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded text-slate-700"
                >
                  <option value="all">All Folders</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredExams.map((exam) => {
                  const prevAttempt = studentAttempts.find((a) => a.examId === exam.id);
                  const folderName =
                    folders.find((f) => f.id === exam.folderId)?.name ?? 'General';
                  return (
                    <article
                      key={exam.id}
                      className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between gap-4"
                    >
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-mono text-slate-500 tabular-nums">
                          {exam.code} · {exam.subject || 'PCM'} · {folderName} · Class{' '}
                          {exam.targetClass} · {exam.questionIds.length} Qs · {exam.durationMinutes} min
                        </p>
                        <h2 className="text-base font-bold text-slate-900">{exam.title}</h2>
                        <p className="text-xs text-slate-600">
                          Marking: +{exam.marksPositive} / {exam.marksNegative}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
                        <span className="text-xs font-mono text-slate-600 tabular-nums">
                          {prevAttempt
                            ? `Last: ${prevAttempt.score + prevAttempt.manualAdjustment}/${prevAttempt.maxScore}`
                            : 'Not Attempted'}
                        </span>
                        <div className="flex items-center gap-2">
                          {prevAttempt && (
                            <button
                              type="button"
                              onClick={() => onViewResult(prevAttempt)}
                              className="px-2.5 py-1.5 text-xs font-medium text-[#0F3CC9] bg-blue-50 border border-blue-200 rounded"
                            >
                              Solutions
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onShareExam(exam)}
                            className="p-1.5 text-slate-500 border border-slate-200 rounded hover:bg-slate-50"
                            title="Share Exam Link & QR"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onStartExam(exam)}
                            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#0F3CC9] rounded hover:bg-blue-800"
                          >
                            {prevAttempt ? 'Retake' : 'Start Exam'}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'courses' && (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Courses</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enroll in structured classroom &amp; digital programs via UPI / Bank Transfer.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {courses
                  .filter((c) => c.status === 'LIVE')
                  .map((course) => (
                    <article
                      key={course.id}
                      className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between gap-4"
                    >
                      <div className="space-y-2">
                        <p className="text-[11px] font-mono text-slate-500">
                          {course.subjectTag} · {course.duration}
                        </p>
                        <h2 className="text-base font-bold text-slate-900">{course.title}</h2>
                        <p className="text-xs text-slate-600">{course.description}</p>
                      </div>
                      <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                        <span className="text-base font-bold font-mono text-slate-900 tabular-nums">
                          ₹{new Intl.NumberFormat('en-IN').format(course.price)}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            onStartCheckout({
                              name: course.title,
                              type: 'Course',
                              amount: course.price,
                            })
                          }
                          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#0F3CC9] rounded hover:bg-blue-800"
                        >
                          Enroll Now
                        </button>
                      </div>
                    </article>
                  ))}
              </div>
            </div>
          )}

          {activeTab === 'test-series' && (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Test Series</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Subscribe to curated mock test packs with NTA CBT interface &amp; KaTeX solutions.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {testSeries
                  .filter((t) => t.status === 'Active')
                  .map((series) => (
                    <article
                      key={series.id}
                      className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between gap-4"
                    >
                      <div className="space-y-2">
                        <p className="text-[11px] font-mono text-slate-500 tabular-nums">
                          {series.category} · {series.mockCount} Mocks
                        </p>
                        <h2 className="text-base font-bold text-slate-900">{series.title}</h2>
                        <p className="text-xs text-slate-600">{series.subtitle}</p>
                      </div>
                      <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                        <span className="text-base font-bold font-mono text-slate-900 tabular-nums">
                          ₹{new Intl.NumberFormat('en-IN').format(series.price)}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            onStartCheckout({
                              name: series.title,
                              type: 'Test Series',
                              amount: series.price,
                            })
                          }
                          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#0F3CC9] rounded hover:bg-blue-800"
                        >
                          Subscribe
                        </button>
                      </div>
                    </article>
                  ))}
              </div>
            </div>
          )}

          {activeTab === 'purchases' && (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">My Purchases</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  All submitted UPI and Bank Transfer enrollments with verification status.
                </p>
              </div>

              {studentPayments.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-lg p-8 text-center space-y-3">
                  <p className="text-xs text-slate-600">No purchases submitted yet.</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('courses')}
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#0F3CC9] rounded"
                  >
                    Browse Courses
                  </button>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600 uppercase tracking-wider text-[10px]">
                        <th className="py-3 px-4">Item</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Amount</th>
                        <th className="py-3 px-4">UTR / Ref</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {studentPayments.map((p) => (
                        <tr key={p.id}>
                          <td className="py-3 px-4 font-semibold text-slate-900">{p.itemName}</td>
                          <td className="py-3 px-4 text-slate-600">{p.itemType}</td>
                          <td className="py-3 px-4 font-mono tabular-nums text-slate-900">
                            ₹{new Intl.NumberFormat('en-IN').format(p.amount)}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600">{p.utr}</td>
                          <td className="py-3 px-4 font-mono text-slate-500">{p.submittedAt}</td>
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="max-w-xl space-y-5">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Student Profile</h1>
                <p className="text-xs text-slate-500 mt-0.5 font-mono">
                  Roll No: {student.rollNo} · Batch: {student.batchName}
                </p>
              </div>

              <form
                onSubmit={handleSaveProfile}
                className="bg-white border border-slate-200 rounded-lg p-6 space-y-4 text-xs"
              >
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mobile Number</label>
                  <input
                    type="tel"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Exam</label>
                  <input
                    type="text"
                    value={profileTarget}
                    onChange={(e) => setProfileTarget(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  {profileSaved ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                      <CheckCircle2 className="w-4 h-4" />
                      Profile saved to database.
                    </span>
                  ) : (
                    <span />
                  )}
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#0F3CC9] rounded hover:bg-blue-800"
                  >
                    Save Profile
                  </button>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
