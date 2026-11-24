import { useState, type FormEvent } from 'react';
import { X, CheckCircle2, Copy } from 'lucide-react';
import type { InstituteSettings, PaymentRecord, StudentRecord } from '../types/portal';

interface CheckoutItem {
  name: string;
  type: PaymentRecord['itemType'];
  amount: number;
}

interface UpiCheckoutModalProps {
  item: CheckoutItem | null;
  settings: InstituteSettings;
  activeStudent: StudentRecord | null;
  onClose: () => void;
  onSubmitPayment: (payload: {
    itemName: string;
    itemType: PaymentRecord['itemType'];
    amount: number;
    utr: string;
    paymentMode: PaymentRecord['paymentMode'];
    studentName: string;
    rollNo: string;
  }) => void;
}

export function UpiCheckoutModal({
  item,
  settings,
  activeStudent,
  onClose,
  onSubmitPayment,
}: UpiCheckoutModalProps) {
  const [utr, setUtr] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentRecord['paymentMode']>('UPI');
  const [guestName, setGuestName] = useState(activeStudent?.name ?? '');
  const [guestRoll, setGuestRoll] = useState(activeStudent?.rollNo ?? 'GUEST');
  const [error, setError] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);

  if (!item) return null;

  const formattedAmount = new Intl.NumberFormat('en-IN').format(item.amount);

  const handleCopyUpi = () => {
    navigator.clipboard?.writeText(settings.upiId);
    setCopiedUpi(true);
    window.setTimeout(() => setCopiedUpi(false), 1800);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmedUtr = utr.trim();
    if (trimmedUtr.length < 8) {
      setError('Enter a valid 8–16 character UTR / transaction reference number.');
      return;
    }
    const finalName = (activeStudent?.name ?? guestName).trim();
    if (finalName.length < 2) {
      setError('Enter the student’s full name.');
      return;
    }

    onSubmitPayment({
      itemName: item.name,
      itemType: item.type,
      amount: item.amount,
      utr: trimmedUtr,
      paymentMode,
      studentName: finalName,
      rollNo: activeStudent?.rollNo ?? (guestRoll.trim() || 'GUEST'),
    });
    setUtr('');
    setError('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-mono text-slate-500">
              {item.type} Enrollment · UPI &amp; Bank Checkout
            </p>
            <h3 id="checkout-title" className="text-lg font-semibold text-slate-900 mt-0.5">
              {item.name}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close checkout"
            className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-slate-500">Amount Payable</p>
              <p className="text-2xl font-semibold text-slate-900 font-mono tabular-nums">
                ₹{formattedAmount}
              </p>
            </div>
            <div className="text-right text-xs text-slate-600 space-y-1">
              <div className="flex items-center justify-end gap-1.5">
                <span className="font-mono font-medium text-slate-900">{settings.upiId}</span>
                <button
                  type="button"
                  onClick={handleCopyUpi}
                  className="text-blue-800 hover:text-blue-900 inline-flex items-center gap-1"
                  title="Copy UPI ID"
                >
                  {copiedUpi ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
              <p>
                {settings.bankName} · A/C {settings.accountNo}
              </p>
              <p className="font-mono">IFSC: {settings.ifsc}</p>
            </div>
          </div>

          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setPaymentMode('UPI')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                paymentMode === 'UPI' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              UPI Transfer
            </button>
            <button
              type="button"
              onClick={() => setPaymentMode('Bank Transfer')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                paymentMode === 'Bank Transfer'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600'
              }`}
            >
              NEFT / IMPS Bank
            </button>
          </div>

          {!activeStudent && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Student Name
                </label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Full name"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-800"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Roll No (if enrolled)
                </label>
                <input
                  type="text"
                  value={guestRoll}
                  onChange={(e) => setGuestRoll(e.target.value)}
                  placeholder="GC-2026-..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-800"
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="utr-input" className="block text-xs font-semibold text-slate-700 mb-1">
              12-Digit UTR / Transaction Reference Number
            </label>
            <input
              id="utr-input"
              type="text"
              value={utr}
              onChange={(e) => {
                setUtr(e.target.value);
                if (error) setError('');
              }}
              placeholder="e.g. 432198765432"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-800"
            />
            {error && <p className="text-xs text-rose-700 mt-1">{error}</p>}
            <p className="text-xs text-slate-500 mt-1.5">
              Payments are verified by Gurukul Classes admin within 1 hour and unlocked under My
              Purchases.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-medium text-white bg-blue-800 rounded-lg hover:bg-blue-900"
            >
              Submit Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
