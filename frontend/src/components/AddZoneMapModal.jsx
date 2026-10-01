import React, { useState, useEffect } from 'react';
import {
  Shield,
  X,
  MapPin,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Compass,
  Layers,
  Edit3,
  Loader2,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const STATE_BOUNDS = {
  Delhi: { minLat: 28.3, maxLat: 28.95, minLng: 76.8, maxLng: 77.45 },
  Maharashtra: { minLat: 15.6, maxLat: 22.1, minLng: 72.5, maxLng: 80.9 },
  Gujarat: { minLat: 20.1, maxLat: 24.7, minLng: 68.1, maxLng: 74.5 },
};

export default function AddZoneMapModal({
  isOpen,
  onClose,
  coords = null,
  initialCoordinates = null,
  currentRegion = 'Delhi',
  onZoneCreated,
}) {
  const { getRegionMeta } = useAuth();
  const regionMeta = getRegionMeta(currentRegion);

  const activeCoords = coords || initialCoordinates;

  const [mode, setMode] = useState(activeCoords ? 'map' : 'manual'); // 'manual' or 'map'
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [zoneProfile, setZoneProfile] = useState('Residential');
  const [description, setDescription] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [geocodedAddress, setGeocodedAddress] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (activeCoords) {
      setMode('map');
      setLatitude(activeCoords.lat?.toFixed(4) || '');
      setLongitude(activeCoords.lng?.toFixed(4) || '');
      handleReverseGeocode(activeCoords.lat, activeCoords.lng);
    } else if (isOpen) {
      setLatitude(regionMeta.latitude.toFixed(4));
      setLongitude(regionMeta.longitude.toFixed(4));
    }
  }, [activeCoords, isOpen, regionMeta]);

  const handleReverseGeocode = async (lat, lon) => {
    if (!lat || !lon) return;
    setGeocoding(true);
    try {
      const data = await api.reverseGeocode(lat, lon);
      setGeocodedAddress(data);
      if (data.locality && !name) {
        setName(`${data.locality} Zone`);
      }
      if (data.city && !city) {
        setCity(data.city);
      }
    } catch {
      // Fallback
    } finally {
      setGeocoding(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (!name.trim()) {
      setError('Zone name is required.');
      return;
    }
    if (isNaN(lat) || isNaN(lon)) {
      setError('Valid latitude and longitude coordinates are required.');
      return;
    }

    // State geographic boundary validation
    const bounds = STATE_BOUNDS[currentRegion];
    if (bounds) {
      if (lat < bounds.minLat || lat > bounds.maxLat || lon < bounds.minLng || lon > bounds.maxLng) {
        setError(`Selected coordinates (${lat.toFixed(4)}, ${lon.toFixed(4)}) appear to be outside the administrative boundaries of ${currentRegion}. Please select a location within ${currentRegion}.`);
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        region: currentRegion,
        latitude: lat,
        longitude: lon,
        zone_profile: zoneProfile,
        description: description.trim() || undefined,
      };

      const res = await api.createStation(payload);
      setSuccess(`Zone "${res.name}" successfully established in ${currentRegion}. Active monitoring telemetry initialized.`);
      if (onZoneCreated) onZoneCreated(res);
      setTimeout(() => {
        onClose();
        setSuccess(null);
        setName('');
        setCity('');
        setDescription('');
      }, 1500);
    } catch (err) {
      console.error('Failed to create zone:', err);
      setError(err.response?.data?.detail || 'Failed to create zone. Authorization required.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base tracking-wide text-white">
                Add Monitoring Zone — {currentRegion}
              </h3>
              <p className="text-[11px] text-slate-400">
                {mode === 'map' ? 'Option B: Map-Captured Coordinates' : 'Option A: Manual Zone Registration'}
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

        {/* Mode Selector Tab */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-100 border-b border-slate-200 text-xs font-bold shrink-0">
          <button
            type="button"
            onClick={() => setMode('manual')}
            className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              mode === 'manual'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Option A: Manual Entry</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('map')}
            className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              mode === 'map'
                ? 'bg-amber-500 text-slate-950 shadow-2xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Option B: Map Coordinates</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto text-xs">
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

          {/* Reverse Geocode Preview Banner */}
          {geocodedAddress && (
            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  Spatial Geocoded Location
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  {geocodedAddress.state}
                </span>
              </div>
              <p className="text-xs text-slate-800 font-medium">
                {geocodedAddress.display_name}
              </p>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Zone Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Kalyan Zone, Chembur East, GIDC North"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">State / Region</label>
              <input
                type="text"
                readOnly
                value={currentRegion}
                className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl text-slate-600 font-medium cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">City / Area</label>
              <input
                type="text"
                placeholder="e.g. Kalyan, Mumbai, Surat"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Latitude <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.0001"
                required
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Longitude <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.0001"
                required
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Zone Environmental Profile</label>
            <select
              value={zoneProfile}
              onChange={(e) => setZoneProfile(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none font-medium"
            >
              <option value="Residential">Residential</option>
              <option value="Commercial">Commercial</option>
              <option value="Industrial">Industrial</option>
              <option value="Traffic Corridor">Traffic Corridor</option>
              <option value="Green Area">Green Area</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Description (Optional)</label>
            <textarea
              rows={2}
              placeholder="Geospatial characteristics, major arterial intersections, nearby industrial clusters..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
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
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-slate-950 font-bold rounded-xl shadow-xs transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>{loading ? 'Initializing Station...' : 'Create Zone'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
