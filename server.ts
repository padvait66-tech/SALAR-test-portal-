import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
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
  QuestionItem,
  StudentRecord,
  StudyMaterial,
  TeacherRecord,
  TestFolder,
  TestSeriesPackage,
  UserRole,
} from './src/types/portal.ts';
import { INITIAL_PAYMENTS } from './src/data/seedPortalData.ts';
import {
  createSession,
  db,
  deleteById,
  deleteSession,
  getOwnerAuth,
  getPublicLicenseSummary,
  getSession,
  getSettings,
  hashSecret,
  initDatabase,
  insertAtTop,
  listAttempts,
  listAttendance,
  listOrdered,
  listPayments,
  listStudents,
  saveSettings,
  updateOwnerPassword,
  updateRowData,
  verifySecret,
} from './server/db.ts';

initDatabase();

const app = express();
app.use(express.json({ limit: '15mb' }));

interface AuthedRequest extends Request {
  session?: { role: UserRole; subjectId: string; email: string };
}

function extractBearer(req: Request): string {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) {
    return header.slice(7).trim();
  }
  return '';
}

function attachSession(req: AuthedRequest, _res: Response, next: NextFunction): void {
  const token = extractBearer(req);
  if (token) {
    const sess = getSession(token);
    if (sess) req.session = sess;
  }
  next();
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (!req.session) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  next();
}

function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (!req.session) {
    res.status(401).json({ error: 'Admin authentication required.' });
    return;
  }
  if (req.session.role !== 'admin') {
    res.status(403).json({ error: 'Admin access denied.' });
    return;
  }
  next();
}

function requireOwner(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (!req.session) {
    res.status(401).json({ error: 'Owner authentication required.' });
    return;
  }
  if (req.session.role !== 'owner') {
    res.status(403).json({ error: 'Owner access denied.' });
    return;
  }
  next();
}

function isPortalLicenseBlocked(): string | null {
  const summary = getPublicLicenseSummary();
  if (summary.status === 'Suspended' || summary.status === 'Expired') {
    return `Portal license (${summary.licenseKey}) is ${summary.status}. Contact ${summary.licensor} (₹${summary.price}/${summary.billingCycle}) to renew access.`;
  }
  return null;
}

function stripQuestionSolutions(q: QuestionItem): QuestionItem {
  return {
    ...q,
    correctAnswer: '',
    explanation: '',
    formulaNote: '',
  };
}

app.use(attachSession);

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ ok: true });
});

// Public bootstrap (safe public data only)
app.get('/api/public/bootstrap', (_req: Request, res: Response) => {
  const settings = getSettings();
  const courses = listOrdered<CoursePackage>('courses').filter((c) => c.status === 'LIVE');
  const testSeries = listOrdered<TestSeriesPackage>('test_series').filter(
    (t) => t.status === 'Active'
  );
  const batches = listOrdered<BatchRecord>('batches').filter((b) => b.status === 'Active');
  const folders = listOrdered<TestFolder>('folders');
  const exams = listOrdered<ExamPaper>('exams').filter((e) => e.status === 'Live');
  const questions = listOrdered<QuestionItem>('questions');
  res.json({
    settings,
    courses,
    testSeries,
    batches,
    folders,
    liveExams: exams,
    license: getPublicLicenseSummary(),
    stats: {
      examCount: exams.length,
      questionCount: questions.length,
    },
  });
});

function findPublicExam(exams: ExamPaper[], rawId: string): ExamPaper | undefined {
  const target = rawId.trim();
  if (!target) return undefined;
  const lower = target.toLowerCase();
  const compact = lower.replace(/[^a-z0-9]/g, '');
  return (
    exams.find((e) => e.id === target || e.code.toLowerCase() === lower) ??
    exams.find((e) => e.code.toLowerCase().replace(/[^a-z0-9]/g, '') === compact) ??
    exams.find((e) => e.title.toLowerCase().replace(/[^a-z0-9]/g, '') === compact)
  );
}

// Public Shared Exam landing metadata
app.get('/api/public/exams/:id', (req: Request, res: Response) => {
  const examId = decodeURIComponent(String(req.params.id || '')).trim();
  const exams = listOrdered<ExamPaper>('exams');
  const exam = findPublicExam(exams, examId);
  if (!exam) {
    res.status(404).json({ error: 'Examination not found.' });
    return;
  }
  const folders = listOrdered<TestFolder>('folders');
  const folder = folders.find((f) => f.id === exam.folderId) ?? null;
  const allQuestions = listOrdered<QuestionItem>('questions');
  const examQuestions = exam.questionIds
    .map((id) => allQuestions.find((q) => q.id === id))
    .filter((q): q is QuestionItem => Boolean(q));
  const subjects = [...new Set(examQuestions.map((q) => q.subject))];
  res.json({
    exam,
    folder,
    questionCount: examQuestions.length,
    subjects,
    settings: getSettings(),
  });
});

// Self-hydrating shared exam import (inserts ONLY if missing so cross-instance shared links never 404)
app.post('/api/public/exams/hydrate', (req: Request, res: Response) => {
  const body = req.body as {
    exam?: Partial<ExamPaper>;
    questions?: Partial<QuestionItem>[];
    folder?: Partial<TestFolder> | null;
  };
  const rawExam = body.exam;
  const rawQuestions = Array.isArray(body.questions) ? body.questions.slice(0, 100) : [];
  if (!rawExam || !String(rawExam.id || '').trim() || !String(rawExam.title || '').trim()) {
    res.status(400).json({ error: 'Invalid shared exam payload.' });
    return;
  }

  const exams = listOrdered<ExamPaper>('exams');
  const existing = findPublicExam(exams, String(rawExam.id));
  if (existing) {
    const folders = listOrdered<TestFolder>('folders');
    const folder = folders.find((f) => f.id === existing.folderId) ?? null;
    const allQuestions = listOrdered<QuestionItem>('questions');
    const eqs = existing.questionIds
      .map((id) => allQuestions.find((q) => q.id === id))
      .filter((q): q is QuestionItem => Boolean(q));
    res.json({
      exam: existing,
      folder,
      questionCount: eqs.length,
      subjects: [...new Set(eqs.map((q) => q.subject))],
      settings: getSettings(),
    });
    return;
  }

  const folderId = String(rawExam.folderId || body.folder?.id || 'folder-1').trim();
  const existingFolders = listOrdered<TestFolder>('folders');
  let folder = existingFolders.find((f) => f.id === folderId) ?? null;
  if (!folder && body.folder && String(body.folder.name || '').trim()) {
    folder = {
      id: folderId,
      name: String(body.folder.name).trim(),
      description: String(body.folder.description || '').trim(),
      category: String(body.folder.category || 'JEE Main').trim(),
      subject: String(body.folder.subject || rawExam.subject || 'PCM').trim(),
      targetClass: body.folder.targetClass || rawExam.targetClass || '11th',
      createdAt: String(body.folder.createdAt || new Date().toISOString().slice(0, 10)),
    };
    insertAtTop('folders', folder);
  }

  const existingQuestions = listOrdered<QuestionItem>('questions');
  const existingQIds = new Set(existingQuestions.map((q) => q.id));
  const savedQuestionIds: string[] = [];

  for (const rq of rawQuestions) {
    const qId = String(rq.id || '').trim();
    if (!qId) continue;
    const text = String(rq.questionText || '').trim();
    const rawImg = typeof rq.imageDataUrl === 'string' ? rq.imageDataUrl.trim() : '';
    const imageDataUrl = rawImg.startsWith('data:image/') ? rawImg : undefined;
    if (!text && !imageDataUrl) continue;

    if (!existingQIds.has(qId)) {
      const sanitizedQ: QuestionItem = {
        id: qId,
        code: String(rq.code || `GC-SH-${savedQuestionIds.length + 1}`).trim(),
        subject: rq.subject || 'Mathematics',
        topic: String(rq.topic || 'Shared Test').trim(),
        type: rq.type === 'numerical' ? 'numerical' : 'single_choice',
        difficulty: rq.difficulty || 'Moderate',
        targetClass:
          rq.targetClass || (rawExam.targetClass && rawExam.targetClass !== 'All' ? rawExam.targetClass : '11th'),
        questionText: text,
        imageDataUrl,
        formulaNote: String(rq.formulaNote || '').trim(),
        options: Array.isArray(rq.options) ? rq.options.slice(0, 6) : [],
        correctAnswer: String(rq.correctAnswer || 'A').trim(),
        marksPositive: Number(rq.marksPositive) || 4,
        marksNegative: rq.type === 'numerical' ? 0 : (Number(rq.marksNegative) ?? -1),
        explanation: String(rq.explanation || 'Standard derivation.').trim(),
        createdAt: String(rq.createdAt || new Date().toISOString().slice(0, 10)),
      };
      insertAtTop('questions', sanitizedQ);
      existingQIds.add(qId);
    }
    savedQuestionIds.push(qId);
  }

  const hydratedExam: ExamPaper = {
    id: String(rawExam.id).trim(),
    title: String(rawExam.title).trim(),
    code: String(rawExam.code || `GC-SH-${Date.now().toString().slice(-4)}`).trim(),
    folderId,
    subject: rawExam.subject || 'PCM',
    examTag: rawExam.examTag ? String(rawExam.examTag).trim() : undefined,
    targetClass: rawExam.targetClass || '11th',
    durationMinutes: Number(rawExam.durationMinutes) || 60,
    passingMarks: Number(rawExam.passingMarks) || 0,
    allowedTabSwitches: Number(rawExam.allowedTabSwitches) || 3,
    webcamRequired: rawExam.webcamRequired ?? true,
    randomizeQuestions: rawExam.randomizeQuestions ?? false,
    status: rawExam.status === 'Draft' ? 'Draft' : 'Live',
    questionIds:
      savedQuestionIds.length > 0
        ? savedQuestionIds
        : Array.isArray(rawExam.questionIds)
        ? rawExam.questionIds
        : [],
    marksPositive: Number(rawExam.marksPositive) || 4,
    marksNegative: Number(rawExam.marksNegative) ?? -1,
    instructions: Array.isArray(rawExam.instructions)
      ? rawExam.instructions
      : ['Read each question carefully.'],
    startTime: String(rawExam.startTime || new Date().toISOString().slice(0, 16)),
    endTime: String(rawExam.endTime || '2026-12-31T23:59'),
    createdAt: String(rawExam.createdAt || new Date().toISOString().slice(0, 10)),
  };
  insertAtTop('exams', hydratedExam);

  res.status(201).json({
    exam: hydratedExam,
    folder,
    questionCount: hydratedExam.questionIds.length,
    subjects: [...new Set(rawQuestions.map((q) => q.subject).filter(Boolean))],
    settings: getSettings(),
  });
});

