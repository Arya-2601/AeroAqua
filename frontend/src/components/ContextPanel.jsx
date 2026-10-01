import React from 'react';
import { Info, Sparkles, Calendar, Car, Wind, Navigation, Factory, MapPin } from 'lucide-react';

/**
 * Environmental Context Engine Classification Bands:
 * Thresholds:
 * - HIGH (relevance >= 0.70): Strong contextual correlation
 * - MEDIUM (0.40 <= relevance < 0.70): Moderate contextual influence
 * - LOW (relevance < 0.40): Limited contextual influence
 *
 * Underlying numerical values remain within [0.0 - 1.0], mapped consistently to bands.
 */
export const CONTEXT_THRESHOLDS = {
  HIGH: 0.70,
  MEDIUM: 0.40,
};

export const getContextScoreBand = (score) => {
  const val = typeof score === 'number' ? score : parseFloat(score) || 0.0;
  if (val >= CONTEXT_THRESHOLDS.HIGH) {
    return {
      band: 'HIGH',
      label: 'HIGH',
      description: 'strong contextual correlation',
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
    };
  }
  if (val >= CONTEXT_THRESHOLDS.MEDIUM) {
    return {
      band: 'MEDIUM',
      label: 'MEDIUM',
      description: 'moderate contextual influence',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    };
  }
  return {
    band: 'LOW',
    label: 'LOW',
    description: 'limited contextual influence',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
  };
};

export default function ContextPanel({ context }) {
  if (!context || !context.factors) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm text-center text-slate-500 text-sm">
        No context data available for this station.
      </div>
    );
  }

  const factors = context.factors;

  // Derive overall environmental context score band (highest contextual factor or average)
  const maxScore = factors.length > 0 ? Math.max(...factors.map((f) => f.relevance || 0)) : 0.0;
  const overallBand = getContextScoreBand(maxScore);

  const getFactorIcon = (type) => {
    switch (type) {
      case 'event':
        return <Calendar className="w-4 h-4 text-purple-600" />;
      case 'traffic':
        return <Car className="w-4 h-4 text-amber-600" />;
      case 'wind':
        return <Wind className="w-4 h-4 text-sky-600" />;
      case 'roads':
        return <Navigation className="w-4 h-4 text-emerald-600" />;
      case 'industry':
        return <Factory className="w-4 h-4 text-slate-600" />;
      default:
        return <MapPin className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
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

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Environmental Context:</span>
          <span
            className={`text-xs font-black uppercase px-2.5 py-1 rounded-full border ${overallBand.badgeClass}`}
            title={`Environmental Context: ${overallBand.band} (${overallBand.description})`}
          >
            {overallBand.band}
          </span>
          <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
            {factors.length} Factor{factors.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {factors.length === 0 ? (
        <p className="text-sm text-slate-500 italic py-4 text-center">
          No significant coinciding local events or abnormal signals detected within radius.
        </p>
      ) : (
        <div className="space-y-3">
          {factors.map((factor, idx) => {
            const factorBand = getContextScoreBand(factor.relevance);
            return (
              <div
                key={idx}
                className="flex items-start justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors gap-3"
              >
                <div className="flex items-start space-x-3 flex-1">
                  <span className="p-2 bg-white rounded-lg border border-slate-200 shadow-2xs mt-0.5 flex items-center justify-center">
                    {getFactorIcon(factor.type)}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 leading-snug">
                      {factor.text}
                    </p>
                    <div className="flex items-center space-x-2 mt-1 flex-wrap">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Factor: {factor.type}
                      </span>
                      <span className="text-[11px] text-slate-400">•</span>
                      <span className="text-[11px] text-slate-500 font-medium">
                        Potentially relevant factor (non-causal)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex flex-col items-end">
                  <span
                    className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${factorBand.badgeClass}`}
                    title={factorBand.description}
                  >
                    Context: {factorBand.band}
                  </span>
                  <span className="text-[9px] text-slate-400 mt-0.5 capitalize">
                    {factorBand.description}
                  </span>
                </div>
              </div>
            );
          })}
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
