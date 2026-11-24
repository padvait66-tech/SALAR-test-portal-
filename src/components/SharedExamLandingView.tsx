import { useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  FileText,
  GraduationCap,
  Search,
  ShieldCheck,
  UserPlus,
  X,
} from 'lucide-react';
import type {
  ExamPaper,
  InstituteSettings,
  QuestionItem,
  StudentRecord,
  TestFolder,
} from '../types/portal';
import { api, setAuthToken } from '../api/client';

interface SharedExamLandingViewProps {
  exam: ExamPaper;
  folder: TestFolder | null;
  questionCount: number;
  subjects: string[];
  settings: InstituteSettings;
  onBackToHome: () => void;
  onOpenAuthModal: (mode: 'signin' | 'signup') => void;
  onJoinAndStart: (payload: {
    student: StudentRecord;
    exam: ExamPaper;
    questions: QuestionItem[];
  }) => void;
}

export function SharedExamLandingView({
  exam,
  folder,
  questionCount,
  subjects,
  settings,
  onBackToHome,
  onOpenAuthModal,
  onJoinAndStart,
}: SharedExamLandingViewProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [targetClass, setTargetClass] = useState<string>(
    exam.targetClass === 'All' ? '11th' : exam.targetClass
  );
  const [rollNo, setRollNo] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await api.quickJoinExam({
        name,
        phone,
        collegeName,
        targetClass,
        rollNo,
        examId: exam.id,
      });
      setAuthToken(res.token);
      onJoinAndStart({
        student: res.student,
        exam: res.exam,
        questions: res.questions,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to launch examination. Please check details and try again.'
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col text-slate-900">
      <header className="bg-white border-b border-slate-200 px-4 sm:px-8 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBackToHome}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Home</span>
          </button>
          <span className="text-slate-300">|</span>
          <span className="text-sm font-bold text-slate-900 truncate">
            {settings.instituteName}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onOpenAuthModal('signin')}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50"
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => onOpenAuthModal('signup')}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-[#0F3CC9] hover:bg-blue-800 rounded"
          >
            Signup
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Exam Info & Instructions */}
          <div className="lg:col-span-7 space-y-5">
            <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 text-[11px] font-mono font-bold bg-[#0F3CC9] text-white rounded">
                  {exam.code}
                </span>
                <span className="px-2 py-0.5 text-[11px] font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded uppercase">
                  {exam.status} CBT
                </span>
                {folder && (
                  <span className="text-xs font-mono text-slate-500">{folder.name}</span>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {exam.title}
              </h1>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                  <p className="text-[10px] font-mono uppercase text-slate-500">Questions</p>
                  <p className="text-base font-bold font-mono text-slate-900 mt-0.5 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#0F3CC9]" />
                    <span>{questionCount}</span>
                  </p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                  <p className="text-[10px] font-mono uppercase text-slate-500">Duration</p>
                  <p className="text-base font-bold font-mono text-slate-900 mt-0.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#0F3CC9]" />
                    <span>{exam.durationMinutes} min</span>
                  </p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                  <p className="text-[10px] font-mono uppercase text-slate-500">Target</p>
                  <p className="text-base font-bold font-mono text-slate-900 mt-0.5 flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-[#0F3CC9]" />
                    <span>{exam.targetClass}</span>
                  </p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                  <p className="text-[10px] font-mono uppercase text-slate-500">Marking</p>
                  <p className="text-base font-bold font-mono text-slate-900 mt-0.5">
                    +{exam.marksPositive} / {exam.marksNegative}
                  </p>
                </div>
              </div>

              {subjects.length > 0 && (
                <p className="text-xs text-slate-600">
                  Subjects covered:{' '}
                  <span className="font-semibold text-slate-900">{subjects.join(', ')}</span>
                </p>
              )}
            </section>

            <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <ShieldCheck className="w-4 h-4 text-[#0F3CC9]" />
                <span>Candidate Instructions</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-600 leading-relaxed">
                {exam.instructions.map((inst, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="font-mono text-[#0F3CC9] font-bold">•</span>
                    <span>{inst}</span>
                  </li>
                ))}
                <li className="flex items-start gap-2">
                  <span className="font-mono text-[#0F3CC9] font-bold">•</span>
                  <span>
                    Do not refresh or switch tabs during the live Computer Based Test. Tab switches
                    are logged for faculty review.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono text-[#0F3CC9] font-bold">•</span>
                  <span>
                    Upon submission, you can immediately view your official scorecard, accuracy
                    breakdown, and step-by-step KaTeX solutions.
                  </span>
                </li>
              </ul>
            </section>
          </div>

          {/* Right Column: Quick Join Registration Card */}
          <div className="lg:col-span-5">
            <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
              <div className="bg-[#0F3CC9] p-4 sm:p-5 text-white">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-blue-200" />
                  <h2 className="text-base font-bold tracking-tight">Quick Join Registration</h2>
                </div>
                <p className="text-[11px] text-blue-100 mt-1">
                  Enter details to start your allocated examination immediately.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-3.5 text-xs">
                {error && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded">
                    {error}
                  </div>
                )}

                <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded flex items-center justify-between text-[11px]">
                  <span className="text-slate-600">Assigned Paper:</span>
                  <span className="font-bold text-[#0F3CC9]">
                    Class {exam.targetClass} · {questionCount} Questions
                  </span>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    1. Candidate Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter candidate name (e.g. Rahul Sharma)"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    2. Mobile / WhatsApp Number (10 digits) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="98XXXXXXXX"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded font-mono text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    3. College / School Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={collegeName}
                    onChange={(e) => setCollegeName(e.target.value)}
                    placeholder="Enter junior college or school name"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">4. Target Class</label>
                    <select
                      value={targetClass}
                      onChange={(e) => setTargetClass(e.target.value)}
                      className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded text-slate-900"
                    >
                      <option value="11th">Class 11th</option>
                      <option value="12th">Class 12th</option>
                      <option value="MHT-CET">MHT-CET</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      5. Roll No (Optional)
                    </label>
                    <input
                      type="text"
                      value={rollNo}
                      onChange={(e) => setRollNo(e.target.value)}
                      placeholder="Auto-generated"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded font-mono text-slate-900"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 bg-[#0F3CC9] hover:bg-blue-800 text-white font-semibold rounded flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <span>{submitting ? 'Registering & Launching...' : 'Join & Start'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Standalone Quick Join Modal (used from Landing Page / Public Exam Cards)
interface QuickJoinModalProps {
  exam: ExamPaper | null;
  onClose: () => void;
  onJoinAndStart: (payload: {
    student: StudentRecord;
    exam: ExamPaper;
    questions: QuestionItem[];
  }) => void;
}

export function QuickJoinModal({ exam, onClose, onJoinAndStart }: QuickJoinModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [targetClass, setTargetClass] = useState('11th');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!exam) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await api.quickJoinExam({
        name,
        phone,
        collegeName: collegeName || 'Open Candidate',
        targetClass,
        examId: exam.id,
      });
      setAuthToken(res.token);
      onClose();
      onJoinAndStart({
        student: res.student,
        exam: res.exam,
        questions: res.questions,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start exam.');
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-[1px] flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white border border-slate-200 rounded-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#0F3CC9] px-5 py-4 text-white flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold">Quick Join — {exam.code}</h2>
            <p className="text-[11px] text-blue-100 mt-0.5 truncate max-w-xs">{exam.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Quick Join modal"
            className="p-1 text-blue-100 hover:text-white rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded">
              {error}
            </div>
          )}
          <div>
            <label className="block font-bold text-slate-800 mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter candidate full name"
              className="w-full px-3 py-2 border border-slate-300 rounded text-slate-900"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              Mobile Number (10 digits) *
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="98XXXXXXXX"
              className="w-full px-3 py-2 border border-slate-300 rounded font-mono text-slate-900"
            />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block font-bold text-slate-800 mb-1">College / School *</label>
              <input
                type="text"
                required
                value={collegeName}
                onChange={(e) => setCollegeName(e.target.value)}
                placeholder="School / College"
                className="w-full px-3 py-2 border border-slate-300 rounded text-slate-900"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-800 mb-1">Target Class</label>
              <select
                value={targetClass}
                onChange={(e) => setTargetClass(e.target.value)}
                className="w-full px-2.5 py-2 border border-slate-300 rounded bg-white text-slate-900"
              >
                <option value="11th">Class 11th</option>
                <option value="12th">Class 12th</option>
                <option value="MHT-CET">MHT-CET</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#0F3CC9] hover:bg-blue-800 rounded flex items-center gap-1.5 disabled:opacity-60"
            >
              <span>{submitting ? 'Starting...' : 'Join & Start'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface SharedExamNotFoundViewProps {
  requestedExamId: string;
  liveExams: ExamPaper[];
  settings: InstituteSettings;
  onSearchExamCode: (codeOrId: string) => void;
  onBackToHome: () => void;
}

export function SharedExamNotFoundView({
  requestedExamId,
  liveExams,
  settings,
  onSearchExamCode,
  onBackToHome,
}: SharedExamNotFoundViewProps) {
  const [lookupCode, setLookupCode] = useState(requestedExamId);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!lookupCode.trim()) return;
    onSearchExamCode(lookupCode.trim());
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col text-slate-900">
      <header className="bg-white border-b border-slate-200 px-4 sm:px-8 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBackToHome}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Home</span>
          </button>
          <span className="text-slate-300">|</span>
          <span className="text-sm font-bold text-slate-900 truncate">
            {settings.instituteName}
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-10 space-y-6">
        <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-4">
          <p className="text-[11px] font-mono uppercase tracking-wider text-rose-600 font-semibold">
            // SHARED EXAM LINK LOOKUP
          </p>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Examination &ldquo;{requestedExamId}&rdquo; could not be located
          </h1>
          <p className="text-xs text-slate-600 leading-relaxed">
            The exam link may use an outdated code, or the paper was created in another local
            session without a self-hydrating payload. Enter an active Exam Code below or select one
            of our live Computer-Based Tests.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 pt-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={lookupCode}
                onChange={(e) => setLookupCode(e.target.value)}
                placeholder="Enter Exam Code (e.g. GC-PHYS-101)"
                className="w-full pl-9 pr-3 py-2 text-xs font-mono border border-slate-300 rounded bg-white text-slate-900"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-[#0F3CC9] hover:bg-blue-800 rounded shrink-0"
            >
              Find Exam →
            </button>
          </form>
        </section>

        {liveExams.length > 0 && (
          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
              AVAILABLE LIVE EXAMINATIONS ({liveExams.length})
            </h2>
            <div className="space-y-2">
              {liveExams.map((ex) => (
                <div
                  key={ex.id}
                  className="border border-slate-200 rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{ex.title}</span>
                      <span className="px-2 py-0.5 text-[10px] font-mono font-semibold text-[#0F3CC9] bg-blue-50 border border-blue-200 rounded">
                        {ex.code}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {ex.subject || 'PCM'} · Class {ex.targetClass} · {ex.questionIds.length} Qs ·{' '}
                      {ex.durationMinutes} min
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSearchExamCode(ex.code || ex.id)}
                    className="px-3.5 py-2 text-xs font-semibold text-white bg-[#0F3CC9] hover:bg-blue-800 rounded shrink-0"
                  >
                    Open Test →
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