// Public Quick Join registration + immediate CBT launch
app.post('/api/public/quick-join', (req: Request, res: Response) => {
  const body = req.body as {
    name?: string;
    phone?: string;
    collegeName?: string;
    targetClass?: string;
    rollNo?: string;
    examId?: string;
  };
  const name = String(body.name || '').trim();
  const phoneDigits = String(body.phone || '').replace(/\D/g, '');
  const collegeName = String(body.collegeName || '').trim() || 'Open Candidate';
  const targetClass = String(body.targetClass || '11th').trim();
  const examId = String(body.examId || '').trim();

  if (name.length < 2) {
    res.status(400).json({ error: 'Please enter candidate full name.' });
    return;
  }
  if (phoneDigits.length < 10) {
    res.status(400).json({ error: 'Please enter a valid 10-digit mobile number.' });
    return;
  }

  const licenseBlocked = isPortalLicenseBlocked();
  if (licenseBlocked) {
    res.status(403).json({ error: licenseBlocked });
    return;
  }

  const exams = listOrdered<ExamPaper>('exams');
  const exam = findPublicExam(exams, examId) ?? exams[0];
  if (!exam) {
    res.status(404).json({ error: 'Requested examination does not exist.' });
    return;
  }

  const allStudents = listStudents();
  const existing = allStudents.find(
    (s) => s.phone.replace(/\D/g, '') === phoneDigits && s.isQuickJoin
  );

  let student: StudentRecord;
  if (existing) {
    student = {
      ...existing,
      name,
      collegeName,
      targetExam: `${targetClass} IIT-JEE / CET`,
      assignedExamId: exam.id,
      assignedExamTitle: exam.title,
    };
    db.prepare('UPDATE students SET data = ? WHERE id = ?').run(
      JSON.stringify(student),
      student.id
    );
  } else {
    const rollNo =
      String(body.rollNo || '').trim() || `GC-QJ-${Math.floor(1000 + Math.random() * 9000)}`;
    const username = `g_${phoneDigits.slice(-10)}`;
    student = {
      id: `student-qj-${Date.now()}`,
      rollNo,
      username,
      name,
      batchId: '',
      batchName: 'Quick Join Candidate',
      targetExam: `${targetClass} IIT-JEE / CET`,
      phone: phoneDigits.slice(-10),
      email: `${phoneDigits.slice(-10)}@quickjoin.gurukul.edu`,
      collegeName,
      isQuickJoin: true,
      assignedExamId: exam.id,
      assignedExamTitle: exam.title,
      joinedDate: new Date().toISOString().slice(0, 10),
    };
    const minRow = db.prepare('SELECT COALESCE(MIN(sort_order), 1) AS m FROM students').get() as {
      m: number;
    };
    db.prepare(
      'INSERT INTO students (id, roll_no, username, email, phone, pin_hash, sort_order, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      student.id,
      student.rollNo,
      student.username,
      student.email,
      student.phone,
      null,
      minRow.m - 1,
      JSON.stringify(student)
    );
  }

  const token = createSession('student', student.id, student.email);
  const allQuestions = listOrdered<QuestionItem>('questions');
  const examQuestions = exam.questionIds
    .map((id) => allQuestions.find((q) => q.id === id))
    .filter((q): q is QuestionItem => Boolean(q))
    .map(stripQuestionSolutions);

  res.status(201).json({
    token,
    student,
    exam,
    questions: examQuestions,
  });
});

// Public Parent Scorecard link
app.get('/api/public/scorecard/:attemptId', (req: Request, res: Response) => {
  const attemptId = String(req.params.attemptId || '').trim();
  const row = db.prepare('SELECT data FROM attempts WHERE id = ?').get(attemptId) as
    | { data: string }
    | undefined;
  if (!row) {
    res.status(404).json({ error: 'Scorecard not found.' });
    return;
  }
  const attempt = JSON.parse(row.data) as ExamAttempt;
  const exams = listOrdered<ExamPaper>('exams');
  const exam = exams.find((e) => e.id === attempt.examId);
  const questions = listOrdered<QuestionItem>('questions');
  res.json({
    attempt,
    exam: exam ?? null,
    questions,
    settings: getSettings(),
  });
});

// Admin Auth Status & First-Run Setup
app.get('/api/auth/admin/status', (_req: Request, res: Response) => {
  const adminRow = db.prepare('SELECT email FROM admin_auth WHERE id = 1').get() as
    | { email: string }
    | undefined;
  const settings = getSettings();
  res.json({
    configured: Boolean(adminRow),
    email: adminRow?.email || settings.email,
  });
});

app.post('/api/auth/admin/setup', (req: Request, res: Response) => {
  const existing = db.prepare('SELECT id FROM admin_auth WHERE id = 1').get();
  if (existing) {
    res.status(409).json({ error: 'Admin passcode is already configured. Please sign in.' });
    return;
  }
  const body = req.body as { email?: string; passcode?: string };
  const settings = getSettings();
  const email = String(body.email || settings.email)
    .trim()
    .toLowerCase();
  const passcode = String(body.passcode || '').trim();
  if (!email.includes('@')) {
    res.status(400).json({ error: 'Enter a valid administrator email address.' });
    return;
  }
  if (passcode.length < 6) {
    res.status(400).json({ error: 'Passcode must be at least 6 characters.' });
    return;
  }
  db.prepare(
    'INSERT INTO admin_auth (id, email, passcode_hash, updated_at) VALUES (1, ?, ?, ?)'
  ).run(email, hashSecret(passcode), new Date().toISOString());
  const token = createSession('admin', 'admin-1', email);
  res.status(201).json({ token, role: 'admin', email });
});

