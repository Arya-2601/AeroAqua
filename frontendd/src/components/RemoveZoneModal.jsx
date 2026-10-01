import React from 'react';
import { AlertTriangle, Trash2, X, ShieldAlert } from 'lucide-react';

export default function RemoveZoneModal({
  isOpen,
  zone,
  onClose,
  onConfirm,
  isSubmitting = false,
}) {
  if (!isOpen || !zone) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden transform transition-all">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-rose-500/20 text-rose-400 rounded-lg border border-rose-500/30">
              <Trash2 className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm tracking-wide">Confirm Zone Deactivation</h3>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-white text-lg font-bold transition-colors p-1"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <div className="flex items-start space-x-3">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl shrink-0 mt-0.5 border border-amber-200">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900 leading-snug">
                Are you sure you want to remove this zone?
              </h4>
              <p className="text-xs font-semibold text-sky-700 mt-1">
                Target Zone: <span className="font-mono text-slate-900 font-bold">{zone.name}</span> ({zone.region})
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            Removing this zone will remove it from the active monitoring grid for this state. Historical records should be preserved where possible.
          </p>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold shadow-2xs transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => onConfirm(zone.id)}
              disabled={isSubmitting}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Removing...' : 'Remove Zone'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
