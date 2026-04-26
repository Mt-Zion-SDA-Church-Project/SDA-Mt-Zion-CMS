import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export type SabbathPreviewKind = 'pdf' | 'image' | 'unknown';

export function getSabbathResourcePreviewKind(url: string | null): SabbathPreviewKind {
  if (!url) return 'unknown';
  const path = url.split('?')[0].toLowerCase();
  if (path.endsWith('.pdf')) return 'pdf';
  if (/\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i.test(path)) return 'image';
  return 'unknown';
}

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  fileUrl: string | null;
};

export const SabbathResourcePreviewModal: React.FC<Props> = ({ open, onClose, title, fileUrl }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !fileUrl) return null;

  const kind = getSabbathResourcePreviewKind(fileUrl);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sabbath-preview-title"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <h2 id="sabbath-preview-title" className="text-sm font-semibold text-gray-800 truncate pr-4">
            {title}
          </h2>
          <div className="flex items-center gap-2 shrink-0">
            <a href={fileUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
              Open in new tab
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded hover:bg-gray-100"
              aria-label="Close preview"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4 bg-gray-50 min-h-[40vh]">
          {kind === 'pdf' && (
            <iframe title={title} src={fileUrl} className="w-full h-[75vh] border border-gray-200 rounded bg-white" />
          )}
          {kind === 'image' && (
            <img src={fileUrl} alt={title} className="mx-auto max-h-[75vh] max-w-full object-contain rounded shadow-sm bg-white" />
          )}
          {kind === 'unknown' && (
            <div className="text-sm text-gray-600 text-center py-12 px-4">
              <p className="mb-4">Preview isn’t available for this file type in the browser.</p>
              <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex px-4 py-2 bg-primary text-white rounded text-sm hover:opacity-90"
              >
                Open or download file
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