app.post('/api/auth/admin/login', (req: Request, res: Response) => {
  const body = req.body as { email?: string; passcode?: string };
  const email = String(body.email || '')
    .trim()
    .toLowerCase();
  const passcode = String(body.passcode || '').trim();
  const adminRow = db.prepare('SELECT email, passcode_hash FROM admin_auth WHERE id = 1').get() as
    | { email: string; passcode_hash: string }
    | undefined;
  if (!adminRow) {
    res.status(400).json({ error: 'Admin passcode is not configured yet. Complete initial setup first.' });
    return;
  }
  if (email !== adminRow.email.toLowerCase() || !verifySecret(passcode, adminRow.passcode_hash)) {
    res.status(401).json({ error: 'Invalid administrator email or passcode.' });
    return;
  }
  const token = createSession('admin', 'admin-1', adminRow.email);
  res.json({ token, role: 'admin', email: adminRow.email });
});

app.post('/api/auth/admin/change-passcode', requireAdmin, (req: AuthedRequest, res: Response) => {
  const body = req.body as { currentPasscode?: string; newPasscode?: string; email?: string };
  const currentPasscode = String(body.currentPasscode || '').trim();
  const newPasscode = String(body.newPasscode || '').trim();
  const adminRow = db.prepare('SELECT email, passcode_hash FROM admin_auth WHERE id = 1').get() as
    | { email: string; passcode_hash: string }
    | undefined;
  if (!adminRow || !verifySecret(currentPasscode, adminRow.passcode_hash)) {
    res.status(401).json({ error: 'Current passcode is incorrect.' });
    return;
  }
  if (newPasscode.length < 6) {
    res.status(400).json({ error: 'New passcode must be at least 6 characters.' });
    return;
  }
  const nextEmail = String(body.email || adminRow.email)
    .trim()
    .toLowerCase();
  db.prepare('UPDATE admin_auth SET email = ?, passcode_hash = ?, updated_at = ? WHERE id = 1').run(
    nextEmail,
    hashSecret(newPasscode),
    new Date().toISOString()
  );
  res.json({ ok: true });
});

// Student Authentication & Signup
app.post('/api/auth/student/login', (req: Request, res: Response) => {
  const body = req.body as { identifier?: string; password?: string };
  const query = String(body.identifier || '')
    .trim()
    .toLowerCase();
  const password = String(body.password || '').trim();

  if (!query) {
    res.status(400).json({ error: 'Enter your Roll Number, Username, or Email.' });
    return;
  }

  const row = db
    .prepare(
      'SELECT id, pin_hash, data FROM students WHERE LOWER(roll_no) = ? OR LOWER(username) = ? OR LOWER(email) = ? OR phone = ?'
    )
    .get(query, query, query, query) as
    | { id: string; pin_hash: string | null; data: string }
    | undefined;

  if (!row) {
    res.status(401).json({ error: 'No student account matched that Roll No or Username.' });
    return;
  }
  if (row.pin_hash && (!password || !verifySecret(password, row.pin_hash))) {
    res.status(401).json({ error: 'Incorrect student password.' });
    return;
  }
  const student = JSON.parse(row.data) as StudentRecord;
  const token = createSession('student', student.id, student.email);
  res.json({ token, role: 'student', student });
});

app.post('/api/auth/student/signup', (req: Request, res: Response) => {
  const body = req.body as {
    name?: string;
    phone?: string;
    email?: string;
    password?: string;
    batchId?: string;
    collegeName?: string;
  };
  const name = String(body.name || '').trim();
  const phoneDigits = String(body.phone || '').replace(/\D/g, '');
  const password = String(body.password || '').trim();
  if (name.length < 2) {
    res.status(400).json({ error: 'Enter full student name.' });
    return;
  }
  if (phoneDigits.length !== 10) {
    res.status(400).json({ error: 'Enter a valid 10-digit mobile number.' });
    return;
  }
  const batches = listOrdered<BatchRecord>('batches');
  const batch = batches.find((b) => b.id === body.batchId) ?? batches[0];
  const allStudents = listStudents();
  const nextNum = 100 + allStudents.length + 1;
  const slug = name.split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, '') || 'student';
  const rollNo = `GC-2026-0${nextNum}`;
  const username = `${slug}${nextNum}`;
  const email = String(body.email || `${username}@student.gurukul.edu`).trim().toLowerCase();

  const student: StudentRecord = {
    id: `student-${Date.now()}`,
    rollNo,
    username,
    name,
    batchId: batch?.id ?? 'batch-jee-main',
    batchName: batch?.name ?? 'JEE Main Target 2026',
    targetExam: batch?.targetExam ?? 'JEE Main 2026',
    phone: phoneDigits,
    email,
    collegeName: String(body.collegeName || '').trim() || undefined,
    joinedDate: new Date().toISOString().slice(0, 10),
  };

  const pinHash = password.length >= 4 ? hashSecret(password) : null;
  const minRow = db.prepare('SELECT COALESCE(MIN(sort_order), 1) AS m FROM students').get() as {
    m: number;
  };
  db.prepare(
    'INSERT INTO students (id, roll_no, username, email, phone, pin_hash, sort_order, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    student.id,
    student.rollNo,
    student.username,
    student.email,
    student.phone,
    pinHash,
    minRow.m - 1,
    JSON.stringify(student)
  );

  const token = createSession('student', student.id, student.email);
  res.status(201).json({ token, role: 'student', student });
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  const token = extractBearer(req);
  if (token) deleteSession(token);
  res.json({ ok: true });
});

// Student Workspace & Actions
app.get('/api/student/workspace', requireAuth, (req: AuthedRequest, res: Response) => {
  const sess = req.session!;
  const requestedStudentId =
    sess.role === 'admin' && typeof req.query.studentId === 'string'
      ? req.query.studentId
      : sess.subjectId;
  const students = listStudents();
  const student = students.find((s) => s.id === requestedStudentId) ?? students[0];
  if (!student) {
    res.status(404).json({ error: 'Student profile not found.' });
    return;
  }
  const exams = listOrdered<ExamPaper>('exams').filter((e) => e.status === 'Live');
  const folders = listOrdered<TestFolder>('folders');
  const attempts = listAttempts().filter(
    (a) => a.studentId === student.id || a.rollNo === student.rollNo
  );
  const announcements = listOrdered<Announcement>('announcements');
  const materials = listOrdered<StudyMaterial>('materials');
  const courses = listOrdered<CoursePackage>('courses').filter((c) => c.status === 'LIVE');
  const testSeries = listOrdered<TestSeriesPackage>('test_series').filter(
    (t) => t.status === 'Active'
  );
  const payments = listPayments().filter(
    (p) =>
      p.studentId === student.id || p.rollNo.toLowerCase() === student.rollNo.toLowerCase()
  );

  res.json({
    settings: getSettings(),
    student,
    exams,
    folders,
    attempts,
    announcements,
    materials,
    courses,
    testSeries,
    payments,
    license: getPublicLicenseSummary(),
  });
});

app.get('/api/student/exams/:id/questions', requireAuth, (req: AuthedRequest, res: Response) => {
  if (req.session?.role === 'student') {
    const licenseBlocked = isPortalLicenseBlocked();
    if (licenseBlocked) {
      res.status(403).json({ error: licenseBlocked });
      return;
    }
  }
  const examId = String(req.params.id || '').trim();
  const exams = listOrdered<ExamPaper>('exams');
  const exam = exams.find((e) => e.id === examId);
  if (!exam) {
    res.status(404).json({ error: 'Exam not found.' });
    return;
  }
  const allQuestions = listOrdered<QuestionItem>('questions');
  const questions = exam.questionIds
    .map((id) => allQuestions.find((q) => q.id === id))
    .filter((q): q is QuestionItem => Boolean(q))
    .map((q) => (req.session?.role === 'admin' ? q : stripQuestionSolutions(q)));
  res.json({ exam, questions });
});

