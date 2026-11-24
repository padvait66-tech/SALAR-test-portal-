import { useCallback, useEffect, useState } from 'react';
import type {
  AppView,
  ExamAttempt,
  ExamPaper,
  PaymentRecord,
  QuestionItem,
  StudentRecord,
  StudyMaterial,
  TestFolder,
} from './types/portal';
import {
  INITIAL_BATCHES,
  INITIAL_COURSES,
  INITIAL_SETTINGS,
  INITIAL_TEST_SERIES,
} from './data/seedPortalData';
import {
  api,
  setAuthToken,
  type AdminWorkspaceResponse,
  type OwnerWorkspaceResponse,
  type PublicBootstrapResponse,
  type StudentWorkspaceResponse,
} from './api/client';
import { LandingView } from './components/LandingView';
import { LoginView } from './components/LoginView';
import { AuthModal } from './components/AuthModal';
import { StudentPortalView } from './components/StudentPortalView';
import { AdminPortalView } from './components/AdminPortalView';
import { OwnerLoginView, OwnerPortalView } from './components/OwnerPortalView';
import { ExamRunnerView } from './components/ExamRunnerView';
import { ResultScorecardView } from './components/ResultScorecardView';
import {
  QuickJoinModal,
  SharedExamLandingView,
  SharedExamNotFoundView,
} from './components/SharedExamLandingView';
import { ShareExamModal } from './components/ShareExamModal';
import { UpiCheckoutModal } from './components/UpiCheckoutModal';
import { decodeHydratedBundle, parseRouteFromLocation } from './utils/shareLinks';

interface SharedExamState {
  exam: ExamPaper;
  folder: TestFolder | null;
  questionCount: number;
  subjects: string[];
}

