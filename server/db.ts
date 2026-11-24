import Database from 'better-sqlite3';
import crypto from 'node:crypto';
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
  PublicLicenseSummary,
  QuestionItem,
  StudentRecord,
  StudyMaterial,
  TeacherRecord,
  TestFolder,
  TestSeriesPackage,
  UserRole,
} from '../src/types/portal.ts';
import {
  INITIAL_ANNOUNCEMENTS,
  INITIAL_ATTEMPTS,
  INITIAL_ATTENDANCE,
  INITIAL_BATCHES,
  INITIAL_COURSES,
  INITIAL_EXAMS,
  INITIAL_FOLDERS,
  INITIAL_MATERIALS,
  INITIAL_PAYMENTS,
  INITIAL_QUESTIONS,
  INITIAL_SETTINGS,
  INITIAL_STUDENTS,
  INITIAL_TEACHERS,
  INITIAL_TEST_SERIES,
  SUBJECT_PCM_EXAMS,
  SUBJECT_PCM_FOLDER,
  SUBJECT_PCM_QUESTIONS,
} from '../src/data/seedPortalData.ts';

const defaultDbPath = process.env.VERCEL
  ? '/tmp/gurukul_portal.db'
  : path.resolve(process.cwd(), 'gurukul_portal.db');
const DB_PATH = process.env.SQLITE_DB_PATH || defaultDbPath;
export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function hashSecret(secret: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(secret, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifySecret(secret: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, hexHash] = parts;
  if (!salt || !hexHash) return false;
  const expected = Buffer.from(hexHash, 'hex');
  const actual = crypto.scryptSync(secret, salt, 64);
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS admin_auth (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      email TEXT NOT NULL,
      passcode_hash TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      role TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      email TEXT NOT NULL,
      expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS batches (
      id TEXT PRIMARY KEY,
      sort_order INTEGER NOT NULL DEFAULT 0,
      data TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS teachers (
      id TEXT PRIMARY KEY,
      sort_order INTEGER NOT NULL DEFAULT 0,
      data TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      roll_no TEXT NOT NULL,
      username TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      pin_hash TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      data TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      sort_order INTEGER NOT NULL DEFAULT 0,
      data TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      sort_order INTEGER NOT NULL DEFAULT 0,
      data TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS exams (
      id TEXT PRIMARY KEY,
      sort_order INTEGER NOT NULL DEFAULT 0,
      data TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS attempts (
      id TEXT PRIMARY KEY,
      exam_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      submitted_at TEXT NOT NULL,
      data TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS attendance (
      id TEXT PRIMARY KEY,
      saved_at TEXT NOT NULL,
      data TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS materials (
      id TEXT PRIMARY KEY,
      sort_order INTEGER NOT NULL DEFAULT 0,
      data TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      sort_order INTEGER NOT NULL DEFAULT 0,
      data TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      sort_order INTEGER NOT NULL DEFAULT 0,
      data TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS test_series (
      id TEXT PRIMARY KEY,
      sort_order INTEGER NOT NULL DEFAULT 0,
      data TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      submitted_at TEXT NOT NULL,
      data TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS owner_auth (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      username TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS license_plans (
      id TEXT PRIMARY KEY,
      sort_order INTEGER NOT NULL DEFAULT 0,
      data TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS client_licenses (
      id TEXT PRIMARY KEY,
      sort_order INTEGER NOT NULL DEFAULT 0,
      data TEXT NOT NULL
    );
  `);

  const hasSettings = db.prepare('SELECT 1 FROM settings WHERE id = ?').get('institute');
  if (!hasSettings) {
    db.prepare('INSERT INTO settings (id, data) VALUES (?, ?)').run(
      'institute',
      JSON.stringify(INITIAL_SETTINGS)
    );
  }

  const seedTable = <T extends { id: string }>(table: string, items: T[]): void => {
    const countRow = db.prepare(`SELECT COUNT(*) AS cnt FROM ${table}`).get() as { cnt: number };
    if (countRow.cnt === 0) {
      const stmt = db.prepare(`INSERT INTO ${table} (id, sort_order, data) VALUES (?, ?, ?)`);
      const tx = db.transaction((rows: T[]) => {
        rows.forEach((item, idx) => {
          stmt.run(item.id, idx + 1, JSON.stringify(item));
        });
      });
      tx(items);
    }
  };

  seedTable<BatchRecord>('batches', INITIAL_BATCHES);
  seedTable<TeacherRecord>('teachers', INITIAL_TEACHERS);
  seedTable<TestFolder>('folders', INITIAL_FOLDERS);
  seedTable<QuestionItem>('questions', INITIAL_QUESTIONS);
  seedTable<ExamPaper>('exams', INITIAL_EXAMS);
  seedTable<StudyMaterial>('materials', INITIAL_MATERIALS);
  seedTable<Announcement>('announcements', INITIAL_ANNOUNCEMENTS);
  seedTable<CoursePackage>('courses', INITIAL_COURSES);
  seedTable<TestSeriesPackage>('test_series', INITIAL_TEST_SERIES);

  const studentCount = db.prepare('SELECT COUNT(*) AS cnt FROM students').get() as { cnt: number };
  if (studentCount.cnt === 0) {
    const stmt = db.prepare(
      'INSERT INTO students (id, roll_no, username, email, phone, pin_hash, sort_order, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    const tx = db.transaction((rows: StudentRecord[]) => {
      rows.forEach((s, idx) => {
        stmt.run(s.id, s.rollNo, s.username, s.email, s.phone, null, idx + 1, JSON.stringify(s));
      });
    });
    tx(INITIAL_STUDENTS);
  }

  const attemptCount = db.prepare('SELECT COUNT(*) AS cnt FROM attempts').get() as { cnt: number };
  if (attemptCount.cnt === 0) {
    const stmt = db.prepare(
      'INSERT INTO attempts (id, exam_id, student_id, submitted_at, data) VALUES (?, ?, ?, ?, ?)'
    );
    const tx = db.transaction((rows: ExamAttempt[]) => {
      rows.forEach((a) => {
        stmt.run(a.id, a.examId, a.studentId, a.submittedAt, JSON.stringify(a));
      });
    });
    tx(INITIAL_ATTEMPTS);
  }

  const attCount = db.prepare('SELECT COUNT(*) AS cnt FROM attendance').get() as { cnt: number };
  if (attCount.cnt === 0) {
    const stmt = db.prepare('INSERT INTO attendance (id, saved_at, data) VALUES (?, ?, ?)');
    const tx = db.transaction((rows: AttendanceRecord[]) => {
      rows.forEach((rec) => {
        stmt.run(rec.id, rec.savedAt, JSON.stringify(rec));
      });
    });
    tx(INITIAL_ATTENDANCE);
  }

  const payCount = db.prepare('SELECT COUNT(*) AS cnt FROM payments').get() as { cnt: number };
  if (payCount.cnt === 0) {
    const stmt = db.prepare(
      'INSERT INTO payments (id, student_id, submitted_at, data) VALUES (?, ?, ?, ?)'
    );
    const tx = db.transaction((rows: PaymentRecord[]) => {
      rows.forEach((p) => {
        stmt.run(p.id, p.studentId, p.submittedAt, JSON.stringify(p));
      });
    });
    tx(INITIAL_PAYMENTS);
  }

  const envPasscode = (process.env.ADMIN_PASSCODE || '').trim();
  const existingAdmin = db.prepare('SELECT id FROM admin_auth WHERE id = 1').get();
  if (!existingAdmin && envPasscode.length >= 4) {
    const settings = getSettings();
    db.prepare(
      'INSERT INTO admin_auth (id, email, passcode_hash, updated_at) VALUES (1, ?, ?, ?)'
    ).run(settings.email.toLowerCase(), hashSecret(envPasscode), new Date().toISOString());
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);
  const pcmApplied = db
    .prepare('SELECT id FROM schema_migrations WHERE id = ?')
    .get('seed_pcm_subject_tests_v1');
  if (!pcmApplied) {
    const tx = db.transaction(() => {
      db.prepare('INSERT OR IGNORE INTO folders (id, sort_order, data) VALUES (?, ?, ?)').run(
        SUBJECT_PCM_FOLDER.id,
        0,
        JSON.stringify(SUBJECT_PCM_FOLDER)
      );
      const qStmt = db.prepare(
        'INSERT OR IGNORE INTO questions (id, sort_order, data) VALUES (?, ?, ?)'
      );
      SUBJECT_PCM_QUESTIONS.forEach((q, idx) => {
        qStmt.run(q.id, -10 - idx, JSON.stringify(q));
      });
      const eStmt = db.prepare(
        'INSERT OR IGNORE INTO exams (id, sort_order, data) VALUES (?, ?, ?)'
      );
      SUBJECT_PCM_EXAMS.forEach((ex, idx) => {
        eStmt.run(ex.id, -10 - idx, JSON.stringify(ex));
      });
      const existingExams = db.prepare('SELECT id, data FROM exams').all() as {
        id: string;
        data: string;
      }[];
      existingExams.forEach((row) => {
        const parsed = JSON.parse(row.data) as ExamPaper;
        if (!parsed.subject) {
          parsed.subject = parsed.id === 'exam-cet-speed' ? 'Mathematics' : 'PCM';
          db.prepare('UPDATE exams SET data = ? WHERE id = ?').run(
            JSON.stringify(parsed),
            row.id
          );
        }
      });
      db.prepare('INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)').run(
        'seed_pcm_subject_tests_v1',
        new Date().toISOString()
      );
    });
    tx();
  }

  // Seed SALAR Tech platform owner account (salted scrypt hash, never plaintext password)
  const existingOwner = db.prepare('SELECT id FROM owner_auth WHERE id = 1').get();
  if (!existingOwner) {
    const ownerUsername = (process.env.OWNER_USERNAME || 'SALAR Tech').trim();
    const envOwnerPass = (process.env.OWNER_PASSWORD || '').trim();
    const passwordHash =
      envOwnerPass.length >= 4
        ? hashSecret(envOwnerPass)
        : 'f97065e18362415b7097ba80e3407f7f:d2f72dda54858a9334585629412dcfb85030ffaaa248f9c1ce0f7609c8a17f4f3d59d23d8facaec6526dd4853de475bc83395c590a6eb498645a89a7e4269d1d';
    db.prepare(
      'INSERT INTO owner_auth (id, username, password_hash, updated_at) VALUES (1, ?, ?, ?)'
    ).run(ownerUsername, passwordHash, new Date().toISOString());
  }

  const initialLicensePlans: LicensePlan[] = [
    {
      id: 'plan-starter',
      name: 'Starter Coaching License',
      price: 1999,
      billingCycle: 'Monthly',
      maxStudents: 150,
      maxExams: 25,
      description: 'Essential CBT portal for single-branch tuition & coaching batches.',
      features: ['Up to 150 active students', 'Quick Join & QR Exam Links', 'Auto KaTeX Scorecard'],
    },
    {
      id: 'plan-pro',
      name: 'Pro Institute CBT License',
      price: 4999,
      billingCycle: 'Monthly',
      maxStudents: 1000,
      maxExams: 200,
      description: 'Full-featured IIT-JEE / NEET / MHT-CET examination platform with analytics.',
      features: [
        'Up to 1,000 students',
        'Image & Bulk Question Bank',
        'Attendance, Courses & UPI Billing',
        'Self-Hydrating CBT Links',
      ],
      isRecommended: true,
    },
    {
      id: 'plan-enterprise',
      name: 'Enterprise Multi-Branch License',
      price: 39999,
      billingCycle: 'Yearly',
      maxStudents: 5000,
      maxExams: 1000,
      description: 'Annual institute license with priority support & custom branding.',
      features: [
        'Up to 5,000 students',
        'Unlimited batches & faculty',
        'Priority SALAR Tech support',
      ],
    },
  ];
  seedTable<LicensePlan>('license_plans', initialLicensePlans);

  const initialClients: ClientLicense[] = [
    {
      id: 'lic-gurukul-primary',
      clientName: 'Gurukul Classes',
      instituteEmail: 'gurukulclasses51@gmail.com',
      contactPhone: '+91 98230 11223',
      licenseKey: 'SALAR-GC-2026-PRO',
      planId: 'plan-pro',
      planName: 'Pro Institute CBT License',
      customPrice: 4999,
      billingCycle: 'Monthly',
      maxStudents: 1000,
      status: 'Active',
      issuedAt: '2026-01-01',
      expiresAt: '2027-12-31',
      isPrimaryPortal: true,
      notes: 'Primary licensed client portal managed by SALAR Tech.',
    },
    {
      id: 'lic-apex-iit',
      clientName: 'Apex IIT Academy',
      instituteEmail: 'director@apexiit.in',
      contactPhone: '+91 97650 44110',
      licenseKey: 'SALAR-APX-2026-ENT',
      planId: 'plan-enterprise',
      planName: 'Enterprise Multi-Branch License',
      customPrice: 39999,
      billingCycle: 'Yearly',
      maxStudents: 5000,
      status: 'Active',
      issuedAt: '2026-02-15',
      expiresAt: '2027-02-14',
      isPrimaryPortal: false,
      notes: 'Pune + Nashik campus license.',
    },
    {
      id: 'lic-sankalp-cet',
      clientName: 'Sankalp MHT-CET Hub',
      instituteEmail: 'admin@sankalpcet.com',
      contactPhone: '+91 94220 77889',
      licenseKey: 'SALAR-SNK-2026-STR',
      planId: 'plan-starter',
      planName: 'Starter Coaching License',
      customPrice: 1999,
      billingCycle: 'Monthly',
      maxStudents: 150,
      status: 'Trial',
      issuedAt: '2026-11-01',
      expiresAt: '2026-12-01',
      isPrimaryPortal: false,
      notes: '30-day evaluation license.',
    },
  ];
  seedTable<ClientLicense>('client_licenses', initialClients);
}

export function getSettings(): InstituteSettings {
  const row = db.prepare('SELECT data FROM settings WHERE id = ?').get('institute') as
    | { data: string }
    | undefined;
  if (!row) return INITIAL_SETTINGS;
  return JSON.parse(row.data) as InstituteSettings;
}

export function saveSettings(next: InstituteSettings): InstituteSettings {
  db.prepare('INSERT OR REPLACE INTO settings (id, data) VALUES (?, ?)').run(
    'institute',
    JSON.stringify(next)
  );
  return next;
}

export function listOrdered<T>(table: string): T[] {
  const rows = db
    .prepare(`SELECT data FROM ${table} ORDER BY sort_order ASC, rowid DESC`)
    .all() as { data: string }[];
  return rows.map((r) => JSON.parse(r.data) as T);
}

export function listStudents(): StudentRecord[] {
  const rows = db
    .prepare('SELECT data FROM students ORDER BY sort_order ASC, rowid DESC')
    .all() as { data: string }[];
  return rows.map((r) => JSON.parse(r.data) as StudentRecord);
}

export function listAttempts(): ExamAttempt[] {
  const rows = db
    .prepare('SELECT data FROM attempts ORDER BY submitted_at DESC, rowid DESC')
    .all() as { data: string }[];
  return rows.map((r) => JSON.parse(r.data) as ExamAttempt);
}

export function listAttendance(): AttendanceRecord[] {
  const rows = db
    .prepare('SELECT data FROM attendance ORDER BY saved_at DESC, rowid DESC')
    .all() as { data: string }[];
  return rows.map((r) => JSON.parse(r.data) as AttendanceRecord);
}

export function listPayments(): PaymentRecord[] {
  const rows = db
    .prepare('SELECT data FROM payments ORDER BY submitted_at DESC, rowid DESC')
    .all() as { data: string }[];
  return rows.map((r) => JSON.parse(r.data) as PaymentRecord);
}

export function insertAtTop<T extends { id: string }>(table: string, item: T): T {
  const minRow = db.prepare(`SELECT COALESCE(MIN(sort_order), 1) AS m FROM ${table}`).get() as {
    m: number;
  };
  db.prepare(`INSERT OR REPLACE INTO ${table} (id, sort_order, data) VALUES (?, ?, ?)`).run(
    item.id,
    minRow.m - 1,
    JSON.stringify(item)
  );
  return item;
}

export function updateRowData<T extends { id: string }>(table: string, item: T): T {
  db.prepare(`UPDATE ${table} SET data = ? WHERE id = ?`).run(JSON.stringify(item), item.id);
  return item;
}

export function deleteById(table: string, id: string): void {
  db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
}

export function getOwnerAuth(): {
  username: string;
  passwordHash: string;
  updatedAt: string;
} | null {
  const row = db
    .prepare('SELECT username, password_hash, updated_at FROM owner_auth WHERE id = 1')
    .get() as { username: string; password_hash: string; updated_at: string } | undefined;
  if (!row) return null;
  return { username: row.username, passwordHash: row.password_hash, updatedAt: row.updated_at };
}

export function updateOwnerPassword(newPassword: string, username?: string): void {
  const current = getOwnerAuth();
  const nextUsername = (username || current?.username || 'SALAR Tech').trim();
  db.prepare(
    'INSERT OR REPLACE INTO owner_auth (id, username, password_hash, updated_at) VALUES (1, ?, ?, ?)'
  ).run(nextUsername, hashSecret(newPassword), new Date().toISOString());
}

export function getPublicLicenseSummary(): PublicLicenseSummary {
  const plans = listOrdered<LicensePlan>('license_plans');
  const clients = listOrdered<ClientLicense>('client_licenses');
  const primary = clients.find((c) => c.isPrimaryPortal) ?? clients[0];

  if (!primary) {
    const fallbackPlan = plans[1] ?? plans[0];
    return {
      licensedTo: getSettings().instituteName,
      licensor: 'SALAR Tech',
      licenseKey: 'SALAR-TRIAL-2026',
      planName: fallbackPlan?.name ?? 'Pro Institute CBT License',
      price: fallbackPlan?.price ?? 4999,
      billingCycle: fallbackPlan?.billingCycle ?? 'Monthly',
      status: 'Active',
      expiresAt: '2027-12-31',
      maxStudents: fallbackPlan?.maxStudents ?? 1000,
      plans,
    };
  }

  return {
    licensedTo: primary.clientName,
    licensor: 'SALAR Tech',
    licenseKey: primary.licenseKey,
    planName: primary.planName,
    price: primary.customPrice,
    billingCycle: primary.billingCycle,
    status: primary.status,
    expiresAt: primary.expiresAt,
    maxStudents: primary.maxStudents,
    plans,
  };
}

export function createSession(role: UserRole, subjectId: string, email: string): string {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7; // 7 days
  db.prepare(
    'INSERT INTO sessions (token_hash, role, subject_id, email, expires_at) VALUES (?, ?, ?, ?, ?)'
  ).run(hashToken(rawToken), role, subjectId, email, expiresAt);
  return rawToken;
}

export function getSession(
  rawToken: string
): { role: UserRole; subjectId: string; email: string } | null {
  if (!rawToken) return null;
  const row = db
    .prepare('SELECT role, subject_id, email, expires_at FROM sessions WHERE token_hash = ?')
    .get(hashToken(rawToken)) as
    | { role: UserRole; subject_id: string; email: string; expires_at: number }
    | undefined;
  if (!row) return null;
  if (row.expires_at < Date.now()) {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(rawToken));
    return null;
  }
  return { role: row.role, subjectId: row.subject_id, email: row.email };
}

export function deleteSession(rawToken: string): void {
  if (!rawToken) return;
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(rawToken));
}