app.post('/api/attempts', requireAuth, (req: AuthedRequest, res: Response) => {
  const sess = req.session!;
  const body = req.body as {
    examId?: string;
    studentId?: string;
    answers?: Record<string, string>;
    markedForReview?: string[];
    tabSwitches?: number;
    timeTakenMinutes?: number;
  };
  const exams = listOrdered<ExamPaper>('exams');
  const exam = exams.find((e) => e.id === body.examId);
  if (!exam) {
    res.status(404).json({ error: 'Exam not found.' });
    return;
  }

  const students = listStudents();
  const targetStudentId =
    sess.role === 'admin' && body.studentId ? body.studentId : sess.subjectId;
  const student = students.find((s) => s.id === targetStudentId) ?? students[0];
  if (!student) {
    res.status(404).json({ error: 'Student not found.' });
    return;
  }

  const allQuestions = listOrdered<QuestionItem>('questions');
  const examQuestions = exam.questionIds
    .map((id) => allQuestions.find((q) => q.id === id))
    .filter((q): q is QuestionItem => Boolean(q));

  const answers = body.answers && typeof body.answers === 'object' ? body.answers : {};
  let score = 0;
  let maxScore = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  let unattemptedCount = 0;

  examQuestions.forEach((q) => {
    const pos = q.marksPositive || exam.marksPositive;
    const neg = q.type === 'numerical' ? 0 : (q.marksNegative ?? exam.marksNegative);
    maxScore += pos;
    const given = String(answers[q.id] ?? '').trim();
    if (!given) {
      unattemptedCount += 1;
      return;
    }
    if (q.type === 'numerical') {
      const expectedNum = Number.parseFloat(q.correctAnswer);
      const givenNum = Number.parseFloat(given);
      if (
        !Number.isNaN(expectedNum) &&
        !Number.isNaN(givenNum) &&
        Math.abs(expectedNum - givenNum) <= 0.05
      ) {
        score += pos;
        correctCount += 1;
      } else {
        score += neg;
        incorrectCount += 1;
      }
    } else if (given.toUpperCase() === q.correctAnswer.toUpperCase()) {
      score += pos;
      correctCount += 1;
    } else {
      score += neg;
      incorrectCount += 1;
    }
  });

  const attempted = correctCount + incorrectCount;
  const accuracy = attempted > 0 ? Math.round((correctCount / attempted) * 100) : 0;

  const attempt: ExamAttempt = {
    id: `att-${Date.now()}`,
    examId: exam.id,
    examTitle: exam.title,
    examCode: exam.code,
    studentId: student.id,
    studentName: student.name,
    rollNo: student.rollNo,
    answers,
    markedForReview: Array.isArray(body.markedForReview) ? body.markedForReview : [],
    score,
    maxScore,
    manualAdjustment: 0,
    correctCount,
    incorrectCount,
    unattemptedCount,
    accuracy,
    tabSwitches: Math.max(0, Number(body.tabSwitches) || 0),
    timeTakenMinutes: Math.max(1, Number(body.timeTakenMinutes) || 1),
    status: 'Evaluated',
    submittedAt: new Date().toISOString(),
  };

  db.prepare(
    'INSERT INTO attempts (id, exam_id, student_id, submitted_at, data) VALUES (?, ?, ?, ?, ?)'
  ).run(attempt.id, attempt.examId, attempt.studentId, attempt.submittedAt, JSON.stringify(attempt));

  res.status(201).json({
    attempt,
    exam,
    questions: examQuestions,
  });
});

app.get('/api/attempts/:id/solutions', requireAuth, (req: AuthedRequest, res: Response) => {
  const attemptId = String(req.params.id || '').trim();
  const row = db.prepare('SELECT data FROM attempts WHERE id = ?').get(attemptId) as
    | { data: string }
    | undefined;
  if (!row) {
    res.status(404).json({ error: 'Attempt not found.' });
    return;
  }
  const attempt = JSON.parse(row.data) as ExamAttempt;
  if (req.session!.role !== 'admin' && attempt.studentId !== req.session!.subjectId) {
    res.status(403).json({ error: 'Access denied.' });
    return;
  }
  const exams = listOrdered<ExamPaper>('exams');
  const exam = exams.find((e) => e.id === attempt.examId) ?? null;
  const questions = listOrdered<QuestionItem>('questions');
  res.json({ attempt, exam, questions });
});

app.put('/api/student/profile', requireAuth, (req: AuthedRequest, res: Response) => {
  const sess = req.session!;
  const body = req.body as { name?: string; phone?: string; targetExam?: string };
  const row = db.prepare('SELECT data FROM students WHERE id = ?').get(sess.subjectId) as
    | { data: string }
    | undefined;
  if (!row) {
    res.status(404).json({ error: 'Student record not found.' });
    return;
  }
  const existing = JSON.parse(row.data) as StudentRecord;
  const updated: StudentRecord = {
    ...existing,
    name: String(body.name || existing.name).trim() || existing.name,
    phone: String(body.phone || existing.phone).trim() || existing.phone,
    targetExam: String(body.targetExam || existing.targetExam).trim() || existing.targetExam,
  };
  db.prepare('UPDATE students SET phone = ?, data = ? WHERE id = ?').run(
    updated.phone,
    JSON.stringify(updated),
    updated.id
  );
  res.json({ student: updated });
});

app.post('/api/materials/:id/download', (req: Request, res: Response) => {
  const id = String(req.params.id || '').trim();
  const row = db.prepare('SELECT data FROM materials WHERE id = ?').get(id) as
    | { data: string }
    | undefined;
  if (!row) {
    res.status(404).json({ error: 'Study material not found.' });
    return;
  }
  const mat = JSON.parse(row.data) as StudyMaterial;
  const updated: StudyMaterial = { ...mat, downloadCount: mat.downloadCount + 1 };
  updateRowData('materials', updated);
  res.json({ material: updated });
});

app.post('/api/payments', (req: AuthedRequest, res: Response) => {
  const body = req.body as {
    itemName?: string;
    itemType?: PaymentRecord['itemType'];
    amount?: number;
    utr?: string;
    paymentMode?: PaymentRecord['paymentMode'];
    studentName?: string;
    rollNo?: string;
  };
  const utr = String(body.utr || '').trim();
  const studentName = String(body.studentName || '').trim();
  if (utr.length < 8) {
    res.status(400).json({ error: 'Valid 8–16 character UTR reference is required.' });
    return;
  }
  if (studentName.length < 2) {
    res.status(400).json({ error: 'Student name is required.' });
    return;
  }
  const payment: PaymentRecord = {
    id: `pay-${Date.now()}`,
    studentId: req.session?.role === 'student' ? req.session.subjectId : 'guest',
    studentName,
    rollNo: String(body.rollNo || 'GUEST').trim() || 'GUEST',
    itemName: String(body.itemName || 'Course Enrollment').trim(),
    itemType: body.itemType === 'Test Series' ? 'Test Series' : 'Course',
    amount: Math.max(1, Number(body.amount) || 0),
    utr,
    paymentMode: body.paymentMode === 'Bank Transfer' ? 'Bank Transfer' : 'UPI',
    status: 'Pending',
    submittedAt: new Date().toISOString().slice(0, 10),
  };
  db.prepare(
    'INSERT INTO payments (id, student_id, submitted_at, data) VALUES (?, ?, ?, ?)'
  ).run(payment.id, payment.studentId, payment.submittedAt, JSON.stringify(payment));
  res.status(201).json({ payment });
});

// ======================== ADMIN PROTECTED ROUTES ========================

app.get('/api/admin/workspace', requireAdmin, (_req: AuthedRequest, res: Response) => {
  res.json({
    settings: getSettings(),
    students: listStudents(),
    teachers: listOrdered<TeacherRecord>('teachers'),
    batches: listOrdered<BatchRecord>('batches'),
    folders: listOrdered<TestFolder>('folders'),
    questions: listOrdered<QuestionItem>('questions'),
    exams: listOrdered<ExamPaper>('exams'),
    attempts: listAttempts(),
    attendance: listAttendance(),
    materials: listOrdered<StudyMaterial>('materials'),
    announcements: listOrdered<Announcement>('announcements'),
    courses: listOrdered<CoursePackage>('courses'),
    testSeries: listOrdered<TestSeriesPackage>('test_series'),
    payments: listPayments(),
    license: getPublicLicenseSummary(),
  });
});

