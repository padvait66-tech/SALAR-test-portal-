import { useEffect, useMemo, useRef, useState } from 'react';
import { Clock, AlertTriangle, CheckCircle2, Bookmark } from 'lucide-react';
import type { ExamPaper, QuestionItem, StudentRecord } from '../types/portal';
import { MathText } from './MathText';

interface ExamRunnerViewProps {
  exam: ExamPaper;
  questions: QuestionItem[];
  student: StudentRecord;
  onCancel: () => void;
  onSubmitResponses: (payload: {
    answers: Record<string, string>;
    markedForReview: string[];
    tabSwitches: number;
    timeTakenMinutes: number;
  }) => Promise<void> | void;
}

export function ExamRunnerView({
  exam,
  questions,
  student,
  onCancel,
  onSubmitResponses,
}: ExamRunnerViewProps) {
  const examQuestions = useMemo(
    () =>
      exam.questionIds
        .map((id) => questions.find((q) => q.id === id))
        .filter((q): q is QuestionItem => Boolean(q)),
    [exam.questionIds, questions]
  );

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [visitedIds, setVisitedIds] = useState<Record<string, boolean>>(() =>
    examQuestions[0] ? { [examQuestions[0].id]: true } : {}
  );
  const [markedIds, setMarkedIds] = useState<Record<string, boolean>>({});
  const [secondsLeft, setSecondsLeft] = useState(exam.durationMinutes * 60);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const submittedRef = useRef(false);

  const currentQuestion = examQuestions[currentIdx];

  useEffect(() => {
    if (!currentQuestion) return;
    setVisitedIds((prev) => ({ ...prev, [currentQuestion.id]: true }));
  }, [currentQuestion]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        setTabSwitches((prev) => prev + 1);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const finalizeSubmit = async () => {
    if (submittedRef.current || submitting) return;
    submittedRef.current = true;
    setSubmitting(true);
    setSubmitError('');

    const elapsedSeconds = Math.max(60, exam.durationMinutes * 60 - secondsLeft);
    try {
      await onSubmitResponses({
        answers,
        markedForReview: Object.keys(markedIds).filter((k) => markedIds[k]),
        tabSwitches,
        timeTakenMinutes: Math.max(1, Math.round(elapsedSeconds / 60)),
      });
    } catch (err) {
      submittedRef.current = false;
      setSubmitting(false);
      setSubmitError(err instanceof Error ? err.message : 'Unable to submit exam. Please retry.');
    }
  };

  useEffect(() => {
    if (secondsLeft <= 0) {
      void finalizeSubmit();
      return;
    }
    const timer = window.setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [secondsLeft]);

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const formattedTime = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const answeredCount = examQuestions.filter((q) => Boolean(answers[q.id]?.trim())).length;
  const markedCount = examQuestions.filter((q) => Boolean(markedIds[q.id])).length;

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-xl p-8 max-w-md text-center space-y-4">
          <p className="text-base font-semibold text-slate-900">
            This examination has no assigned questions yet.
          </p>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-800 rounded-lg"
          >
            Return to Portal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* NTA CBT Top Bar */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-mono text-slate-500">
            {exam.code} · {student.name} ({student.rollNo})
          </p>
          <h1 className="text-base sm:text-lg font-semibold text-slate-900">{exam.title}</h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-slate-600 tabular-nums">
            <AlertTriangle
              className={`w-4 h-4 ${tabSwitches > 0 ? 'text-amber-600' : 'text-slate-400'}`}
            />
            <span>
              Tab switches: {tabSwitches}/{exam.allowedTabSwitches ?? 30}
            </span>
          </div>

          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono text-sm font-semibold tabular-nums ${
              secondsLeft < 300
                ? 'border-rose-300 bg-rose-50 text-rose-800'
                : 'border-slate-200 bg-slate-50 text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>{formattedTime}</span>
          </div>

          <button
            type="button"
            onClick={() => setShowConfirmModal(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors whitespace-nowrap"
          >
            Submit Exam
          </button>
        </div>
      </header>

      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Question Area */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl flex flex-col justify-between min-h-[520px]">
          <div>
            <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-slate-50">
              <div className="text-xs font-mono text-slate-600 tabular-nums">
                Question {currentIdx + 1} of {examQuestions.length} · {currentQuestion.subject} ·{' '}
                {currentQuestion.topic}
              </div>
              <div className="text-xs font-mono text-slate-700 tabular-nums">
                Marking: +{currentQuestion.marksPositive} /{' '}
                {currentQuestion.type === 'numerical' ? '0' : currentQuestion.marksNegative}
              </div>
            </div>

            <div className="p-6 space-y-6">
              {currentQuestion.questionText && (
                <div className="text-base sm:text-lg text-slate-900 leading-relaxed font-medium">
                  <MathText text={currentQuestion.questionText} />
                </div>
              )}
              {currentQuestion.imageDataUrl && (
                <div className="border border-slate-200 rounded-lg p-2 bg-white inline-block max-w-full">
                  <img
                    src={currentQuestion.imageDataUrl}
                    alt={`Question ${currentIdx + 1}`}
                    className="max-h-96 w-auto object-contain rounded"
                  />
                </div>
              )}

              {currentQuestion.type === 'single_choice' ? (
                <div className="space-y-3">
                  {currentQuestion.options.map((opt) => {
                    const isSelected = answers[currentQuestion.id] === opt.label;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          setAnswers((prev) => ({ ...prev, [currentQuestion.id]: opt.label }))
                        }
                        className={`w-full flex items-center gap-3.5 text-left px-4 py-3.5 rounded-lg border transition-colors ${
                          isSelected
                            ? 'border-blue-800 bg-blue-50/70 text-slate-900'
                            : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                        }`}
                      >
                        <span
                          className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-mono font-semibold shrink-0 ${
                            isSelected
                              ? 'bg-blue-800 text-white'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {opt.label}
                        </span>
                        <span className="text-sm sm:text-base">
                          <MathText text={opt.text} />
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="max-w-sm space-y-2">
                  <label
                    htmlFor="numerical-input"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Enter Numerical Value (integer or decimal)
                  </label>
                  <input
                    id="numerical-input"
                    type="text"
                    inputMode="decimal"
                    value={answers[currentQuestion.id] ?? ''}
                    onChange={(e) =>
                      setAnswers((prev) => ({ ...prev, [currentQuestion.id]: e.target.value }))
                    }
                    placeholder="e.g. 21.33"
                    className="w-full px-4 py-3 text-base font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-800"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Bottom Controls */}
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setMarkedIds((prev) => ({ ...prev, [currentQuestion.id]: true }));
                  if (currentIdx < examQuestions.length - 1) setCurrentIdx((i) => i + 1);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100"
              >
                <Bookmark className="w-3.5 h-3.5" />
                Mark for Review &amp; Next
              </button>
              <button
                type="button"
                onClick={() =>
                  setAnswers((prev) => {
                    const next = { ...prev };
                    delete next[currentQuestion.id];
                    return next;
                  })
                }
                className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100"
              >
                Clear Response
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => {
                  if (currentIdx < examQuestions.length - 1) {
                    setCurrentIdx((i) => i + 1);
                  } else {
                    setShowConfirmModal(true);
                  }
                }}
                className="px-4 py-2 text-xs font-medium text-white bg-blue-800 rounded-lg hover:bg-blue-900"
              >
                {currentIdx < examQuestions.length - 1 ? 'Save & Next' : 'Review & Submit'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Sidebar Question Palette */}
        <aside className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Question Palette</h2>
            <p className="text-xs text-slate-500 mt-0.5 font-mono tabular-nums">
              {answeredCount} answered · {markedCount} marked ·{' '}
              {examQuestions.length - answeredCount} remaining
            </p>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {examQuestions.map((q, idx) => {
              const isAnswered = Boolean(answers[q.id]?.trim());
              const isMarked = Boolean(markedIds[q.id]);
              const isVisited = Boolean(visitedIds[q.id]);
              const isCurrent = idx === currentIdx;

              let style = 'bg-slate-100 text-slate-700 border-slate-200';
              if (isMarked) {
                style = 'bg-amber-100 text-amber-900 border-amber-300';
              } else if (isAnswered) {
                style = 'bg-emerald-700 text-white border-emerald-700';
              } else if (isVisited) {
                style = 'bg-rose-50 text-rose-800 border-rose-200';
              }

              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setCurrentIdx(idx)}
                  className={`h-10 rounded-lg border text-xs font-mono font-semibold tabular-nums transition-colors ${style} ${
                    isCurrent ? 'ring-2 ring-blue-800 ring-offset-1' : ''
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <div className="pt-4 border-t border-slate-200 grid grid-cols-2 gap-2 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded bg-emerald-700 inline-block" />
              <span>Answered</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded bg-rose-100 border border-rose-300 inline-block" />
              <span>Not Answered</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded bg-amber-100 border border-amber-300 inline-block" />
              <span>Marked Review</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded bg-slate-100 border border-slate-300 inline-block" />
              <span>Not Visited</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="w-full py-2 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            Exit Exam Without Submitting
          </button>
        </aside>
      </div>

      {/* Confirm Submit Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Submit Examination?</h3>
                <p className="text-sm text-slate-600 mt-1">
                  You have answered{' '}
                  <span className="font-mono font-semibold text-slate-900">{answeredCount}</span>{' '}
                  out of{' '}
                  <span className="font-mono font-semibold text-slate-900">
                    {examQuestions.length}
                  </span>{' '}
                  questions.
                </p>
              </div>
            </div>

            {submitError && (
              <p className="text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                {submitError}
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50"
              >
                Continue Test
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void finalizeSubmit()}
                className="px-5 py-2 text-sm font-medium text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 disabled:opacity-60"
              >
                {submitting ? 'Submitting...' : 'Confirm Final Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
