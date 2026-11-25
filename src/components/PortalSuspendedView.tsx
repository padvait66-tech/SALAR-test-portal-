import { useRef, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  ChevronDown,
  ChevronUp,
  Headphones,
  Info,
  Mail,
  Phone,
  ShieldAlert,
} from 'lucide-react';
import type { InstituteSettings, PublicLicenseSummary } from '../types/portal';
import { formatTrialRange, toDDMMYYYY } from '../utils/licenseDates';

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

  const isExpired = license.status === 'Expired';
  const trialRange = formatTrialRange(license.trialStartDate, license.trialEndDate);
  const supportText = license.supportContact || '+91 98230 11223 · support@salartech.in';
  const emailMatch = supportText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const phoneMatch = supportText.match(/\+?\d[\d\s-]{7,}\d/);

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
              Licensed by {license.licensor}
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 text-[11px] font-mono font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 rounded">
          {isExpired ? 'LICENSE EXPIRED' : 'ID SUSPENDED'}
        </span>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
          <div className="bg-rose-50 border-b border-rose-200 px-6 py-5 flex items-start gap-4">
            <div className="w-11 h-11 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <span className="inline-block text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 bg-white text-rose-700 border border-rose-200 rounded">
                {isExpired ? 'ID License Expired' : 'ID Suspended'} · {license.licenseKey}
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                {isExpired ? 'Your ID License has Expired' : 'Your ID is Suspended'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                Access for <strong>{license.licensedTo}</strong> ({license.licenseKey}) has been
                paused by the platform administrator. Contact Support Team to reactivate your ID or
                get more info about your license.
              </p>
            </div>
          </div>

          <div className="p-6 space-y-5 text-xs">
            {/* Primary Support Team Contact Box */}
            <div className="border border-slate-200 bg-slate-50 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#0F3CC9] text-white flex items-center justify-center shrink-0">
                  <Headphones className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
                    {license.licensor} Support Team
                  </p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">{supportText}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Quote License ID <span className="font-mono font-semibold">{license.licenseKey}</span> when contacting support.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {phoneMatch && (
                  <a
                    href={`tel:${phoneMatch[0].replace(/\s+/g, '')}`}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#0B192C] hover:bg-slate-900 rounded"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    Call Support
                  </a>
                )}
                {emailMatch && (
                  <a
                    href={`mailto:${emailMatch[0]}?subject=${encodeURIComponent(
                      `Suspended License Support - ${license.licenseKey} (${license.licensedTo})`
                    )}`}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#0F3CC9] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    Email Team
                  </a>
                )}
              </div>
            </div>

            {/* Action Toggle: Get More Info */}
            <div className="flex flex-wrap items-center justify-between gap-3">
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

              {trialRange && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono bg-blue-50 text-[#0F3CC9] border border-blue-200 rounded">
                  <Calendar className="w-3.5 h-3.5" />
                  Trial Date: {trialRange}
                </span>
              )}
            </div>

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
                  disabled while this license is <strong>{license.status}</strong>. Once renewed or
                  reactivated by {license.licensor}, refresh this page to resume full access.
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
        · Powered by {license.licensor} Licensing System
      </footer>
    </div>
  );
}
