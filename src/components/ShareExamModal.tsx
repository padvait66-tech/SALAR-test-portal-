import { useEffect, useMemo, useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Check, Copy, Download, ExternalLink, Globe, QrCode, Share2, X } from 'lucide-react';
import type { ExamPaper, InstituteSettings, QuestionItem, TestFolder } from '../types/portal';
import {
  buildShortExamUrl,
  encodeHydratedBundle,
  isDevPreviewHost,
} from '../utils/shareLinks';

interface ShareExamModalProps {
  exam: ExamPaper | null;
  settings: InstituteSettings;
  questions?: QuestionItem[];
  folder?: TestFolder | null;
  onClose: () => void;
  onOpenSharedLanding: (examId: string) => void;
}

export function ShareExamModal({
  exam,
  settings,
  questions = [],
  folder = null,
  onClose,
  onOpenSharedLanding,
}: ShareExamModalProps) {
  const [linkMode, setLinkMode] = useState<'overview' | 'cbt'>('overview');
  const [usePublicHost, setUsePublicHost] = useState(() => isDevPreviewHost());
  const [hydrateToken, setHydrateToken] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const qrContainerRef = useRef<HTMLDivElement>(null);

  const examQuestions = useMemo(() => {
    if (!exam || questions.length === 0) return [];
    const byId = new Map(questions.map((q) => [q.id, q]));
    return exam.questionIds
      .map((id) => byId.get(id))
      .filter((q): q is QuestionItem => Boolean(q));
  }, [exam, questions]);

  useEffect(() => {
    let active = true;
    if (!exam) {
      setHydrateToken(null);
      return;
    }
    void encodeHydratedBundle({
      exam,
      questions: examQuestions,
      folder,
    }).then((token) => {
      if (active) setHydrateToken(token);
    });
    return () => {
      active = false;
    };
  }, [exam, examQuestions, folder]);

  if (!exam) return null;

  const shortUrl = buildShortExamUrl(exam, linkMode, usePublicHost);
  const activeUrl = hydrateToken ? `${shortUrl}#hydrate=${hydrateToken}` : shortUrl;
  const onDevHost = isDevPreviewHost();

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownloadQr = () => {
    const canvas = qrContainerRef.current?.querySelector('canvas');
    if (!canvas) return;
    const pngUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = pngUrl;
    const safeCode = (exam.code || 'exam').replace(/[^a-zA-Z0-9_-]/g, '_');
    a.download = `${settings.instituteName.replace(/[^a-zA-Z0-9]+/g, '_')}_${safeCode}_QR.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(
    `${settings.instituteName} Live Online Test\nExam: ${exam.title} (${exam.code})\nQuestions: ${exam.questionIds.length} | Duration: ${exam.durationMinutes} min\n\nOpen & Quick Join here:\n${shortUrl}`
  )}`;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-[1px] flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg border border-slate-200 shadow-2xl max-w-xl w-full my-auto overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <Share2 className="w-4 h-4 text-[#0F3CC9]" />
            <span>Share Exam &amp; Student QR Code</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Share Exam modal"
            className="text-slate-400 hover:text-slate-700 p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-mono text-slate-500 uppercase">
                {exam.code} · Class {exam.targetClass} · {exam.questionIds.length} Qs ·{' '}
                {exam.durationMinutes} min
              </p>
              <p className="text-sm font-bold text-slate-900 truncate mt-0.5">{exam.title}</p>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded border border-emerald-200 bg-emerald-50 text-emerald-700 shrink-0">
              {exam.status}
            </span>
          </div>

          {/* Link Mode Selector */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded border border-slate-200">
            <button
              type="button"
              onClick={() => setLinkMode('overview')}
              className={`py-1.5 px-2.5 text-xs font-semibold rounded transition-colors ${
                linkMode === 'overview'
                  ? 'bg-white text-[#0F3CC9] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Shared Exam Page (Quick Join)
            </button>
            <button
              type="button"
              onClick={() => setLinkMode('cbt')}
              className={`py-1.5 px-2.5 text-xs font-semibold rounded transition-colors ${
                linkMode === 'cbt'
                  ? 'bg-white text-[#0F3CC9] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Direct CBT Launch URL
            </button>
          </div>

          {onDevHost && (
            <div className="flex items-center justify-between gap-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded text-[11px]">
              <div className="flex items-center gap-2 text-slate-700 min-w-0">
                <Globe className="w-3.5 h-3.5 text-[#0F3CC9] shrink-0" />
                <span className="truncate">
                  Use Public Student URL (prevents 403 error on student devices)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setUsePublicHost((v) => !v)}
                className={`px-2.5 py-1 font-semibold rounded shrink-0 border ${
                  usePublicHost
                    ? 'bg-[#0F3CC9] text-white border-[#0F3CC9]'
                    : 'bg-white text-slate-700 border-slate-300'
                }`}
              >
                {usePublicHost ? 'Public URL On' : 'Dev URL'}
              </button>
            </div>
          )}

          {/* Copyable Link Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                Student Access Link
              </label>
              {hydrateToken && (
                <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                  Self-hydrating enabled
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shortUrl}
                className="flex-1 px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded text-slate-800"
              />
              <button
                type="button"
                onClick={() => handleCopy(activeUrl, 'url')}
                className="px-3.5 py-2 bg-[#0F3CC9] hover:bg-blue-800 text-white font-semibold rounded flex items-center gap-1.5 shrink-0"
              >
                {copiedKey === 'url' ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleCopy(shortUrl, 'quick')}
              className="py-2 px-3 bg-[#0F3CC9] hover:bg-blue-800 text-white font-semibold rounded flex items-center justify-center gap-1.5"
            >
              {copiedKey === 'quick' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'quick' ? 'Copied' : 'Copy Short URL'}</span>
            </button>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded flex items-center justify-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </a>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSharedLanding(exam.id);
              }}
              className="py-2 px-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-semibold rounded flex items-center justify-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Preview Page</span>
            </button>
          </div>

          {/* Working QR Code Section (always uses shortUrl so QR never overflows) */}
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/70 flex flex-col items-center">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-3">
              <QrCode className="w-3.5 h-3.5 text-[#0F3CC9]" />
              <span>QR Code — Scan to Open Test</span>
            </div>

            <div
              ref={qrContainerRef}
              className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs"
            >
              <QRCodeCanvas
                value={shortUrl}
                size={180}
                bgColor="#FFFFFF"
                fgColor="#0B192C"
                level="M"
                includeMargin
              />
            </div>

            <div className="flex items-center gap-2 mt-3">
              <button
                type="button"
                onClick={handleDownloadQr}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-[11px] font-semibold flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download QR Code (PNG)</span>
              </button>
              <button
                type="button"
                onClick={() => handleCopy(shortUrl, 'qr-url')}
                className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded text-[11px] font-semibold flex items-center gap-1"
              >
                <Copy className="w-3 h-3 text-[#0F3CC9]" />
                <span>{copiedKey === 'qr-url' ? 'Copied' : 'Copy URL'}</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-500 font-mono mt-2 text-center">
              Instant scan on all smartphone cameras, Google Lens, and WhatsApp scanners.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
