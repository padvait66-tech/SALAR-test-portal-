import { useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  Building2,
  CalendarPlus,
  CheckCircle2,
  Edit3,
  KeyRound,
  Layers,
  LogOut,
  Plus,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Star,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import type {
  ClientLicense,
  ClientLicenseStatus,
  InstituteSettings,
  LicenseBillingCycle,
  LicensePlan,
} from '../types/portal';
import { api, setAuthToken, type OwnerWorkspaceResponse } from '../api/client';
import { ConfirmDialog } from './ConfirmDialog';

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
  onLogout,
}: OwnerPortalViewProps) {
  const [activeTab, setActiveTab] = useState<'clients' | 'plans' | 'security'>('clients');
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
  const [newClientNotes, setNewClientNotes] = useState('');

  // Edit client modal
  const [editingClient, setEditingClient] = useState<ClientLicense | null>(null);

  // Add / Edit plan modal
  const [editingPlan, setEditingPlan] = useState<Partial<LicensePlan> | null>(null);
  const [planFeaturesText, setPlanFeaturesText] = useState('');

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
        isPrimaryPortal: newClientPrimary,
        notes: newClientNotes.trim(),
      });
      await onRefresh();
      setAddClientOpen(false);
      setNewClientName('');
      setNewClientEmail('');
      setNewClientPhone('');
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
      await api.updateClientLicense(editingClient.id, editingClient);
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
                <span className="font-mono">{primaryClient.expiresAt}</span> · Current Portal Data:{' '}
                {workspace.portalStats.studentsCount} students, {workspace.portalStats.examsCount}{' '}
                exams
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEditingClient({ ...primaryClient })}
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
          <div className="flex items-center gap-2">
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
              License Plans &amp; Pricing ({workspace.plans.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('security')}
              className={`px-3.5 py-2 text-xs font-semibold rounded transition-colors ${
                activeTab === 'security'
                  ? 'bg-[#0F3CC9] text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              Owner Account
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
                      <p>Expires: {c.expiresAt}</p>
                      <p className="text-[11px] text-slate-400">Issued: {c.issuedAt}</p>
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
                          onClick={() => setEditingClient({ ...c })}
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

        {/* Owner Account & Password Settings */}
        {activeTab === 'security' && (
          <div className="max-w-xl bg-white border border-slate-200 rounded-lg p-6 space-y-4 text-xs">
            <div className="flex items-center gap-2.5">
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

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Owner Notes</label>
                <input
                  type="text"
                  value={newClientNotes}
                  onChange={(e) => setNewClientNotes(e.target.value)}
                  placeholder="Agreement terms, custom renewal notes..."
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

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes</label>
                <input
                  type="text"
                  value={editingClient.notes}
                  onChange={(e) =>
                    setEditingClient((c) => (c ? { ...c, notes: e.target.value } : c))
                  }
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
