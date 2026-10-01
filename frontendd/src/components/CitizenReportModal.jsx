import React, { useState } from 'react';
import {
  FileText,
  X,
  AlertTriangle,
  CheckCircle,
  MapPin,
  Camera,
  Send,
  Loader2,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function CitizenReportModal({ isOpen, onClose, onReportSubmitted }) {
  const { currentRegion, user } = useAuth();

  const [category, setCategory] = useState('air_pollution');
  const [city, setCity] = useState(user?.preferred_city || '');
  const [areaLocality, setAreaLocality] = useState(user?.preferred_zone || '');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [description, setDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!city.trim() || !areaLocality.trim() || !description.trim()) {
      setError('Please fill in city, area/locality, and issue description.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        category,
        region: currentRegion,
        city: city.trim(),
        area_locality: areaLocality.trim(),
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
        description: description.trim(),
        photo_url: photoUrl.trim() || undefined,
      };

      const res = await api.submitReport(payload);
      setSuccess(`Report #${res.id} submitted successfully. Municipal environmental authority has been notified.`);
      if (onReportSubmitted) onReportSubmitted(res);
      setTimeout(() => {
        onClose();
        setSuccess(null);
        setDescription('');
      }, 1800);
    } catch (err) {
      console.error('Failed to submit report:', err);
      setError(err.response?.data?.detail || 'Failed to submit issue report. Please try again.');
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
          setError('Could not retrieve current location automatically. Please enter area manually.');
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
            <div className="p-1.5 bg-sky-500/20 text-sky-400 rounded-lg border border-sky-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base tracking-wide text-white">
                Report Environmental Issue
              </h3>
              <p className="text-[11px] text-slate-400">
                Citizen Feedback &amp; Municipal Response Portal
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

          {/* Category Selector */}
          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              Issue Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-sky-500 font-medium cursor-pointer"
            >
              <option value="air_pollution">Air Pollution (Smoke, dust, odor, open burning)</option>
              <option value="water_concern">Water Concern (Turbidity, effluent, drain overflow)</option>
              <option value="industrial_activity">Industrial Activity (Unregulated discharge, chemical fumes)</option>
              <option value="other">Other Environmental Issue</option>
            </select>
          </div>

          {/* Region / State (Readonly with indicator) */}
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
                placeholder="e.g. Mumbai, Pune, Ahmedabad"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-sky-500 font-medium"
              />
            </div>
          </div>

          {/* Area / Locality */}
          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              Area / Locality / Street
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Khadakpada, Near MIDC Phase II, Sector 15"
              value={areaLocality}
              onChange={(e) => setAreaLocality(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-sky-500 font-medium"
            />
          </div>

          {/* Optional Coordinates with GPS Button */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700 text-[11px]">Geographic Location (Optional)</span>
              <button
                type="button"
                onClick={handleCaptureLocation}
                className="text-[10px] font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1 hover:underline"
              >
                <MapPin className="w-3 h-3" />
                <span>Use My Device GPS</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                step="0.0001"
                placeholder="Latitude (e.g. 19.0760)"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg outline-none font-mono text-[11px]"
              />
              <input
                type="number"
                step="0.0001"
                placeholder="Longitude (e.g. 72.8777)"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg outline-none font-mono text-[11px]"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              Issue Description
            </label>
            <textarea
              rows={3}
              required
              placeholder="Describe what you observed: color/intensity of smoke, time observed, nearby suspected industrial or construction source..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-sky-500 font-medium"
            />
          </div>

          {/* Optional Photo URL */}
          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              Optional Photo URL / Evidence Link
            </label>
            <div className="relative">
              <input
                type="url"
                placeholder="https://example.com/photo.jpg"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none font-mono text-[11px]"
              />
              <Camera className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
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
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>{loading ? 'Submitting Report...' : 'Submit Report'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
