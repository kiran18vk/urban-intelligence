import React, { useEffect } from 'react';
import { X, ZoomIn, Info, ShieldCheck } from 'lucide-react';

interface ImageLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title: string;
  subtitle?: string;
  tag?: string;
  attribution?: string;
}

export function ImageLightboxModal({
  isOpen,
  onClose,
  imageUrl,
  title,
  subtitle,
  tag = 'Real-world reference',
  attribution,
}: ImageLightboxModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full rounded-2xl border border-ink-700 bg-ink-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-ink-750 bg-ink-850/80">
          <div className="flex items-center gap-2">
            <ZoomIn className="h-4 w-4 text-accent-400" />
            <h3 className="text-sm font-bold text-slate-100">{title}</h3>
            {tag && (
              <span className="rounded bg-sky-500/15 border border-sky-500/30 px-2 py-0.5 text-[10px] font-semibold text-sky-300">
                {tag}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-100 hover:bg-ink-750 transition"
            aria-label="Close image preview"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Image Content */}
        <div className="flex-1 overflow-auto bg-black/50 p-2 flex items-center justify-center min-h-[300px] max-h-[65vh]">
          <img
            src={imageUrl}
            alt={title}
            className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-lg"
          />
        </div>

        {/* Footer info */}
        <div className="px-5 py-3 border-t border-ink-750 bg-ink-850/90 text-xs flex flex-col md:flex-row md:items-center justify-between gap-2">
          {subtitle && <p className="text-slate-300 font-medium">{subtitle}</p>}
          {attribution && (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <Info className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
              <span>{attribution}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
