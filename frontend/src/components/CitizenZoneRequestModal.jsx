import React, { useState } from 'react';
import {
  MapPinPlus,
  X,
  AlertTriangle,
  CheckCircle,
  MapPin,
  Send,
  Loader2,
  Building,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function CitizenZoneRequestModal({ isOpen, onClose, onRequestSubmitted }) {
  const { currentRegion, user } = useAuth();

  const [city, setCity] = useState(user?.preferred_city || '');
  const [areaLocality, setAreaLocality] = useState(user?.preferred_zone || '');
  const [pincode, setPincode] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!city.trim() || !areaLocality.trim()) {
      setError('City and area/locality are required.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        region: currentRegion,
        city: city.trim(),
        area_locality: areaLocality.trim(),
        pincode: pincode.trim() || undefined,
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
        reason: reason.trim() || undefined,
      };

      const res = await api.submitZoneRequest(payload);
      setSuccess(`Coverage request registered (${res.request_count} total citizen requests for this locality). Authority has been notified for operational review.`);
      if (onRequestSubmitted) onRequestSubmitted(res);
      setTimeout(() => {
        onClose();
        setSuccess(null);
      }, 2000);
    } catch (err) {
      console.error('Failed to submit zone request:', err);
      setError(err.response?.data?.detail || 'Failed to submit coverage request.');
    } finally {
      setLoading(false);
    }
  };

  const handleCaptureLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(pos.coords.latitude.toFixed(4));
          setLongitude(pos.coords.longitude.toFixed(4));
        },
        () => {
          setError('Could not retrieve current location automatically.');
        }
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
              <MapPinPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base tracking-wide text-white">
                Request Environmental Coverage
              </h3>
              <p className="text-[11px] text-slate-400">
                Citizen Zone Expansion Petition &amp; Review
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto text-xs">
          <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-950 text-[11px] leading-relaxed">
            <strong className="font-bold block mb-0.5">Your area is currently not covered by a monitoring zone.</strong>
            Submit a formal coverage request to municipal authorities. When reviewed and approved, a dedicated telemetry and forecasting zone will be configured for your locality.
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Region / State */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                State / Region
              </label>
              <input
                type="text"
                readOnly
                value={currentRegion}
                className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl text-slate-600 font-semibold cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                City / Municipality
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Kalyan, Vapi, Rohini"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-sky-500 font-medium"
              />
            </div>
          </div>

          {/* Area / Locality */}
          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              Area / Locality / Neighborhood
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Khadakpada, Sector 21, Ring Road Industrial Belt"
              value={areaLocality}
              onChange={(e) => setAreaLocality(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-sky-500 font-medium"
            />
          </div>

          {/* Pincode & GPS */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Postal Pincode
              </label>
              <input
                type="text"
                placeholder="e.g. 421301"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none font-mono"
              />
            </div>
            <div className="flex flex-col justify-end">
              <button
                type="button"
                onClick={handleCaptureLocation}
                className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5 text-sky-600" />
                <span>Auto GPS Coordinates</span>
              </button>
            </div>
          </div>

          {(latitude || longitude) && (
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-200">
              <div>Lat: {latitude}</div>
              <div>Lon: {longitude}</div>
            </div>
          )}

          {/* Reason / Justification */}
          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              Reason / Justification for Coverage
            </label>
            <textarea
              rows={3}
              placeholder="Explain why this area needs dedicated air/groundwater monitoring (e.g., proximity to national highway, rising residential density, nearby industrial clusters)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-sky-500 font-medium"
            />
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
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>{loading ? 'Submitting Petition...' : 'Request My Area'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
