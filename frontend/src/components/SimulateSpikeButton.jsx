import React, { useState } from 'react';
import { Zap, RotateCcw, AlertTriangle, Check, Loader2 } from 'lucide-react';
import api from '../services/api';

export default function SimulateSpikeButton({ stations = [], onDataUpdated }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedStationId, setSelectedStationId] = useState(3); // Default Zone C or A
  const [magnitude, setMagnitude] = useState(70);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

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
      }, 1500);
    } catch (err) {
      console.error('Error simulating spike:', err);
      alert('Failed to simulate spike. Ensure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Reset demo back to initial baseline data?')) return;
    setLoading(true);
    setSuccessMessage(null);
    try {
      await api.simulateReset();
      setSuccessMessage('Demo dataset reset to initial state!');
      if (onDataUpdated) onDataUpdated();
      setTimeout(() => {
        setIsOpen(false);
        setSuccessMessage(null);
      }, 1500);
    } catch (err) {
      console.error('Error resetting demo:', err);
      alert('Failed to reset demo dataset.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white rounded-lg text-xs sm:text-sm font-bold shadow-sm transition-all transform active:scale-95"
        >
          <Zap className="w-4 h-4" />
          <span>Simulate Spike</span>
        </button>

        <button
          onClick={handleReset}
          disabled={loading}
          title="Reset to initial pristine dataset"
          className="inline-flex items-center space-x-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Reset Demo</span>
        </button>
      </div>

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base">Simulate Pollution Spike</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                Injects an elevated reading into the chosen zone and executes live anomaly
                re-detection, factor correlation, XGBoost forecasting, and early-warning alert logic.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Select Target Station
                </label>
                <select
                  value={selectedStationId}
                  onChange={(e) => setSelectedStationId(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
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
                  <span>+30% (Mild)</span>
                  <span>+70% (Significant)</span>
                  <span>+200% (Severe)</span>
                </div>
              </div>

              {successMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-medium flex items-center space-x-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={handleSimulate}
                  disabled={loading}
                  className="flex-1 inline-flex items-center justify-center space-x-2 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-bold shadow-md transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  <span>{loading ? 'Processing...' : 'Trigger Live Spike'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