export default function App() {
  const [view, setView] = useState<AppView>('landing');
  const [returnRole, setReturnRole] = useState<'student' | 'admin'>('student');
  const [sessionRole, setSessionRole] = useState<'none' | 'student' | 'admin' | 'owner'>('none');

  const [publicData, setPublicData] = useState<PublicBootstrapResponse>({
    settings: INITIAL_SETTINGS,
    courses: INITIAL_COURSES,
    testSeries: INITIAL_TEST_SERIES,
    batches: INITIAL_BATCHES,
    folders: [],
    liveExams: [],
    stats: { examCount: 0, questionCount: 0 },
  });
  const [bootLoading, setBootLoading] = useState(true);
  const [bootError, setBootError] = useState('');

  const [studentWorkspace, setStudentWorkspace] = useState<StudentWorkspaceResponse | null>(null);
  const [adminWorkspace, setAdminWorkspace] = useState<AdminWorkspaceResponse | null>(null);
  const [ownerWorkspace, setOwnerWorkspace] = useState<OwnerWorkspaceResponse | null>(null);

  const [sharedExamData, setSharedExamData] = useState<SharedExamState | null>(null);
  const [sharedExamNotFoundId, setSharedExamNotFoundId] = useState<string | null>(null);
  const [quickJoinExam, setQuickJoinExam] = useState<ExamPaper | null>(null);
  const [shareExamTarget, setShareExamTarget] = useState<ExamPaper | null>(null);

  const [authModalState, setAuthModalState] = useState<{
    open: boolean;
    role: 'student' | 'admin';
    studentMode: 'signin' | 'signup';
  }>({ open: false, role: 'student', studentMode: 'signin' });

  const [activeExam, setActiveExam] = useState<ExamPaper | null>(null);
  const [runnerQuestions, setRunnerQuestions] = useState<QuestionItem[]>([]);
  const [runnerStudent, setRunnerStudent] = useState<StudentRecord | null>(null);

  const [activeAttempt, setActiveAttempt] = useState<ExamAttempt | null>(null);
  const [justSubmittedAttemptId, setJustSubmittedAttemptId] = useState<string | null>(null);
  const [solutionExam, setSolutionExam] = useState<ExamPaper | null>(null);
  const [solutionQuestions, setSolutionQuestions] = useState<QuestionItem[]>([]);

  const [checkoutItem, setCheckoutItem] = useState<{
    name: string;
    type: PaymentRecord['itemType'];
    amount: number;
  } | null>(null);

  const refreshPublic = useCallback(async () => {
    const data = await api.getPublicBootstrap();
    setPublicData(data);
  }, []);

  const refreshStudentWorkspace = useCallback(async (studentId?: string) => {
    const ws = await api.getStudentWorkspace(studentId);
    setStudentWorkspace(ws);
    return ws;
  }, []);

  const refreshAdminWorkspace = useCallback(async () => {
    const ws = await api.getAdminWorkspace();
    setAdminWorkspace(ws);
    return ws;
  }, []);

  const refreshOwnerWorkspace = useCallback(async () => {
    const ws = await api.getOwnerWorkspace();
    setOwnerWorkspace(ws);
    return ws;
  }, []);

  const openSharedExamById = useCallback(
    async (examId: string, autoQuickJoin = false, hydrateToken?: string) => {
      setSharedExamNotFoundId(null);
      try {
        const res = await api.getPublicExam(examId);
        setSharedExamData({
          exam: res.exam,
          folder: res.folder,
          questionCount: res.questionCount,
          subjects: res.subjects,
        });
        setView('shared-exam');
        if (autoQuickJoin) {
          setQuickJoinExam(res.exam);
        }
        return;
      } catch {
        // Fallback: if URL contains a self-hydrating payload, import into DB and open cleanly
        if (hydrateToken) {
          const bundle = await decodeHydratedBundle(hydrateToken);
          if (bundle) {
            try {
              const hydrated = await api.hydratePublicExam(bundle);
              setSharedExamData({
                exam: hydrated.exam,
                folder: hydrated.folder,
                questionCount: hydrated.questionCount,
                subjects: hydrated.subjects,
              });
              setView('shared-exam');
              if (autoQuickJoin) {
                setQuickJoinExam(hydrated.exam);
              }
              void refreshPublic().catch(() => undefined);
              return;
            } catch {
              // Fall through to Not Found lookup view
            }
          }
        }
        setSharedExamData(null);
        setSharedExamNotFoundId(examId);
        setView('shared-exam');
      }
    },
    [refreshPublic]
  );

  const openPublicScorecard = useCallback(async (attemptId: string) => {
    try {
      const res = await api.getPublicScorecard(attemptId);
      setActiveAttempt(res.attempt);
      setSolutionExam(res.exam);
      setSolutionQuestions(res.questions);
      setView('parent-scorecard');
    } catch {
      setView('landing');
    }
  }, []);

  // Initial bootstrap + universal URL/hash route hydration
  useEffect(() => {
    let active = true;

    async function handleCurrentRoute() {
      const parsed = parseRouteFromLocation();
      if (parsed.type === 'scorecard') {
        await openPublicScorecard(parsed.id);
      } else if (parsed.type === 'exam') {
        await openSharedExamById(parsed.id, parsed.autoQuickJoin, parsed.hydrateToken);
      } else if (parsed.type === 'owner-login') {
        setView('owner-login');
      }
    }

    async function init() {
      try {
        const boot = await api.getPublicBootstrap();
        if (!active) return;
        setPublicData(boot);
        await handleCurrentRoute();
      } catch (err) {
        if (active) {
          setBootError(err instanceof Error ? err.message : 'Unable to reach portal server.');
        }
      } finally {
        if (active) setBootLoading(false);
      }
    }

    void init();

    const handleRouteChange = () => {
      void handleCurrentRoute();
    };

    window.addEventListener('hashchange', handleRouteChange);
    window.addEventListener('popstate', handleRouteChange);

    // Silent keyboard shortcut (Ctrl+Shift+O / Cmd+Shift+O) opens hidden Owner Console login
    const handleSecretKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        setView('owner-login');
      }
    };
    window.addEventListener('keydown', handleSecretKey);

    return () => {
      active = false;
      window.removeEventListener('hashchange', handleRouteChange);
      window.removeEventListener('popstate', handleRouteChange);
      window.removeEventListener('keydown', handleSecretKey);
    };
  }, [openPublicScorecard, openSharedExamById]);

  const currentSettings =
    adminWorkspace?.settings ?? studentWorkspace?.settings ?? publicData.settings;
  const currentLicense =
    adminWorkspace?.license ?? studentWorkspace?.license ?? publicData.license;

  const handleAuthenticatedStudent = async (student: StudentRecord) => {
    setSessionRole('student');
    setReturnRole('student');
    setRunnerStudent(student);
    await refreshStudentWorkspace(student.id);
    setView('student');
  };

  const handleAuthenticatedAdmin = async () => {
    setSessionRole('admin');
    setReturnRole('admin');
    await refreshAdminWorkspace();
    setView('admin');
  };

  const handleAuthenticatedOwner = async () => {
    setSessionRole('owner');
    await refreshOwnerWorkspace();
    setView('owner');
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      // Ignore network errors on sign out
    }
    setAuthToken('');
    setSessionRole('none');
    setStudentWorkspace(null);
    setAdminWorkspace(null);
    setOwnerWorkspace(null);
    setActiveExam(null);
    setRunnerQuestions([]);
    setRunnerStudent(null);
    if (
      window.location.search.includes('owner=') ||
      /^\/owner\/?$/i.test(window.location.pathname) ||
      window.location.hash.toLowerCase() === '#owner'
    ) {
      window.history.replaceState(null, '', '/');
    }
    setView('landing');
  };

  const handleStartExamFromStudent = async (exam: ExamPaper) => {
    const res = await api.getExamQuestionsForRunner(exam.id);
    const activeStud = studentWorkspace?.student ?? runnerStudent ?? adminWorkspace?.students[0] ?? null;
    if (!activeStud) return;
    setActiveExam(res.exam);
    setRunnerQuestions(res.questions);
    setRunnerStudent(activeStud);
    setReturnRole(sessionRole === 'admin' ? 'admin' : 'student');
    setView('exam-runner');
  };

  const handleLaunchExamPreviewFromAdmin = async (exam: ExamPaper) => {
    const res = await api.getExamQuestionsForRunner(exam.id);
    const previewStudent = adminWorkspace?.students[0] ?? {
      id: 'student-preview',
      rollNo: 'PREVIEW',
      username: 'admin-preview',
      name: 'Faculty Preview Candidate',
      batchId: '',
      batchName: 'Preview',
      targetExam: exam.targetClass,
      phone: '',
      email: currentSettings.email,
      joinedDate: new Date().toISOString().slice(0, 10),
    };
    setActiveExam(res.exam);
    setRunnerQuestions(res.questions);
    setRunnerStudent(previewStudent);
    setReturnRole('admin');
    setView('exam-runner');
  };

  const handleQuickJoinStart = (payload: {
    student: StudentRecord;
    exam: ExamPaper;
    questions: QuestionItem[];
  }) => {
    setSessionRole('student');
    setReturnRole('student');
    setQuickJoinExam(null);
    setActiveExam(payload.exam);
    setRunnerQuestions(payload.questions);
    setRunnerStudent(payload.student);
    void refreshStudentWorkspace(payload.student.id).catch(() => undefined);
    setView('exam-runner');
  };

  const handleSubmitExamResponses = async (payload: {
    answers: Record<string, string>;
    markedForReview: string[];
    tabSwitches: number;
    timeTakenMinutes: number;
  }) => {
    if (!activeExam || !runnerStudent) return;
    const res = await api.submitAttempt({
      examId: activeExam.id,
      studentId: sessionRole === 'admin' ? runnerStudent.id : undefined,
      answers: payload.answers,
      markedForReview: payload.markedForReview,
      tabSwitches: payload.tabSwitches,
      timeTakenMinutes: payload.timeTakenMinutes,
    });
    setActiveAttempt(res.attempt);
    setJustSubmittedAttemptId(res.attempt.id);
    setSolutionExam(res.exam);
    setSolutionQuestions(res.questions);
    if (sessionRole === 'admin') {
      await refreshAdminWorkspace();
    } else if (sessionRole === 'student') {
      await refreshStudentWorkspace(runnerStudent.id);
    }
    setView('result-view');
  };

  const handleViewAttemptSolutions = async (attempt: ExamAttempt, role: 'student' | 'admin') => {
    const res = await api.getAttemptSolutions(attempt.id);
    setJustSubmittedAttemptId(null);
    setActiveAttempt(res.attempt);
    setSolutionExam(res.exam);
    setSolutionQuestions(res.questions);
    setReturnRole(role);
    setView('result-view');
  };

  const handleDownloadMaterial = (material: StudyMaterial) => {
    void api
      .recordMaterialDownload(material.id)
      .then(({ material: updated }) => {
        setStudentWorkspace((prev) =>
          prev
            ? {
                ...prev,
                materials: prev.materials.map((m) => (m.id === updated.id ? updated : m)),
              }
            : prev
        );
        setAdminWorkspace((prev) =>
          prev
            ? {
                ...prev,
                materials: prev.materials.map((m) => (m.id === updated.id ? updated : m)),
              }
            : prev
        );
      })
      .catch(() => undefined);

    const content = `${currentSettings.instituteName}\n${material.title}\nSubject: ${material.subject} | Type: ${material.materialType} | Topic: ${material.topic}\nAuthor: ${material.uploadedBy}\n\n${material.description}\n\n--- Study Notes ---\n${material.contentSummary}\n`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${material.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSubmitPayment = async (payload: {
    itemName: string;
    itemType: PaymentRecord['itemType'];
    amount: number;
    utr: string;
    paymentMode: PaymentRecord['paymentMode'];
    studentName: string;
    rollNo: string;
  }) => {
    const { payment } = await api.submitPayment(payload);
    setStudentWorkspace((prev) =>
      prev ? { ...prev, payments: [payment, ...prev.payments] } : prev
    );
    setAdminWorkspace((prev) =>
      prev ? { ...prev, payments: [payment, ...prev.payments] } : prev
    );
  };

  if (bootLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-md px-6 py-5 text-center space-y-2">
          <div className="w-8 h-8 rounded bg-[#0F3CC9] text-white font-bold text-sm flex items-center justify-center mx-auto">
            G
          </div>
          <p className="text-sm font-semibold text-slate-900">Loading Gurukul Classes Portal...</p>
          <p className="text-xs text-slate-500">Connecting to examination database</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {bootError && view === 'landing' && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-2 text-xs text-rose-700 text-center">
          {bootError}
        </div>
      )}

      {view === 'landing' && (
        <LandingView
          settings={currentSettings}
          courses={publicData.courses}
          testSeries={publicData.testSeries}
          liveExams={publicData.liveExams}
          examCount={publicData.stats.examCount}
          questionCount={publicData.stats.questionCount}
          license={currentLicense}
          onOpenLogin={() => setView('login')}
          onOpenAuthModal={(role, mode = 'signin') =>
            setAuthModalState({ open: true, role, studentMode: mode })
          }
          onOpenQuickJoin={(exam) => setQuickJoinExam(exam)}
          onOpenSharedExam={(examId) => {
            window.history.replaceState(null, '', `/?exam=${encodeURIComponent(examId)}`);
            void openSharedExamById(examId, false);
          }}
          onStartCheckout={(item) => setCheckoutItem(item)}
          onSecretOwnerTrigger={() => setView('owner-login')}
        />
      )}

      {view === 'shared-exam' && sharedExamData && (
        <SharedExamLandingView
          exam={sharedExamData.exam}
          folder={sharedExamData.folder}
          questionCount={sharedExamData.questionCount}
          subjects={sharedExamData.subjects}
          settings={currentSettings}
          onBackToHome={() => {
            window.history.replaceState(null, '', '/');
            setSharedExamData(null);
            setSharedExamNotFoundId(null);
            setView('landing');
          }}
          onOpenAuthModal={(mode) =>
            setAuthModalState({ open: true, role: 'student', studentMode: mode })
          }
          onJoinAndStart={handleQuickJoinStart}
        />
      )}

      {view === 'shared-exam' && !sharedExamData && sharedExamNotFoundId && (
        <SharedExamNotFoundView
          requestedExamId={sharedExamNotFoundId}
          liveExams={publicData.liveExams}
          settings={currentSettings}
          onSearchExamCode={(codeOrId) => {
            window.history.replaceState(null, '', `/?exam=${encodeURIComponent(codeOrId)}`);
            void openSharedExamById(codeOrId, false);
          }}
          onBackToHome={() => {
            window.history.replaceState(null, '', '/');
            setSharedExamNotFoundId(null);
            setView('landing');
          }}
        />
      )}

      {view === 'login' && (
        <LoginView
          settings={currentSettings}
          batches={publicData.batches}
          license={currentLicense}
          onBackToHome={() => setView('landing')}
          onLoginStudent={(student) => void handleAuthenticatedStudent(student)}
          onLoginAdmin={() => void handleAuthenticatedAdmin()}
        />
      )}

      {view === 'owner-login' && (
        <OwnerLoginView
          settings={currentSettings}
          onBackToPortal={() => {
            window.history.replaceState(null, '', '/');
            setView('landing');
          }}
          onAuthenticatedOwner={handleAuthenticatedOwner}
        />
      )}

      {view === 'owner' && ownerWorkspace && (
        <OwnerPortalView
          workspace={ownerWorkspace}
          onRefresh={async () => {
            await refreshOwnerWorkspace();
            await refreshPublic();
          }}
          onOpenClientPortal={() => {
            window.history.replaceState(null, '', '/');
            void refreshPublic();
            setView('landing');
          }}
          onLogout={handleLogout}
        />
      )}

      {view === 'student' && studentWorkspace && (
        <StudentPortalView
          settings={studentWorkspace.settings}
          student={studentWorkspace.student}
          exams={studentWorkspace.exams}
          folders={studentWorkspace.folders}
          attempts={studentWorkspace.attempts}
          announcements={studentWorkspace.announcements}
          materials={studentWorkspace.materials}
          courses={studentWorkspace.courses}
          testSeries={studentWorkspace.testSeries}
          payments={studentWorkspace.payments}
          isAdminSession={sessionRole === 'admin'}
          onStartExam={(exam) => void handleStartExamFromStudent(exam)}
          onViewResult={(attempt) => void handleViewAttemptSolutions(attempt, 'student')}
          onDownloadMaterial={handleDownloadMaterial}
          onStartCheckout={(item) => setCheckoutItem(item)}
          onUpdateProfile={async (payload) => {
            const { student } = await api.updateStudentProfile(payload);
            setStudentWorkspace((prev) => (prev ? { ...prev, student } : prev));
          }}
          onShareExam={(exam) => setShareExamTarget(exam)}
          onSwitchToAdmin={
            sessionRole === 'admin'
              ? async () => {
                  await refreshAdminWorkspace();
                  setReturnRole('admin');
                  setView('admin');
                }
              : undefined
          }
          onLogout={() => void handleLogout()}
        />
      )}

      {view === 'admin' && adminWorkspace && (
        <AdminPortalView
          settings={adminWorkspace.settings}
          students={adminWorkspace.students}
          teachers={adminWorkspace.teachers}
          batches={adminWorkspace.batches}
          folders={adminWorkspace.folders}
          questions={adminWorkspace.questions}
          exams={adminWorkspace.exams}
          attempts={adminWorkspace.attempts}
          attendance={adminWorkspace.attendance}
          materials={adminWorkspace.materials}
          announcements={adminWorkspace.announcements}
          courses={adminWorkspace.courses}
          testSeries={adminWorkspace.testSeries}
          payments={adminWorkspace.payments}
          license={adminWorkspace.license ?? publicData.license}
          onRefreshWorkspace={async () => {
            await refreshAdminWorkspace();
          }}
          onUpdateSettings={async (next) => {
            const { settings } = await api.updateSettings(next);
            setAdminWorkspace((prev) => (prev ? { ...prev, settings } : prev));
            await refreshPublic();
          }}
          onChangePasscode={async (currentPasscode, newPasscode) => {
            await api.changeAdminPasscode(currentPasscode, newPasscode);
          }}
          onAddStudent={async (student) => {
            await api.addStudent(student);
            await refreshAdminWorkspace();
          }}
          onDeleteStudent={async (id) => {
            await api.deleteStudent(id);
            await refreshAdminWorkspace();
          }}
          onAddTeacher={async (teacher) => {
            await api.addTeacher(teacher);
            await refreshAdminWorkspace();
          }}
          onDeleteTeacher={async (id) => {
            await api.deleteTeacher(id);
            await refreshAdminWorkspace();
          }}
          onAddBatch={async (batch) => {
            await api.addBatch(batch);
            await refreshAdminWorkspace();
            await refreshPublic();
          }}
          onCreateFolderAndExam={async ({ folder, createExam }) => {
            const { folder: createdFolder } = await api.addFolder(folder);
            let createdExam: ExamPaper | null = null;
            if (createExam && createExam.title) {
              const resolvedClass =
                createExam.targetClass ??
                (createdFolder.targetClass === '12th' ||
                createdFolder.targetClass === 'MHT-CET' ||
                createdFolder.targetClass === 'All'
                  ? createdFolder.targetClass
                  : '11th');
              const res = await api.createExam({
                ...createExam,
                folderId: createdFolder.id,
                subject: createExam.subject ?? (createdFolder.subject as ExamPaper['subject']) ?? 'PCM',
                targetClass: resolvedClass,
              });
              createdExam = res.exam;
            }
            await refreshAdminWorkspace();
            await refreshPublic();
            return { folder: createdFolder, exam: createdExam };
          }}
          onDeleteFolder={async (id) => {
            await api.deleteFolder(id);
            await refreshAdminWorkspace();
            await refreshPublic();
          }}
          onAddQuestion={async (q) => {
            await api.addQuestion(q);
            await refreshAdminWorkspace();
            await refreshPublic();
          }}
          onBulkImportQuestions={async (items, attachToExamId) => {
            await api.bulkImportQuestions(items, attachToExamId);
            await refreshAdminWorkspace();
            await refreshPublic();
          }}
          onDeleteQuestion={async (id) => {
            await api.deleteQuestion(id);
            await refreshAdminWorkspace();
            await refreshPublic();
          }}
          onCreateExam={async (exam) => {
            await api.createExam(exam);
            await refreshAdminWorkspace();
            await refreshPublic();
          }}
          onUpdateExamQuestions={async (examId, questionIds) => {
            await api.updateExam(examId, { questionIds });
            await refreshAdminWorkspace();
            await refreshPublic();
          }}
          onToggleExamStatus={async (id) => {
            await api.toggleExamStatus(id);
            await refreshAdminWorkspace();
            await refreshPublic();
          }}
          onDeleteExam={async (id) => {
            await api.deleteExam(id);
            await refreshAdminWorkspace();
            await refreshPublic();
          }}
          onSaveAttendance={async (rec) => {
            await api.saveAttendance(rec);
            await refreshAdminWorkspace();
          }}
          onAddMaterial={async (mat) => {
            await api.addMaterial(mat);
            await refreshAdminWorkspace();
          }}
          onDownloadMaterial={handleDownloadMaterial}
          onAddAnnouncement={async (ann) => {
            await api.addAnnouncement(ann);
            await refreshAdminWorkspace();
          }}
          onViewAttemptResult={(att) => void handleViewAttemptSolutions(att, 'admin')}
          onDeleteAttempt={async (id) => {
            await api.deleteAttempt(id);
            await refreshAdminWorkspace();
          }}
          onApplyScoreAdjustment={async (attemptId, adjustment, note) => {
            await api.evaluateAttempt(attemptId, adjustment, note);
            await refreshAdminWorkspace();
          }}
          onUpdatePaymentStatus={async (id, status) => {
            await api.updatePaymentStatus(id, status);
            await refreshAdminWorkspace();
          }}
          onDeletePayment={async (id) => {
            await api.deletePayment(id);
            await refreshAdminWorkspace();
          }}
          onRestoreDemoPayments={async () => {
            await api.restoreDemoPayments();
            await refreshAdminWorkspace();
          }}
          onAddCourse={async (c) => {
            await api.addCourse(c);
            await refreshAdminWorkspace();
            await refreshPublic();
          }}
          onDeleteCourse={async (id) => {
            await api.deleteCourse(id);
            await refreshAdminWorkspace();
            await refreshPublic();
          }}
          onAddTestSeries={async (ts) => {
            await api.addTestSeries(ts);
            await refreshAdminWorkspace();
            await refreshPublic();
          }}
          onDeleteTestSeries={async (id) => {
            await api.deleteTestSeries(id);
            await refreshAdminWorkspace();
            await refreshPublic();
          }}
          onLaunchExamPreview={(exam) => void handleLaunchExamPreviewFromAdmin(exam)}
          onOpenSharedExam={(examId) => {
            window.history.replaceState(null, '', `/?exam=${encodeURIComponent(examId)}`);
            void openSharedExamById(examId, false);
          }}
          onSwitchToStudent={async () => {
            const targetId = adminWorkspace.students[0]?.id;
            await refreshStudentWorkspace(targetId);
            setReturnRole('student');
            setView('student');
          }}
          onLogout={() => void handleLogout()}
        />
      )}

      {view === 'exam-runner' && activeExam && runnerStudent && (
        <ExamRunnerView
          exam={activeExam}
          questions={runnerQuestions}
          student={runnerStudent}
          onCancel={() => {
            if (sessionRole === 'none') {
              setView('landing');
            } else {
              setView(returnRole);
            }
          }}
          onSubmitResponses={handleSubmitExamResponses}
        />
      )}

      {(view === 'result-view' || view === 'parent-scorecard') && activeAttempt && (
        <ResultScorecardView
          attempt={activeAttempt}
          exam={
            solutionExam ??
            adminWorkspace?.exams.find((e) => e.id === activeAttempt.examId) ??
            studentWorkspace?.exams.find((e) => e.id === activeAttempt.examId)
          }
          questions={solutionQuestions}
          settings={currentSettings}
          isParentView={view === 'parent-scorecard'}
          justSubmitted={activeAttempt.id === justSubmittedAttemptId}
          onBack={() => {
            setJustSubmittedAttemptId(null);
            if (view === 'parent-scorecard') {
              window.history.replaceState(null, '', window.location.pathname);
              if (sessionRole === 'admin') {
                setView('admin');
              } else if (sessionRole === 'student') {
                setView('student');
              } else {
                setView('landing');
              }
            } else {
              setView(returnRole);
            }
          }}
          onOpenParentMode={() => setView('parent-scorecard')}
        />
      )}

      <AuthModal
        open={authModalState.open}
        initialRole={authModalState.role}
        initialStudentMode={authModalState.studentMode}
        settings={currentSettings}
        batches={publicData.batches}
        onClose={() => setAuthModalState((prev) => ({ ...prev, open: false }))}
        onAuthenticatedStudent={(student) => void handleAuthenticatedStudent(student)}
        onAuthenticatedAdmin={() => void handleAuthenticatedAdmin()}
      />

      <QuickJoinModal
        exam={quickJoinExam}
        onClose={() => setQuickJoinExam(null)}
        onJoinAndStart={handleQuickJoinStart}
      />

      <ShareExamModal
        exam={shareExamTarget}
        settings={currentSettings}
        questions={adminWorkspace?.questions ?? []}
        folder={
          adminWorkspace?.folders.find((f) => f.id === shareExamTarget?.folderId) ??
          publicData.folders.find((f) => f.id === shareExamTarget?.folderId) ??
          null
        }
        onClose={() => setShareExamTarget(null)}
        onOpenSharedLanding={(examId) => {
          window.history.replaceState(null, '', `/?exam=${encodeURIComponent(examId)}`);
          void openSharedExamById(examId, false);
        }}
      />

      <UpiCheckoutModal
        item={checkoutItem}
        settings={currentSettings}
        activeStudent={view === 'student' ? (studentWorkspace?.student ?? null) : null}
        onClose={() => setCheckoutItem(null)}
        onSubmitPayment={(payload) => void handleSubmitPayment(payload)}
      />
    </>
  );
}
