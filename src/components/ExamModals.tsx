import { useEffect, useMemo, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react';
import {
  BookOpen,
  CheckCircle2,
  FileText,
  FolderPlus,
  HelpCircle,
  ImagePlus,
  Plus,
  Share2,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import type {
  ExamPaper,
  ExamSubject,
  QuestionItem,
  QuestionType,
  StudentRecord,
  TestFolder,
} from '../types/portal';
import { MathText } from './MathText';

// Helper to read + compress an uploaded PNG/JPG/WebP image cleanly into a data URL
async function readImageFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read image file.'));
    reader.onload = () => {
      const rawUrl = String(reader.result || '');
      const img = new Image();
      img.onerror = () => resolve(rawUrl);
      img.onload = () => {
        const maxWidth = 1400;
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(rawUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/webp', 0.88));
      };
      img.src = rawUrl;
    };
    reader.readAsDataURL(file);
  });
}

// ===================== 1. CREATE EXAM FOLDER MODAL =====================

const EXAM_TAGS = [
  { id: 'JEE Mains (+4/-1)', label: 'JEE Mains (+4/-1)', category: 'JEE Main', pos: 4, neg: -1 },
  { id: 'JEE Advanced (+4/-1)', label: 'JEE Advanced (+4/-1)', category: 'JEE Advanced', pos: 4, neg: -1 },
  { id: 'MHT-CET (+2/-0)', label: 'MHT-CET (+2/-0)', category: 'MHT-CET', pos: 2, neg: 0 },
  { id: 'NEET (+4/-1)', label: 'NEET (+4/-1)', category: 'NEET', pos: 4, neg: -1 },
] as const;

interface CreateExamFolderModalProps {
  open: boolean;
  questions: QuestionItem[];
  students: StudentRecord[];
  onClose: () => void;
  onCreateFolderAndExam: (payload: {
    folder: Partial<TestFolder>;
    createExam?: Partial<ExamPaper>;
  }) => Promise<{ folder: TestFolder; exam: ExamPaper | null } | void>;
  onCreatedGoToQuestions?: (folder: TestFolder, exam: ExamPaper | null) => void;
}

