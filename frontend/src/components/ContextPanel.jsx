import React from 'react';
import { Info, Sparkles, ChevronRight } from 'lucide-react';

export default function ContextPanel({ context }) {
  if (!context || !context.factors) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm text-center text-slate-500 text-sm">
        No context data available for this station.
      </div>
    );
  }

  const factors = context.factors;

  const getFactorIcon = (type) => {
    switch (type) {
      case 'event':
        return '🏟️';
      case 'traffic':
        return '🚗';
      case 'wind':
        return '💨';
      case 'roads':
        return '🛣️';
      case 'industry':
        return '🏭';
      default:
        return '📍';
    }
  };

  const getRelevanceBadge = (rel) => {
    if (rel >= 0.8) {
      return 'bg-rose-100 text-rose-800 border-rose-200';
    } else if (rel >= 0.5) {
      return 'bg-amber-100 text-amber-800 border-amber-200';
    } else {
      return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
        <div className="flex items-center space-x-2">
          <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <Sparkles className="w-5 h-5" />
          </span>
          <div>
            <h3 className="font-bold text-slate-900 text-base">Environmental Context Engine</h3>
            <p className="text-xs text-slate-500">
              Spatial & temporal alignment with events, traffic, road infrastructure, and meteorology
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">
          {factors.length} Correlated Factor{factors.length !== 1 ? 's' : ''}
        </span>
      </div>

      {factors.length === 0 ? (
        <p className="text-sm text-slate-500 italic py-4 text-center">
          No significant coinciding local events or abnormal signals detected within radius.
        </p>
      ) : (
        <div className="space-y-3">
          {factors.map((factor, idx) => (
            <div
              key={idx}
              className="flex items-start justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-start space-x-3">
                <span className="text-2xl select-none mt-0.5" role="img" aria-label={factor.type}>
                  {getFactorIcon(factor.type)}
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-800 leading-snug">
                    {factor.text}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Factor: {factor.type}
                    </span>
                  </div>
                </div>
              </div>

              <div className="shrink-0 ml-3">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getRelevanceBadge(
                    factor.relevance
                  )}`}
                >
                  Score: {Math.round(factor.relevance * 100)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mandatory Non-Causality Disclaimer Banner */}
      <div className="mt-5 p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 flex items-start space-x-2 text-xs text-amber-900">
        <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="font-semibold">Analysis Disclaimer: </strong>
          {context.disclaimer || 'These are potentially relevant factors, not confirmed causes.'}
        </p>
      </div>
    </div>
  );
}
