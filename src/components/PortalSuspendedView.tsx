import { useRef, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  ExternalLink,
  Headphones,
  Info,
  Mail,
  MessageCircle,
  Phone,
  ShieldAlert,
  Wrench,
} from 'lucide-react';
import type {
  InstituteSettings,
  LicensePaymentRecord,
  PublicLicenseSummary,
} from '../types/portal';
import { formatTrialRange, toDDMMYYYY } from '../utils/licenseDates';
import { api } from '../api/client';

interface PortalSuspendedViewProps {
  license: PublicLicenseSummary;
  settings: InstituteSettings;
  onSecretOwnerTrigger?: () => void;
}

export function PortalSuspendedView({
  license,
  settings,
  onSecretOwnerTrigger,
}: PortalSuspendedViewProps) {
  const [showMoreInfo, setShowMoreInfo] = useState(false);
  const [showRenewForm, setShowRenewForm] = useState(false);
  const [payMode, setPayMode] = useState<LicensePaymentRecord['paymentMode']>('UPI');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [payBusy, setPayBusy] = useState(false);
  const [payError, setPayError] = useState('');
  const [paySuccess, setPaySuccess] = useState('');

  const secretClicksRef = useRef<{ count: number; lastAt: number }>({ count: 0, lastAt: 0 });

  const handleSecretTap = () => {
    if (!onSecretOwnerTrigger) return;
    const now = Date.now();
    if (now - secretClicksRef.current.lastAt > 2500) {
      secretClicksRef.current = { count: 1, lastAt: now };
    } else {
      secretClicksRef.current.count += 1;
      secretClicksRef.current.lastAt = now;
    }
    if (secretClicksRef.current.count >= 5) {
      secretClicksRef.current = { count: 0, lastAt: 0 };
      onSecretOwnerTrigger();
    }
  };

  const isMaintenance = Boolean(license.portalControls?.maintenanceMode);
  const isExpired = !isMaintenance && license.status === 'Expired';
  const trialRange = formatTrialRange(license.trialStartDate, license.trialEndDate);
  const supportText = license.supportContact || '+91 98230 11223 · support@salartech.in';
  const ownerPhone =
    license.ownerContactPhone ||
    supportText.match(/\+?\d[\d\s-]{7,}\d/)?.[0] ||
    '+91 98230 11223';
  const ownerWhatsapp = (license.ownerWhatsapp || ownerPhone).replace(/\D/g, '');
  const ownerEmail =
    license.ownerEmail ||
    supportText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ||
    'support@salartech.in';
  const madeBy = license.madeByText || `Made by ${license.licensor}`;
  const gw = license.paymentGateway;

  const handleSubmitRenewal = async (e: FormEvent) => {
    e.preventDefault();
    setPayError('');
    setPaySuccess('');
    setPayBusy(true);
    try {
      const res = await api.submitClientLicensePayment({
        planName: license.planName,
        amount: license.price,
        paymentMode: payMode,
        referenceId: payRef.trim(),
        notes: payNotes.trim(),
        clientName: license.licensedTo,
      });
      setPaySuccess(
        `Renewal reference ${res.payment.referenceId} submitted to ${license.licensor}. Your portal will reactivate once verified.`
      );
      setPayRef('');
      setPayNotes('');
    } catch (err) {
      setPayError(err instanceof Error ? err.message : 'Unable to submit license payment.');
    } finally {
      setPayBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-4 sm:px-8 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded bg-[#0B192C] text-white font-bold text-xs flex items-center justify-center shrink-0">
            {settings.instituteName.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">{settings.instituteName}</p>
            <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
              {madeBy}
            </p>
          </div>
        </div>
        <span
          className={`px-2.5 py-1 text-[11px] font-mono font-bold uppercase tracking-wider border rounded ${
            isMaintenance
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}
        >
          {isMaintenance ? 'MAINTENANCE' : isExpired ? 'LICENSE EXPIRED' : 'ID SUSPENDED'}
        </span>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
          <div
            className={`border-b px-6 py-5 flex items-start gap-4 ${
              isMaintenance
                ? 'bg-amber-50 border-amber-200'
                : 'bg-rose-50 border-rose-200'
            }`}
          >
            <div
              className={`w-11 h-11 rounded-lg text-white flex items-center justify-center shrink-0 ${
                isMaintenance ? 'bg-amber-600' : 'bg-rose-600'
              }`}
            >
              {isMaintenance ? <Wrench className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
            </div>
            <div className="space-y-1">
              <span
                className={`inline-block text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 bg-white border rounded ${
                  isMaintenance
                    ? 'text-amber-800 border-amber-200'
                    : 'text-rose-700 border-rose-200'
                }`}
              >
                {isMaintenance
                  ? 'Scheduled Maintenance'
                  : isExpired
                  ? 'ID License Expired'
                  : 'ID Suspended'}{' '}
                · {license.licenseKey}
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                {isMaintenance
                  ? 'Portal Under Scheduled Maintenance'
                  : isExpired
                  ? 'Your ID License has Expired'
                  : 'Your ID is Suspended'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                {isMaintenance ? (
                  license.portalControls?.maintenanceMessage ||
                  `${license.licensor} is updating this portal. Please check back shortly or contact our support desk.`
                ) : (
                  <>
                    Access for <strong>{license.licensedTo}</strong> ({license.licenseKey}) has been
                    paused by the platform owner. Contact Support Team to reactivate your ID or get
                    more info about your license.
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="p-6 space-y-5 text-xs">
            {/* Primary Support Team Contact Box */}
            <div className="border border-slate-200 bg-slate-50 rounded-lg p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#0F3CC9] text-white flex items-center justify-center shrink-0">
                    <Headphones className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
                      {license.licensor} Support Team
                    </p>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">
                      {ownerPhone} · {ownerEmail}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Quote License ID <span className="font-mono font-semibold">{license.licenseKey}</span> when contacting support.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {ownerPhone && (
                    <a
                      href={`tel:${ownerPhone.replace(/\s+/g, '')}`}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#0B192C] hover:bg-slate-900 rounded"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      Call Support
                    </a>
                  )}
                  {ownerWhatsapp && (
                    <a
                      href={`https://wa.me/${ownerWhatsapp}?text=${encodeURIComponent(
                        `Hello ${license.licensor} Support, regarding portal license ${license.licenseKey} (${license.licensedTo}).`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      WhatsApp
                    </a>
                  )}
                  {ownerEmail && (
                    <a
                      href={`mailto:${ownerEmail}?subject=${encodeURIComponent(
                        `Portal Support - ${license.licenseKey} (${license.licensedTo})`
                      )}`}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#0F3CC9] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      Email Team
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Action Toggles: Get More Info + Renew License */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowMoreInfo((v) => !v)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0F3CC9] hover:bg-blue-800 rounded transition-colors"
                >
                  <Info className="w-4 h-4" />
                  <span>{showMoreInfo ? 'Hide More Info' : 'Get More Info'}</span>
                  {showMoreInfo ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>

                {!isMaintenance && gw && (
                  <button
                    type="button"
                    onClick={() => setShowRenewForm((v) => !v)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded transition-colors"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>{showRenewForm ? 'Hide Renewal Payment' : 'Pay & Renew License'}</span>
                  </button>
                )}
              </div>

              {trialRange && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono bg-blue-50 text-[#0F3CC9] border border-blue-200 rounded">
                  <Calendar className="w-3.5 h-3.5" />
                  Trial Date: {trialRange}
                </span>
              )}
            </div>

            {/* License Renewal & Owner Payment Gateway Box */}
            {showRenewForm && gw && (
              <div className="border border-emerald-200 bg-emerald-50/40 rounded-lg p-4 sm:p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200 pb-2.5">
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      {license.licensor} License Renewal ({gw.provider})
                    </h2>
                    <p className="text-[11px] text-slate-600">
                      Pay ₹{new Intl.NumberFormat('en-IN').format(license.price)} /{' '}
                      {license.billingCycle} and submit your UTR / transaction ID below.
                    </p>
                  </div>
                  {gw.paymentLink && (
                    <a
                      href={gw.paymentLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded self-start"
                    >
                      <span>Open {gw.provider} Link</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white border border-slate-200 rounded p-3">
                  <div>
                    <p className="text-[10px] font-mono uppercase text-slate-500">UPI ID</p>
                    <p className="font-mono font-bold text-slate-900 mt-0.5">{gw.upiId || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono uppercase text-slate-500">Bank / Holder</p>
                    <p className="font-semibold text-slate-900 mt-0.5">
                      {gw.bankName} · {gw.accountHolder}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono uppercase text-slate-500">Account / IFSC</p>
                    <p className="font-mono font-semibold text-slate-900 mt-0.5">
                      {gw.accountNo} · {gw.ifsc}
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSubmitRenewal} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Payment Mode
                      </label>
                      <select
                        value={payMode}
                        onChange={(e) =>
                          setPayMode(e.target.value as LicensePaymentRecord['paymentMode'])
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded bg-white"
                      >
                        <option value="UPI">UPI</option>
                        <option value="Payment Gateway">Payment Gateway ({gw.provider})</option>
                        <option value="Bank Transfer">Bank Transfer (IMPS/NEFT)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        UTR / Payment Reference ID *
                      </label>
                      <input
                        type="text"
                        value={payRef}
                        onChange={(e) => setPayRef(e.target.value)}
                        placeholder="e.g. 604811920041 or pay_XXX"
                        className="w-full px-3 py-2 border border-slate-300 rounded font-mono bg-white"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Note for {license.licensor} (optional)
                    </label>
                    <input
                      type="text"
                      value={payNotes}
                      onChange={(e) => setPayNotes(e.target.value)}
                      placeholder="Renewal period or sender name"
                      className="w-full px-3 py-2 border border-slate-300 rounded bg-white"
                    />
                  </div>
                  {payError && (
                    <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 p-2 rounded">
                      {payError}
                    </p>
                  )}
                  {paySuccess && (
                    <p className="text-xs text-emerald-800 bg-emerald-100 border border-emerald-300 p-2.5 rounded flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{paySuccess}</span>
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={payBusy}
                    className="px-4 py-2 font-semibold text-white bg-[#0B192C] hover:bg-slate-900 rounded disabled:opacity-60"
                  >
                    {payBusy ? 'Submitting...' : 'Submit Renewal Payment Proof'}
                  </button>
                </form>
              </div>
            )}

            {/* Expandable License & Account Diagnostics */}
            {showMoreInfo && (
              <div className="border border-slate-200 rounded-lg p-4 sm:p-5 space-y-4 bg-white">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    License &amp; Suspension Information
                  </h2>
                  <span className="font-mono text-[11px] text-slate-500">
                    {license.licensor} Billing &amp; Access
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="bg-slate-50 border border-slate-200 rounded p-3">
                    <p className="text-[10px] font-mono uppercase text-slate-500">Client ID / Key</p>
                    <p className="font-mono font-bold text-slate-900 mt-0.5">
                      {license.licenseKey}
                    </p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded p-3">
                    <p className="text-[10px] font-mono uppercase text-slate-500">
                      Institute / Account
                    </p>
                    <p className="font-bold text-slate-900 mt-0.5">{license.licensedTo}</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded p-3">
                    <p className="text-[10px] font-mono uppercase text-slate-500">Current Status</p>
                    <p className="font-mono font-bold text-rose-700 mt-0.5">{license.status}</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded p-3">
                    <p className="text-[10px] font-mono uppercase text-slate-500">
                      Plan &amp; Owner Price
                    </p>
                    <p className="font-bold text-slate-900 mt-0.5">
                      {license.planName} ·{' '}
                      <span className="font-mono text-[#0F3CC9]">
                        ₹{new Intl.NumberFormat('en-IN').format(license.price)} /{' '}
                        {license.billingCycle}
                      </span>
                    </p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded p-3">
                    <p className="text-[10px] font-mono uppercase text-slate-500">
                      Trial Date Window
                    </p>
                    <p className="font-mono font-semibold text-slate-900 mt-0.5">
                      {trialRange || 'Not Configured'}
                    </p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded p-3">
                    <p className="text-[10px] font-mono uppercase text-slate-500">
                      Issued · Valid Until
                    </p>
                    <p className="font-mono font-semibold text-slate-900 mt-0.5">
                      {toDDMMYYYY(license.issuedAt) || '—'} → {toDDMMYYYY(license.expiresAt)}
                    </p>
                  </div>
                </div>

                {license.notes && (
                  <div className="bg-rose-50/70 border border-rose-200 rounded p-3">
                    <p className="text-[10px] font-mono uppercase text-rose-700 font-semibold">
                      Account / Suspension Note
                    </p>
                    <p className="text-xs text-slate-800 mt-1">{license.notes}</p>
                  </div>
                )}

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Student logins, faculty consoles, and shared CBT examination links remain
                  disabled while this portal is paused. Once renewed or reactivated by{' '}
                  {license.licensor}, refresh this page to resume full access.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 px-4 sm:px-8 py-3 text-center text-[11px] text-slate-500">
        <span onClick={handleSecretTap} className="cursor-default select-none">
          {settings.instituteName}
        </span>{' '}
        · <strong className="text-slate-700">{madeBy}</strong> · {ownerPhone} · {ownerEmail}
      </footer>
    </div>
  );
}
