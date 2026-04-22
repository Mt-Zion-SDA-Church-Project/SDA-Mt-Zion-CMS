import React, { useState, useCallback } from 'react';
import QRCode from 'qrcode';
import {
  Download,
  Printer,
  Calendar,
  Clock,
  MapPin,
  Copy,
  Check,
  ChevronDown,
  QrCode,
  Church,
} from 'lucide-react';
import churchLogo from '../assets/sda-logo.png';

const CHURCH_LINE_PRIMARY = 'Seventh-day Adventist Church';
const CHURCH_LINE_SECONDARY = 'Mt. Zion — Kigoma';

interface QRCodeGeneratorProps {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  location?: string;
  onQRGenerated?: (qrCodeUrl: string) => void;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({
  eventId,
  eventTitle,
  eventDate,
  location,
  onQRGenerated,
}) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [qrSize, setQrSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [copied, setCopied] = useState(false);

  const getCheckInSiteOrigin = () => {
    const fromEnv = (import.meta.env.VITE_PUBLIC_APP_URL as string | undefined)?.trim().replace(/\/$/, '');
    if (fromEnv && /^https?:\/\//i.test(fromEnv)) return fromEnv;
    return window.location.origin;
  };

  const buildCheckinUrl = useCallback(() => {
    const payload = JSON.stringify({
      eventId: eventId,
      type: 'event_checkin',
      timestamp: Date.now(),
      expiresAt: Date.now() + 4 * 60 * 60 * 1000,
    });
    return `${getCheckInSiteOrigin()}/member/qr-checkin?data=${encodeURIComponent(btoa(payload))}`;
  }, [eventId]);

  const pxForSize = (s: 'small' | 'medium' | 'large') =>
    s === 'small' ? 240 : s === 'medium' ? 360 : 520;

  /** Generate or refresh QR (new expiry). Pass explicitSize after QR exists to resize without losing the view. */
  const runGenerate = async (explicitSize?: 'small' | 'medium' | 'large') => {
    const size = explicitSize ?? qrSize;
    if (explicitSize) setQrSize(explicitSize);
    setGenerating(true);
    try {
      const checkinUrl = buildCheckinUrl();
      const qrDataUrl = await QRCode.toDataURL(checkinUrl, {
        errorCorrectionLevel: 'H',
        width: pxForSize(size),
        margin: 2,
        color: { dark: '#0f172a', light: '#ffffff' },
      });
      setQrCodeUrl(qrDataUrl);
      onQRGenerated?.(qrDataUrl);
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      alert('Failed to generate QR code. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const downloadQRCode = () => {
    if (!qrCodeUrl) return;
    const safe = eventTitle.replace(/\s/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
    const link = document.createElement('a');
    link.download = `checkin_qr_${safe || 'event'}_${eventId.slice(0, 8)}.png`;
    link.href = qrCodeUrl;
    link.click();
  };

  const copyCheckinUrl = () => {
    const checkinUrl = buildCheckinUrl();
    void navigator.clipboard.writeText(checkinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const printQRCode = () => {
    if (!qrCodeUrl) return;
    const title = escapeHtml(eventTitle);
    const loc = location ? escapeHtml(location) : '';
    const when = new Date(eventDate);
    const dateStr = escapeHtml(when.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    const timeStr = escapeHtml(when.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }));
    const logoSrc = churchLogo;

    const printWindow = window.open('', '_blank');
    printWindow?.document.write(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Check-in — ${title}</title>
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
        color: #0f172a;
        background: #f8fafc;
        display: flex;
        justify-content: center;
        align-items: flex-start;
        padding: 24px;
      }
      .sheet {
        width: 100%;
        max-width: 420px;
        background: #fff;
        border-radius: 16px;
        box-shadow: 0 4px 24px rgba(15, 23, 42, 0.08);
        border: 1px solid #e2e8f0;
        overflow: hidden;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 20px 22px;
        background: linear-gradient(135deg, #f0f9ff 0%, #fff 50%, #ecfeff 100%);
        border-bottom: 1px solid #e2e8f0;
      }
      .brand img { width: 56px; height: 56px; object-fit: contain; flex-shrink: 0; }
      .brand-text { text-align: left; }
      .brand-text .line1 { font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: #0369a1; margin: 0 0 4px 0; }
      .brand-text .line2 { font-size: 15px; font-weight: 700; color: #0f172a; margin: 0; line-height: 1.25; }
      .brand-text .line3 { font-size: 13px; color: #475569; margin: 4px 0 0 0; }
      .event-block { padding: 18px 22px 8px; text-align: center; }
      .event-block h1 { font-size: 18px; font-weight: 700; margin: 0 0 10px 0; color: #0f172a; line-height: 1.3; }
      .meta { font-size: 13px; color: #64748b; margin: 0; line-height: 1.6; }
      .qr-zone {
        padding: 20px 24px 12px;
        display: flex;
        flex-direction: column;
        align-items: center;
        background: #fff;
      }
      .qr-zone img {
        width: min(280px, 72vw);
        height: auto;
        border-radius: 12px;
        border: 1px solid #e2e8f0;
        padding: 10px;
        background: #fff;
      }
      .scan-callout {
        margin-top: 14px;
        padding: 10px 16px;
        background: #0c4a6e;
        color: #fff;
        border-radius: 999px;
        font-size: 13px;
        font-weight: 600;
        letter-spacing: 0.02em;
      }
      .fine-print {
        padding: 14px 22px 22px;
        font-size: 11px;
        color: #64748b;
        line-height: 1.5;
        border-top: 1px solid #f1f5f9;
        text-align: center;
      }
      .no-print { text-align: center; padding: 16px; gap: 8px; display: flex; justify-content: center; flex-wrap: wrap; }
      .no-print button {
        padding: 10px 18px;
        border-radius: 8px;
        border: none;
        font-weight: 600;
        cursor: pointer;
        font-size: 14px;
      }
      .btn-print { background: #0369a1; color: #fff; }
      .btn-close { background: #e2e8f0; color: #334155; }
      @media print {
        body { background: #fff; padding: 0; }
        .no-print { display: none !important; }
        .sheet { box-shadow: none; border: none; max-width: none; }
      }
    </style>
  </head>
  <body>
    <div class="sheet">
      <div class="brand">
        <img src="${logoSrc}" alt="" />
        <div class="brand-text">
          <p class="line1">${CHURCH_LINE_PRIMARY}</p>
          <p class="line2">${CHURCH_LINE_SECONDARY}</p>
          <p class="line3">Attendance check-in</p>
        </div>
      </div>
      <div class="event-block">
        <h1>${title}</h1>
        <p class="meta"><strong>Date:</strong> ${dateStr}<br/><strong>Time:</strong> ${timeStr}${loc ? `<br/><strong>Venue:</strong> ${loc}` : ''}</p>
      </div>
      <div class="qr-zone">
        <img src="${qrCodeUrl}" alt="Check-in QR code" />
        <div class="scan-callout">Please scan me — check in for this event</div>
      </div>
      <p class="fine-print">Point your phone camera at the code, then sign in if asked. This link is valid for about four hours after the code is generated.</p>
    </div>
    <div class="no-print">
      <button type="button" class="btn-print" onclick="window.print()">Print</button>
      <button type="button" class="btn-close" onclick="window.close()">Close</button>
    </div>
  </body>
</html>`);
    printWindow?.document.close();
  };

  const getPreviewBoxClass = () => {
    switch (qrSize) {
      case 'small':
        return 'max-w-[200px]';
      case 'medium':
        return 'max-w-[280px]';
      case 'large':
        return 'max-w-[340px]';
    }
  };

  return (
    <div className="space-y-5">
      {/* Setup: size + generate (no QR yet) */}
      {!qrCodeUrl && (
        <>
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Event</p>
            <p className="font-semibold text-slate-900">{eventTitle}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                {new Date(eventDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                {new Date(eventDate).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
              </span>
              {location && (
                <span className="inline-flex items-center gap-1.5 min-w-0">
                  <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                  <span className="truncate">{location}</span>
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">QR resolution</label>
            <div className="flex flex-wrap gap-2">
              {(['small', 'medium', 'large'] as const).map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setQrSize(size)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    qrSize === size
                      ? 'bg-[#007f98] text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {size.charAt(0).toUpperCase() + size.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => void runGenerate()}
            disabled={generating}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#007f98] py-3.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-50"
          >
            <QrCode className="h-5 w-5" />
            {generating ? 'Generating…' : 'Generate check-in QR code'}
          </button>
        </>
      )}

      {/* Solo QR — primary focus after generation */}
      {qrCodeUrl && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
            <div className={`mx-auto ${getPreviewBoxClass()}`}>
              <img src={qrCodeUrl} alt="" className="w-full rounded-xl border border-slate-100 bg-white p-3 shadow-inner" />
            </div>
            <p className="mt-5 text-center text-[15px] font-semibold tracking-tight text-slate-800">
              Please scan me
            </p>
            <p className="mt-1 text-center text-sm text-slate-500">
              Use your phone camera, then sign in if prompted — your attendance will be recorded.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={downloadQRCode}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              <Download className="h-4 w-4" />
              Download QR (PNG)
            </button>
            <button
              type="button"
              onClick={printQRCode}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#007f98] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
            >
              <Printer className="h-4 w-4" />
              Print poster
            </button>
          </div>

          <button
            type="button"
            onClick={copyCheckinUrl}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Check-in link copied' : 'Copy check-in link'}
          </button>

          <details className="group rounded-xl border border-slate-200 bg-slate-50/50 open:bg-white open:shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-4 py-3.5 text-sm font-semibold text-slate-800 marker:hidden [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-2">
                <Church className="h-4 w-4 text-[#007f98]" />
                Event &amp; church details
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-180" />
            </summary>
            <div className="space-y-4 border-t border-slate-100 px-4 pb-4 pt-3">
              <div className="flex gap-3 rounded-lg border border-slate-100 bg-gradient-to-br from-sky-50/80 to-white p-3">
                <img src={churchLogo} alt="" className="h-14 w-14 shrink-0 object-contain" />
                <div className="min-w-0 text-left">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-800/90">
                    {CHURCH_LINE_PRIMARY}
                  </p>
                  <p className="text-base font-bold text-slate-900 leading-snug">{CHURCH_LINE_SECONDARY}</p>
                  <p className="mt-1 text-xs text-slate-600">Official event check-in</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Event</p>
                <p className="font-semibold text-slate-900">{eventTitle}</p>
                <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
                  <li className="flex items-start gap-2">
                    <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    {new Date(eventDate).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' })}
                  </li>
                  {location && (
                    <li className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                      {location}
                    </li>
                  )}
                </ul>
              </div>

              <div className="rounded-lg bg-amber-50/90 px-3 py-2.5 text-left text-xs leading-relaxed text-amber-950/90 ring-1 ring-amber-200/60">
                <strong className="font-semibold">For organisers:</strong> Display the code at the entrance. Each
                generated code expires after about four hours. Members must be logged in to complete check-in.
              </div>
            </div>
          </details>

          <div className="border-t border-slate-100 pt-4">
            <p className="mb-2 text-xs font-medium text-slate-600">Resolution (regenerates code &amp; expiry)</p>
            <div className="flex flex-wrap gap-2">
              {(['small', 'medium', 'large'] as const).map((size) => (
                <button
                  key={size}
                  type="button"
                  disabled={generating}
                  onClick={() => void runGenerate(size)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition disabled:opacity-50 ${
                    qrSize === size
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => void runGenerate()}
            disabled={generating}
            className="w-full rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {generating ? 'Regenerating…' : 'Regenerate (new 4-hour window)'}
          </button>
        </div>
      )}
    </div>
  );
};

export default QRCodeGenerator;