export function CreateExamFolderModal({
  open,
  questions,
  students,
  onClose,
  onCreateFolderAndExam,
  onCreatedGoToQuestions,
}: CreateExamFolderModalProps) {
  const [modalTab, setModalTab] = useState<'info' | 'questions' | 'students'>('info');
  const [folderName, setFolderName] = useState('');
  const [examName, setExamName] = useState('');
  const [targetClass, setTargetClass] = useState<ExamPaper['targetClass']>('11th');
  const [examTag, setExamTag] = useState<string>('JEE Mains (+4/-1)');
  const [subject, setSubject] = useState<ExamSubject>('PCM');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [passingMarks, setPassingMarks] = useState('0');
  const [allowedTabSwitches, setAllowedTabSwitches] = useState('3');
  const [publishLive, setPublishLive] = useState(true);
  const [webcamRequired, setWebcamRequired] = useState(true);
  const [randomizeQuestions, setRandomizeQuestions] = useState(false);
  const [instructionsText, setInstructionsText] = useState(
    'Read each question carefully. Marks: +4 correct, -1 wrong.'
  );
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const activeTagMeta = EXAM_TAGS.find((t) => t.id === examTag) ?? EXAM_TAGS[0];

  const handleSelectTag = (tagId: string) => {
    setExamTag(tagId);
    const meta = EXAM_TAGS.find((t) => t.id === tagId);
    if (meta) {
      setInstructionsText(
        `Read each question carefully. Marks: +${meta.pos} correct, ${meta.neg} wrong.`
      );
      if (meta.category === 'MHT-CET') setTargetClass('MHT-CET');
      if (meta.category === 'NEET') setSubject('Biology');
    }
  };

  const classStudents = students.filter((s) =>
    targetClass === 'All'
      ? true
      : s.targetExam.toLowerCase().includes(targetClass.toLowerCase()) ||
        s.batchName.toLowerCase().includes(targetClass.toLowerCase())
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) {
      setError('Please enter a Folder Name.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const folderId = `folder-${Date.now()}`;
      const cleanFolderName = folderName.trim();
      const cleanExamTitle = examName.trim() || `${cleanFolderName} — ${targetClass}`;
      const generatedCode = `GC-${Math.floor(1000 + Math.random() * 8999)}`;

      const result = await onCreateFolderAndExam({
        folder: {
          id: folderId,
          name: cleanFolderName,
          category: activeTagMeta.category,
          subject,
          targetClass,
          description: `${cleanFolderName} (${activeTagMeta.category}) · ${subject}`,
        },
        createExam: {
          title: cleanExamTitle,
          code: generatedCode,
          folderId,
          subject,
          examTag,
          targetClass,
          durationMinutes: Number(durationMinutes) || 60,
          passingMarks: Number(passingMarks) || 0,
          allowedTabSwitches: Number(allowedTabSwitches) || 3,
          webcamRequired,
          randomizeQuestions,
          status: publishLive ? 'Live' : 'Draft',
          questionIds: selectedQuestionIds,
          marksPositive: activeTagMeta.pos,
          marksNegative: activeTagMeta.neg,
          instructions: instructionsText
            .split('\n')
            .map((l) => l.trim())
            .filter(Boolean),
          startTime: startTime || new Date().toISOString().slice(0, 16),
          endTime: endTime || '2026-12-31T23:59',
        },
      });

      const createdFolder: TestFolder = result?.folder ?? {
        id: folderId,
        name: cleanFolderName,
        category: activeTagMeta.category,
        subject,
        targetClass,
        description: '',
        createdAt: new Date().toISOString().slice(0, 10),
      };
      const createdExam = result?.exam ?? null;

      setFolderName('');
      setExamName('');
      setSelectedQuestionIds([]);
      setModalTab('info');
      onClose();
      onCreatedGoToQuestions?.(createdFolder, createdExam);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create exam folder.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-[1px] flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg border border-slate-200 shadow-2xl max-w-2xl w-full my-auto overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header matching Screenshot */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <FolderPlus className="w-4 h-4 text-[#0F3CC9]" />
            <span>Create Exam Folder*</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="text-slate-400 hover:text-slate-700 p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Exact Tab Row matching Screenshot */}
        <div className="px-6 pt-3 border-b border-slate-200 flex items-center gap-2 bg-slate-50/70">
          <button
            type="button"
            onClick={() => setModalTab('info')}
            className={`px-3.5 py-1.5 rounded-t text-xs font-semibold border-t border-l border-r flex items-center gap-1.5 ${
              modalTab === 'info'
                ? 'bg-white border-slate-200 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FolderPlus className="w-3.5 h-3.5 text-[#0F3CC9]" />
            <span>Folder Info</span>
          </button>
          <button
            type="button"
            onClick={() => setModalTab('questions')}
            className={`px-3.5 py-1.5 rounded-t text-xs font-medium border-t border-l border-r flex items-center gap-1.5 ${
              modalTab === 'questions'
                ? 'bg-white border-slate-200 text-slate-900 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>Questions ({selectedQuestionIds.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setModalTab('students')}
            className={`px-3.5 py-1.5 rounded-t text-xs font-medium border-t border-l border-r flex items-center gap-1.5 ${
              modalTab === 'students'
                ? 'bg-white border-slate-200 text-slate-900 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span>Students (Class {targetClass})</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs max-h-[78vh] overflow-y-auto">
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded">
              {error}
            </div>
          )}

          {modalTab === 'info' && (
            <div className="space-y-4">
              {/* Row 1: Folder Name * | Exam Name * */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Folder Name <span className="text-slate-900">*</span>
                  </label>
                  <input
                    type="text"
                    value={folderName}
                    onChange={(e) => setFolderName(e.target.value)}
                    placeholder="e.g. 11th JEE Maths Paper 1"
                    className="w-full px-3 py-2 border border-slate-300 rounded text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Exam Name <span className="text-slate-900">*</span>
                  </label>
                  <input
                    type="text"
                    value={examName}
                    onChange={(e) => setExamName(e.target.value)}
                    placeholder="e.g. Class 11th Mock Test"
                    className="w-full px-3 py-2 border border-slate-300 rounded text-slate-900"
                  />
                </div>
              </div>

              {/* Row 2: Class / Section | Exam Tag */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-start">
                <div className="space-y-2.5">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Class / Section
                    </label>
                    <select
                      value={targetClass}
                      onChange={(e) => setTargetClass(e.target.value as ExamPaper['targetClass'])}
                      className="w-full px-3 py-2 border border-slate-300 rounded bg-white text-slate-900"
                    >
                      <option value="11th">11th Standard</option>
                      <option value="12th">12th Standard</option>
                      <option value="MHT-CET">MHT-CET</option>
                      <option value="All">All Classes</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Subject</label>
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value as ExamSubject)}
                      className="w-full px-3 py-2 border border-slate-300 rounded bg-white text-slate-900"
                    >
                      <option value="PCM">Combined PCM</option>
                      <option value="Physics">Physics</option>
                      <option value="Chemistry">Chemistry</option>
                      <option value="Mathematics">Mathematics</option>
                      <option value="Biology">Biology</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Exam Tag</label>
                  <div className="flex flex-wrap gap-1.5">
                    {EXAM_TAGS.map((tag) => {
                      const active = examTag === tag.id;
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => handleSelectTag(tag.id)}
                          className={`px-2.5 py-1.5 rounded text-[11px] font-semibold border transition-colors ${
                            active
                              ? 'bg-[#0F3CC9] text-white border-[#0F3CC9]'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {tag.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Row 3: Duration (min) | Passing marks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Duration (min)</label>
                  <input
                    type="number"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded font-mono text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Passing marks</label>
                  <input
                    type="number"
                    value={passingMarks}
                    onChange={(e) => setPassingMarks(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded font-mono text-slate-900"
                  />
                </div>
              </div>

              {/* Row 4: Allowed tab switches | Publish / Webcam / Randomize toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-end">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Allowed tab switches
                  </label>
                  <input
                    type="number"
                    value={allowedTabSwitches}
                    onChange={(e) => setAllowedTabSwitches(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded font-mono text-slate-900"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-4 pb-2">
                  <button
                    type="button"
                    onClick={() => setPublishLive((v) => !v)}
                    className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800"
                  >
                    <span
                      className={`w-8 h-4 rounded-full relative transition-colors ${
                        publishLive ? 'bg-[#0F3CC9]' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform ${
                          publishLive ? 'left-4' : 'left-0.5'
                        }`}
                      />
                    </span>
                    <span>Publish</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWebcamRequired((v) => !v)}
                    className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800"
                  >
                    <span
                      className={`w-8 h-4 rounded-full relative transition-colors ${
                        webcamRequired ? 'bg-[#0F3CC9]' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform ${
                          webcamRequired ? 'left-4' : 'left-0.5'
                        }`}
                      />
                    </span>
                    <span>Webcam</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRandomizeQuestions((v) => !v)}
                    className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800"
                  >
                    <span
                      className={`w-8 h-4 rounded-full relative transition-colors ${
                        randomizeQuestions ? 'bg-[#0F3CC9]' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform ${
                          randomizeQuestions ? 'left-4' : 'left-0.5'
                        }`}
                      />
                    </span>
                    <span>Randomize</span>
                  </button>
                </div>
              </div>

              {/* Row 5: Instructions */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Instructions</label>
                <textarea
                  rows={2}
                  value={instructionsText}
                  onChange={(e) => setInstructionsText(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded text-slate-900"
                />
              </div>

              {/* Row 6: Start at / End at */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Start at (optional — opens)
                  </label>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-slate-700 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    End at (optional — window closes)
                  </label>
                  <input
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-slate-700 font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {modalTab === 'questions' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">
                  Attach Existing Bank Questions ({selectedQuestionIds.length} selected)
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedQuestionIds(questions.slice(0, 5).map((q) => q.id))}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded text-[11px] font-semibold text-slate-700"
                >
                  Auto-Select 5
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto border border-slate-200 rounded divide-y divide-slate-200">
                {questions.map((q) => {
                  const checked = selectedQuestionIds.includes(q.id);
                  return (
                    <label
                      key={q.id}
                      className="flex items-start gap-2.5 p-2.5 hover:bg-slate-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setSelectedQuestionIds((prev) =>
                            checked ? prev.filter((id) => id !== q.id) : [...prev, q.id]
                          )
                        }
                        className="mt-0.5"
                      />
                      <div className="min-w-0">
                        <p className="font-mono text-[10px] text-slate-500">
                          {q.code} · {q.subject} · {q.targetClass}
                        </p>
                        <div className="text-xs text-slate-900 line-clamp-2">
                          {q.questionText ? <MathText text={q.questionText} /> : 'Image Question'}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {modalTab === 'students' && (
            <div className="space-y-2">
              <p className="text-slate-600">
                Matching enrolled candidates ({classStudents.length} students):
              </p>
              <div className="max-h-60 overflow-y-auto border border-slate-200 rounded divide-y divide-slate-200">
                {classStudents.length === 0 ? (
                  <p className="p-4 text-center text-slate-500">
                    All active students will have access when published live.
                  </p>
                ) : (
                  classStudents.map((s) => (
                    <div key={s.id} className="px-3 py-2 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{s.name}</p>
                        <p className="text-[11px] font-mono text-slate-500">{s.rollNo}</p>
                      </div>
                      <span className="text-[11px] text-slate-600">{s.batchName}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 font-semibold text-white bg-[#0F3CC9] hover:bg-blue-800 rounded disabled:opacity-60 inline-flex items-center gap-1.5"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>{saving ? 'Creating...' : 'Create Folder → Add Questions'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===================== 2. EXAM QUESTIONS INSPECTOR MODAL =====================

interface ExamQuestionsModalProps {
  exam: ExamPaper | null;
  allQuestions: QuestionItem[];
  onClose: () => void;
  onUpdateExamQuestions: (examId: string, questionIds: string[]) => Promise<void>;
  onOpenAddQuestionForExam: (exam: ExamPaper) => void;
  onStartExamPreview: (exam: ExamPaper) => void;
}

export function ExamQuestionsModal({
  exam,
  allQuestions,
  onClose,
  onUpdateExamQuestions,
  onOpenAddQuestionForExam,
  onStartExamPreview,
}: ExamQuestionsModalProps) {
  const [showAttachPicker, setShowAttachPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!exam) return null;

  const assignedQuestions = exam.questionIds
    .map((id) => allQuestions.find((q) => q.id === id))
    .filter((q): q is QuestionItem => Boolean(q));

  const unassignedQuestions = allQuestions.filter((q) => !exam.questionIds.includes(q.id));

  const handleRemoveQuestion = async (qId: string) => {
    setSaving(true);
    try {
      await onUpdateExamQuestions(
        exam.id,
        exam.questionIds.filter((id) => id !== qId)
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAttachQuestion = async (qId: string) => {
    setSaving(true);
    try {
      await onUpdateExamQuestions(exam.id, [...exam.questionIds, qId]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-[1px] flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg border border-slate-200 shadow-2xl max-w-3xl w-full my-auto overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <p className="text-[11px] font-mono text-slate-500 uppercase">
              {exam.code} · {exam.subject || 'PCM'} · Class {exam.targetClass} ·{' '}
              {exam.durationMinutes} min · +{exam.marksPositive}/{exam.marksNegative}
            </p>
            <h2 className="text-base font-bold text-slate-900 mt-0.5">
              {exam.title} — Assigned Questions ({assignedQuestions.length})
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Questions modal"
            className="text-slate-400 hover:text-slate-700 p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAddQuestionForExam(exam);
                }}
                className="px-3 py-1.5 bg-[#0F3CC9] hover:bg-blue-800 text-white font-semibold rounded inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add New Question to Exam</span>
              </button>
              <button
                type="button"
                onClick={() => setShowAttachPicker((v) => !v)}
                className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-semibold rounded"
              >
                {showAttachPicker ? 'Hide Bank Picker' : 'Attach from Question Bank'}
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                onStartExamPreview(exam);
              }}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded"
            >
              Start Exam Preview →
            </button>
          </div>

          {showAttachPicker && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-2">
              <p className="font-bold text-slate-800">
                Available Bank Questions ({unassignedQuestions.length})
              </p>
              <div className="max-h-44 overflow-y-auto divide-y divide-slate-200 border border-slate-200 bg-white rounded">
                {unassignedQuestions.length === 0 ? (
                  <p className="p-3 text-slate-500">All Question Bank items are already assigned.</p>
                ) : (
                  unassignedQuestions.map((q) => (
                    <div key={q.id} className="p-2.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-[10px] text-slate-500">
                          {q.code} · {q.subject} · {q.topic}
                        </p>
                        <div className="text-xs text-slate-900 line-clamp-1">
                          {q.questionText ? <MathText text={q.questionText} /> : 'Image Question'}
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleAttachQuestion(q.id)}
                        className="px-2.5 py-1 bg-[#0F3CC9] text-white rounded text-[11px] font-semibold shrink-0"
                      >
                        + Add
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {assignedQuestions.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-300 rounded text-slate-500">
              No questions assigned to this exam yet. Click “Add New Question to Exam” above.
            </div>
          ) : (
            <div className="space-y-3">
              {assignedQuestions.map((q, idx) => (
                <div
                  key={q.id}
                  className="p-4 bg-white border border-slate-200 rounded-lg space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-[11px] text-slate-500">
                        Q{idx + 1} · {q.code} · {q.subject} · {q.topic} · Key:{' '}
                        <span className="font-bold text-emerald-700">{q.correctAnswer}</span>
                      </p>
                      {q.questionText && (
                        <div className="text-sm text-slate-900 mt-1 font-medium">
                          <MathText text={q.questionText} />
                        </div>
                      )}
                      {q.imageDataUrl && (
                        <div className="mt-2 border border-slate-200 rounded p-1.5 bg-white inline-block">
                          <img
                            src={q.imageDataUrl}
                            alt={`Q${idx + 1}`}
                            className="max-h-52 w-auto object-contain rounded"
                          />
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleRemoveQuestion(q.id)}
                      className="text-slate-400 hover:text-rose-700 p-1 shrink-0"
                      title="Remove from exam"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {q.type === 'single_choice' && q.options.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {q.options.map((opt) => (
                        <div
                          key={opt.id}
                          className={`px-2.5 py-1.5 rounded border text-xs flex items-center gap-2 ${
                            opt.label === q.correctAnswer
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-900 font-medium'
                              : 'border-slate-200 bg-slate-50 text-slate-700'
                          }`}
                        >
                          <span className="font-mono font-bold">{opt.label}.</span>
                          <MathText text={opt.text} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===================== 3. CREATE QUESTION MODAL (MATCHING SCREENSHOT) =====================

interface CreateQuestionModalProps {
  open: boolean;
  exams: ExamPaper[];
  folders: TestFolder[];
  defaultExamId?: string | null;
  onClose: () => void;
  onSaveQuestion: (
    question: Partial<QuestionItem> & { attachToExamId?: string }
  ) => Promise<void>;
  onFinishAndShare?: (exam: ExamPaper) => void;
}

export function CreateQuestionModal({
  open,
  exams,
  folders,
  defaultExamId = '',
  onClose,
  onSaveQuestion,
  onFinishAndShare,
}: CreateQuestionModalProps) {
  const [attachExamId, setAttachExamId] = useState(defaultExamId || exams[0]?.id || '');
  const [targetClass, setTargetClass] = useState<QuestionItem['targetClass']>('11th');
  const [subject, setSubject] = useState<QuestionItem['subject']>('Mathematics');
  const [type, setType] = useState<QuestionType>('single_choice');
  const [questionText, setQuestionText] = useState('');
  const [imageDataUrl, setImageDataUrl] = useState('');
  const [showOptionTextInputs, setShowOptionTextInputs] = useState(false);
  const [optA, setOptA] = useState('');
  const [optB, setOptB] = useState('');
  const [optC, setOptC] = useState('');
  const [optD, setOptD] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('A');
  const [marksPos, setMarksPos] = useState('4');
  const [marksNeg, setMarksNeg] = useState('1');
  const [sessionQNumber, setSessionQNumber] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setSessionQNumber(1);
    const chosenId = defaultExamId || exams[0]?.id || '';
    setAttachExamId(chosenId);
    const ex = exams.find((e) => e.id === chosenId);
    if (ex) {
      if (ex.targetClass === '11th' || ex.targetClass === '12th' || ex.targetClass === 'MHT-CET') {
        setTargetClass(ex.targetClass);
      }
      if (
        ex.subject === 'Physics' ||
        ex.subject === 'Chemistry' ||
        ex.subject === 'Mathematics' ||
        ex.subject === 'Biology'
      ) {
        setSubject(ex.subject);
      }
      setMarksPos(String(ex.marksPositive ?? 4));
      setMarksNeg(String(Math.abs(ex.marksNegative ?? 1)));
    }
  }, [open, defaultExamId, exams]);

  if (!open) return null;

  const selectedExam = exams.find((e) => e.id === attachExamId) ?? null;

  const handleImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please choose a valid PNG, JPG, JPEG, or WebP image file.');
      return;
    }
    setError('');
    const dataUrl = await readImageFileAsDataUrl(file);
    setImageDataUrl(dataUrl);
  };

  const resetFormFieldsForNext = () => {
    setQuestionText('');
    setImageDataUrl('');
    setOptA('');
    setOptB('');
    setOptC('');
    setOptD('');
    setCorrectAnswer('A');
    setError('');
  };

  const saveCurrentQuestion = async (): Promise<boolean> => {
    if (!questionText.trim() && !imageDataUrl) {
      setError('Type a question or upload a question image first.');
      return false;
    }
    setError('');
    setSaving(true);
    try {
      const negNum = Math.abs(Number(marksNeg) || 0);
      await onSaveQuestion({
        subject,
        targetClass,
        topic: imageDataUrl ? 'Image Question' : `${subject} Paper`,
        type,
        questionText: questionText.trim(),
        imageDataUrl: imageDataUrl || undefined,
        options:
          type === 'single_choice'
            ? [
                { id: 'opt-1', label: 'A', text: optA.trim() || 'Option A' },
                { id: 'opt-2', label: 'B', text: optB.trim() || 'Option B' },
                { id: 'opt-3', label: 'C', text: optC.trim() || 'Option C' },
                { id: 'opt-4', label: 'D', text: optD.trim() || 'Option D' },
              ]
            : [],
        correctAnswer: correctAnswer.trim() || 'A',
        marksPositive: Number(marksPos) || 4,
        marksNegative: type === 'numerical' ? 0 : negNum > 0 ? -negNum : 0,
        explanation: imageDataUrl ? 'Refer to uploaded question key.' : 'Standard conceptual solution.',
        attachToExamId: attachExamId || undefined,
      });
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save question.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndStay = async () => {
    const ok = await saveCurrentQuestion();
    if (ok) {
      setSessionQNumber((n) => n + 1);
      resetFormFieldsForNext();
    }
  };

  const handleSaveAndNext = async () => {
    const ok = await saveCurrentQuestion();
    if (ok) {
      setSessionQNumber((n) => n + 1);
      resetFormFieldsForNext();
    }
  };

  const handleFinish = async (openShareAfter: boolean) => {
    if (questionText.trim() || imageDataUrl) {
      const ok = await saveCurrentQuestion();
      if (!ok) return;
    }
    resetFormFieldsForNext();
    onClose();
    if (openShareAfter && selectedExam && onFinishAndShare) {
      onFinishAndShare(selectedExam);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-[1px] flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg border border-slate-200 shadow-2xl max-w-2xl w-full my-auto overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onPaste={(e) => {
          const items = e.clipboardData?.items;
          if (!items) return;
          for (const item of items) {
            if (item.type.startsWith('image/')) {
              const file = item.getAsFile();
              if (file) {
                e.preventDefault();
                void handleImageFile(file);
              }
              break;
            }
          }
        }}
      >
        {/* Header: Create Question [Q1] */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">Create Question</h2>
            <span className="px-2 py-0.5 bg-[#0F3CC9] text-white font-bold text-xs rounded">
              Q{sessionQNumber}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="text-slate-400 hover:text-slate-700 p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Blue Assign Bar matching Screenshot */}
        <div className="px-6 py-3 bg-blue-50/60 border-b border-blue-200 grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
          <div className="sm:col-span-6">
            <label className="block text-[11px] font-bold text-[#0F3CC9] mb-1">
              Assign to Exam Folder / Paper *
            </label>
            <select
              value={attachExamId}
              onChange={(e) => setAttachExamId(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-blue-300 rounded text-xs font-semibold text-slate-900"
            >
              <option value="">Question Bank Only (Unassigned)</option>
              {exams.map((ex) => {
                const fname = folders.find((f) => f.id === ex.folderId)?.name ?? 'General';
                return (
                  <option key={ex.id} value={ex.id}>
                    [{ex.code}] {ex.title} — {ex.targetClass} ({fname})
                  </option>
                );
              })}
            </select>
          </div>
          <div className="sm:col-span-3">
            <label className="block text-[11px] font-bold text-[#0F3CC9] mb-1">
              Target Class *
            </label>
            <select
              value={targetClass}
              onChange={(e) => setTargetClass(e.target.value as QuestionItem['targetClass'])}
              className="w-full px-2.5 py-1.5 bg-white border border-blue-300 rounded text-xs font-semibold text-slate-900"
            >
              <option value="11th">Class 11th</option>
              <option value="12th">Class 12th</option>
              <option value="MHT-CET">MHT-CET</option>
              <option value="Foundation">Foundation</option>
            </select>
          </div>
          <div className="sm:col-span-3">
            <label className="block text-[11px] font-bold text-[#0F3CC9] mb-1">Subject</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value as QuestionItem['subject'])}
              className="w-full px-2.5 py-1.5 bg-white border border-blue-300 rounded text-xs font-semibold text-slate-900"
            >
              <option value="Mathematics">Mathematics</option>
              <option value="Physics">Physics</option>
              <option value="Chemistry">Chemistry</option>
              <option value="Biology">Biology</option>
            </select>
          </div>
        </div>

        <div className="p-6 space-y-4 text-xs max-h-[66vh] overflow-y-auto">
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded">
              {error}
            </div>
          )}

          {/* Question Text (optional if problem is in image) */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Question text (optional if problem is in image)
            </label>
            <textarea
              rows={3}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Type the question (or upload an image below)"
              className="w-full px-3 py-2 border border-slate-300 rounded text-xs text-slate-900"
            />
            {questionText && (
              <div className="mt-1.5 p-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900">
                <MathText text={questionText} />
              </div>
            )}
          </div>

          {/* Question Image / Diagram Dropzone matching Screenshot */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Question Image / Diagram
            </label>
            {imageDataUrl ? (
              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-2">
                <img
                  src={imageDataUrl}
                  alt="Uploaded question preview"
                  className="max-h-56 w-auto mx-auto object-contain rounded border border-slate-200 bg-white"
                />
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-emerald-700 font-semibold">
                    Image ready (PNG/WebP attached)
                  </span>
                  <button
                    type="button"
                    onClick={() => setImageDataUrl('')}
                    className="text-[11px] font-semibold text-rose-700 hover:underline"
                  >
                    Remove Image
                  </button>
                </div>
              </div>
            ) : (
              <label
                onDragOver={(e: DragEvent<HTMLLabelElement>) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e: DragEvent<HTMLLabelElement>) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) void handleImageFile(file);
                }}
                className={`block border border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  isDragging
                    ? 'border-[#0F3CC9] bg-blue-50/70'
                    : 'border-slate-300 bg-white hover:bg-slate-50'
                }`}
              >
                <Upload className="w-5 h-5 text-[#0F3CC9] mx-auto mb-2" />
                <p className="text-xs text-slate-600">
                  Drag &amp; drop or{' '}
                  <span className="text-[#0F3CC9] underline font-medium">
                    browse question image (PNG, JPG, JPEG, WebP)
                  </span>
                </p>
                <p className="text-[10px] text-slate-400 mt-1">
                  Tip: You can also press Ctrl+V anywhere inside this dialog to paste a screenshot.
                </p>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleImageFile(file);
                  }}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Question Type */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Question type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as QuestionType)}
              className="w-full px-3 py-2 border border-slate-300 rounded bg-white text-slate-900"
            >
              <option value="single_choice">MCQ — Single</option>
              <option value="numerical">Numerical / Integer Value</option>
            </select>
          </div>

          {/* Correct Answer Key A / B / C / D big selector buttons matching Screenshot */}
          {type === 'single_choice' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block font-semibold text-slate-700">Correct Answer Key</label>
                <button
                  type="button"
                  onClick={() => setShowOptionTextInputs((v) => !v)}
                  className="text-[11px] font-medium text-[#0F3CC9] hover:underline"
                >
                  {showOptionTextInputs ? 'Hide Custom Option Text' : '+ Edit Option Text (Optional)'}
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2.5">
                {(['A', 'B', 'C', 'D'] as const).map((key) => {
                  const active = correctAnswer.toUpperCase() === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setCorrectAnswer(key)}
                      className={`py-2.5 rounded text-sm font-bold border transition-colors ${
                        active
                          ? 'bg-[#0F3CC9] text-white border-[#0F3CC9]'
                          : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {key}
                    </button>
                  );
                })}
              </div>

              {showOptionTextInputs && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <input
                    type="text"
                    value={optA}
                    onChange={(e) => setOptA(e.target.value)}
                    placeholder="Option A (default: Option A)"
                    className="px-3 py-1.5 border border-slate-300 rounded"
                  />
                  <input
                    type="text"
                    value={optB}
                    onChange={(e) => setOptB(e.target.value)}
                    placeholder="Option B (default: Option B)"
                    className="px-3 py-1.5 border border-slate-300 rounded"
                  />
                  <input
                    type="text"
                    value={optC}
                    onChange={(e) => setOptC(e.target.value)}
                    placeholder="Option C (default: Option C)"
                    className="px-3 py-1.5 border border-slate-300 rounded"
                  />
                  <input
                    type="text"
                    value={optD}
                    onChange={(e) => setOptD(e.target.value)}
                    placeholder="Option D (default: Option D)"
                    className="px-3 py-1.5 border border-slate-300 rounded"
                  />
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Correct Numerical Answer
              </label>
              <input
                type="text"
                value={correctAnswer}
                onChange={(e) => setCorrectAnswer(e.target.value)}
                placeholder="e.g. 21.33"
                className="w-full px-3 py-2 border border-slate-300 rounded font-mono text-slate-900"
              />
            </div>
          )}

          {/* Marks (+) | Negative (-) */}
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Marks (+)</label>
              <input
                type="number"
                value={marksPos}
                onChange={(e) => setMarksPos(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded font-mono text-slate-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Negative (-)</label>
              <input
                type="number"
                value={marksNeg}
                onChange={(e) => setMarksNeg(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded font-mono text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* Exact 4-Button Footer matching Screenshot */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSaveAndStay()}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-60"
          >
            Save
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSaveAndNext()}
            className="px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-60"
          >
            + Save &amp; Add Next
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleFinish(true)}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded inline-flex items-center gap-1.5 disabled:opacity-60"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Finish &amp; Share Link</span>
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleFinish(false)}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#0F3CC9] hover:bg-blue-800 rounded disabled:opacity-60"
          >
            Finish
          </button>
        </div>
      </div>
    </div>
  );
}

// ===================== 4. BULK IMAGES MODAL =====================

interface BulkImagesModalProps {
  open: boolean;
  exams: ExamPaper[];
  onClose: () => void;
  onBulkImport: (items: Partial<QuestionItem>[], attachToExamId?: string) => Promise<void>;
}

interface PendingImageItem {
  id: string;
  name: string;
  imageDataUrl: string;
  correctAnswer: 'A' | 'B' | 'C' | 'D';
}

export function BulkImagesModal({ open, exams, onClose, onBulkImport }: BulkImagesModalProps) {
  const [items, setItems] = useState<PendingImageItem[]>([]);
  const [subject, setSubject] = useState<QuestionItem['subject']>('Physics');
  const [targetClass, setTargetClass] = useState<QuestionItem['targetClass']>('11th');
  const [attachExamId, setAttachExamId] = useState(exams[0]?.id ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError('');
    const next: PendingImageItem[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      const url = await readImageFileAsDataUrl(file);
      next.push({
        id: `${Date.now()}-${Math.random()}`,
        name: file.name,
        imageDataUrl: url,
        correctAnswer: 'A',
      });
    }
    setItems((prev) => [...prev, ...next]);
  };

  const handleUploadAll = async () => {
    if (items.length === 0) {
      setError('Select at least one question image.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onBulkImport(
        items.map((it) => ({
          subject,
          targetClass,
          topic: 'Image Question',
          type: 'single_choice',
          questionText: '',
          imageDataUrl: it.imageDataUrl,
          options: [
            { id: 'opt-1', label: 'A', text: 'Option A' },
            { id: 'opt-2', label: 'B', text: 'Option B' },
            { id: 'opt-3', label: 'C', text: 'Option C' },
            { id: 'opt-4', label: 'D', text: 'Option D' },
          ],
          correctAnswer: it.correctAnswer,
          marksPositive: 4,
          marksNegative: -1,
        })),
        attachExamId || undefined
      );
      setItems([]);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to upload bulk images.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-[1px] flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg border border-slate-200 shadow-2xl max-w-3xl w-full my-auto overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <ImagePlus className="w-4 h-4 text-[#0F3CC9]" />
            <span>Bulk Upload Question Images</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="text-slate-400 hover:text-slate-700 p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Subject</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value as QuestionItem['subject'])}
                className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
              >
                <option value="Physics">Physics</option>
                <option value="Chemistry">Chemistry</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Biology">Biology</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Target Class</label>
              <select
                value={targetClass}
                onChange={(e) => setTargetClass(e.target.value as QuestionItem['targetClass'])}
                className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
              >
                <option value="11th">Class 11th</option>
                <option value="12th">Class 12th</option>
                <option value="MHT-CET">MHT-CET</option>
                <option value="Foundation">Foundation</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Assign to Exam</label>
              <select
                value={attachExamId}
                onChange={(e) => setAttachExamId(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
              >
                <option value="">Question Bank Only</option>
                {exams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    [{ex.code}] {ex.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label className="block border border-dashed border-slate-300 rounded-lg p-6 text-center bg-slate-50 hover:bg-slate-100/70 cursor-pointer">
            <Upload className="w-5 h-5 text-[#0F3CC9] mx-auto mb-1.5" />
            <p className="font-semibold text-slate-800">
              Click to select multiple question screenshots (PNG, JPG, WebP)
            </p>
            <input
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => void handleFilesSelected(e.target.files)}
              className="hidden"
            />
          </label>

          {items.length > 0 && (
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-3 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono font-bold text-slate-500">Q{idx + 1}</span>
                    <img
                      src={item.imageDataUrl}
                      alt={item.name}
                      className="h-16 w-auto object-contain border border-slate-200 rounded"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] text-slate-500 mr-1">Key:</span>
                    {(['A', 'B', 'C', 'D'] as const).map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() =>
                          setItems((prev) =>
                            prev.map((p) => (p.id === item.id ? { ...p, correctAnswer: k } : p))
                          )
                        }
                        className={`w-7 h-7 rounded font-bold text-xs border ${
                          item.correctAnswer === k
                            ? 'bg-[#0F3CC9] text-white border-[#0F3CC9]'
                            : 'bg-white text-slate-700 border-slate-300'
                        }`}
                      >
                        {k}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setItems((prev) => prev.filter((p) => p.id !== item.id))}
                      className="ml-2 p-1 text-slate-400 hover:text-rose-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || items.length === 0}
            onClick={() => void handleUploadAll()}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#0F3CC9] hover:bg-blue-800 rounded disabled:opacity-60"
          >
            {saving ? 'Uploading...' : `Save ${items.length} Image Questions`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===================== 5. IMPORT PDF MODAL =====================

interface ImportPdfModalProps {
  open: boolean;
  exams: ExamPaper[];
  onClose: () => void;
  onBulkImport: (items: Partial<QuestionItem>[], attachToExamId?: string) => Promise<void>;
}

function extractReadableTextFromFileBytes(bytes: Uint8Array): string {
  const decoder = new TextDecoder('latin1');
  const raw = decoder.decode(bytes);
  if (!raw.startsWith('%PDF')) {
    return new TextDecoder('utf-8').decode(bytes);
  }
  const chunks: string[] = [];
  const tjMatches = raw.match(/\(([^()\\]{2,200})\)\s*Tj/g) || [];
  tjMatches.forEach((m) => {
    const inner = m.replace(/^\(/, '').replace(/\)\s*Tj$/, '');
    if (/[A-Za-z0-9]/.test(inner)) chunks.push(inner);
  });
  if (chunks.length > 0) return chunks.join(' ');
  return raw.replace(/[^\x20-\x7E\n\r]/g, ' ').replace(/\s{2,}/g, '\n');
}

function parseQuestionBlocks(
  rawText: string,
  subject: QuestionItem['subject'],
  targetClass: QuestionItem['targetClass']
): Partial<QuestionItem>[] {
  const normalized = rawText.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];

  const blocks = normalized
    .split(/\n(?=(?:Q\.?\s*\d+[\).:\s]|\d+[\).]\s))/gi)
    .map((b) => b.trim())
    .filter(Boolean);

  return blocks.map((block, index) => {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    const firstLine = (lines[0] || '').replace(/^(?:Q\.?\s*\d+[\).:\s]+|\d+[\).]\s+)/i, '');
    const optMatches: Record<'A' | 'B' | 'C' | 'D', string> = { A: '', B: '', C: '', D: '' };
    let answer = 'A';
    const stemParts: string[] = [firstLine];

    lines.slice(1).forEach((line) => {
      const optM = line.match(/^\(?([A-D])\)?[.):\s]+(.+)$/i);
      const ansM = line.match(/^(?:Ans|Answer|Key)[:\s-]*\(?([A-D0-9.-]+)\)?/i);
      if (ansM) {
        answer = ansM[1].toUpperCase();
      } else if (optM) {
        const key = optM[1].toUpperCase() as 'A' | 'B' | 'C' | 'D';
        optMatches[key] = optM[2].trim();
      } else {
        stemParts.push(line);
      }
    });

    const hasOptions = Boolean(optMatches.A || optMatches.B || optMatches.C || optMatches.D);
    return {
      subject,
      targetClass,
      topic: 'Imported Question Paper',
      type: hasOptions ? 'single_choice' : 'numerical',
      questionText: stemParts.join(' ').trim() || `Imported Question ${index + 1}`,
      options: hasOptions
        ? [
            { id: 'opt-1', label: 'A', text: optMatches.A || 'Option A' },
            { id: 'opt-2', label: 'B', text: optMatches.B || 'Option B' },
            { id: 'opt-3', label: 'C', text: optMatches.C || 'Option C' },
            { id: 'opt-4', label: 'D', text: optMatches.D || 'Option D' },
          ]
        : [],
      correctAnswer: answer,
      marksPositive: 4,
      marksNegative: hasOptions ? -1 : 0,
    };
  });
}

export function ImportPdfModal({ open, exams, onClose, onBulkImport }: ImportPdfModalProps) {
  const [rawText, setRawText] = useState(
    `1. Find the derivative of $\\sin(x^2)$ with respect to $x$.\n(A) $2x\\cos(x^2)$\n(B) $\\cos(x^2)$\n(C) $-2x\\cos(x^2)$\n(D) $2x\\sin(x^2)$\nAns: A\n\n2. Evaluate $\\int_0^2 3x^2\\,dx$.\n(A) 4\n(B) 8\n(C) 12\n(D) 6\nAns: B`
  );
  const [subject, setSubject] = useState<QuestionItem['subject']>('Mathematics');
  const [targetClass, setTargetClass] = useState<QuestionItem['targetClass']>('12th');
  const [attachExamId, setAttachExamId] = useState('');
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');

  const parsedPreview = useMemo(
    () => parseQuestionBlocks(rawText, subject, targetClass),
    [rawText, subject, targetClass]
  );

  if (!open) return null;

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const buffer = await file.arrayBuffer();
    const extracted = extractReadableTextFromFileBytes(new Uint8Array(buffer));
    if (extracted.trim().length > 10) {
      setRawText(extracted.trim());
    }
  };

  const handleImport = async () => {
    if (parsedPreview.length === 0) {
      setError('No questions detected. Format lines with "1. Question..." and "(A) ... Ans: A".');
      return;
    }
    setError('');
    setImporting(true);
    try {
      await onBulkImport(parsedPreview, attachExamId || undefined);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import questions.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-[1px] flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg border border-slate-200 shadow-2xl max-w-3xl w-full my-auto overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <Upload className="w-4 h-4 text-[#0F3CC9]" />
            <span>Import PDF / Bulk Questions</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Import PDF modal"
            className="text-slate-400 hover:text-slate-700 p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs max-h-[76vh] overflow-y-auto">
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Subject</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value as QuestionItem['subject'])}
                className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
              >
                <option value="Mathematics">Mathematics</option>
                <option value="Physics">Physics</option>
                <option value="Chemistry">Chemistry</option>
                <option value="Biology">Biology</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Target Class</label>
              <select
                value={targetClass}
                onChange={(e) => setTargetClass(e.target.value as QuestionItem['targetClass'])}
                className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
              >
                <option value="11th">Class 11th</option>
                <option value="12th">Class 12th</option>
                <option value="MHT-CET">MHT-CET</option>
                <option value="Foundation">Foundation</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Attach to Exam (Optional)
              </label>
              <select
                value={attachExamId}
                onChange={(e) => setAttachExamId(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
              >
                <option value="">Question Bank Only</option>
                {exams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    [{ex.code}] {ex.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="border border-dashed border-slate-300 rounded-lg p-4 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-800">
                {fileName ? `Loaded file: ${fileName}` : 'Upload PDF or Question Text File'}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Supports .pdf, .txt, .tex — or paste/edit formatted questions directly below.
              </p>
            </div>
            <label className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-100 rounded text-xs font-semibold text-slate-800 cursor-pointer shrink-0 inline-flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-[#0F3CC9]" />
              <span>Choose PDF / File</span>
              <input
                type="file"
                accept=".pdf,.txt,.md,.tex"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Question Text Buffer (Numbered Questions + Options A–D + Ans)
            </label>
            <textarea
              rows={6}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded font-mono text-xs text-slate-900"
            />
          </div>

          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-[#0F3CC9]" />
                <span>Parsed Preview ({parsedPreview.length} Questions Ready)</span>
              </span>
              <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                KaTeX Enabled
              </span>
            </div>
            <div className="max-h-36 overflow-y-auto space-y-2">
              {parsedPreview.map((item, i) => (
                <div key={i} className="bg-white border border-slate-200 rounded p-2.5">
                  <p className="text-[10px] font-mono text-slate-500">
                    Q{i + 1} · {item.type === 'single_choice' ? 'MCQ' : 'Numerical'} · Key:{' '}
                    <strong className="text-emerald-700">{item.correctAnswer}</strong>
                  </p>
                  <div className="text-xs text-slate-900 mt-0.5">
                    <MathText text={item.questionText || ''} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={importing || parsedPreview.length === 0}
            onClick={handleImport}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#0F3CC9] hover:bg-blue-800 rounded disabled:opacity-60"
          >
            {importing ? 'Importing...' : `Import ${parsedPreview.length} Questions`}
          </button>
        </div>
      </div>
    </div>
  );
}
