import React, { useState, useEffect } from 'react';
import { Zap, AlertTriangle, Check, Loader2, Sparkles, Shield } from 'lucide-react';
import api from '../services/api';

export default function SimulateSpikeButton({ stations = [], onDataUpdated }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedStationId, setSelectedStationId] = useState(() => (stations.length > 0 ? stations[0].id : 1));
  const [magnitude, setMagnitude] = useState(70);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    if (stations.length > 0 && !stations.some((s) => s.id === selectedStationId)) {
      setSelectedStationId(stations[0].id);
    }
  }, [stations, selectedStationId]);

  const handleSimulate = async () => {
    setLoading(true);
    setSuccessMessage(null);
    try {
      const res = await api.simulateSpike(selectedStationId, magnitude);
      setSuccessMessage(res.message);
      if (onDataUpdated) onDataUpdated();
      setTimeout(() => {
        setIsOpen(false);
        setSuccessMessage(null);
      }, 1800);
    } catch (err) {
      console.error('Error simulating demo anomaly:', err);
      alert('Failed to simulate anomaly. Ensure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-700 hover:to-rose-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition-all transform active:scale-95"
      >
        <Zap className="w-4 h-4" />
        <span>Demo: Simulate Spike</span>
      </button>

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm tracking-wide">Demo: Simulate Pollution Spike</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
                <span className="font-bold block mb-0.5">Demo Simulation (Clearly Labeled)</span>
                Injects an elevated abnormal reading into the chosen zone and executes the live pipeline:
                baseline comparison, deviation %, z-score, XGBoost forecasting, context evaluation, and authority alert generation.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Select Target Station
                </label>
                <select
                  value={selectedStationId}
                  onChange={(e) => setSelectedStationId(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                >
                  {stations.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.zone_profile}) — Current: {s.current_pm25} µg/m³
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-slate-700 uppercase">
                    Spike Magnitude
                  </label>
                  <span className="text-xs font-bold text-rose-600 font-mono">
                    +{magnitude}% above baseline
                  </span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="200"
                  step="5"
                  value={magnitude}
                  onChange={(e) => setMagnitude(Number(e.target.value))}
                  className="w-full accent-rose-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>+30% (Moderate)</span>
                  <span>+70% (Significant)</span>
                  <span>+200% (Critical)</span>
                </div>
              </div>

              {successMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center space-x-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSimulate}
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center space-x-2 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold shadow-md transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  <span>{loading ? 'Processing Pipeline...' : 'Inject Spike Anomaly'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-full py-2 px-4 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-xs font-semibold transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