app.put('/api/admin/settings', requireAdmin, (req: AuthedRequest, res: Response) => {
  const body = req.body as Partial<InstituteSettings>;
  const current = getSettings();
  const next: InstituteSettings = {
    ...current,
    instituteName: String(body.instituteName ?? current.instituteName).trim() || current.instituteName,
    tagline: String(body.tagline ?? current.tagline).trim(),
    heroTitle: String(body.heroTitle ?? current.heroTitle).trim(),
    heroSubtitle: String(body.heroSubtitle ?? current.heroSubtitle).trim(),
    primaryCta: String(body.primaryCta ?? current.primaryCta).trim(),
    secondaryCta: String(body.secondaryCta ?? current.secondaryCta).trim(),
    email: String(body.email ?? current.email).trim(),
    phone: String(body.phone ?? current.phone).trim(),
    address: String(body.address ?? current.address).trim(),
    upiId: String(body.upiId ?? current.upiId).trim(),
    bankName: String(body.bankName ?? current.bankName).trim(),
    accountNo: String(body.accountNo ?? current.accountNo).trim(),
    ifsc: String(body.ifsc ?? current.ifsc).trim(),
  };
  saveSettings(next);
  res.json({ settings: next });
});

// Admin Students CRUD
app.post('/api/admin/students', requireAdmin, (req: AuthedRequest, res: Response) => {
  const body = req.body as Partial<StudentRecord>;
  const name = String(body.name || '').trim();
  if (!name) {
    res.status(400).json({ error: 'Student name is required.' });
    return;
  }
  const allStudents = listStudents();
  const num = 101 + allStudents.length;
  const student: StudentRecord = {
    id: body.id || `student-${Date.now()}`,
    rollNo: body.rollNo || `GC-2026-0${num}`,
    username: body.username || `${name.split(/\s+/)[0].toLowerCase()}${num}`,
    name,
    batchId: body.batchId || 'batch-jee-main',
    batchName: body.batchName || 'JEE Main Target 2026',
    targetExam: body.targetExam || 'JEE Main 2026',
    phone: String(body.phone || '9800000000').trim(),
    email:
      body.email || `${name.split(/\s+/)[0].toLowerCase()}${num}@student.gurukul.edu`,
    collegeName: body.collegeName,
    joinedDate: body.joinedDate || new Date().toISOString().slice(0, 10),
  };
  const minRow = db.prepare('SELECT COALESCE(MIN(sort_order), 1) AS m FROM students').get() as {
    m: number;
  };
  db.prepare(
    'INSERT INTO students (id, roll_no, username, email, phone, pin_hash, sort_order, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    student.id,
    student.rollNo,
    student.username,
    student.email,
    student.phone,
    null,
    minRow.m - 1,
    JSON.stringify(student)
  );
  res.status(201).json({ student });
});

app.delete('/api/admin/students/:id', requireAdmin, (req: AuthedRequest, res: Response) => {
  deleteById('students', String(req.params.id));
  res.json({ ok: true });
});

// Admin Teachers CRUD
app.post('/api/admin/teachers', requireAdmin, (req: AuthedRequest, res: Response) => {
  const body = req.body as Partial<TeacherRecord>;
  if (!String(body.name || '').trim()) {
    res.status(400).json({ error: 'Teacher name is required.' });
    return;
  }
  const teacher: TeacherRecord = {
    id: body.id || `teacher-${Date.now()}`,
    name: String(body.name).trim(),
    role: String(body.role || 'Faculty').trim(),
    qualification: String(body.qualification || 'M.Sc. / B.Tech').trim(),
    specialization: String(body.specialization || 'Core Subject Mentoring').trim(),
    phone: String(body.phone || '+91 98000 00000').trim(),
    assignedBatchIds: Array.isArray(body.assignedBatchIds) ? body.assignedBatchIds : [],
  };
  insertAtTop('teachers', teacher);
  res.status(201).json({ teacher });
});

app.delete('/api/admin/teachers/:id', requireAdmin, (req: AuthedRequest, res: Response) => {
  deleteById('teachers', String(req.params.id));
  res.json({ ok: true });
});

// Admin Batches CRUD
app.post('/api/admin/batches', requireAdmin, (req: AuthedRequest, res: Response) => {
  const body = req.body as Partial<BatchRecord>;
  if (!String(body.name || '').trim()) {
    res.status(400).json({ error: 'Batch name is required.' });
    return;
  }
  const batches = listOrdered<BatchRecord>('batches');
  const batch: BatchRecord = {
    id: body.id || `batch-${Date.now()}`,
    code: body.code || `GC-${batches.length + 1}0`,
    name: String(body.name).trim(),
    targetExam: String(body.targetExam || 'JEE / NEET').trim(),
    schedule: String(body.schedule || '04:00 PM – 06:30 PM (Mon–Sat)').trim(),
    status: body.status === 'Archived' ? 'Archived' : 'Active',
    description: String(body.description || 'Academic coaching batch.').trim(),
    startDate: body.startDate || new Date().toISOString().slice(0, 10),
  };
  insertAtTop('batches', batch);
  res.status(201).json({ batch });
});

app.delete('/api/admin/batches/:id', requireAdmin, (req: AuthedRequest, res: Response) => {
  deleteById('batches', String(req.params.id));
  res.json({ ok: true });
});

// Admin Exam Folders CRUD
app.post('/api/admin/folders', requireAdmin, (req: AuthedRequest, res: Response) => {
  const body = req.body as Partial<TestFolder>;
  if (!String(body.name || '').trim()) {
    res.status(400).json({ error: 'Folder name is required.' });
    return;
  }
  const folder: TestFolder = {
    id: body.id || `folder-${Date.now()}`,
    name: String(body.name).trim(),
    description: String(body.description || '').trim(),
    category: String(body.category || 'JEE Main').trim(),
    subject: String(body.subject || 'PCM').trim(),
    targetClass: body.targetClass || '11th',
    createdAt: new Date().toISOString().slice(0, 10),
  };
  insertAtTop('folders', folder);
  res.status(201).json({ folder });
});

app.delete('/api/admin/folders/:id', requireAdmin, (req: AuthedRequest, res: Response) => {
  deleteById('folders', String(req.params.id));
  res.json({ ok: true });
});

// Admin Questions CRUD & Bulk PDF/Image Import
app.post('/api/admin/questions', requireAdmin, (req: AuthedRequest, res: Response) => {
  const body = req.body as Partial<QuestionItem> & { attachToExamId?: string };
  const text = String(body.questionText || '').trim();
  const rawImg = typeof body.imageDataUrl === 'string' ? body.imageDataUrl.trim() : '';
  const imageDataUrl = rawImg.startsWith('data:image/') ? rawImg : undefined;

  if (!text && !imageDataUrl) {
    res.status(400).json({ error: 'Question text or question image is required.' });
    return;
  }
  const existing = listOrdered<QuestionItem>('questions');
  const subject = body.subject || 'Mathematics';
  const q: QuestionItem = {
    id: body.id || `q-${Date.now()}`,
    code: body.code || `GC-${subject.slice(0, 4).toUpperCase()}-${existing.length + 1}`,
    subject,
    topic: String(body.topic || (imageDataUrl ? 'Image Question' : 'General')).trim(),
    type: body.type === 'numerical' ? 'numerical' : 'single_choice',
    difficulty: body.difficulty || 'Moderate',
    targetClass: body.targetClass || '11th',
    questionText: text,
    imageDataUrl,
    formulaNote: String(body.formulaNote || '').trim(),
    options: Array.isArray(body.options) ? body.options : [],
    correctAnswer: String(body.correctAnswer || 'A').trim(),
    marksPositive: Number(body.marksPositive) || 4,
    marksNegative: body.type === 'numerical' ? 0 : (Number(body.marksNegative) ?? -1),
    explanation: String(body.explanation || 'Standard derivation.').trim(),
    createdAt: new Date().toISOString().slice(0, 10),
  };
  insertAtTop('questions', q);

  let updatedExam: ExamPaper | null = null;
  if (body.attachToExamId) {
    const exams = listOrdered<ExamPaper>('exams');
    const targetExam = exams.find((e) => e.id === body.attachToExamId);
    if (targetExam && !targetExam.questionIds.includes(q.id)) {
      updatedExam = { ...targetExam, questionIds: [...targetExam.questionIds, q.id] };
      updateRowData('exams', updatedExam);
    }
  }
  res.status(201).json({ question: q, updatedExam });
});

