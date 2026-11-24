import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, GraduationCap, ShieldCheck } from 'lucide-react';
import type {
  BatchRecord,
  InstituteSettings,
  PublicLicenseSummary,
  StudentRecord,
} from '../types/portal';
import { api, setAuthToken } from '../api/client';

interface LoginViewProps {
  settings: InstituteSettings;
  batches: BatchRecord[];
  license?: PublicLicenseSummary;
  onBackToHome: () => void;
  onLoginStudent: (student: StudentRecord) => void;
  onLoginAdmin: () => void;
}

export function LoginView({
  settings,
  batches,
  license,
  onBackToHome,
  onLoginStudent,
  onLoginAdmin,
}: LoginViewProps) {
  const [roleTab, setRoleTab] = useState<'student' | 'admin'>('student');
  const [studentMode, setStudentMode] = useState<'signin' | 'register'>('signin');

  // Student sign-in state
  const [identifier, setIdentifier] = useState('GC-2026-0101');
  const [studentPassword, setStudentPassword] = useState('');
  const [studentError, setStudentError] = useState('');

  // New student registration state
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regCollege, setRegCollege] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regBatchId, setRegBatchId] = useState(batches[0]?.id ?? '');
  const [regError, setRegError] = useState('');

  // Admin state
  const [adminConfigured, setAdminConfigured] = useState<boolean | null>(null);
  const [adminEmail, setAdminEmail] = useState(settings.email);
  const [adminPin, setAdminPin] = useState('');
  const [adminConfirmPin, setAdminConfirmPin] = useState('');
  const [adminError, setAdminError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api
      .getAdminAuthStatus()
      .then((res) => {
        setAdminConfigured(res.configured);
        if (res.email) setAdminEmail(res.email);
      })
      .catch(() => setAdminConfigured(false));
  }, []);

  const handleStudentSignIn = async (event: FormEvent) => {
    event.preventDefault();
    setStudentError('');
    setLoading(true);
    try {
      const res = await api.loginStudent(identifier, studentPassword);
      setAuthToken(res.token);
      onLoginStudent(res.student);
    } catch (err) {
      setStudentError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  };

  const handleStudentRegister = async (event: FormEvent) => {
    event.preventDefault();
    setRegError('');
    setLoading(true);
    try {
      const res = await api.signupStudent({
        name: regName,
        phone: regPhone,
        collegeName: regCollege,
        password: regPassword,
        batchId: regBatchId || batches[0]?.id || '',
      });
      setAuthToken(res.token);
      onLoginStudent(res.student);
    } catch (err) {
      setRegError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setAdminError('');
    setLoading(true);
    try {
      if (adminConfigured === false) {
        if (adminPin.trim().length < 6) {
          setAdminError('Create a passcode of at least 6 characters.');
          setLoading(false);
          return;
        }
        if (adminPin !== adminConfirmPin) {
          setAdminError('Passcodes do not match.');
          setLoading(false);
          return;
        }
        const res = await api.setupAdmin(adminEmail, adminPin);
        setAuthToken(res.token);
        onLoginAdmin();
      } else {
        const res = await api.loginAdmin(adminEmail, adminPin);
        setAuthToken(res.token);
        onLoginAdmin();
      }
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : 'Invalid administrator credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <header className="bg-white border-b border-slate-200 px-4 sm:px-8 h-14 flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToHome}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {settings.instituteName}
        </button>
        <span className="text-sm font-bold text-slate-900 uppercase">
          {settings.instituteName}
        </span>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-lg bg-white border border-slate-200 rounded-lg p-6 sm:p-8 space-y-5 shadow-xs">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-slate-500">
              Test Portal &amp; Institute Console
            </p>
            <h1 className="text-xl font-bold text-slate-900 mt-0.5">
              Sign in to {settings.instituteName}
            </h1>
          </div>

          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded border border-slate-200">
            <button
              type="button"
              onClick={() => setRoleTab('student')}
              className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded transition-colors ${
                roleTab === 'student'
                  ? 'bg-white text-[#0F3CC9] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              Student Portal
            </button>
            <button
              type="button"
              onClick={() => setRoleTab('admin')}
              className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded transition-colors ${
                roleTab === 'admin'
                  ? 'bg-white text-[#0F3CC9] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              Admin Console
            </button>
          </div>

          {roleTab === 'student' ? (
            <div className="space-y-4 text-xs">
              <div className="flex items-center gap-4 border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => setStudentMode('signin')}
                  className={`pb-2 font-semibold border-b-2 transition-colors ${
                    studentMode === 'signin'
                      ? 'border-[#0F3CC9] text-[#0F3CC9]'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Existing Student
                </button>
                <button
                  type="button"
                  onClick={() => setStudentMode('register')}
                  className={`pb-2 font-semibold border-b-2 transition-colors ${
                    studentMode === 'register'
                      ? 'border-[#0F3CC9] text-[#0F3CC9]'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  New Student Signup
                </button>
              </div>

              {studentMode === 'signin' ? (
                <form onSubmit={handleStudentSignIn} className="space-y-3.5">
                  <div>
                    <label
                      htmlFor="student-identifier"
                      className="block font-semibold text-slate-700 mb-1"
                    >
                      Roll Number, Username, or Mobile
                    </label>
                    <input
                      id="student-identifier"
                      type="text"
                      value={identifier}
                      onChange={(e) => {
                        setIdentifier(e.target.value);
                        if (studentError) setStudentError('');
                      }}
                      placeholder="e.g. GC-2026-0101 or rahul101"
                      className="w-full px-3 py-2 border border-slate-300 rounded font-mono text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Password (if configured)
                    </label>
                    <input
                      type="password"
                      value={studentPassword}
                      onChange={(e) => setStudentPassword(e.target.value)}
                      placeholder="Leave blank for roll-no profile access"
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
                    disabled={loading}
                    className="w-full py-2.5 text-xs font-semibold text-white bg-[#0F3CC9] rounded hover:bg-blue-800 disabled:opacity-60"
                  >
                    {loading ? 'Signing in...' : 'Enter Student Portal'}
                  </button>

                  <div className="pt-3 border-t border-slate-200">
                    <p className="text-[11px] text-slate-500 mb-2">
                      Seeded student roll numbers: <span className="font-mono">GC-2026-0101</span>,{' '}
                      <span className="font-mono">GC-2026-0102</span>,{' '}
                      <span className="font-mono">GC-2026-0103</span>
                    </p>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleStudentRegister} className="space-y-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Student Full Name *
                    </label>
                    <input
                      type="text"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="e.g. Siddharth Patil"
                      className="w-full px-3 py-2 border border-slate-300 rounded"
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
                        className="w-full px-3 py-2 border border-slate-300 rounded font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Select Batch</label>
                      <select
                        value={regBatchId}
                        onChange={(e) => setRegBatchId(e.target.value)}
                        className="w-full px-2.5 py-2 border border-slate-300 rounded bg-white"
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
                      className="w-full px-3 py-2 border border-slate-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Account Password (min 4 chars)
                    </label>
                    <input
                      type="password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Create password"
                      className="w-full px-3 py-2 border border-slate-300 rounded"
                    />
                  </div>
                  {regError && (
                    <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 p-2 rounded">
                      {regError}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 text-xs font-semibold text-white bg-[#0F3CC9] rounded hover:bg-blue-800 disabled:opacity-60"
                  >
                    {loading ? 'Creating Account...' : 'Create Student Account & Enter'}
                  </button>
                </form>
              )}
            </div>
          ) : (
            <form onSubmit={handleAdminSubmit} className="space-y-3.5 text-xs">
              {adminConfigured === false && (
                <div className="p-3 bg-blue-50 border border-blue-200 text-[#0F3CC9] rounded leading-relaxed">
                  First-run admin security setup: choose your Admin Console passcode (minimum 6
                  characters). It is hashed securely on the server.
                </div>
              )}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Admin Login Email
                </label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {adminConfigured === false ? 'Create Institute Passcode *' : 'Institute Passcode *'}
                </label>
                <input
                  type="password"
                  value={adminPin}
                  onChange={(e) => {
                    setAdminPin(e.target.value);
                    if (adminError) setAdminError('');
                  }}
                  placeholder="Enter access passcode"
                  className="w-full px-3 py-2 border border-slate-300 rounded"
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
                    value={adminConfirmPin}
                    onChange={(e) => setAdminConfirmPin(e.target.value)}
                    placeholder="Re-enter passcode"
                    className="w-full px-3 py-2 border border-slate-300 rounded"
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
                disabled={loading}
                className="w-full py-2.5 text-xs font-semibold text-white bg-slate-900 rounded hover:bg-slate-800 disabled:opacity-60"
              >
                {loading
                  ? 'Authenticating...'
                  : adminConfigured === false
                  ? 'Set Admin Passcode & Unlock'
                  : 'Unlock Admin Console'}
              </button>
            </form>
          )}

          {license && (
            <div className="pt-3 border-t border-slate-100 text-[11px] font-mono text-slate-500 flex flex-wrap items-center justify-between gap-2">
              <span>
                Licensed by <strong>{license.licensor}</strong> · {license.planName}
              </span>
              <span>
                ₹{new Intl.NumberFormat('en-IN').format(license.price)} / {license.billingCycle} ·{' '}
                {license.status}
              </span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
