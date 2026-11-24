import { useEffect, useState, type FormEvent } from 'react';
import { GraduationCap, ShieldCheck, X } from 'lucide-react';
import type { BatchRecord, InstituteSettings, StudentRecord } from '../types/portal';
import { api, setAuthToken } from '../api/client';

interface AuthModalProps {
  open: boolean;
  initialRole?: 'student' | 'admin';
  initialStudentMode?: 'signin' | 'signup';
  settings: InstituteSettings;
  batches: BatchRecord[];
  onClose: () => void;
  onAuthenticatedStudent: (student: StudentRecord) => void;
  onAuthenticatedAdmin: () => void;
}

export function AuthModal({
  open,
  initialRole = 'student',
  initialStudentMode = 'signin',
  settings,
  batches,
  onClose,
  onAuthenticatedStudent,
  onAuthenticatedAdmin,
}: AuthModalProps) {
  const [roleTab, setRoleTab] = useState<'student' | 'admin'>(initialRole);
  const [studentMode, setStudentMode] = useState<'signin' | 'signup'>(initialStudentMode);

  const [identifier, setIdentifier] = useState('GC-2026-0101');
  const [studentPassword, setStudentPassword] = useState('');
  const [studentError, setStudentError] = useState('');

  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regCollege, setRegCollege] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regBatchId, setRegBatchId] = useState(batches[0]?.id ?? '');
  const [regError, setRegError] = useState('');

  const [adminConfigured, setAdminConfigured] = useState<boolean | null>(null);
  const [adminEmail, setAdminEmail] = useState(settings.email);
  const [adminPasscode, setAdminPasscode] = useState('');
  const [adminConfirmPasscode, setAdminConfirmPasscode] = useState('');
  const [adminError, setAdminError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setRoleTab(initialRole);
    setStudentMode(initialStudentMode);
  }, [initialRole, initialStudentMode, open]);

  useEffect(() => {
    if (!open) return;
    api
      .getAdminAuthStatus()
      .then((res) => {
        setAdminConfigured(res.configured);
        if (res.email) setAdminEmail(res.email);
      })
      .catch(() => {
        setAdminConfigured(false);
      });
  }, [open]);

  if (!open) return null;

  const handleStudentLogin = async (e: FormEvent) => {
    e.preventDefault();
    setStudentError('');
    setSubmitting(true);
    try {
      const res = await api.loginStudent(identifier, studentPassword);
      setAuthToken(res.token);
      onAuthenticatedStudent(res.student);
      onClose();
    } catch (err) {
      setStudentError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStudentSignup = async (e: FormEvent) => {
    e.preventDefault();
    setRegError('');
    setSubmitting(true);
    try {
      const res = await api.signupStudent({
        name: regName,
        phone: regPhone,
        password: regPassword,
        batchId: regBatchId || batches[0]?.id || '',
        collegeName: regCollege,
      });
      setAuthToken(res.token);
      onAuthenticatedStudent(res.student);
      onClose();
    } catch (err) {
      setRegError(err instanceof Error ? err.message : 'Unable to register.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAdminError('');
    setSubmitting(true);
    try {
      if (adminConfigured === false) {
        if (adminPasscode.trim().length < 6) {
          setAdminError('Create a passcode with at least 6 characters.');
          setSubmitting(false);
          return;
        }
        if (adminPasscode !== adminConfirmPasscode) {
          setAdminError('Passcodes do not match.');
          setSubmitting(false);
          return;
        }
        const res = await api.setupAdmin(adminEmail, adminPasscode);
        setAuthToken(res.token);
        onAuthenticatedAdmin();
        onClose();
      } else {
        const res = await api.loginAdmin(adminEmail, adminPasscode);
        setAuthToken(res.token);
        onAuthenticatedAdmin();
        onClose();
      }
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
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
        className="w-full max-w-md bg-white border border-slate-200 rounded-lg shadow-2xl overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
              {settings.instituteName}
            </p>
            <h2 className="text-sm font-bold text-slate-900 mt-0.5">
              {roleTab === 'admin'
                ? adminConfigured === false
                  ? 'Initial Admin Console Setup'
                  : 'Admin & Faculty Sign In'
                : studentMode === 'signin'
                ? 'Student Portal Login'
                : 'Create Student Account'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close login modal"
            className="text-slate-400 hover:text-slate-700 p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-xs">
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded border border-slate-200">
            <button
              type="button"
              onClick={() => setRoleTab('student')}
              className={`flex items-center justify-center gap-1.5 py-2 font-semibold rounded transition-colors ${
                roleTab === 'student' ? 'bg-white text-[#0F3CC9] shadow-xs' : 'text-slate-600'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Student</span>
            </button>
            <button
              type="button"
              onClick={() => setRoleTab('admin')}
              className={`flex items-center justify-center gap-1.5 py-2 font-semibold rounded transition-colors ${
                roleTab === 'admin' ? 'bg-white text-[#0F3CC9] shadow-xs' : 'text-slate-600'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
          </div>

          {roleTab === 'student' ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4 border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => setStudentMode('signin')}
                  className={`pb-2 font-semibold border-b-2 transition-colors ${
                    studentMode === 'signin'
                      ? 'border-[#0F3CC9] text-[#0F3CC9]'
                      : 'border-transparent text-slate-500'
                  }`}
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => setStudentMode('signup')}
                  className={`pb-2 font-semibold border-b-2 transition-colors ${
                    studentMode === 'signup'
                      ? 'border-[#0F3CC9] text-[#0F3CC9]'
                      : 'border-transparent text-slate-500'
                  }`}
                >
                  Signup
                </button>
              </div>

              {studentMode === 'signin' ? (
                <form onSubmit={handleStudentLogin} className="space-y-3.5">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Roll No, Username, or Mobile
                    </label>
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="e.g. GC-2026-0101 or rahul101"
                      className="w-full px-3 py-2 border border-slate-300 rounded font-mono text-slate-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Password (if set during signup)
                    </label>
                    <input
                      type="password"
                      value={studentPassword}
                      onChange={(e) => setStudentPassword(e.target.value)}
                      placeholder="Optional for demo roll numbers"
                      className="w-full px-3 py-2 border border-slate-300 rounded text-slate-900"
                    />
                  </div>
                  {studentError && (
                    <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 p-2 rounded">
                      {studentError}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 text-xs font-semibold text-white bg-[#0F3CC9] hover:bg-blue-800 rounded disabled:opacity-60"
                  >
                    {submitting ? 'Signing in...' : 'Login to Student Portal'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleStudentSignup} className="space-y-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Candidate full name"
                      className="w-full px-3 py-2 border border-slate-300 rounded text-slate-900"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Mobile (10 digits) *
                      </label>
                      <input
                        type="tel"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="98XXXXXXXX"
                        className="w-full px-3 py-2 border border-slate-300 rounded font-mono text-slate-900"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Batch</label>
                      <select
                        value={regBatchId}
                        onChange={(e) => setRegBatchId(e.target.value)}
                        className="w-full px-2.5 py-2 border border-slate-300 rounded bg-white text-slate-900"
                      >
                        {batches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      College / School Name
                    </label>
                    <input
                      type="text"
                      value={regCollege}
                      onChange={(e) => setRegCollege(e.target.value)}
                      placeholder="Optional"
                      className="w-full px-3 py-2 border border-slate-300 rounded text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Create Password (min 4 chars)
                    </label>
                    <input
                      type="password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Choose password"
                      className="w-full px-3 py-2 border border-slate-300 rounded text-slate-900"
                    />
                  </div>
                  {regError && (
                    <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 p-2 rounded">
                      {regError}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 text-xs font-semibold text-white bg-[#0F3CC9] hover:bg-blue-800 rounded disabled:opacity-60"
                  >
                    {submitting ? 'Creating Account...' : 'Create Student Account'}
                  </button>
                </form>
              )}
            </div>
          ) : (
            <form onSubmit={handleAdminSubmit} className="space-y-3.5">
              {adminConfigured === false && (
                <div className="p-2.5 bg-blue-50 border border-blue-200 text-[#0F3CC9] rounded leading-relaxed">
                  First-time setup: choose an administrator passcode below to lock and activate your
                  Admin Console.
                </div>
              )}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Admin Email</label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded text-slate-900"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {adminConfigured === false ? 'Create Admin Passcode *' : 'Admin Passcode *'}
                </label>
                <input
                  type="password"
                  value={adminPasscode}
                  onChange={(e) => setAdminPasscode(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3 py-2 border border-slate-300 rounded text-slate-900"
                  required
                />
              </div>
              {adminConfigured === false && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Confirm Passcode *
                  </label>
                  <input
                    type="password"
                    value={adminConfirmPasscode}
                    onChange={(e) => setAdminConfirmPasscode(e.target.value)}
                    placeholder="Re-enter passcode"
                    className="w-full px-3 py-2 border border-slate-300 rounded text-slate-900"
                    required
                  />
                </div>
              )}
              {adminError && (
                <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 p-2 rounded">
                  {adminError}
                </p>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded disabled:opacity-60"
              >
                {submitting
                  ? 'Verifying...'
                  : adminConfigured === false
                  ? 'Save Passcode & Open Admin Console'
                  : 'Unlock Admin Console'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