app.post('/api/admin/questions/bulk', requireAdmin, (req: AuthedRequest, res: Response) => {
  const body = req.body as { items?: Partial<QuestionItem>[]; attachToExamId?: string };
  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) {
    res.status(400).json({ error: 'No questions supplied to import.' });
    return;
  }
  const existing = listOrdered<QuestionItem>('questions');
  const created: QuestionItem[] = [];
  items.forEach((raw, idx) => {
    const text = String(raw.questionText || '').trim();
    const rawImg = typeof raw.imageDataUrl === 'string' ? raw.imageDataUrl.trim() : '';
    const imageDataUrl = rawImg.startsWith('data:image/') ? rawImg : undefined;
    if (!text && !imageDataUrl) return;
    const subject = raw.subject || 'Mathematics';
    const q: QuestionItem = {
      id: `q-imp-${Date.now()}-${idx}`,
      code: raw.code || `GC-IMP-${existing.length + idx + 1}`,
      subject,
      topic: String(raw.topic || (imageDataUrl ? 'Image Question' : 'PDF Imported')).trim(),
      type: raw.type === 'numerical' ? 'numerical' : 'single_choice',
      difficulty: raw.difficulty || 'Moderate',
      targetClass: raw.targetClass || '11th',
      questionText: text,
      imageDataUrl,
      formulaNote: String(raw.formulaNote || '').trim(),
      options: Array.isArray(raw.options) ? raw.options : [],
      correctAnswer: String(raw.correctAnswer || 'A').trim(),
      marksPositive: Number(raw.marksPositive) || 4,
      marksNegative: raw.type === 'numerical' ? 0 : (Number(raw.marksNegative) ?? -1),
      explanation: String(raw.explanation || 'Imported question.').trim(),
      createdAt: new Date().toISOString().slice(0, 10),
    };
    insertAtTop('questions', q);
    created.push(q);
  });

  let updatedExam: ExamPaper | null = null;
  if (body.attachToExamId && created.length > 0) {
    const exams = listOrdered<ExamPaper>('exams');
    const targetExam = exams.find((e) => e.id === body.attachToExamId);
    if (targetExam) {
      updatedExam = {
        ...targetExam,
        questionIds: [...targetExam.questionIds, ...created.map((c) => c.id)],
      };
      updateRowData('exams', updatedExam);
    }
  }
  res.status(201).json({ questions: created, updatedExam });
});

app.delete('/api/admin/questions/:id', requireAdmin, (req: AuthedRequest, res: Response) => {
  const qId = String(req.params.id);
  deleteById('questions', qId);
  const exams = listOrdered<ExamPaper>('exams');
  exams.forEach((ex) => {
    if (ex.questionIds.includes(qId)) {
      updateRowData('exams', {
        ...ex,
        questionIds: ex.questionIds.filter((id) => id !== qId),
      });
    }
  });
  res.json({ ok: true });
});

// Admin Exams CRUD
app.post('/api/admin/exams', requireAdmin, (req: AuthedRequest, res: Response) => {
  const body = req.body as Partial<ExamPaper>;
  if (!String(body.title || '').trim()) {
    res.status(400).json({ error: 'Exam title is required.' });
    return;
  }
  const existing = listOrdered<ExamPaper>('exams');
  const ex: ExamPaper = {
    id: body.id || `exam-${Date.now()}`,
    title: String(body.title).trim(),
    code: String(body.code || `GC-EXAM-${existing.length + 1}`).trim(),
    folderId: String(body.folderId || 'folder-1'),
    subject: body.subject || 'PCM',
    examTag: body.examTag ? String(body.examTag).trim() : undefined,
    targetClass: body.targetClass || '11th',
    durationMinutes: Number(body.durationMinutes) || 60,
    passingMarks: Number(body.passingMarks) || 0,
    allowedTabSwitches: Number(body.allowedTabSwitches) || 3,
    webcamRequired: body.webcamRequired ?? true,
    randomizeQuestions: body.randomizeQuestions ?? false,
    status: body.status === 'Draft' ? 'Draft' : 'Live',
    questionIds: Array.isArray(body.questionIds) ? body.questionIds : [],
    marksPositive: Number(body.marksPositive) || 4,
    marksNegative: Number(body.marksNegative) ?? -1,
    instructions: Array.isArray(body.instructions)
      ? body.instructions
      : [
          `+${Number(body.marksPositive) || 4} marks for correct response, ${Number(body.marksNegative) ?? -1} for incorrect response.`,
        ],
    startTime: body.startTime || new Date().toISOString().slice(0, 16),
    endTime: body.endTime || '2026-12-31T23:59',
    createdAt: new Date().toISOString().slice(0, 10),
  };
  insertAtTop('exams', ex);
  res.status(201).json({ exam: ex });
});

app.put('/api/admin/exams/:id', requireAdmin, (req: AuthedRequest, res: Response) => {
  const id = String(req.params.id);
  const exams = listOrdered<ExamPaper>('exams');
  const found = exams.find((e) => e.id === id);
  if (!found) {
    res.status(404).json({ error: 'Exam not found.' });
    return;
  }
  const body = req.body as Partial<ExamPaper>;
  const updated: ExamPaper = { ...found, ...body, id: found.id };
  updateRowData('exams', updated);
  res.json({ exam: updated });
});

app.patch('/api/admin/exams/:id/toggle', requireAdmin, (req: AuthedRequest, res: Response) => {
  const id = String(req.params.id);
  const exams = listOrdered<ExamPaper>('exams');
  const found = exams.find((e) => e.id === id);
  if (!found) {
    res.status(404).json({ error: 'Exam not found.' });
    return;
  }
  const updated: ExamPaper = {
    ...found,
    status: found.status === 'Live' ? 'Draft' : 'Live',
  };
  updateRowData('exams', updated);
  res.json({ exam: updated });
});

app.delete('/api/admin/exams/:id', requireAdmin, (req: AuthedRequest, res: Response) => {
  deleteById('exams', String(req.params.id));
  res.json({ ok: true });
});

// Admin Attendance
app.post('/api/admin/attendance', requireAdmin, (req: AuthedRequest, res: Response) => {
  const body = req.body as Partial<AttendanceRecord>;
  const rec: AttendanceRecord = {
    id: body.id || `att-rec-${Date.now()}`,
    date: body.date || new Date().toISOString().slice(0, 10),
    batchId: String(body.batchId || ''),
    batchName: String(body.batchName || 'Batch'),
    statuses: body.statuses && typeof body.statuses === 'object' ? body.statuses : {},
    savedAt: new Date().toISOString(),
  };
  db.prepare('INSERT INTO attendance (id, saved_at, data) VALUES (?, ?, ?)').run(
    rec.id,
    rec.savedAt,
    JSON.stringify(rec)
  );
  res.status(201).json({ record: rec });
});

// Admin Study Materials
app.post('/api/admin/materials', requireAdmin, (req: AuthedRequest, res: Response) => {
  const body = req.body as Partial<StudyMaterial>;
  if (!String(body.title || '').trim()) {
    res.status(400).json({ error: 'Material title is required.' });
    return;
  }
  const mat: StudyMaterial = {
    id: body.id || `mat-${Date.now()}`,
    title: String(body.title).trim(),
    subject: body.subject || 'Mathematics',
    materialType: body.materialType || 'Formula Sheet',
    topic: String(body.topic || 'General').trim(),
    description: String(body.description || 'Study notes uploaded by faculty.').trim(),
    uploadedBy: String(body.uploadedBy || 'Gurukul Faculty').trim(),
    uploadedAt: new Date().toISOString().slice(0, 10),
    downloadCount: 0,
    contentSummary: String(body.contentSummary || body.description || '').trim(),
  };
  insertAtTop('materials', mat);
  res.status(201).json({ material: mat });
});

app.delete('/api/admin/materials/:id', requireAdmin, (req: AuthedRequest, res: Response) => {
  deleteById('materials', String(req.params.id));
  res.json({ ok: true });
});

// Admin Notifications / Announcements
app.post('/api/admin/announcements', requireAdmin, (req: AuthedRequest, res: Response) => {
  const body = req.body as Partial<Announcement>;
  if (!String(body.title || '').trim() || !String(body.message || '').trim()) {
    res.status(400).json({ error: 'Announcement title and message are required.' });
    return;
  }
  const ann: Announcement = {
    id: body.id || `ann-${Date.now()}`,
    title: String(body.title).trim(),
    message: String(body.message).trim(),
    priority: body.priority || 'High',
    audience: String(body.audience || 'All Students').trim(),
    postedBy: String(body.postedBy || 'Admin Desk').trim(),
    postedAt: new Date().toISOString().slice(0, 10),
  };
  insertAtTop('announcements', ann);
  res.status(201).json({ announcement: ann });
});

