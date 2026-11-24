import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileText,
  GraduationCap,
  Share2,
  Sparkles,
  X,
} from 'lucide-react';
import type { ExamAttempt, ExamPaper, InstituteSettings, QuestionItem } from '../types/portal';
import { MathText } from './MathText';

interface ResultScorecardViewProps {
  attempt: ExamAttempt;
  exam?: ExamPaper;
  questions: QuestionItem[];
  settings: InstituteSettings;
  isParentView?: boolean;
  justSubmitted?: boolean;
  onBack: () => void;
  onOpenParentMode?: () => void;
}

type QuestionFilter = 'all' | 'incorrect' | 'skipped' | 'correct';

const CONFETTI_PIECES = [
  { left: '16%', top: '8%', bg: '#3B82F6', rot: '18deg' },
  { left: '24%', top: '14%', bg: '#10B981', rot: '-25deg' },
  { left: '31%', top: '6%', bg: '#F59E0B', rot: '42deg' },
  { left: '38%', top: '17%', bg: '#EC4899', rot: '-12deg' },
  { left: '44%', top: '9%', bg: '#8B5CF6', rot: '30deg' },
  { left: '51%', top: '15%', bg: '#06B6D4', rot: '-35deg' },
  { left: '57%', top: '7%', bg: '#F43F5E', rot: '22deg' },
  { left: '63%', top: '13%', bg: '#10B981', rot: '-18deg' },
  { left: '69%', top: '8%', bg: '#3B82F6', rot: '45deg' },
  { left: '76%', top: '16%', bg: '#F59E0B', rot: '-28deg' },
  { left: '28%', top: '23%', bg: '#A855F7', rot: '15deg' },
  { left: '49%', top: '24%', bg: '#EF4444', rot: '-40deg' },
  { left: '61%', top: '22%', bg: '#22C55E', rot: '33deg' },
  { left: '72%', top: '26%', bg: '#0EA5E9', rot: '-15deg' },
];

