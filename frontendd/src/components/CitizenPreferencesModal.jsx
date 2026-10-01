import React, { useState } from 'react';
import {
  Bell,
  X,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Save,
  Loader2,
  Sliders,
} from 'lucide-react';
import { useAuth, AVAILABLE_REGIONS } from '../context/AuthContext';

export default function CitizenPreferencesModal({ isOpen, onClose, stations = [] }) {
  const { user, currentRegion, updatePreferences } = useAuth();

  const [region, setRegion] = useState(user?.region || currentRegion || 'Maharashtra');
  const [city, setCity] = useState(user?.preferred_city || 'Mumbai');
  const [zone, setZone] = useState(user?.preferred_zone || 'Mumbai Central');
  const [notifyAnomalies, setNotifyAnomalies] = useState(user?.notify_anomalies ?? true);
  const [notifyBroadcasts, setNotifyBroadcasts] = useState(user?.notify_broadcasts ?? true);
  const [notifyEvents, setNotifyEvents] = useState(user?.notify_events ?? true);
  const [notifyForecastChanges, setNotifyForecastChanges] = useState(user?.notify_forecast_changes ?? true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  if (!isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const res = await updatePreferences({
      region,
      preferred_city: city.trim(),
      preferred_zone: zone.trim(),
      notify_anomalies: notifyAnomalies,
      notify_broadcasts: notifyBroadcasts,
      notify_events: notifyEvents,
      notify_forecast_changes: notifyForecastChanges,
    });

    setLoading(false);
    if (res.success) {
      setSuccess('Alert preferences and region configuration saved successfully.');
      setTimeout(() => {
        onClose();
        setSuccess(null);
      }, 1500);
    } else {
      setError(res.error || 'Failed to update preferences.');
    }
  };

  const regionStations = stations.filter((s) => s.region.toLowerCase() === region.toLowerCase());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-sky-500/20 text-sky-400 rounded-lg border border-sky-500/30">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base tracking-wide text-white">
                Alert Preferences
              </h3>
              <p className="text-[11px] text-slate-400">
                Personalized Environmental Intelligence Config
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* My Region Section */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <span className="font-bold text-slate-800 text-xs block uppercase tracking-wider">
              My Region Configuration
            </span>

            <div>
              <label className="block font-semibold text-slate-600 mb-1">State / Region</label>
              <select
                value={region}
                onChange={(e) => {
                  setRegion(e.target.value);
                  if (e.target.value === 'Maharashtra') {
                    setCity('Mumbai');
                    setZone('Mumbai Central');
                  } else if (e.target.value === 'Gujarat') {
                    setCity('Ahmedabad');
                    setZone('Ahmedabad');
                  } else if (e.target.value === 'Delhi') {
                    setCity('Delhi');
                    setZone('Central Delhi');
                  }
                }}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none font-medium cursor-pointer"
              >
                {AVAILABLE_REGIONS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">City</label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Mumbai"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Primary Zone</label>
                {regionStations.length > 0 ? (
                  <select
                    value={zone}
                    onChange={(e) => setZone(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none font-medium cursor-pointer"
                  >
                    {regionStations.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    value={zone}
                    onChange={(e) => setZone(e.target.value)}
                    placeholder="e.g. Mumbai Central"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none font-medium"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Notify Me About Checklist */}
          <div className="space-y-2.5 pt-1">
            <span className="font-bold text-slate-800 text-xs block uppercase tracking-wider">
              Notify Me About:
            </span>

            <label className="flex items-center space-x-3 p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={notifyAnomalies}
                onChange={(e) => setNotifyAnomalies(e.target.checked)}
                className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300"
              />
              <span className="font-semibold text-slate-700">High pollution anomalies</span>
            </label>

            <label className="flex items-center space-x-3 p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={notifyBroadcasts}
                onChange={(e) => setNotifyBroadcasts(e.target.checked)}
                className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300"
              />
              <span className="font-semibold text-slate-700">Authority broadcasts</span>
            </label>

            <label className="flex items-center space-x-3 p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={notifyEvents}
                onChange={(e) => setNotifyEvents(e.target.checked)}
                className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300"
              />
              <span className="font-semibold text-slate-700">Environmental events</span>
            </label>

            <label className="flex items-center space-x-3 p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={notifyForecastChanges}
                onChange={(e) => setNotifyForecastChanges(e.target.checked)}
                className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300"
              />
              <span className="font-semibold text-slate-700">Significant forecast changes</span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>{loading ? 'Saving...' : 'Save Preferences'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