// Admin Attempts & Evaluation
app.patch('/api/admin/attempts/:id/evaluate', requireAdmin, (req: AuthedRequest, res: Response) => {
  const id = String(req.params.id);
  const row = db.prepare('SELECT data FROM attempts WHERE id = ?').get(id) as
    | { data: string }
    | undefined;
  if (!row) {
    res.status(404).json({ error: 'Attempt not found.' });
    return;
  }
  const body = req.body as { manualAdjustment?: number; adjustmentNote?: string };
  const attempt = JSON.parse(row.data) as ExamAttempt;
  const updated: ExamAttempt = {
    ...attempt,
    manualAdjustment: Number(body.manualAdjustment) || 0,
    adjustmentNote: String(body.adjustmentNote || '').trim(),
  };
  db.prepare('UPDATE attempts SET data = ? WHERE id = ?').run(JSON.stringify(updated), updated.id);
  res.json({ attempt: updated });
});

app.delete('/api/admin/attempts/:id', requireAdmin, (req: AuthedRequest, res: Response) => {
  deleteById('attempts', String(req.params.id));
  res.json({ ok: true });
});

// Admin Payments
app.patch('/api/admin/payments/:id/status', requireAdmin, (req: AuthedRequest, res: Response) => {
  const id = String(req.params.id);
  const row = db.prepare('SELECT data FROM payments WHERE id = ?').get(id) as
    | { data: string }
    | undefined;
  if (!row) {
    res.status(404).json({ error: 'Payment record not found.' });
    return;
  }
  const body = req.body as { status?: PaymentRecord['status'] };
  const p = JSON.parse(row.data) as PaymentRecord;
  const status =
    body.status === 'Verified' || body.status === 'Rejected' ? body.status : 'Pending';
  const updated: PaymentRecord = { ...p, status };
  db.prepare('UPDATE payments SET data = ? WHERE id = ?').run(JSON.stringify(updated), updated.id);
  res.json({ payment: updated });
});

app.delete('/api/admin/payments/:id', requireAdmin, (req: AuthedRequest, res: Response) => {
  deleteById('payments', String(req.params.id));
  res.json({ ok: true });
});

app.post('/api/admin/payments/restore-demo', requireAdmin, (_req: AuthedRequest, res: Response) => {
  const stmt = db.prepare(
    'INSERT OR REPLACE INTO payments (id, student_id, submitted_at, data) VALUES (?, ?, ?, ?)'
  );
  const tx = db.transaction((rows: PaymentRecord[]) => {
    rows.forEach((p) => {
      stmt.run(p.id, p.studentId, p.submittedAt, JSON.stringify(p));
    });
  });
  tx(INITIAL_PAYMENTS);
  res.json({ payments: listPayments() });
});

// Admin Courses
app.post('/api/admin/courses', requireAdmin, (req: AuthedRequest, res: Response) => {
  const body = req.body as Partial<CoursePackage>;
  if (!String(body.title || '').trim()) {
    res.status(400).json({ error: 'Course title is required.' });
    return;
  }
  const course: CoursePackage = {
    id: body.id || `course-${Date.now()}`,
    title: String(body.title).trim(),
    subjectTag: String(body.subjectTag || 'PCM · JEE/Boards').trim(),
    duration: String(body.duration || '12 Months').trim(),
    price: Number(body.price) || 3999,
    status: body.status === 'DRAFT' ? 'DRAFT' : 'LIVE',
    enrolledCount: Number(body.enrolledCount) || 0,
    description: String(body.description || 'Structured classroom & digital course.').trim(),
    highlights: Array.isArray(body.highlights)
      ? body.highlights
      : ['Chapterwise DPPs', 'Weekly CBT Mocks', 'KaTeX Solution Notes'],
  };
  insertAtTop('courses', course);
  res.status(201).json({ course });
});

app.delete('/api/admin/courses/:id', requireAdmin, (req: AuthedRequest, res: Response) => {
  deleteById('courses', String(req.params.id));
  res.json({ ok: true });
});

// Admin Test Series
app.post('/api/admin/test-series', requireAdmin, (req: AuthedRequest, res: Response) => {
  const body = req.body as Partial<TestSeriesPackage>;
  if (!String(body.title || '').trim()) {
    res.status(400).json({ error: 'Test series title is required.' });
    return;
  }
  const ts: TestSeriesPackage = {
    id: body.id || `ts-${Date.now()}`,
    title: String(body.title).trim(),
    subtitle: String(body.subtitle || 'Full-length + chapterwise CBT mocks.').trim(),
    category: String(body.category || 'IIT-JEE').trim(),
    mockCount: Number(body.mockCount) || 25,
    price: Number(body.price) || 799,
    status: body.status === 'Archived' ? 'Archived' : 'Active',
    highlights: Array.isArray(body.highlights)
      ? body.highlights
      : ['Real NTA CBT Interface', 'Instant KaTeX Solutions', 'Parent Scorecards'],
  };
  insertAtTop('test_series', ts);
  res.status(201).json({ testSeries: ts });
});

app.delete('/api/admin/test-series/:id', requireAdmin, (req: AuthedRequest, res: Response) => {
  deleteById('test_series', String(req.params.id));
  res.json({ ok: true });
});

// ======================== OWNER (SALAR TECH) HIDDEN LICENSING ROUTES ========================

app.post('/api/auth/owner/login', (req: Request, res: Response) => {
  const body = req.body as { username?: string; password?: string };
  const inputUser = String(body.username || '').trim();
  const inputPass = String(body.password || '');
  if (!inputUser || !inputPass) {
    res.status(400).json({ error: 'Username and password are required.' });
    return;
  }

  const envUser = (process.env.OWNER_USERNAME || '').trim();
  const envPass = (process.env.OWNER_PASSWORD || '').trim();

  if (envPass.length >= 4) {
    const expectedUser = envUser || 'SALAR Tech';
    const userOk = inputUser.toLowerCase() === expectedUser.toLowerCase();
    const passBuf = Buffer.from(inputPass, 'utf8');
    const expectedBuf = Buffer.from(envPass, 'utf8');
    const passOk =
      passBuf.length === expectedBuf.length && crypto.timingSafeEqual(passBuf, expectedBuf);
    if (!userOk || !passOk) {
      res.status(401).json({ error: 'Invalid owner credentials.' });
      return;
    }
    const token = createSession('owner', 'owner-1', expectedUser);
    res.json({ token, role: 'owner', username: expectedUser });
    return;
  }

  const stored = getOwnerAuth();
  if (!stored) {
    res.status(503).json({ error: 'Owner account not initialized.' });
    return;
  }

  const userOk = inputUser.toLowerCase() === stored.username.toLowerCase();
  const passOk = verifySecret(inputPass, stored.passwordHash);
  if (!userOk || !passOk) {
    res.status(401).json({ error: 'Invalid owner credentials.' });
    return;
  }

  const token = createSession('owner', 'owner-1', stored.username);
  res.json({ token, role: 'owner', username: stored.username });
});

app.get('/api/owner/workspace', requireOwner, (_req: AuthedRequest, res: Response) => {
  const stored = getOwnerAuth();
  const plans = listOrdered<LicensePlan>('license_plans');
  const clients = listOrdered<ClientLicense>('client_licenses');
  const studentsCount = listStudents().length;
  const examsCount = listOrdered<ExamPaper>('exams').length;
  res.json({
    ownerUsername: process.env.OWNER_USERNAME?.trim() || stored?.username || 'SALAR Tech',
    plans,
    clients,
    portalStats: {
      studentsCount,
      examsCount,
    },
  });
});