export function ResultScorecardView({
  attempt,
  exam,
  questions,
  settings,
  isParentView = false,
  justSubmitted = false,
  onBack,
  onOpenParentMode,
}: ResultScorecardViewProps) {
  const [filter, setFilter] = useState<QuestionFilter>('all');
  const [showConfetti, setShowConfetti] = useState(justSubmitted);
  const [showToast, setShowToast] = useState(justSubmitted);
  const [copiedNotice, setCopiedNotice] = useState(false);

  useEffect(() => {
    setShowConfetti(justSubmitted);
    setShowToast(justSubmitted);
    if (!justSubmitted) return;
    const t1 = window.setTimeout(() => setShowConfetti(false), 4500);
    const t2 = window.setTimeout(() => setShowToast(false), 7000);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [attempt.id, justSubmitted]);

  const attemptQuestions = useMemo(() => {
    const list = exam?.questionIds.length
      ? exam.questionIds.map((id) => questions.find((q) => q.id === id))
      : Object.keys(attempt.answers).map((id) => questions.find((q) => q.id === id));
    return list.filter((q): q is QuestionItem => Boolean(q));
  }, [exam, questions, attempt.answers]);

  const finalScore = attempt.score + attempt.manualAdjustment;
  const scorePercent =
    attempt.maxScore > 0 ? Math.max(0, Math.round((finalScore / attempt.maxScore) * 100)) : 0;

  const evaluatedItems = useMemo(() => {
    return attemptQuestions.map((q, index) => {
      const selected = attempt.answers[q.id];
      const isSkipped = selected === undefined || selected === '';
      const isCorrect =
        !isSkipped &&
        (q.type === 'numerical'
          ? Math.abs(parseFloat(selected) - parseFloat(q.correctAnswer)) <= 0.05
          : selected.trim().toUpperCase() === q.correctAnswer.trim().toUpperCase());
      const status: 'correct' | 'incorrect' | 'skipped' = isSkipped
        ? 'skipped'
        : isCorrect
        ? 'correct'
        : 'incorrect';
      const marksEarned = isSkipped
        ? 0
        : isCorrect
        ? q.marksPositive
        : q.type === 'numerical'
        ? 0
        : q.marksNegative;

      return { q, index, selected, status, marksEarned };
    });
  }, [attemptQuestions, attempt.answers]);

  const correctItems = evaluatedItems.filter((i) => i.status === 'correct');
  const incorrectItems = evaluatedItems.filter((i) => i.status === 'incorrect');
  const skippedItems = evaluatedItems.filter((i) => i.status === 'skipped');

  const positiveMarks = correctItems.reduce((sum, i) => sum + i.marksEarned, 0);
  const negativeMarksAbs = Math.abs(incorrectItems.reduce((sum, i) => sum + i.marksEarned, 0));
  const attemptedCount = correctItems.length + incorrectItems.length;

  const avgSecsPerQuestion =
    attemptQuestions.length > 0
      ? Math.max(1, Math.round((Math.max(1, attempt.timeTakenMinutes) * 60) / attemptQuestions.length))
      : 0;

  // Compute deterministic projected rank & percentile band based on aggregate percentage
  const percentile = Math.min(99, Math.max(45, Math.round(62 + scorePercent * 0.37)));
  const projectedRank =
    scorePercent >= 85
      ? 1
      : scorePercent >= 65
      ? 2
      : scorePercent >= 40
      ? 3
      : 4;
  const airBand =
    scorePercent >= 85
      ? 'Top 1,200'
      : scorePercent >= 65
      ? 'AIR 2,500 - 6,500'
      : scorePercent >= 40
      ? 'AIR 7,000 - 16,000'
      : 'AIR 18,000 - 35,000';

  const topicBreakdown = useMemo(() => {
    const map = new Map<string, { label: string; total: number; correct: number }>();
    evaluatedItems.forEach((item) => {
      const key = item.q.topic?.trim() || exam?.title || item.q.subject;
      const entry = map.get(key) ?? { label: key, total: 0, correct: 0 };
      entry.total += 1;
      if (item.status === 'correct') entry.correct += 1;
      map.set(key, entry);
    });
    if (map.size === 0) {
      map.set(attempt.examTitle, {
        label: attempt.examTitle,
        total: attemptQuestions.length || 4,
        correct: attempt.correctCount,
      });
    }
    return Array.from(map.values()).map((t) => {
      const acc = t.total > 0 ? Math.round((t.correct / t.total) * 100) : 0;
      return { ...t, accuracy: acc };
    });
  }, [evaluatedItems, exam, attempt.examTitle, attempt.correctCount, attemptQuestions.length]);

  const filteredItems = useMemo(() => {
    if (filter === 'all') return evaluatedItems;
    return evaluatedItems.filter((item) => item.status === filter);
  }, [evaluatedItems, filter]);

  const handleDownloadOfflinePaper = () => {
    const escapeHtml = (s: string) =>
      s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const rowsHtml = evaluatedItems
      .map(({ q, index, selected, status }) => {
        const optsHtml =
          q.options.length > 0
            ? `<ul style="list-style:none;padding:0;margin:8px 0;">${q.options
                .map((opt, idx) => {
                  const letter = opt.id || String.fromCharCode(65 + idx);
                  const isKey = letter === q.correctAnswer.trim().toUpperCase();
                  return `<li style="padding:4px 8px;margin:3px 0;border:1px solid ${
                    isKey ? '#10b981' : '#e2e8f0'
                  };background:${isKey ? '#ecfdf5' : '#fff'};border-radius:6px;"><strong>${escapeHtml(
                    letter
                  )}.</strong> ${escapeHtml(opt.text)}</li>`;
                })
                .join('')}</ul>`
            : '';

        return `<div style="border:1px solid #e2e8f0;border-radius:10px;padding:14px;margin-bottom:14px;background:#fff;">
          <div style="font-size:12px;color:#64748b;font-family:monospace;margin-bottom:6px;">
            Q${index + 1}. [${escapeHtml(q.code)}] • ${escapeHtml(q.topic)} — <strong>${status.toUpperCase()}</strong>
          </div>
          ${q.questionText ? `<div style="font-size:14px;font-weight:600;margin-bottom:8px;">${escapeHtml(q.questionText)}</div>` : ''}
          ${q.imageDataUrl ? `<div style="margin-bottom:8px;"><img src="${q.imageDataUrl}" style="max-width:100%;max-height:280px;border:1px solid #e2e8f0;border-radius:6px;" /></div>` : ''}
          ${optsHtml}
          <div style="font-size:12px;margin-top:8px;">
            Your Answer: <strong>${escapeHtml(selected ?? 'Skipped')}</strong> &nbsp;|&nbsp;
            Official Answer: <strong style="color:#059669;">${escapeHtml(q.correctAnswer)}</strong>
          </div>
          <div style="font-size:12px;color:#334155;background:#f8fafc;padding:8px 10px;border-radius:6px;margin-top:8px;">
            <strong>Solution:</strong> ${escapeHtml(q.explanation)}
          </div>
        </div>`;
      })
      .join('');

    const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(attempt.examTitle)} — Offline Paper &amp; Solutions</title>
