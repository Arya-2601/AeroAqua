import React, { useState, useEffect } from 'react';
import {
  Zap,
  AlertTriangle,
  Check,
  Loader2,
  Shield,
  Radio,
  ArrowRight,
  TrendingUp,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';
import api from '../services/api';
import { Link } from 'react-router-dom';

export default function WhatIfScenarioModal({ isOpen, onClose, stations = [], onDataUpdated }) {
  const [selectedStationId, setSelectedStationId] = useState(() => (stations.length > 0 ? stations[0].id : 1));
  const [scenarioType, setScenarioType] = useState('PM2.5 Surge');
  const [magnitude, setMagnitude] = useState(75);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (stations.length > 0 && !stations.some((s) => s.id === selectedStationId)) {
      setSelectedStationId(stations[0].id);
    }
  }, [stations, selectedStationId]);

  if (!isOpen) return null;

  const handleRunScenario = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.runWhatIfScenario(selectedStationId, magnitude, scenarioType);
      setResult(res);
      if (onDataUpdated) onDataUpdated();
    } catch (err) {
      console.error('Error running What-If scenario:', err);
      setError(err.response?.data?.detail || 'Failed to run scenario. Ensure authority permissions.');
    } finally {
      setLoading(false);
    }
  };

  const selectedStation = stations.find((s) => s.id === selectedStationId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-gradient-to-tr from-amber-500 to-rose-500 text-white rounded-lg shadow-sm">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-sm sm:text-base tracking-wide text-white">
                  Run What-If Scenario
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  SIMULATION
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Controlled environmental anomaly simulation &amp; decision response
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
            aria-label="Close dialog"
          >
            &times;
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 space-y-4 overflow-y-auto text-xs">
          {/* Simulation Notice */}
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-purple-950 text-[11px] leading-relaxed flex items-start gap-2">
            <Shield className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold block">Authority Controlled Simulation</strong>
              Injects a synthetic environmental surge into the chosen zone. The complete ML pipeline will evaluate historical deviation, anomaly Z-score, context factors, forecast, and generate an active alert marked as <strong>SIMULATION</strong>.
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!result ? (
            <div className="space-y-4">
              {/* Target Zone Selection */}
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Target Monitoring Zone
                </label>
                <select
                  value={selectedStationId}
                  onChange={(e) => setSelectedStationId(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-sky-500 font-medium cursor-pointer"
                >
                  {stations.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.region} • {s.zone_profile}) — Current: {s.current_pm25} µg/m³
                    </option>
                  ))}
                </select>
              </div>

              {/* Scenario Type */}
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Scenario Prototype
                </label>
                <select
                  value={scenarioType}
                  onChange={(e) => setScenarioType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-sky-500 font-medium cursor-pointer"
                >
                  <option value="PM2.5 Surge">PM2.5 Surge (General particulate elevation)</option>
                  <option value="Industrial Inversion">Industrial Inversion (Low dispersion + stack discharge)</option>
                  <option value="Highway Congestion Incursion">Highway Congestion Incursion (Severe transit bottleneck)</option>
                  <option value="Agricultural Biomass Plume">Agricultural Biomass Plume (Trans-boundary smoke event)</option>
                </select>
              </div>

              {/* Intensity / Magnitude Slider */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider">
                    Simulation Intensity
                  </label>
                  <span className="font-mono font-bold text-rose-600 text-sm">
                    +{magnitude}% above baseline
                  </span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="200"
                  step="5"
                  value={magnitude}
                  onChange={(e) => setMagnitude(Number(e.target.value))}
                  className="w-full accent-rose-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-medium">
                  <span>+20% (Watch)</span>
                  <span>+75% (Warning / High)</span>
                  <span>+200% (Critical Emergency)</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleRunScenario}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-700 hover:to-rose-700 text-white rounded-xl font-bold shadow-md transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  <span>{loading ? 'Calculating Pipeline...' : 'Execute What-If Scenario'}</span>
                </button>
              </div>
            </div>
          ) : (
            /* Simulation Output Breakdown */
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-bold">{result.message}</span>
                </div>
                <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded bg-purple-200 text-purple-900 border border-purple-300">
                  SIMULATION
                </span>
              </div>

              {/* Quantitative Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Current PM2.5</span>
                  <span className="text-lg font-black font-mono text-slate-700">{result.current_pm25} µg/m³</span>
                </div>
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                  <span className="text-[10px] font-bold text-rose-500 uppercase block">Simulated PM2.5</span>
                  <span className="text-lg font-black font-mono text-rose-700">{result.simulated_pm25} µg/m³</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Anomaly Level</span>
                  <span className="text-sm font-black uppercase text-rose-600 block mt-0.5">
                    {result.anomaly?.severity || 'HIGH'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Generated Alert</span>
                  <span className="text-sm font-black uppercase text-amber-600 block mt-0.5">
                    {result.alert?.risk_level || 'CRITICAL'}
                  </span>
                </div>
              </div>

              {/* Recommended Response Operational Flow */}
              <div className="p-4 bg-slate-900 text-white rounded-xl space-y-2.5">
                <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                  <Sparkles className="w-4 h-4" />
                  <span>Recommended Response Workflow</span>
                </div>
                <div className="space-y-1.5 text-xs text-slate-200">
                  {result.recommended_response?.map((step, idx) => (
                    <div key={idx} className="flex items-start space-x-2">
                      <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <Link
                    to="/alerts"
                    onClick={onClose}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow-sm transition-all"
                  >
                    <Radio className="w-3.5 h-3.5" />
                    <span>Review Alert &amp; Broadcast</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setResult(null)}
                  className="text-xs font-bold text-sky-600 hover:underline"
                >
                  ← Run Another Scenario
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