app.post('/api/owner/plans', requireOwner, (req: AuthedRequest, res: Response) => {
  const body = req.body as Partial<LicensePlan>;
  const name = String(body.name || '').trim();
  if (!name) {
    res.status(400).json({ error: 'License plan name is required.' });
    return;
  }
  const plan: LicensePlan = {
    id: body.id || `plan-${Date.now()}`,
    name,
    price: Math.max(0, Number(body.price) || 0),
    billingCycle: body.billingCycle || 'Monthly',
    maxStudents: Math.max(1, Number(body.maxStudents) || 250),
    maxExams: Math.max(1, Number(body.maxExams) || 50),
    description: String(body.description || 'Custom institute license tier.').trim(),
    features: Array.isArray(body.features) && body.features.length > 0
      ? body.features.map((f) => String(f).trim()).filter(Boolean)
      : ['Full CBT Portal', 'Automated Evaluation', 'QR & Share Links'],
    isRecommended: Boolean(body.isRecommended),
  };
  insertAtTop('license_plans', plan);
  res.status(201).json({ plan });
});

app.put('/api/owner/plans/:id', requireOwner, (req: AuthedRequest, res: Response) => {
  const id = String(req.params.id || '').trim();
  const plans = listOrdered<LicensePlan>('license_plans');
  const existing = plans.find((p) => p.id === id);
  if (!existing) {
    res.status(404).json({ error: 'License plan not found.' });
    return;
  }
  const body = req.body as Partial<LicensePlan>;
  const updated: LicensePlan = {
    ...existing,
    name: body.name !== undefined ? String(body.name).trim() || existing.name : existing.name,
    price: body.price !== undefined ? Math.max(0, Number(body.price) || 0) : existing.price,
    billingCycle: body.billingCycle || existing.billingCycle,
    maxStudents:
      body.maxStudents !== undefined
        ? Math.max(1, Number(body.maxStudents) || existing.maxStudents)
        : existing.maxStudents,
    maxExams:
      body.maxExams !== undefined
        ? Math.max(1, Number(body.maxExams) || existing.maxExams)
        : existing.maxExams,
    description:
      body.description !== undefined ? String(body.description).trim() : existing.description,
    features: Array.isArray(body.features) ? body.features : existing.features,
    isRecommended:
      body.isRecommended !== undefined ? Boolean(body.isRecommended) : existing.isRecommended,
  };
  updateRowData('license_plans', updated);
  res.json({ plan: updated });
});

app.delete('/api/owner/plans/:id', requireOwner, (req: AuthedRequest, res: Response) => {
  deleteById('license_plans', String(req.params.id));
  res.json({ ok: true });
});

app.post('/api/owner/clients', requireOwner, (req: AuthedRequest, res: Response) => {
  const body = req.body as Partial<ClientLicense>;
  const clientName = String(body.clientName || '').trim();
  if (!clientName) {
    res.status(400).json({ error: 'Client institute name is required.' });
    return;
  }
  const plans = listOrdered<LicensePlan>('license_plans');
  const matchedPlan = plans.find((p) => p.id === body.planId) ?? plans[0];

  if (body.isPrimaryPortal) {
    const currentClients = listOrdered<ClientLicense>('client_licenses');
    currentClients.forEach((c) => {
      if (c.isPrimaryPortal) {
        updateRowData('client_licenses', { ...c, isPrimaryPortal: false });
      }
    });
  }

  const client: ClientLicense = {
    id: body.id || `lic-${Date.now()}`,
    clientName,
    instituteEmail: String(body.instituteEmail || '').trim() || 'client@institute.edu',
    contactPhone: String(body.contactPhone || '').trim() || '+91 98000 00000',
    licenseKey:
      String(body.licenseKey || '').trim().toUpperCase() ||
      `SALAR-${Date.now().toString(36).toUpperCase().slice(-6)}`,
    planId: matchedPlan?.id ?? 'plan-pro',
    planName: String(body.planName || matchedPlan?.name || 'Pro Institute CBT License').trim(),
    customPrice:
      body.customPrice !== undefined
        ? Math.max(0, Number(body.customPrice) || 0)
        : matchedPlan?.price ?? 4999,
    billingCycle: body.billingCycle || matchedPlan?.billingCycle || 'Monthly',
    maxStudents: Number(body.maxStudents) || matchedPlan?.maxStudents || 500,
    status: body.status || 'Active',
    issuedAt: body.issuedAt || new Date().toISOString().slice(0, 10),
    expiresAt:
      body.expiresAt ||
      new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString().slice(0, 10),
    isPrimaryPortal: Boolean(body.isPrimaryPortal),
    notes: String(body.notes || '').trim(),
  };

  insertAtTop('client_licenses', client);
  res.status(201).json({ client });
});

app.put('/api/owner/clients/:id', requireOwner, (req: AuthedRequest, res: Response) => {
  const id = String(req.params.id || '').trim();
  const clients = listOrdered<ClientLicense>('client_licenses');
  const existing = clients.find((c) => c.id === id);
  if (!existing) {
    res.status(404).json({ error: 'Client license not found.' });
    return;
  }
  const body = req.body as Partial<ClientLicense>;
  if (body.isPrimaryPortal) {
    clients.forEach((c) => {
      if (c.id !== id && c.isPrimaryPortal) {
        updateRowData('client_licenses', { ...c, isPrimaryPortal: false });
      }
    });
  }
  const plans = listOrdered<LicensePlan>('license_plans');
  const matchedPlan = body.planId ? plans.find((p) => p.id === body.planId) : undefined;

  const updated: ClientLicense = {
    ...existing,
    clientName:
      body.clientName !== undefined ? String(body.clientName).trim() || existing.clientName : existing.clientName,
    instituteEmail:
      body.instituteEmail !== undefined ? String(body.instituteEmail).trim() : existing.instituteEmail,
    contactPhone:
      body.contactPhone !== undefined ? String(body.contactPhone).trim() : existing.contactPhone,
    licenseKey:
      body.licenseKey !== undefined
        ? String(body.licenseKey).trim().toUpperCase() || existing.licenseKey
        : existing.licenseKey,
    planId: matchedPlan?.id ?? existing.planId,
    planName:
      body.planName !== undefined
        ? String(body.planName).trim() || existing.planName
        : matchedPlan?.name ?? existing.planName,
    customPrice:
      body.customPrice !== undefined
        ? Math.max(0, Number(body.customPrice) || 0)
        : existing.customPrice,
    billingCycle: body.billingCycle || existing.billingCycle,
    maxStudents:
      body.maxStudents !== undefined
        ? Math.max(1, Number(body.maxStudents) || existing.maxStudents)
        : existing.maxStudents,
    status: body.status || existing.status,
    expiresAt: body.expiresAt || existing.expiresAt,
    isPrimaryPortal:
      body.isPrimaryPortal !== undefined ? Boolean(body.isPrimaryPortal) : existing.isPrimaryPortal,
    notes: body.notes !== undefined ? String(body.notes).trim() : existing.notes,
  };
  updateRowData('client_licenses', updated);
  res.json({ client: updated });
});

app.delete('/api/owner/clients/:id', requireOwner, (req: AuthedRequest, res: Response) => {
  deleteById('client_licenses', String(req.params.id));
  res.json({ ok: true });
});

app.post('/api/owner/change-password', requireOwner, (req: AuthedRequest, res: Response) => {
  const body = req.body as { currentPassword?: string; newPassword?: string; username?: string };
  const currentPass = String(body.currentPassword || '');
  const newPass = String(body.newPassword || '').trim();
  if (newPass.length < 6) {
    res.status(400).json({ error: 'New password must be at least 6 characters.' });
    return;
  }
  const stored = getOwnerAuth();
  if (!stored || !verifySecret(currentPass, stored.passwordHash)) {
    res.status(401).json({ error: 'Current password is incorrect.' });
    return;
  }
  updateOwnerPassword(newPass, body.username);
  res.json({ ok: true });
});

// Unknown API routes return JSON 404
app.use('/api', (_req: Request, res: Response) => {
  res.status(404).json({ error: 'API endpoint not found.' });
});

export { app };

async function startStandaloneServer(): Promise<void> {
  // Mount Vite dev middleware in development or serve built static files in production
  const isProd =
    process.env.NODE_ENV === 'production' && fs.existsSync(path.resolve('dist/index.html'));

  if (isProd) {
    const distPath = path.resolve('dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const PORT = isProd ? Number(process.env.PORT) || 3000 : 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Gurukul Test Portal server listening on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  void startStandaloneServer();
}