</head>
<body style="font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;color:#0f172a;max-width:860px;margin:24px auto;padding:0 16px;">
  <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:18px;">
    <div style="font-size:11px;font-family:monospace;color:#0f3cc9;text-transform:uppercase;">${escapeHtml(
      settings.instituteName
    )} — Official CBT Scorecard</div>
    <h1 style="margin:6px 0 4px;font-size:22px;">${escapeHtml(attempt.examTitle)}</h1>
    <p style="margin:0;font-size:13px;color:#475569;">Code: ${escapeHtml(attempt.examCode)} • Candidate: ${escapeHtml(
      attempt.studentName
    )} (${escapeHtml(attempt.rollNo)}) • Score: <strong>${finalScore}/${attempt.maxScore}</strong> (${scorePercent}%)</p>
  </div>
  ${rowsHtml}
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${attempt.examCode.toLowerCase()}-paper-and-solutions.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyParentLink = () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}#scorecard=${attempt.id}`;
    navigator.clipboard?.writeText(shareUrl);
    setCopiedNotice(true);
    window.setTimeout(() => setCopiedNotice(false), 2500);
  };

  const whatsappText = encodeURIComponent(
    `${settings.instituteName} Official CBT Scorecard\nExam: ${attempt.examTitle} (${attempt.examCode})\nCandidate: ${attempt.studentName} (${attempt.rollNo})\nScore: ${finalScore}/${attempt.maxScore} (${scorePercent}%)\nAccuracy: ${attempt.accuracy}%`
  );
  const whatsappUrl = `https://wa.me/?text=${whatsappText}`;

  return (
    <div className="min-h-screen bg-[#F8FAFC] relative overflow-x-hidden">
      {/* Subtle Celebration Confetti on fresh submission */}
      {showConfetti && (
        <div
          aria-hidden="true"
          className="no-print pointer-events-none fixed inset-x-0 top-0 h-72 overflow-hidden z-40"
        >
          {CONFETTI_PIECES.map((piece, idx) => (
            <span
              key={idx}
              style={{
                left: piece.left,
                top: piece.top,
                backgroundColor: piece.bg,
                transform: `rotate(${piece.rot})`,
              }}
              className="absolute w-2.5 h-1.5 rounded-[1px] opacity-85 animate-pulse"
            />
          ))}
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-5 relative z-10">
        {/* Card 1: Official CBT Scorecard Overview */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-7 space-y-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex items-start gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-[#0F3CC9] text-white flex items-center justify-center shrink-0">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-[#0F3CC9] bg-blue-50 border border-blue-200 rounded">
                    // OFFICIAL CBT SCORECARD
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full">
                    <CheckCircle2 className="w-3 h-3" />
                    EVALUATED
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1.5 truncate">
                  {attempt.examTitle}
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Code: <span className="font-mono">{attempt.examCode}</span> • Candidate:{' '}
                  <span className="font-semibold text-slate-700">{attempt.studentName}</span> (
                  <span className="font-mono">{attempt.rollNo}</span>)
                </p>
              </div>
            </div>

            {/* Action Buttons matching Screenshot 2 */}
            <div className="no-print flex flex-col sm:items-end gap-2 shrink-0">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0F3CC9] rounded-lg hover:bg-blue-800"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Exam Paper (PDF)</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadOfflinePaper}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Offline Paper &amp; Solutions</span>
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {!isParentView && (
                  <button
                    type="button"
                    onClick={handleCopyParentLink}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100"
                    title="Copy parent scorecard link"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>{copiedNotice ? 'Copied' : 'Parent Link'}</span>
                  </button>
                )}
                {!isParentView && onOpenParentMode && (
                  <button
                    type="button"
                    onClick={onOpenParentMode}
                    className="px-3 py-1.5 text-xs font-semibold text-[#0F3CC9] bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100"
                  >
                    Parent View
                  </button>
                )}
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#16A34A] rounded-lg hover:bg-emerald-700"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>
                <button
                  type="button"
                  onClick={onBack}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  {isParentView ? 'Exit Preview' : 'Dashboard'}
                </button>
              </div>
            </div>
          </div>

          {/* 4 Tinted Stat Boxes */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                TOTAL SCORE
              </p>
              <p className="mt-1.5 tabular-nums">
                <span className="text-3xl font-extrabold text-[#0F3CC9]">{finalScore}</span>
                <span className="text-sm font-semibold text-slate-500"> / {attempt.maxScore}</span>
              </p>
              <p className="text-[11px] font-semibold text-[#0F3CC9] mt-1">
                {scorePercent}% aggregate
              </p>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                ACCURACY
              </p>
              <p className="text-3xl font-extrabold text-emerald-600 mt-1.5 tabular-nums">
                {attempt.accuracy}%
              </p>
              <p className="text-[11px] font-semibold text-emerald-600 mt-1">
                {attempt.correctCount} of {attemptedCount} correct
              </p>
            </div>

            <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-4 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                PROJECTED RANK
              </p>
              <p className="text-3xl font-extrabold text-purple-600 mt-1.5 tabular-nums">
                #{projectedRank}
              </p>
              <p className="text-[11px] font-semibold text-purple-600 mt-1">{airBand}</p>
            </div>

            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                TIME TAKEN
              </p>
              <p className="mt-1.5 tabular-nums">
                <span className="text-3xl font-extrabold text-amber-700">
                  {attempt.timeTakenMinutes}
                </span>
                <span className="text-sm font-semibold text-amber-700"> min</span>
              </p>
              <p className="text-[11px] font-semibold text-amber-700 mt-1">
                ~{avgSecsPerQuestion}s / question
              </p>
            </div>
          </div>

          {/* Summary Strip: +Correct / -Incorrect / Skipped */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-xl py-3.5 px-4 grid grid-cols-3 divide-x divide-slate-200 text-center">
            <div>
              <p className="text-sm font-bold text-emerald-600 tabular-nums">
                +{positiveMarks} marks
              </p>
              <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mt-0.5">
                {attempt.correctCount} CORRECT (+{exam?.marksPositive ?? 4})
              </p>
            </div>
            <div>
              <p className="text-sm font-bold text-rose-600 tabular-nums">
                -{negativeMarksAbs} marks
              </p>
              <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mt-0.5">
                {attempt.incorrectCount} INCORRECT ({exam?.marksNegative ?? -1})
              </p>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 tabular-nums">0 marks</p>
              <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mt-0.5">
                {skippedItems.length} SKIPPED (0)
              </p>
            </div>
          </div>
        </section>

        {/* Card 2: Topic Readiness & Mastery Diagnostic */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#0F3CC9]" />
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                TOPIC READINESS &amp; MASTERY DIAGNOSTIC
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-2.5 py-1 text-[11px] font-semibold text-[#0F3CC9] bg-blue-50 border border-blue-200 rounded">
                {percentile}th Percentile
              </span>
              <span className="text-xs font-semibold text-emerald-600">
                ✓ Target Benchmark Qualified
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {topicBreakdown.map((topic) => {
              const tier =
                topic.accuracy >= 75
                  ? { label: 'Mastered', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', bar: 'bg-emerald-500' }
                  : topic.accuracy >= 45
                  ? { label: 'Developing', cls: 'bg-blue-50 text-[#0F3CC9] border-blue-200', bar: 'bg-[#0F3CC9]' }
                  : { label: 'Needs Practice', cls: 'bg-rose-50 text-rose-700 border-rose-200', bar: 'bg-rose-500' };
              const widthPct = Math.max(8, topic.accuracy);

              return (
                <div key={topic.label} className="border border-slate-200 rounded-lg p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold uppercase text-slate-900 truncate">
                      {topic.label}
                    </p>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold border rounded shrink-0 ${tier.cls}`}
                    >
                      <span>{tier.label}</span>
                      {topic.accuracy < 45 && <AlertTriangle className="w-2.5 h-2.5" />}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${tier.bar}`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      {topic.correct} of {topic.total} solved correctly
                    </span>
                    <span className="font-semibold text-slate-700 tabular-nums">
                      {topic.accuracy}% accuracy
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Card 3: Question-by-Question Solution & Explanations */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                QUESTION-BY-QUESTION SOLUTION &amp; EXPLANATIONS
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Review complete official answer keys with step-by-step methods and shortcuts.
              </p>
            </div>

            <div className="no-print flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`px-3 py-1 text-xs font-semibold rounded border ${
                  filter === 'all'
                    ? 'bg-[#0F172A] text-white border-[#0F172A]'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                All ({evaluatedItems.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('incorrect')}
                className={`px-3 py-1 text-xs font-semibold rounded border ${
                  filter === 'incorrect'
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                }`}
              >
                Incorrect ({incorrectItems.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('skipped')}
                className={`px-3 py-1 text-xs font-semibold rounded border ${
                  filter === 'skipped'
                    ? 'bg-slate-700 text-white border-slate-700'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                }`}
              >
                Skipped ({skippedItems.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('correct')}
                className={`px-3 py-1 text-xs font-semibold rounded border ${
                  filter === 'correct'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                Correct ({correctItems.length})
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {filteredItems.length === 0 ? (
              <div className="border border-dashed border-slate-200 rounded-xl p-6 text-center text-xs text-slate-500">
                No questions match this filter.
              </div>
            ) : (
              filteredItems.map(({ q, index, selected, status, marksEarned }) => (
                <article
                  key={q.id}
                  className="border border-slate-200 rounded-xl p-5 space-y-3 bg-white"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-mono text-slate-500">
                      <span className="font-bold text-slate-900">Q{index + 1}.</span> [{q.code}] •{' '}
                      {q.topic || attempt.examTitle}
                    </p>
                    <span
                      className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded ${
                        status === 'correct'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : status === 'incorrect'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-blue-50 text-slate-600 border border-blue-200'
                      }`}
                    >
                      {status === 'correct'
                        ? `CORRECT (+${marksEarned} MARKS)`
                        : status === 'incorrect'
                        ? `INCORRECT (${marksEarned} MARKS)`
                        : 'UNATTEMPTED (0 MARKS)'}
                    </span>
                  </div>

                  {q.questionText && (
                    <div className="text-sm font-medium text-slate-900 leading-relaxed">
                      <MathText text={q.questionText} />
                    </div>
                  )}

                  {q.imageDataUrl && (
                    <div className="border border-slate-200 rounded-lg p-2.5 bg-white inline-block max-w-full">
                      <img
                        src={q.imageDataUrl}
                        alt={`Question ${index + 1}`}
                        className="max-h-80 w-auto object-contain rounded"
                      />
                    </div>
                  )}

                  {q.options.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {q.options.map((opt, optIdx) => {
                        const letter = opt.id || String.fromCharCode(65 + optIdx);
                        const isKey = letter === q.correctAnswer.trim().toUpperCase();
                        const isChosen =
                          selected !== undefined &&
                          letter === selected.trim().toUpperCase();

                        return (
                          <div
                            key={letter}
                            className={`px-3 py-2 rounded-lg border text-xs flex items-center justify-between gap-2 ${
                              isKey
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                                : isChosen && !isKey
                                ? 'bg-rose-50 border-rose-300 text-rose-900 font-semibold'
                                : 'bg-slate-50 border-slate-200 text-slate-700'
                            }`}
                          >
                            <span className="truncate">
                              <strong className="font-mono mr-1.5">{letter}.</strong>
                              <MathText text={opt.text} />
                            </span>
                            {isKey && (
                              <span className="text-[10px] font-bold text-emerald-700 shrink-0">
                                KEY ✓
                              </span>
                            )}
                            {isChosen && !isKey && (
                              <span className="text-[10px] font-bold text-rose-700 shrink-0">
                                YOURS
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
                    <span className="text-slate-600">
                      Candidate Selected:{' '}
                      <strong className="font-mono text-slate-900">
                        {selected || 'Skipped'}
                      </strong>
                    </span>
                    <span className="text-slate-600">
                      Official Answer Key:{' '}
                      <strong className="font-mono text-emerald-700">{q.correctAnswer}</strong>
                    </span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-xs text-slate-700 space-y-1">
                    <p className="font-bold text-slate-900">Step-by-Step Solution</p>
                    <p className="leading-relaxed">
                      <MathText text={q.explanation} />
                    </p>
                    {q.formulaNote && (
                      <p className="text-[11px] text-slate-500 pt-1">
                        Formula: <MathText text={q.formulaNote} />
                      </p>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </main>

      {/* Bottom-Right Dark Navy Submission Toast */}
      {showToast && (
        <div className="no-print fixed bottom-5 right-5 z-50 bg-[#0F172A] text-white rounded-lg px-4 py-3 shadow-lg border border-slate-800 flex items-center gap-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">
            Exam submitted! Score: {finalScore}/{attempt.maxScore}
          </span>
          <button
            type="button"
            onClick={() => setShowToast(false)}
            className="text-slate-400 hover:text-white ml-2"
            aria-label="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
