import React from 'react';
import { AlertCircle, CheckCircle, Activity, Gauge } from 'lucide-react';

export default function AnomalyPanel({ anomaly, currentPm25 }) {
  if (!anomaly) return null;

  const isAnomaly = anomaly.is_anomaly;

  return (
    <div
      className={`rounded-2xl p-5 border shadow-sm transition-all ${
        isAnomaly
          ? 'bg-rose-50/70 border-rose-200 ring-1 ring-rose-300'
          : 'bg-white border-slate-200'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          {isAnomaly ? (
            <div className="p-2 bg-rose-500 text-white rounded-xl shadow-sm animate-bounce">
              <AlertCircle className="w-5 h-5" />
            </div>
          ) : (
            <div className="p-2 bg-emerald-500 text-white rounded-xl shadow-sm">
              <CheckCircle className="w-5 h-5" />
            </div>
          )}
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              {isAnomaly ? 'Significant Anomaly Detected' : 'Normal Environmental Pattern'}
            </h3>
            <p className="text-xs text-slate-500">
              Evaluated against 14-day same-hour historical baseline
            </p>
          </div>
        </div>

        {isAnomaly && (
          <span className="px-3 py-1 bg-rose-600 text-white font-extrabold uppercase text-xs rounded-full shadow-sm tracking-wide">
            {anomaly.severity} Severity
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white/80 backdrop-blur-sm p-3 rounded-xl border border-slate-200/80">
          <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
            Current PM2.5
          </span>
          <div className="flex items-baseline space-x-1">
            <span className="text-xl font-black text-slate-900 font-mono">{currentPm25}</span>
            <span className="text-[10px] text-slate-500">µg/m³</span>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm p-3 rounded-xl border border-slate-200/80">
          <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
            Baseline Mean
          </span>
          <div className="flex items-baseline space-x-1">
            <span className="text-xl font-black text-slate-700 font-mono">
              {anomaly.baseline_mean || '—'}
            </span>
            <span className="text-[10px] text-slate-500">µg/m³</span>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm p-3 rounded-xl border border-slate-200/80">
          <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
            Deviation %
          </span>
          <span
            className={`text-xl font-black font-mono ${
              anomaly.deviation_pct > 30 ? 'text-rose-600' : 'text-slate-800'
            }`}
          >
            {anomaly.deviation_pct > 0 ? `+${anomaly.deviation_pct}%` : `${anomaly.deviation_pct}%`}
          </span>
        </div>

        <div className="bg-white/80 backdrop-blur-sm p-3 rounded-xl border border-slate-200/80">
          <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
            Z-Score
          </span>
          <span
            className={`text-xl font-black font-mono ${
              anomaly.z_score >= 2.5 ? 'text-rose-600' : 'text-slate-800'
            }`}
          >
            {anomaly.z_score || 0}σ
          </span>
        </div>
      </div>

      {/* Baseline Metric Explanation Grid */}
      <div className="mt-4 pt-3 border-t border-slate-200/70 grid grid-cols-1 md:grid-cols-3 gap-2.5 text-[11px] text-slate-600 bg-white/60 p-3 rounded-xl border border-slate-100">
        <div>
          <span className="font-bold text-slate-800 block">Baseline:</span>
          Expected pollution level calculated from historical readings for comparable time periods.
        </div>
        <div>
          <span className="font-bold text-slate-800 block">Deviation:</span>
          Percentage difference between the current reading and baseline.
        </div>
        <div>
          <span className="font-bold text-slate-800 block">Z-score:</span>
          How far the current reading is from the normal historical pattern in standard-deviation units.
        </div>
      </div>
    </div>
  );
}
