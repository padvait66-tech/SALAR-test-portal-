import { useEffect, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  Building2,
  CalendarPlus,
  CheckCircle2,
  CreditCard,
  Edit3,
  Globe,
  KeyRound,
  Layers,
  LogOut,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Star,
  Trash2,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import type {
  ClientLicense,
  ClientLicenseStatus,
  InstituteSettings,
  LicenseBillingCycle,
  LicensePaymentRecord,
  LicensePlan,
  OwnerProfileSettings,
  PaymentGatewayProvider,
} from '../types/portal';
import { api, setAuthToken, type OwnerWorkspaceResponse } from '../api/client';
import { ConfirmDialog } from './ConfirmDialog';
import {
  formatTrialRange,
  parseTrialRangeInput,
  toDDMMYYYY,
} from '../utils/licenseDates';

interface OwnerLoginViewProps {
  settings: InstituteSettings;
  onBackToPortal: () => void;
  onAuthenticatedOwner: () => Promise<void> | void;
}

export function OwnerLoginView({
  settings,
  onBackToPortal,
  onAuthenticatedOwner,
}: OwnerLoginViewProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.loginOwner(username.trim(), password);
      setAuthToken(res.token);
      await onAuthenticatedOwner();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid owner credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <header className="bg-white border-b border-slate-200 px-4 sm:px-8 h-14 flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToPortal}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {settings.instituteName}
        </button>
        <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider">
          SALAR Tech · Platform Governance
        </span>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-lg p-6 sm:p-8 space-y-5 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#0B192C] text-white flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-mono uppercase tracking-wider text-[#0F3CC9] font-semibold">
                SALAR Tech Control
              </p>
              <h1 className="text-lg font-bold text-slate-900 mt-0.5">
                Owner License Console
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Sign in with your SALAR Tech master credentials to manage client licenses &amp;
                pricing.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label htmlFor="owner-username" className="block font-semibold text-slate-700 mb-1">
                Owner Username *
              </label>
              <input
                id="owner-username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Enter owner username"
                className="w-full px-3 py-2 border border-slate-300 rounded text-slate-900"
                required
              />
            </div>

            <div>
              <label htmlFor="owner-password" className="block font-semibold text-slate-700 mb-1">
                Owner Password *
              </label>
              <input
                id="owner-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Enter owner password"
                className="w-full px-3 py-2 border border-slate-300 rounded text-slate-900"
                required
              />
            </div>

            {error && (
              <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 p-2.5 rounded">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 text-xs font-semibold text-white bg-[#0B192C] hover:bg-slate-900 rounded disabled:opacity-60"
            >
              {loading ? 'Verifying Credentials...' : 'Sign In to Owner Console'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

interface OwnerPortalViewProps {
  workspace: OwnerWorkspaceResponse;
  onRefresh: () => Promise<void>;
  onOpenClientPortal: () => void;
  onOpenAdminConsole: () => Promise<void>;
  onOpenStudentPortal: () => Promise<void>;
  onLogout: () => Promise<void> | void;
}

const BILLING_CYCLES: LicenseBillingCycle[] = ['Monthly', 'Quarterly', 'Yearly', 'Lifetime'];
const CLIENT_STATUSES: ClientLicenseStatus[] = [
  'Active',
  'Trial',
  'Grace Period',
  'Suspended',
  'Expired',
];
const GATEWAY_PROVIDERS: PaymentGatewayProvider[] = [
  'UPI',
  'Razorpay',
  'Cashfree',
  'PhonePe',
  'Stripe',
  'Bank Transfer',
];

function getStatusBadgeClass(status: ClientLicenseStatus): string {
  switch (status) {
    case 'Active':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Trial':
      return 'bg-blue-50 text-[#0F3CC9] border-blue-200';
    case 'Grace Period':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'Suspended':
    case 'Expired':
      return 'bg-rose-50 text-rose-700 border-rose-200';
  }
}

export function OwnerPortalView({
  workspace,
  onRefresh,
  onOpenClientPortal,
  onOpenAdminConsole,
  onOpenStudentPortal,
  onLogout,
}: OwnerPortalViewProps) {
  const [activeTab, setActiveTab] = useState<
    'clients' | 'plans' | 'billing' | 'portal' | 'profile'
  >('clients');
  const [toast, setToast] = useState('');
  const [errorBanner, setErrorBanner] = useState('');
  const [busy, setBusy] = useState(false);

  // Add client modal/drawer
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientPlanId, setNewClientPlanId] = useState(workspace.plans[0]?.id ?? '');
  const [newClientPrice, setNewClientPrice] = useState(
    String(workspace.plans[0]?.price ?? 4999)
  );
  const [newClientCycle, setNewClientCycle] = useState<LicenseBillingCycle>(
    workspace.plans[0]?.billingCycle ?? 'Monthly'
  );
  const [newClientMaxStudents, setNewClientMaxStudents] = useState(
    String(workspace.plans[0]?.maxStudents ?? 500)
  );
  const [newClientStatus, setNewClientStatus] = useState<ClientLicenseStatus>('Active');
  const [newClientExpiresAt, setNewClientExpiresAt] = useState(
    new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString().slice(0, 10)
  );
  const [newClientPrimary, setNewClientPrimary] = useState(false);
  const [newClientTrialStart, setNewClientTrialStart] = useState('');
  const [newClientTrialEnd, setNewClientTrialEnd] = useState('');
  const [newClientTrialRangeInput, setNewClientTrialRangeInput] = useState('');
  const [newClientSupportContact, setNewClientSupportContact] = useState(
    `${workspace.ownerProfile.contactPhone} · ${workspace.ownerProfile.email}`
  );
  const [newClientNotes, setNewClientNotes] = useState('');

  // Edit client modal
  const [editingClient, setEditingClient] = useState<ClientLicense | null>(null);
  const [editTrialRangeInput, setEditTrialRangeInput] = useState('');

  const openEditClientModal = (client: ClientLicense) => {
    setEditingClient({ ...client });
    setEditTrialRangeInput(formatTrialRange(client.trialStartDate, client.trialEndDate));
  };

  // Add / Edit plan modal
  const [editingPlan, setEditingPlan] = useState<Partial<LicensePlan> | null>(null);
  const [planFeaturesText, setPlanFeaturesText] = useState('');

  // Owner Profile, Contact, Gateway & Feature Controls Draft
  const [profileDraft, setProfileDraft] = useState<OwnerProfileSettings>(workspace.ownerProfile);

  // Client Portal Full Management Drafts
  const [portalSettingsDraft, setPortalSettingsDraft] = useState<InstituteSettings>(
    workspace.portalSettings
  );
  const [resetAdminEmail, setResetAdminEmail] = useState(workspace.adminEmail);
  const [resetAdminPasscode, setResetAdminPasscode] = useState('');

  // Record Manual License Payment form
  const [licPayClientId, setLicPayClientId] = useState(workspace.clients[0]?.id ?? '');
  const [licPayAmount, setLicPayAmount] = useState(
    String(workspace.clients[0]?.customPrice ?? 4999)
  );
  const [licPayMode, setLicPayMode] = useState<LicensePaymentRecord['paymentMode']>('UPI');
  const [licPayRef, setLicPayRef] = useState('');
  const [licPayNotes, setLicPayNotes] = useState('');
  const [licPayActivate, setLicPayActivate] = useState(true);

  // Owner password update
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newUsername, setNewUsername] = useState(workspace.ownerUsername);
  const [passStatus, setPassStatus] = useState('');

  // Confirmation dialog
  const [confirmState, setConfirmState] = useState<{
    title: string;
    message: string;
    onConfirm: () => Promise<void>;
  } | null>(null);

  useEffect(() => {
    setProfileDraft(workspace.ownerProfile);
    setPortalSettingsDraft(workspace.portalSettings);
    setResetAdminEmail(workspace.adminEmail);
    setNewUsername(workspace.ownerUsername);
  }, [workspace]);

  const notify = (msg: string) => {
    setErrorBanner('');
    setToast(msg);
    window.setTimeout(() => setToast(''), 4000);
  };

  const activeClients = workspace.clients.filter(
    (c) => c.status === 'Active' || c.status === 'Trial'
  );
  const totalLicenseRevenue = activeClients.reduce((sum, c) => sum + (c.customPrice || 0), 0);
  const primaryClient = workspace.clients.find((c) => c.isPrimaryPortal) ?? workspace.clients[0];

  const handleSelectPlanForNewClient = (planId: string) => {
    setNewClientPlanId(planId);
    const plan = workspace.plans.find((p) => p.id === planId);
    if (plan) {
      setNewClientPrice(String(plan.price));
      setNewClientCycle(plan.billingCycle);
      setNewClientMaxStudents(String(plan.maxStudents));
    }
  };

  const handleCreateClient = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrorBanner('');
    try {
      const matchedPlan = workspace.plans.find((p) => p.id === newClientPlanId);
      await api.createClientLicense({
        clientName: newClientName.trim(),
        instituteEmail: newClientEmail.trim(),
        contactPhone: newClientPhone.trim(),
        planId: newClientPlanId || matchedPlan?.id,
        planName: matchedPlan?.name,
        customPrice: Number(newClientPrice) || 0,
        billingCycle: newClientCycle,
        maxStudents: Number(newClientMaxStudents) || 500,
        status: newClientStatus,
        expiresAt: newClientExpiresAt,
        trialStartDate: newClientTrialStart.trim() || undefined,
        trialEndDate: newClientTrialEnd.trim() || undefined,
        supportContact: newClientSupportContact.trim() || undefined,
        isPrimaryPortal: newClientPrimary,
        notes: newClientNotes.trim(),
      });
      await onRefresh();
      setAddClientOpen(false);
      setNewClientName('');
      setNewClientEmail('');
      setNewClientPhone('');
      setNewClientTrialStart('');
      setNewClientTrialEnd('');
      setNewClientTrialRangeInput('');
      setNewClientNotes('');
      setNewClientPrimary(false);
      notify('Client license issued and synced.');
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Unable to issue client license.');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveClientEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;
    setBusy(true);
    setErrorBanner('');
    try {
      await api.updateClientLicense(editingClient.id, {
        ...editingClient,
        trialStartDate: editingClient.trialStartDate || '',
        trialEndDate: editingClient.trialEndDate || '',
      });
      await onRefresh();
      setEditingClient(null);
      notify('Client license terms & owner pricing updated.');
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Failed to update client license.');
    } finally {
      setBusy(false);
    }
  };

  const handleQuickStatus = async (client: ClientLicense, status: ClientLicenseStatus) => {
    setBusy(true);
    try {
      await api.updateClientLicense(client.id, { status });
      await onRefresh();
      notify(`${client.clientName} status updated to ${status}.`);
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Unable to update status.');
    } finally {
      setBusy(false);
    }
  };

  const handleExtendExpiry = async (client: ClientLicense, days: number) => {
    setBusy(true);
    try {
      const baseMs = Math.max(Date.now(), new Date(client.expiresAt).getTime() || Date.now());
      const nextDate = new Date(baseMs + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      await api.updateClientLicense(client.id, {
        expiresAt: nextDate,
        status: client.status === 'Expired' ? 'Active' : client.status,
      });
      await onRefresh();
      notify(`Extended ${client.clientName} validity to ${nextDate}.`);
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Unable to extend validity.');
    } finally {
      setBusy(false);
    }
  };

  const handleSetPrimary = async (client: ClientLicense) => {
    setBusy(true);
    try {
      await api.updateClientLicense(client.id, { isPrimaryPortal: true });
      await onRefresh();
      notify(`${client.clientName} is now the active license bound to this portal.`);
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Unable to bind portal license.');
    } finally {
      setBusy(false);
    }
  };

  const openPlanEditor = (plan?: LicensePlan) => {
    if (plan) {
      setEditingPlan({ ...plan });
      setPlanFeaturesText(plan.features.join('\n'));
    } else {
      setEditingPlan({
        name: '',
        price: 2999,
        billingCycle: 'Monthly',
        maxStudents: 300,
        maxExams: 60,
        description: '',
        isRecommended: false,
      });
      setPlanFeaturesText('Full CBT Examination Engine\nInstant Scorecard & Solutions\nShareable QR & Exam Links');
    }
  };

  const handleSavePlan = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    setBusy(true);
    setErrorBanner('');
    try {
      const features = planFeaturesText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      if (editingPlan.id) {
        await api.updateLicensePlan(editingPlan.id, { ...editingPlan, features });
        notify(`Updated "${editingPlan.name}" license pricing.`);
      } else {
        await api.createLicensePlan({ ...editingPlan, features });
        notify(`Created new license tier "${editingPlan.name}".`);
      }
      await onRefresh();
      setEditingPlan(null);
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Unable to save license plan.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col">
      {/* Top Owner Console Bar */}
      <header className="bg-[#0B192C] text-white border-b border-slate-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded bg-[#0F3CC9] text-white flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-tight truncate">
                  SALAR Tech — Owner License Console
                </span>
                <span className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 bg-blue-500/20 text-blue-200 border border-blue-400/30 rounded">
                  OWNER: {workspace.ownerUsername}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => void onRefresh()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-slate-200"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              type="button"
              onClick={onOpenClientPortal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-slate-200"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Client Portal</span>
            </button>
            <button
              type="button"
              onClick={() => void onLogout()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 rounded text-white"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {toast && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-lg text-xs font-medium flex items-center justify-between">
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              {toast}
            </span>
            <button type="button" onClick={() => setToast('')}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {errorBanner && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-2.5 rounded-lg text-xs font-medium flex items-center justify-between">
            <span className="inline-flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" />
              {errorBanner}
            </span>
            <button type="button" onClick={() => setErrorBanner('')}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Active Portal Binding Banner */}
        {primaryClient && (
          <section className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-[11px] font-mono uppercase tracking-wider text-slate-500">
                Active Deployment License Binding
              </p>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-base font-bold text-slate-900">{primaryClient.clientName}</h2>
                <span className="text-[11px] font-mono px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-700">
                  {primaryClient.licenseKey}
                </span>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 border rounded ${getStatusBadgeClass(
                    primaryClient.status
                  )}`}
                >
                  {primaryClient.status}
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Owner-Decided Rate:{' '}
                <strong className="font-mono text-slate-900">
                  ₹{new Intl.NumberFormat('en-IN').format(primaryClient.customPrice)} /{' '}
                  {primaryClient.billingCycle}
                </strong>{' '}
                · Plan: {primaryClient.planName} · Valid Until:{' '}
                <span className="font-mono">{toDDMMYYYY(primaryClient.expiresAt)}</span>
                {formatTrialRange(primaryClient.trialStartDate, primaryClient.trialEndDate) && (
                  <>
                    {' '}
                    · Trial:{' '}
                    <span className="font-mono font-semibold text-[#0F3CC9]">
                      {formatTrialRange(primaryClient.trialStartDate, primaryClient.trialEndDate)}
                    </span>
                  </>
                )}{' '}
                · Current Portal Data: {workspace.portalStats.studentsCount} students,{' '}
                {workspace.portalStats.examsCount} exams
              </p>
            </div>
            <button
              type="button"
              onClick={() => openEditClientModal(primaryClient)}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-[#0F3CC9] hover:bg-blue-800 rounded shrink-0"
            >
              Adjust Client Price / Status
            </button>
          </section>
        )}

        {/* 4 KPI Cards */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="flex items-center justify-between text-slate-400">
              <Building2 className="w-4 h-4 text-[#0F3CC9]" />
              <span className="text-[10px] font-semibold uppercase tracking-wider">
                Client Institutes
              </span>
            </div>
            <p className="text-2xl font-bold font-mono text-slate-900 mt-3 tabular-nums">
              {workspace.clients.length}
            </p>
            <p className="text-xs text-slate-500 mt-1">Licensed organizations</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="flex items-center justify-between text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="text-[10px] font-semibold uppercase tracking-wider">
                Active Licenses
              </span>
            </div>
            <p className="text-2xl font-bold font-mono text-slate-900 mt-3 tabular-nums">
              {activeClients.length}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {workspace.clients.length - activeClients.length} suspended/grace/expired
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="flex items-center justify-between text-slate-400">
              <Users className="w-4 h-4 text-[#0F3CC9]" />
              <span className="text-[10px] font-semibold uppercase tracking-wider">
                License Portfolio Value
              </span>
            </div>
            <p className="text-2xl font-bold font-mono text-slate-900 mt-3 tabular-nums">
              ₹{new Intl.NumberFormat('en-IN').format(totalLicenseRevenue)}
            </p>
            <p className="text-xs text-slate-500 mt-1">Active client license billing</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="flex items-center justify-between text-slate-400">
              <Layers className="w-4 h-4 text-[#0F3CC9]" />
              <span className="text-[10px] font-semibold uppercase tracking-wider">
                Pricing Tiers
              </span>
            </div>
            <p className="text-2xl font-bold font-mono text-slate-900 mt-3 tabular-nums">
              {workspace.plans.length}
            </p>
            <p className="text-xs text-slate-500 mt-1">Owner-defined plans</p>
          </div>
        </section>

        {/* Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('clients')}
              className={`px-3.5 py-2 text-xs font-semibold rounded transition-colors ${
                activeTab === 'clients'
                  ? 'bg-[#0F3CC9] text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              Client Licenses ({workspace.clients.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('plans')}
              className={`px-3.5 py-2 text-xs font-semibold rounded transition-colors ${
                activeTab === 'plans'
                  ? 'bg-[#0F3CC9] text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              Plans &amp; Pricing ({workspace.plans.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('billing')}
              className={`px-3.5 py-2 text-xs font-semibold rounded transition-colors inline-flex items-center gap-1.5 ${
                activeTab === 'billing'
                  ? 'bg-[#0F3CC9] text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              Payment Gateway &amp; Billing ({workspace.licensePayments.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('portal')}
              className={`px-3.5 py-2 text-xs font-semibold rounded transition-colors inline-flex items-center gap-1.5 ${
                activeTab === 'portal'
                  ? 'bg-[#0F3CC9] text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              Client Portal Control
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`px-3.5 py-2 text-xs font-semibold rounded transition-colors inline-flex items-center gap-1.5 ${
                activeTab === 'profile'
                  ? 'bg-[#0F3CC9] text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              Owner Profile &amp; Security
            </button>
          </div>

          {activeTab === 'clients' && (
            <button
              type="button"
              onClick={() => setAddClientOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0B192C] hover:bg-slate-900 rounded"
            >
              <Plus className="w-3.5 h-3.5" />
              Issue Client License
            </button>
          )}
          {activeTab === 'plans' && (
            <button
              type="button"
              onClick={() => openPlanEditor()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0B192C] hover:bg-slate-900 rounded"
            >
              <Plus className="w-3.5 h-3.5" />
              Create License Plan
            </button>
          )}
        </div>

        {/* Client Licenses Table & Cards */}
        {activeTab === 'clients' && (
          <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-mono uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Client Institute</th>
                  <th className="py-3 px-4">License Key &amp; Tier</th>
                  <th className="py-3 px-4">Owner-Decided Price</th>
                  <th className="py-3 px-4">Validity</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">License Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {workspace.clients.map((c) => (
                  <tr key={c.id} className={c.isPrimaryPortal ? 'bg-blue-50/30' : ''}>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{c.clientName}</span>
                        {c.isPrimaryPortal && (
                          <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-[#0F3CC9] text-white rounded">
                            THIS PORTAL
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {c.instituteEmail} · {c.contactPhone}
                      </p>
                      {c.notes && (
                        <p className="text-[11px] text-slate-500 italic mt-0.5">{c.notes}</p>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-mono font-semibold text-slate-800">{c.licenseKey}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {c.planName} · Up to {c.maxStudents} students
                      </p>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-mono font-bold text-slate-900 text-sm">
                        ₹{new Intl.NumberFormat('en-IN').format(c.customPrice)}
                      </p>
                      <p className="text-[11px] text-slate-500">{c.billingCycle} Billing</p>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      <p>Expires: {toDDMMYYYY(c.expiresAt)}</p>
                      {formatTrialRange(c.trialStartDate, c.trialEndDate) && (
                        <p className="text-[11px] font-semibold text-[#0F3CC9] mt-0.5">
                          Trial: {formatTrialRange(c.trialStartDate, c.trialEndDate)}
                        </p>
                      )}
                      <p className="text-[11px] text-slate-400">
                        Issued: {toDDMMYYYY(c.issuedAt)}
                      </p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 text-[11px] font-semibold border rounded ${getStatusBadgeClass(
                          c.status
                        )}`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => openEditClientModal(c)}
                          className="px-2 py-1 text-[11px] font-semibold text-[#0F3CC9] bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 inline-flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" />
                          Price / Edit
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handleExtendExpiry(c, 30)}
                          className="px-2 py-1 text-[11px] font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 inline-flex items-center gap-1"
                          title="Extend validity by 30 days"
                        >
                          <CalendarPlus className="w-3 h-3" />
                          +30d
                        </button>
                        {c.status === 'Suspended' || c.status === 'Expired' ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleQuickStatus(c, 'Active')}
                            className="px-2 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100"
                          >
                            Activate
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleQuickStatus(c, 'Suspended')}
                            className="px-2 py-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded hover:bg-rose-100"
                          >
                            Suspend
                          </button>
                        )}
                        {!c.isPrimaryPortal && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleSetPrimary(c)}
                            className="px-2 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded hover:bg-slate-200"
                          >
                            Bind Portal
                          </button>
                        )}
                        {!c.isPrimaryPortal && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              setConfirmState({
                                title: 'Delete Client License',
                                message: `Remove ${c.clientName} (${c.licenseKey}) permanently?`,
                                onConfirm: async () => {
                                  await api.deleteClientLicense(c.id);
                                  await onRefresh();
                                  notify(`Removed client license ${c.clientName}.`);
                                },
                              })
                            }
                            className="p-1 text-slate-400 hover:text-rose-700"
                            title="Delete client license"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* License Plans & Pricing Grid */}
        {activeTab === 'plans' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Pricing decided here is shown directly to clients on their Portal Settings &amp;
              License screen under <strong>SALAR Tech</strong>.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {workspace.plans.map((plan) => (
                <article
                  key={plan.id}
                  className={`bg-white border rounded-lg p-5 flex flex-col justify-between gap-4 ${
                    plan.isRecommended ? 'border-[#0F3CC9] ring-1 ring-[#0F3CC9]/20' : 'border-slate-200'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
                        {plan.billingCycle}
                      </span>
                      {plan.isRecommended && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 bg-blue-50 text-[#0F3CC9] border border-blue-200 rounded">
                          <Star className="w-3 h-3" />
                          Recommended
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-slate-900">{plan.name}</h3>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-bold font-mono text-slate-900">
                        ₹{new Intl.NumberFormat('en-IN').format(plan.price)}
                      </span>
                      <span className="text-xs text-slate-500">/ {plan.billingCycle}</span>
                    </div>
                    <p className="text-xs text-slate-600">{plan.description}</p>
                    <p className="text-[11px] font-mono text-slate-500">
                      Up to {plan.maxStudents} students · {plan.maxExams} exams
                    </p>
                    <ul className="space-y-1 pt-2 border-t border-slate-100">
                      {plan.features.map((f) => (
                        <li key={f} className="text-xs text-slate-700 flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#0F3CC9] shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => openPlanEditor(plan)}
                      className="flex-1 py-1.5 px-3 text-xs font-semibold text-[#0F3CC9] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded inline-flex items-center justify-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit Price &amp; Tier
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setConfirmState({
                          title: 'Delete License Plan',
                          message: `Delete plan "${plan.name}"? Existing client contracts remain intact.`,
                          onConfirm: async () => {
                            await api.deleteLicensePlan(plan.id);
                            await onRefresh();
                            notify(`Deleted license plan "${plan.name}".`);
                          },
                        })
                      }
                      className="p-1.5 text-slate-400 hover:text-rose-700 border border-slate-200 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {/* Payment Gateway & Billing Ledger */}
        {activeTab === 'billing' && (
          <div className="space-y-6 text-xs">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Gateway & UPI Configuration */}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy(true);
                  setErrorBanner('');
                  try {
                    await api.updateOwnerProfile(profileDraft);
                    await onRefresh();
                    notify('Owner Payment Gateway & Bank settings saved.');
                  } catch (err) {
                    setErrorBanner(
                      err instanceof Error ? err.message : 'Unable to save payment gateway settings.'
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
                className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-5 space-y-4"
              >
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-[#0F3CC9]" />
                    <h2 className="text-sm font-bold text-slate-900">
                      Owner Payment Gateway &amp; Settlement Bank
                    </h2>
                  </div>
                  <span className="font-mono text-[10px] px-2 py-0.5 bg-blue-50 text-[#0F3CC9] border border-blue-200 rounded">
                    {profileDraft.paymentGatewayProvider}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Payment Gateway Provider
                    </label>
                    <select
                      value={profileDraft.paymentGatewayProvider}
                      onChange={(e) =>
                        setProfileDraft((p) => ({
                          ...p,
                          paymentGatewayProvider: e.target.value as PaymentGatewayProvider,
                        }))
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded bg-white"
                    >
                      {GATEWAY_PROVIDERS.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Owner Merchant UPI ID
                    </label>
                    <input
                      type="text"
                      value={profileDraft.upiId}
                      onChange={(e) =>
                        setProfileDraft((p) => ({ ...p, upiId: e.target.value }))
                      }
                      placeholder="salartech@okaxis"
                      className="w-full px-3 py-2 border border-slate-300 rounded font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Gateway Public Key ID (Razorpay / Cashfree)
                    </label>
                    <input
                      type="text"
                      value={profileDraft.gatewayKeyId}
                      onChange={(e) =>
                        setProfileDraft((p) => ({ ...p, gatewayKeyId: e.target.value }))
                      }
                      placeholder="rzp_live_XXXXXXXXXX"
                      className="w-full px-3 py-2 border border-slate-300 rounded font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Hosted Payment Link URL
                    </label>
                    <input
                      type="url"
                      value={profileDraft.gatewayPaymentLink}
                      onChange={(e) =>
                        setProfileDraft((p) => ({ ...p, gatewayPaymentLink: e.target.value }))
                      }
                      placeholder="https://rzp.io/l/salartech"
                      className="w-full px-3 py-2 border border-slate-300 rounded font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={profileDraft.bankName}
                      onChange={(e) =>
                        setProfileDraft((p) => ({ ...p, bankName: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Account Holder Name
                    </label>
                    <input
                      type="text"
                      value={profileDraft.accountHolder}
                      onChange={(e) =>
                        setProfileDraft((p) => ({ ...p, accountHolder: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={profileDraft.accountNo}
                      onChange={(e) =>
                        setProfileDraft((p) => ({ ...p, accountNo: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">IFSC Code</label>
                    <input
                      type="text"
                      value={profileDraft.ifsc}
                      onChange={(e) =>
                        setProfileDraft((p) => ({ ...p, ifsc: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-100">
                  <button
                    type="submit"
                    disabled={busy}
                    className="px-4 py-2 font-semibold text-white bg-[#0F3CC9] hover:bg-blue-800 rounded"
                  >
                    Save Payment Gateway
                  </button>
                </div>
              </form>

              {/* Record Manual / Direct Client License Payment */}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy(true);
                  setErrorBanner('');
                  try {
                    await api.createOwnerLicensePayment({
                      clientId: licPayClientId,
                      amount: Number(licPayAmount) || 0,
                      paymentMode: licPayMode,
                      referenceId: licPayRef.trim(),
                      notes: licPayNotes.trim(),
                      status: 'Verified',
                      activateClient: licPayActivate,
                    });
                    setLicPayRef('');
                    setLicPayNotes('');
                    await onRefresh();
                    notify('Client license payment recorded and synced.');
                  } catch (err) {
                    setErrorBanner(
                      err instanceof Error ? err.message : 'Unable to record license payment.'
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
                className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5 space-y-3"
              >
                <h2 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-3">
                  Record Client License Payment
                </h2>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Client</label>
                  <select
                    value={licPayClientId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setLicPayClientId(id);
                      const found = workspace.clients.find((c) => c.id === id);
                      if (found) setLicPayAmount(String(found.customPrice));
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded bg-white"
                  >
                    {workspace.clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.clientName} ({c.licenseKey})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Amount (₹)</label>
                    <input
                      type="number"
                      min={0}
                      value={licPayAmount}
                      onChange={(e) => setLicPayAmount(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded font-mono font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Mode</label>
                    <select
                      value={licPayMode}
                      onChange={(e) =>
                        setLicPayMode(e.target.value as LicensePaymentRecord['paymentMode'])
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded bg-white"
                    >
                      <option value="UPI">UPI</option>
                      <option value="Payment Gateway">Payment Gateway</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cash / Manual">Cash / Manual</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    UTR / Gateway Reference ID *
                  </label>
                  <input
                    type="text"
                    value={licPayRef}
                    onChange={(e) => setLicPayRef(e.target.value)}
                    placeholder="e.g. UTR-60491234 or pay_xyz"
                    className="w-full px-3 py-2 border border-slate-300 rounded font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Notes</label>
                  <input
                    type="text"
                    value={licPayNotes}
                    onChange={(e) => setLicPayNotes(e.target.value)}
                    placeholder="Optional billing period note"
                    className="w-full px-3 py-2 border border-slate-300 rounded"
                  />
                </div>
                <label className="flex items-center gap-2 font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={licPayActivate}
                    onChange={(e) => setLicPayActivate(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  Auto-activate client &amp; extend validity cycle
                </label>
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-2 font-semibold text-white bg-[#0B192C] hover:bg-slate-900 rounded"
                >
                  Record Verified License Payment
                </button>
              </form>
            </div>

            {/* Client License Payment Ledger */}
            <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
              <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">
                  Client License Payment Ledger
                </h3>
                <span className="font-mono text-[11px] text-slate-500">
                  {workspace.licensePayments.filter((p) => p.status === 'Pending').length} pending
                  verification
                </span>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-mono uppercase tracking-wider text-slate-500">
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Client &amp; Key</th>
                    <th className="py-2.5 px-4">Plan &amp; Amount</th>
                    <th className="py-2.5 px-4">Mode &amp; Reference</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {workspace.licensePayments.map((lp) => (
                    <tr key={lp.id}>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {toDDMMYYYY(lp.submittedAt)}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{lp.clientName}</p>
                        <p className="font-mono text-[11px] text-slate-500">{lp.licenseKey}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-mono font-bold text-slate-900">
                          ₹{new Intl.NumberFormat('en-IN').format(lp.amount)}
                        </p>
                        <p className="text-[11px] text-slate-500">{lp.planName}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-800">{lp.paymentMode}</p>
                        <p className="font-mono text-[11px] text-slate-600">{lp.referenceId}</p>
                        {lp.notes && (
                          <p className="text-[11px] text-slate-500 italic">{lp.notes}</p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 text-[11px] font-semibold border rounded ${
                            lp.status === 'Verified'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : lp.status === 'Rejected'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {lp.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {lp.status !== 'Verified' && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={async () => {
                                setBusy(true);
                                try {
                                  await api.updateOwnerLicensePaymentStatus(
                                    lp.id,
                                    'Verified',
                                    true
                                  );
                                  await onRefresh();
                                  notify(
                                    `Verified payment ${lp.referenceId} & activated ${lp.clientName}.`
                                  );
                                } catch (err) {
                                  setErrorBanner(
                                    err instanceof Error
                                      ? err.message
                                      : 'Unable to verify payment.'
                                  );
                                } finally {
                                  setBusy(false);
                                }
                              }}
                              className="px-2 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100"
                            >
                              Verify &amp; Activate
                            </button>
                          )}
                          {lp.status === 'Pending' && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={async () => {
                                setBusy(true);
                                try {
                                  await api.updateOwnerLicensePaymentStatus(
                                    lp.id,
                                    'Rejected',
                                    false
                                  );
                                  await onRefresh();
                                  notify(`Marked payment ${lp.referenceId} as Rejected.`);
                                } finally {
                                  setBusy(false);
                                }
                              }}
                              className="px-2 py-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded hover:bg-rose-100"
                            >
                              Reject
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={busy}
                            onClick={async () => {
                              setBusy(true);
                              try {
                                await api.deleteOwnerLicensePayment(lp.id);
                                await onRefresh();
                                notify('Payment entry removed.');
                              } finally {
                                setBusy(false);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-rose-700"
                            title="Delete payment entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Full Client Portal Control */}
        {activeTab === 'portal' && (
          <div className="space-y-6 text-xs">
            {/* One-Click Direct Portal Access */}
            <section className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-[#0F3CC9] font-semibold">
                  Owner Master Access
                </p>
                <h2 className="text-sm font-bold text-slate-900 mt-0.5">
                  Handle Full Client Portal Directly ({portalSettingsDraft.instituteName})
                </h2>
                <p className="text-slate-600 mt-0.5">
                  Jump directly into the Client Admin Console or Student Portal with owner privileges,
                  or control global switches &amp; exams below.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const res = await api.ownerImpersonateAdmin();
                      setAuthToken(res.token);
                      await onOpenAdminConsole();
                    } catch (err) {
                      setErrorBanner(
                        err instanceof Error ? err.message : 'Unable to open Admin Console.'
                      );
                    } finally {
                      setBusy(false);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 font-semibold text-white bg-[#0F3CC9] hover:bg-blue-800 rounded"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Open Client Admin Console
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const res = await api.ownerImpersonateStudent();
                      setAuthToken(res.token);
                      await onOpenStudentPortal();
                    } catch (err) {
                      setErrorBanner(
                        err instanceof Error ? err.message : 'Unable to open Student Portal.'
                      );
                    } finally {
                      setBusy(false);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded"
                >
                  <UserCheck className="w-4 h-4" />
                  Open Student Portal
                </button>
              </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Feature Toggles & Maintenance Mode */}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy(true);
                  setErrorBanner('');
                  try {
                    await api.updateOwnerProfile(profileDraft);
                    await onRefresh();
                    notify('Client portal feature switches & maintenance controls updated.');
                  } catch (err) {
                    setErrorBanner(
                      err instanceof Error ? err.message : 'Failed to save portal switches.'
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
                className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5 space-y-3.5"
              >
                <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                  <Sliders className="w-4 h-4 text-[#0F3CC9]" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Global Client Feature Switches
                  </h3>
                </div>

                <label className="flex items-start gap-2.5 p-2.5 border border-slate-200 rounded bg-slate-50">
                  <input
                    type="checkbox"
                    checked={profileDraft.clientPortalControls.allowQuickJoin}
                    onChange={(e) =>
                      setProfileDraft((p) => ({
                        ...p,
                        clientPortalControls: {
                          ...p.clientPortalControls,
                          allowQuickJoin: e.target.checked,
                        },
                      }))
                    }
                    className="mt-0.5 rounded border-slate-300"
                  />
                  <div>
                    <p className="font-semibold text-slate-900">Allow Quick Join Exam Links</p>
                    <p className="text-[11px] text-slate-500">
                      Students can join shared live tests with phone/name without prior account.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-2.5 border border-slate-200 rounded bg-slate-50">
                  <input
                    type="checkbox"
                    checked={profileDraft.clientPortalControls.allowStudentSignup}
                    onChange={(e) =>
                      setProfileDraft((p) => ({
                        ...p,
                        clientPortalControls: {
                          ...p.clientPortalControls,
                          allowStudentSignup: e.target.checked,
                        },
                      }))
                    }
                    className="mt-0.5 rounded border-slate-300"
                  />
                  <div>
                    <p className="font-semibold text-slate-900">Allow Public Student Signup</p>
                    <p className="text-[11px] text-slate-500">
                      Enable or lock self-registration on the Client Portal login screen.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-2.5 border border-slate-200 rounded bg-slate-50">
                  <input
                    type="checkbox"
                    checked={profileDraft.clientPortalControls.allowPayments}
                    onChange={(e) =>
                      setProfileDraft((p) => ({
                        ...p,
                        clientPortalControls: {
                          ...p.clientPortalControls,
                          allowPayments: e.target.checked,
                        },
                      }))
                    }
                    className="mt-0.5 rounded border-slate-300"
                  />
                  <div>
                    <p className="font-semibold text-slate-900">Enable Course / Test Payments</p>
                    <p className="text-[11px] text-slate-500">
                      Controls student checkout and UPI enrollment buttons in the client portal.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-2.5 border border-amber-200 rounded bg-amber-50">
                  <input
                    type="checkbox"
                    checked={profileDraft.clientPortalControls.maintenanceMode}
                    onChange={(e) =>
                      setProfileDraft((p) => ({
                        ...p,
                        clientPortalControls: {
                          ...p.clientPortalControls,
                          maintenanceMode: e.target.checked,
                        },
                      }))
                    }
                    className="mt-0.5 rounded border-amber-400"
                  />
                  <div>
                    <p className="font-semibold text-amber-950">Maintenance Mode Lock</p>
                    <p className="text-[11px] text-amber-800">
                      Temporarily puts the Client Portal into maintenance notice screen.
                    </p>
                  </div>
                </label>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Maintenance Notice Message
                  </label>
                  <input
                    type="text"
                    value={profileDraft.clientPortalControls.maintenanceMessage}
                    onChange={(e) =>
                      setProfileDraft((p) => ({
                        ...p,
                        clientPortalControls: {
                          ...p.clientPortalControls,
                          maintenanceMessage: e.target.value,
                        },
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded"
                  />
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-2 font-semibold text-white bg-[#0F3CC9] hover:bg-blue-800 rounded"
                >
                  Save Portal Feature Controls
                </button>
              </form>

              {/* Edit Client Institute Settings + Reset Client Admin Passcode */}
              <div className="lg:col-span-7 space-y-5">
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setBusy(true);
                    setErrorBanner('');
                    try {
                      await api.ownerUpdateClientSettings(portalSettingsDraft);
                      await onRefresh();
                      notify('Client Institute Settings updated.');
                    } catch (err) {
                      setErrorBanner(
                        err instanceof Error ? err.message : 'Unable to save client settings.'
                      );
                    } finally {
                      setBusy(false);
                    }
                  }}
                  className="bg-white border border-slate-200 rounded-lg p-5 space-y-3"
                >
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                    <Globe className="w-4 h-4 text-[#0F3CC9]" />
                    <h3 className="text-sm font-bold text-slate-900">
                      Remote Client Institute Branding &amp; Bank Settings
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Institute Name
                      </label>
                      <input
                        type="text"
                        value={portalSettingsDraft.instituteName}
                        onChange={(e) =>
                          setPortalSettingsDraft((s) => ({ ...s, instituteName: e.target.value }))
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Tagline</label>
                      <input
                        type="text"
                        value={portalSettingsDraft.tagline}
                        onChange={(e) =>
                          setPortalSettingsDraft((s) => ({ ...s, tagline: e.target.value }))
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Client Contact Email
                      </label>
                      <input
                        type="email"
                        value={portalSettingsDraft.email}
                        onChange={(e) =>
                          setPortalSettingsDraft((s) => ({ ...s, email: e.target.value }))
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Client Contact Phone
                      </label>
                      <input
                        type="text"
                        value={portalSettingsDraft.phone}
                        onChange={(e) =>
                          setPortalSettingsDraft((s) => ({ ...s, phone: e.target.value }))
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Client UPI ID
                      </label>
                      <input
                        type="text"
                        value={portalSettingsDraft.upiId}
                        onChange={(e) =>
                          setPortalSettingsDraft((s) => ({ ...s, upiId: e.target.value }))
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Address</label>
                      <input
                        type="text"
                        value={portalSettingsDraft.address}
                        onChange={(e) =>
                          setPortalSettingsDraft((s) => ({ ...s, address: e.target.value }))
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={busy}
                      className="px-4 py-2 font-semibold text-white bg-[#0B192C] hover:bg-slate-900 rounded"
                    >
                      Update Client Portal Settings
                    </button>
                  </div>
                </form>

                {/* Reset Client Admin Passcode */}
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setBusy(true);
                    setErrorBanner('');
                    try {
                      const res = await api.ownerResetClientAdminPasscode(
                        resetAdminPasscode,
                        resetAdminEmail
                      );
                      setResetAdminPasscode('');
                      await onRefresh();
                      notify(`Client Admin passcode reset for ${res.email}.`);
                    } catch (err) {
                      setErrorBanner(
                        err instanceof Error ? err.message : 'Unable to reset admin passcode.'
                      );
                    } finally {
                      setBusy(false);
                    }
                  }}
                  className="bg-white border border-slate-200 rounded-lg p-5 space-y-3"
                >
                  <h3 className="text-sm font-bold text-slate-900">
                    Reset Client Institute Admin Login
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Client Admin Email
                      </label>
                      <input
                        type="email"
                        value={resetAdminEmail}
                        onChange={(e) => setResetAdminEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        New Passcode (min 6 chars)
                      </label>
                      <input
                        type="text"
                        value={resetAdminPasscode}
                        onChange={(e) => setResetAdminPasscode(e.target.value)}
                        placeholder="Set new client passcode"
                        className="w-full px-3 py-2 border border-slate-300 rounded font-mono"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={busy}
                      className="px-4 py-2 font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded"
                    >
                      Reset Admin Passcode
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Client Exams Live / Draft Remote Control */}
            <section className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
              <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">
                  Client Portal Exams ({workspace.portalExams.length})
                </h3>
                <span className="font-mono text-[11px] text-slate-500">
                  Toggle exam Live/Draft state directly from Owner Console
                </span>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-mono uppercase tracking-wider text-slate-500">
                    <th className="py-2.5 px-4">Code</th>
                    <th className="py-2.5 px-4">Title</th>
                    <th className="py-2.5 px-4">Subject / Class</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Owner Control</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {workspace.portalExams.map((ex) => (
                    <tr key={ex.id}>
                      <td className="py-2.5 px-4 font-mono font-semibold text-slate-700">
                        {ex.code}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-900">{ex.title}</td>
                      <td className="py-2.5 px-4 text-slate-600">
                        {ex.subject || 'PCM'} · Class {ex.targetClass} · {ex.questionIds.length} Qs
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 text-[11px] font-semibold border rounded ${
                            ex.status === 'Live'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {ex.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={async () => {
                            setBusy(true);
                            try {
                              await api.ownerToggleClientExam(ex.id);
                              await onRefresh();
                              notify(
                                `${ex.title} switched to ${ex.status === 'Live' ? 'Draft' : 'Live'}.`
                              );
                            } finally {
                              setBusy(false);
                            }
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-slate-300 hover:bg-slate-50 rounded"
                        >
                          {ex.status === 'Live' ? 'Set Draft' : 'Publish Live'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        )}

        {/* Owner Profile, Support Contact & Security */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setErrorBanner('');
                try {
                  await api.updateOwnerProfile(profileDraft);
                  await onRefresh();
                  notify('SALAR Tech owner profile, contact number, email & branding saved.');
                } catch (err) {
                  setErrorBanner(
                    err instanceof Error ? err.message : 'Unable to save owner profile.'
                  );
                } finally {
                  setBusy(false);
                }
              }}
              className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-6 space-y-4"
            >
              <div className="flex items-center gap-2.5 border-b border-slate-200 pb-3">
                <Building2 className="w-4 h-4 text-[#0F3CC9]" />
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Owner Contact, Mail ID &amp; Client Portal Attribution
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Displayed across Client Portals, Suspended screens, and invoices.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Owner Name</label>
                  <input
                    type="text"
                    value={profileDraft.ownerName}
                    onChange={(e) =>
                      setProfileDraft((p) => ({ ...p, ownerName: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Company Name</label>
                  <input
                    type="text"
                    value={profileDraft.companyName}
                    onChange={(e) =>
                      setProfileDraft((p) => ({ ...p, companyName: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    <span className="inline-flex items-center gap-1">
                      <Phone className="w-3 h-3 text-[#0F3CC9]" /> Contact Number *
                    </span>
                  </label>
                  <input
                    type="text"
                    value={profileDraft.contactPhone}
                    onChange={(e) =>
                      setProfileDraft((p) => ({ ...p, contactPhone: e.target.value }))
                    }
                    placeholder="+91 98230 11223"
                    className="w-full px-3 py-2 border border-slate-300 rounded font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    WhatsApp Support Number
                  </label>
                  <input
                    type="text"
                    value={profileDraft.whatsappNumber}
                    onChange={(e) =>
                      setProfileDraft((p) => ({ ...p, whatsappNumber: e.target.value }))
                    }
                    placeholder="+919823011223"
                    className="w-full px-3 py-2 border border-slate-300 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    <span className="inline-flex items-center gap-1">
                      <Mail className="w-3 h-3 text-[#0F3CC9]" /> Owner Mail ID *
                    </span>
                  </label>
                  <input
                    type="email"
                    value={profileDraft.email}
                    onChange={(e) => setProfileDraft((p) => ({ ...p, email: e.target.value }))}
                    placeholder="support@salartech.in"
                    className="w-full px-3 py-2 border border-slate-300 rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    GSTIN / Business Reg No
                  </label>
                  <input
                    type="text"
                    value={profileDraft.gstNumber}
                    onChange={(e) =>
                      setProfileDraft((p) => ({ ...p, gstNumber: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Office Address</label>
                <input
                  type="text"
                  value={profileDraft.address}
                  onChange={(e) => setProfileDraft((p) => ({ ...p, address: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Client Portal Credit Text (shown on Client Portals)
                </label>
                <input
                  type="text"
                  value={profileDraft.footerTagline}
                  onChange={(e) =>
                    setProfileDraft((p) => ({ ...p, footerTagline: e.target.value }))
                  }
                  placeholder="Made by SALAR Tech"
                  className="w-full px-3 py-2 border border-slate-300 rounded font-semibold"
                />
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={busy}
                  className="px-4 py-2 font-semibold text-white bg-[#0F3CC9] hover:bg-blue-800 rounded"
                >
                  Save Owner Profile &amp; Contact Details
                </button>
              </div>
            </form>

            {/* Owner Login Security */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-6 space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-200 pb-3">
                <KeyRound className="w-4 h-4 text-[#0F3CC9]" />
                <h2 className="text-sm font-bold text-slate-900">
                  SALAR Tech Owner Credentials
                </h2>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setPassStatus('');
                  setBusy(true);
                  try {
                    await api.changeOwnerPassword(currentPassword, newPassword, newUsername);
                    setCurrentPassword('');
                    setNewPassword('');
                    await onRefresh();
                    setPassStatus('Owner credentials updated successfully.');
                  } catch (err) {
                    setPassStatus(
                      err instanceof Error ? err.message : 'Unable to update owner credentials.'
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
                className="space-y-3"
              >
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Owner Username</label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Current Password *
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    New Password (min 6 characters) *
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded"
                    required
                  />
                </div>
                {passStatus && <p className="text-xs font-medium text-[#0F3CC9]">{passStatus}</p>}
                <button
                  type="submit"
                  disabled={busy}
                  className="px-4 py-2 font-semibold text-white bg-[#0B192C] hover:bg-slate-900 rounded"
                >
                  Update Owner Account
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Issue New Client License Modal */}
      {addClientOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4"
          onClick={() => setAddClientOpen(false)}
        >
          <div
            className="bg-white border border-slate-200 rounded-lg max-w-lg w-full p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Issue New Client License</h3>
              <button type="button" onClick={() => setAddClientOpen(false)}>
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Client Institute Name *
                </label>
                <input
                  type="text"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="e.g. Vidyasagar Science Academy"
                  className="w-full px-3 py-2 border border-slate-300 rounded"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contact Email</label>
                  <input
                    type="email"
                    value={newClientEmail}
                    onChange={(e) => setNewClientEmail(e.target.value)}
                    placeholder="director@institute.edu"
                    className="w-full px-3 py-2 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    placeholder="+91 98XXXXXXXX"
                    className="w-full px-3 py-2 border border-slate-300 rounded font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">License Tier</label>
                  <select
                    value={newClientPlanId}
                    onChange={(e) => handleSelectPlanForNewClient(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded bg-white"
                  >
                    {workspace.plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (₹{p.price})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Owner-Decided Price (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={newClientPrice}
                    onChange={(e) => setNewClientPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Billing Cycle</label>
                  <select
                    value={newClientCycle}
                    onChange={(e) => setNewClientCycle(e.target.value as LicenseBillingCycle)}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded bg-white"
                  >
                    {BILLING_CYCLES.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Max Students</label>
                  <input
                    type="number"
                    min={1}
                    value={newClientMaxStudents}
                    onChange={(e) => setNewClientMaxStudents(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={newClientStatus}
                    onChange={(e) => setNewClientStatus(e.target.value as ClientLicenseStatus)}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded bg-white"
                  >
                    {CLIENT_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Valid Until</label>
                  <input
                    type="date"
                    value={newClientExpiresAt}
                    onChange={(e) => setNewClientExpiresAt(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded font-mono"
                  />
                </div>
                <label className="flex items-center gap-2 pt-5 font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={newClientPrimary}
                    onChange={(e) => setNewClientPrimary(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  Bind as primary portal license
                </label>
              </div>

              <div className="border border-slate-200 bg-slate-50 rounded p-3 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-slate-800">
                    Trial Date Range (DD-MM-YYYY to DD-MM-YYYY)
                  </span>
                  <div className="flex items-center gap-1">
                    {[7, 15, 30].map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => {
                          const start = new Date().toISOString().slice(0, 10);
                          const end = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
                            .toISOString()
                            .slice(0, 10);
                          setNewClientTrialStart(start);
                          setNewClientTrialEnd(end);
                          setNewClientTrialRangeInput(formatTrialRange(start, end));
                          if (newClientStatus === 'Trial') {
                            setNewClientExpiresAt(end);
                          }
                        }}
                        className="px-2 py-0.5 text-[10px] font-mono bg-white border border-slate-300 rounded hover:bg-slate-100"
                      >
                        {days}d Trial
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setNewClientTrialStart('');
                        setNewClientTrialEnd('');
                        setNewClientTrialRangeInput('');
                      }}
                      className="px-2 py-0.5 text-[10px] font-mono text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-100"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  value={newClientTrialRangeInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewClientTrialRangeInput(val);
                    const parsed = parseTrialRangeInput(val);
                    if (parsed) {
                      setNewClientTrialStart(parsed.start);
                      setNewClientTrialEnd(parsed.end);
                      if (parsed.end && newClientStatus === 'Trial') {
                        setNewClientExpiresAt(parsed.end);
                      }
                    }
                  }}
                  onBlur={() => {
                    const formatted = formatTrialRange(newClientTrialStart, newClientTrialEnd);
                    if (formatted) setNewClientTrialRangeInput(formatted);
                  }}
                  placeholder="02-02-2026 to 03-03-2026"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono bg-white"
                />
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">Trial Start</label>
                    <input
                      type="date"
                      value={newClientTrialStart}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewClientTrialStart(val);
                        setNewClientTrialRangeInput(formatTrialRange(val, newClientTrialEnd));
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">Trial End</label>
                    <input
                      type="date"
                      value={newClientTrialEnd}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewClientTrialEnd(val);
                        setNewClientTrialRangeInput(formatTrialRange(newClientTrialStart, val));
                        if (val && newClientStatus === 'Trial') {
                          setNewClientExpiresAt(val);
                        }
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono bg-white"
                    />
                  </div>
                </div>
                {formatTrialRange(newClientTrialStart, newClientTrialEnd) && (
                  <p className="text-[11px] font-mono text-[#0F3CC9]">
                    Formatted Trial Window: {formatTrialRange(newClientTrialStart, newClientTrialEnd)}
                  </p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Support Team Contact (shown if ID suspended)
                </label>
                <input
                  type="text"
                  value={newClientSupportContact}
                  onChange={(e) => setNewClientSupportContact(e.target.value)}
                  placeholder="+91 98230 11223 · support@salartech.in"
                  className="w-full px-3 py-2 border border-slate-300 rounded font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Owner / Suspension Notes
                </label>
                <input
                  type="text"
                  value={newClientNotes}
                  onChange={(e) => setNewClientNotes(e.target.value)}
                  placeholder="Suspension reason, renewal terms, or trial info..."
                  className="w-full px-3 py-2 border border-slate-300 rounded"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setAddClientOpen(false)}
                  className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="px-4 py-2 font-semibold text-white bg-[#0F3CC9] hover:bg-blue-800 rounded"
                >
                  Issue License
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Client License & Owner Price Modal */}
      {editingClient && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4"
          onClick={() => setEditingClient(null)}
        >
          <div
            className="bg-white border border-slate-200 rounded-lg max-w-lg w-full p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Edit Client License &amp; Pricing
                </h3>
                <p className="text-[11px] font-mono text-slate-500">{editingClient.licenseKey}</p>
              </div>
              <button type="button" onClick={() => setEditingClient(null)}>
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSaveClientEdit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Client Institute Name
                </label>
                <input
                  type="text"
                  value={editingClient.clientName}
                  onChange={(e) =>
                    setEditingClient((c) => (c ? { ...c, clientName: e.target.value } : c))
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">License Tier</label>
                  <select
                    value={editingClient.planId}
                    onChange={(e) => {
                      const plan = workspace.plans.find((p) => p.id === e.target.value);
                      setEditingClient((c) =>
                        c
                          ? {
                              ...c,
                              planId: e.target.value,
                              planName: plan?.name ?? c.planName,
                            }
                          : c
                      );
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded bg-white"
                  >
                    {workspace.plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Owner-Decided Fee (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editingClient.customPrice}
                    onChange={(e) =>
                      setEditingClient((c) =>
                        c ? { ...c, customPrice: Number(e.target.value) || 0 } : c
                      )
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded font-mono font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Billing Cycle</label>
                  <select
                    value={editingClient.billingCycle}
                    onChange={(e) =>
                      setEditingClient((c) =>
                        c
                          ? { ...c, billingCycle: e.target.value as LicenseBillingCycle }
                          : c
                      )
                    }
                    className="w-full px-2.5 py-2 border border-slate-300 rounded bg-white"
                  >
                    {BILLING_CYCLES.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={editingClient.status}
                    onChange={(e) =>
                      setEditingClient((c) =>
                        c ? { ...c, status: e.target.value as ClientLicenseStatus } : c
                      )
                    }
                    className="w-full px-2.5 py-2 border border-slate-300 rounded bg-white"
                  >
                    {CLIENT_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Max Students</label>
                  <input
                    type="number"
                    min={1}
                    value={editingClient.maxStudents}
                    onChange={(e) =>
                      setEditingClient((c) =>
                        c ? { ...c, maxStudents: Number(e.target.value) || 100 } : c
                      )
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Valid Until</label>
                  <input
                    type="date"
                    value={editingClient.expiresAt}
                    onChange={(e) =>
                      setEditingClient((c) => (c ? { ...c, expiresAt: e.target.value } : c))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded font-mono"
                  />
                </div>
                <label className="flex items-center gap-2 pt-5 font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={editingClient.isPrimaryPortal}
                    onChange={(e) =>
                      setEditingClient((c) =>
                        c ? { ...c, isPrimaryPortal: e.target.checked } : c
                      )
                    }
                    className="rounded border-slate-300"
                  />
                  Active portal license
                </label>
              </div>

              <div className="border border-slate-200 bg-slate-50 rounded p-3 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-slate-800">
                    Trial Date Range (DD-MM-YYYY to DD-MM-YYYY)
                  </span>
                  <div className="flex items-center gap-1">
                    {[7, 15, 30].map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => {
                          const start = new Date().toISOString().slice(0, 10);
                          const end = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
                            .toISOString()
                            .slice(0, 10);
                          setEditTrialRangeInput(formatTrialRange(start, end));
                          setEditingClient((c) =>
                            c
                              ? {
                                  ...c,
                                  trialStartDate: start,
                                  trialEndDate: end,
                                  expiresAt: c.status === 'Trial' ? end : c.expiresAt,
                                }
                              : c
                          );
                        }}
                        className="px-2 py-0.5 text-[10px] font-mono bg-white border border-slate-300 rounded hover:bg-slate-100"
                      >
                        {days}d Trial
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setEditTrialRangeInput('');
                        setEditingClient((c) =>
                          c ? { ...c, trialStartDate: '', trialEndDate: '' } : c
                        );
                      }}
                      className="px-2 py-0.5 text-[10px] font-mono text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-100"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  value={editTrialRangeInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEditTrialRangeInput(val);
                    const parsed = parseTrialRangeInput(val);
                    if (parsed) {
                      setEditingClient((c) =>
                        c
                          ? {
                              ...c,
                              trialStartDate: parsed.start,
                              trialEndDate: parsed.end,
                              expiresAt:
                                parsed.end && c.status === 'Trial' ? parsed.end : c.expiresAt,
                            }
                          : c
                      );
                    }
                  }}
                  onBlur={() => {
                    const formatted = formatTrialRange(
                      editingClient.trialStartDate,
                      editingClient.trialEndDate
                    );
                    if (formatted) setEditTrialRangeInput(formatted);
                  }}
                  placeholder="02-02-2026 to 03-03-2026"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono bg-white"
                />
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">Trial Start</label>
                    <input
                      type="date"
                      value={editingClient.trialStartDate || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditTrialRangeInput(formatTrialRange(val, editingClient.trialEndDate));
                        setEditingClient((c) => (c ? { ...c, trialStartDate: val } : c));
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">Trial End</label>
                    <input
                      type="date"
                      value={editingClient.trialEndDate || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditTrialRangeInput(formatTrialRange(editingClient.trialStartDate, val));
                        setEditingClient((c) =>
                          c
                            ? {
                                ...c,
                                trialEndDate: val,
                                expiresAt: val && c.status === 'Trial' ? val : c.expiresAt,
                              }
                            : c
                        );
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono bg-white"
                    />
                  </div>
                </div>
                {formatTrialRange(editingClient.trialStartDate, editingClient.trialEndDate) && (
                  <p className="text-[11px] font-mono text-[#0F3CC9]">
                    Formatted Trial Window:{' '}
                    {formatTrialRange(editingClient.trialStartDate, editingClient.trialEndDate)}
                  </p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Support Team Contact (shown in Get More Info when suspended)
                </label>
                <input
                  type="text"
                  value={editingClient.supportContact || ''}
                  onChange={(e) =>
                    setEditingClient((c) => (c ? { ...c, supportContact: e.target.value } : c))
                  }
                  placeholder="+91 98230 11223 · support@salartech.in"
                  className="w-full px-3 py-2 border border-slate-300 rounded font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Owner / Suspension Notes
                </label>
                <input
                  type="text"
                  value={editingClient.notes}
                  onChange={(e) =>
                    setEditingClient((c) => (c ? { ...c, notes: e.target.value } : c))
                  }
                  placeholder="Suspension reason, payment pending note, or trial remarks..."
                  className="w-full px-3 py-2 border border-slate-300 rounded"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingClient(null)}
                  className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="px-4 py-2 font-semibold text-white bg-[#0F3CC9] hover:bg-blue-800 rounded"
                >
                  Save License &amp; Price
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create / Edit Plan Modal */}
      {editingPlan && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4"
          onClick={() => setEditingPlan(null)}
        >
          <div
            className="bg-white border border-slate-200 rounded-lg max-w-lg w-full p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {editingPlan.id ? 'Edit License Plan Pricing' : 'Create License Plan'}
              </h3>
              <button type="button" onClick={() => setEditingPlan(null)}>
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Plan Name *</label>
                <input
                  type="text"
                  value={editingPlan.name || ''}
                  onChange={(e) =>
                    setEditingPlan((p) => (p ? { ...p, name: e.target.value } : p))
                  }
                  placeholder="e.g. Pro Institute CBT License"
                  className="w-full px-3 py-2 border border-slate-300 rounded"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Owner Price (₹) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editingPlan.price ?? 0}
                    onChange={(e) =>
                      setEditingPlan((p) => (p ? { ...p, price: Number(e.target.value) || 0 } : p))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Billing Cycle</label>
                  <select
                    value={editingPlan.billingCycle || 'Monthly'}
                    onChange={(e) =>
                      setEditingPlan((p) =>
                        p ? { ...p, billingCycle: e.target.value as LicenseBillingCycle } : p
                      )
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded bg-white"
                  >
                    {BILLING_CYCLES.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Max Students</label>
                  <input
                    type="number"
                    min={1}
                    value={editingPlan.maxStudents ?? 300}
                    onChange={(e) =>
                      setEditingPlan((p) =>
                        p ? { ...p, maxStudents: Number(e.target.value) || 100 } : p
                      )
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Max Exams</label>
                  <input
                    type="number"
                    min={1}
                    value={editingPlan.maxExams ?? 50}
                    onChange={(e) =>
                      setEditingPlan((p) =>
                        p ? { ...p, maxExams: Number(e.target.value) || 50 } : p
                      )
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  value={editingPlan.description || ''}
                  onChange={(e) =>
                    setEditingPlan((p) => (p ? { ...p, description: e.target.value } : p))
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Included Features (one per line)
                </label>
                <textarea
                  rows={4}
                  value={planFeaturesText}
                  onChange={(e) => setPlanFeaturesText(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded font-mono"
                />
              </div>

              <label className="flex items-center gap-2 font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(editingPlan.isRecommended)}
                  onChange={(e) =>
                    setEditingPlan((p) => (p ? { ...p, isRecommended: e.target.checked } : p))
                  }
                  className="rounded border-slate-300"
                />
                Mark as Recommended License Tier
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="px-4 py-2 font-semibold text-white bg-[#0F3CC9] hover:bg-blue-800 rounded"
                >
                  Save License Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmState)}
        title={confirmState?.title ?? ''}
        message={confirmState?.message ?? ''}
        onCancel={() => setConfirmState(null)}
        onConfirm={async () => {
          if (confirmState) {
            await confirmState.onConfirm();
          }
          setConfirmState(null);
        }}
      />
    </div>
  );
}
