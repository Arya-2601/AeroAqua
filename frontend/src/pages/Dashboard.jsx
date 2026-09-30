import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import AlertBanner from '../components/AlertBanner';
import PollutionMap from '../components/PollutionMap';
import StationCard from '../components/StationCard';
import SimulateSpikeButton from '../components/SimulateSpikeButton';
import { useAuth } from '../context/AuthContext';
import { getRegionMeta } from '../utils/regions';
import { AQI_CATEGORIES } from '../utils/aqi';
import { formatISTTime } from '../utils/dateTime';
import {
  Activity,
  AlertTriangle,
  Bell,
  MapPin,
  Flame,
  Shield,
  User,
  Radio,
  ExternalLink,
  Droplets,
  Info,
  Thermometer,
  Wind,
  Compass,
  CloudRain,
  Gauge,
  CheckCircle,
  Plus,
  RefreshCw,
  X,
} from 'lucide-react';

export default function Dashboard() {
  const { user, isAuthority, isCitizen, currentRegion } = useAuth();
  const [stations, setStations] = useState([]);
  const [events, setEvents] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [regionalWeather, setRegionalWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  // Add Zone Modal state for Authority
  const [isAddZoneOpen, setIsAddZoneOpen] = useState(false);
  const [zoneForm, setZoneForm] = useState({
    name: '',
    latitude: '',
    longitude: '',
    zone_profile: 'Residential',
    description: '',
  });
  const [addZoneLoading, setAddZoneLoading] = useState(false);
  const [addZoneError, setAddZoneError] = useState(null);
  const [addZoneSuccess, setAddZoneSuccess] = useState(null);

  const regionMeta = getRegionMeta(currentRegion);

  const fetchData = useCallback(async () => {
    try {
      const [stData, evData, alData, wData] = await Promise.all([
        api.getStations(currentRegion),
        api.getEvents('all', currentRegion),
        isAuthority ? api.getAlerts(true, currentRegion) : api.getBroadcastAlerts(currentRegion),
        api.getRegionalWeather(regionMeta.latitude, regionMeta.longitude).catch(() => null),
      ]);
      setStations(stData);
      setEvents(evData);
      setAlerts(alData);
      setRegionalWeather(wData);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthority, currentRegion, regionMeta.latitude, regionMeta.longitude]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleAddZoneSubmit = async (e) => {
    e.preventDefault();
    setAddZoneError(null);
    setAddZoneSuccess(null);

    const lat = parseFloat(zoneForm.latitude);
    const lon = parseFloat(zoneForm.longitude);

    if (!zoneForm.name.trim()) {
      setAddZoneError('Zone name is required.');
      return;
    }
    if (isNaN(lat) || isNaN(lon)) {
      setAddZoneError('Valid numerical latitude and longitude are required.');
      return;
    }

    setAddZoneLoading(true);
    try {
      const payload = {
        name: zoneForm.name.trim(),
        region: currentRegion,
        latitude: lat,
        longitude: lon,
        zone_profile: zoneForm.zone_profile,
        description: zoneForm.description.trim() || undefined,
      };

      const res = await api.createStation(payload);
      setAddZoneSuccess(`Zone "${res.name}" successfully added to ${currentRegion}.`);
      setZoneForm({
        name: '',
        latitude: '',
        longitude: '',
        zone_profile: 'Residential',
        description: '',
      });
      await fetchData();
      setTimeout(() => {
        setIsAddZoneOpen(false);
        setAddZoneSuccess(null);
      }, 1500);
    } catch (err) {
      console.error('Failed to add zone:', err);
      const detail = err.response?.data?.detail || 'Failed to add zone. Please check parameters.';
      setAddZoneError(detail);
    } finally {
      setAddZoneLoading(false);
    }
  };

  // Derived metrics
  const activeAnomaliesCount = stations.filter((s) => s.is_anomaly).length;
  const activeAlertsCount = alerts.filter(
    (a) => a.is_active || a.status === 'ACTIVE' || a.is_broadcast || a.status === 'BROADCASTED'
  ).length;

  const highestStation = stations.reduce(
    (max, s) => (s.current_pm25 > (max?.current_pm25 || 0) ? s : max),
    null
  );

  const sortedStations = [...stations].sort((a, b) => {
    const riskOrder = { CRITICAL: 4, WARNING: 3, WATCH: 2, NORMAL: 1 };
    const rA = riskOrder[a.risk_level] || 0;
    const rB = riskOrder[b.risk_level] || 0;
    if (rA !== rB) return rB - rA;
    return b.current_pm25 - a.current_pm25;
  });

  const hasLiveCoverage = stations.length > 0;

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Top Alert Banner */}
      <AlertBanner alerts={alerts} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Role & Operational Mode Banner */}
        <div
          className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-sm ${
            isAuthority
              ? 'bg-amber-50/80 border-amber-200 text-amber-950'
              : 'bg-blue-50/80 border-blue-200 text-blue-950'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`p-1.5 rounded-lg ${
                isAuthority ? 'bg-amber-200 text-amber-900' : 'bg-blue-200 text-blue-900'
              }`}
            >
              {isAuthority ? <Shield className="w-4 h-4" /> : <User className="w-4 h-4" />}
            </div>
            <div>
              <span className="font-bold uppercase tracking-wider">
                {isAuthority ? 'Authority Operations Mode' : 'Citizen Advisory Mode'}
              </span>
              <span className="mx-2 text-slate-300">|</span>
              <span className="text-slate-600">
                Region: <strong className="text-slate-900">{currentRegion}</strong> • Status:{' '}
                <strong className={hasLiveCoverage ? 'text-emerald-700' : 'text-slate-700'}>
                  {hasLiveCoverage
                    ? 'Regional Environmental Monitoring Active'
                    : 'Regional Meteorological Telemetry Active'}
                </strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-500 font-mono text-[11px]">
              Telemetry Sync: {formatISTTime(lastRefreshed)}
            </span>
          </div>
        </div>

        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-sans">
                {isAuthority ? 'Authority Dashboard' : 'Citizen Dashboard'}
              </h1>
              {hasLiveCoverage ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Regional Monitoring Active
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-700 border border-slate-300">
                  Meteorological Telemetry Active
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {hasLiveCoverage
                ? `Regional monitoring active — API + prepared monitoring data for ${currentRegion}.`
                : `Live meteorological telemetry (Open-Meteo) for ${currentRegion}.`}
            </p>
          </div>

          <div className="flex items-center space-x-2.5 flex-wrap">
            {/* Operational Refresh Button */}
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
              title="Re-fetch latest environmental readings and alerts"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-sky-600' : 'text-slate-500'}`} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>

            {/* Authority Add Zone Button */}
            {isAuthority && (
              <button
                onClick={() => {
                  setZoneForm({
                    name: '',
                    latitude: regionMeta.latitude.toFixed(4),
                    longitude: regionMeta.longitude.toFixed(4),
                    zone_profile: 'Residential',
                    description: '',
                  });
                  setIsAddZoneOpen(true);
                }}
                className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
              >
                <Plus className="w-3.5 h-3.5 text-sky-400" />
                <span>Add Zone</span>
              </button>
            )}

            {/* Run Demo Anomaly only visible to Authorities when stations are present */}
            {isAuthority && hasLiveCoverage && (
              <SimulateSpikeButton stations={stations} onDataUpdated={fetchData} />
            )}
          </div>
        </div>

        {/* Summary Metric Cards Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Stations */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className={`p-3 rounded-xl ${hasLiveCoverage ? 'bg-sky-50 text-sky-600' : 'bg-slate-100 text-slate-400'}`}>
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Active Stations
              </span>
              <span className="text-2xl font-black text-slate-900 font-mono">
                {stations.length} {stations.length === 1 ? 'Zone' : 'Zones'}
              </span>
              <span className="text-[10px] text-slate-500 font-semibold block">
                {hasLiveCoverage ? currentRegion : 'No zones configured'}
              </span>
            </div>
          </div>

          {/* Active Anomalies */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center space-x-4">
            <div
              className={`p-3 rounded-xl ${
                activeAnomaliesCount > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-500'
              }`}
            >
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Active Anomalies
              </span>
              <div className="flex items-baseline space-x-1.5">
                <span
                  className={`text-2xl font-black font-mono ${
                    activeAnomaliesCount > 0 ? 'text-rose-600' : 'text-slate-900'
                  }`}
                >
                  {activeAnomaliesCount}
                </span>
                <span className="text-xs text-slate-500 font-medium">flagged</span>
              </div>
            </div>
          </div>

          {/* Active Alerts */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center space-x-4">
            <div
              className={`p-3 rounded-xl ${
                activeAlertsCount > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-500'
              }`}
            >
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                {isAuthority ? 'Platform Alerts' : 'Citizen Broadcasts'}
              </span>
              <div className="flex items-baseline space-x-1.5">
                <span
                  className={`text-2xl font-black font-mono ${
                    activeAlertsCount > 0 ? 'text-amber-600' : 'text-slate-900'
                  }`}
                >
                  {activeAlertsCount}
                </span>
                <span className="text-xs text-slate-500 font-medium">active</span>
              </div>
            </div>
          </div>

          {/* Highest PM2.5 */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className={`p-3 rounded-xl ${hasLiveCoverage ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-400'}`}>
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Peak PM2.5 Level
              </span>
              {highestStation ? (
                <div className="flex items-baseline space-x-1.5">
                  <span className="text-2xl font-black text-slate-900 font-mono">
                    {highestStation.current_pm25}
                  </span>
                  <span className="text-xs font-bold text-rose-600 truncate max-w-[90px]">
                    ({highestStation.name})
                  </span>
                </div>
              ) : (
                <span className="text-xs font-bold text-slate-400">
                  {hasLiveCoverage ? '—' : '—'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* State Notice Banner when regional air sensor grid is not configured */}
        {!hasLiveCoverage && (
          <div className="bg-slate-100/90 border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-slate-200 text-slate-700 rounded-xl shrink-0 mt-0.5">
                <Info className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-slate-900 text-sm">
                    Regional Monitoring Status: Monitoring grid currently unconfigured for {currentRegion}
                  </h3>
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-slate-200 text-slate-700">
                    METEOROLOGICAL TELEMETRY ACTIVE
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  AeroAqua provides real-time meteorological telemetry and historical groundwater analysis for all Indian States &amp; Union Territories. Dedicated multi-zone air intelligence grids are currently active for <strong>Delhi</strong>, <strong>Maharashtra</strong>, and <strong>Gujarat</strong>. Authorities may also register new monitoring zones for {currentRegion} using the Add Zone control.
                </p>
              </div>
            </div>

            {/* Regional Weather Telemetry Block */}
            {regionalWeather && (
              <div className="bg-white rounded-xl p-4 border border-slate-200">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                  <div className="flex items-center space-x-2">
                    <Thermometer className="w-4 h-4 text-sky-600" />
                    <span className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                      Regional Meteorological Telemetry ({currentRegion} Centroid: {regionMeta.latitude.toFixed(2)}°N, {regionMeta.longitude.toFixed(2)}°E)
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">Source: Open-Meteo API</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Temperature</span>
                    <span className="text-base font-black text-slate-800 font-mono">
                      {regionalWeather.temperature} {regionalWeather.temperature_unit}
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Humidity</span>
                    <span className="text-base font-black text-slate-800 font-mono">
                      {regionalWeather.humidity} {regionalWeather.humidity_unit}
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Wind Velocity</span>
                    <span className="text-base font-black text-slate-800 font-mono">
                      {regionalWeather.wind_speed} {regionalWeather.wind_speed_unit} ({regionalWeather.wind_direction}°)
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Pressure</span>
                    <span className="text-base font-black text-slate-800 font-mono">
                      {regionalWeather.pressure} {regionalWeather.pressure_unit}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 mt-2.5">
                  <strong className="text-slate-700 font-semibold">Contextual note: </strong>
                  {regionalWeather.context_note || 'Correlated meteorological factor.'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Map and Stations Grid Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Map Column (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg text-slate-900">
                Spatial Telemetry Map ({currentRegion})
              </h2>
              <span className="text-xs text-slate-500 font-mono">
                Telemetry updated: {formatISTTime(lastRefreshed)}
              </span>
            </div>

            <PollutionMap
              stations={stations}
              events={events}
              center={[regionMeta.latitude, regionMeta.longitude]}
              zoom={regionMeta.zoom}
              regionName={currentRegion}
            />

            {/* PM2.5 Color Scale Legend */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-700 block mb-2 uppercase tracking-wider">
                PM2.5 Pollution Index Ranges (µg/m³)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                {AQI_CATEGORIES.map((cat, idx) => (
                  <div
                    key={cat.category}
                    className="p-2 rounded-lg border text-center flex flex-col justify-between"
                    style={{ borderColor: `${cat.color}40`, backgroundColor: `${cat.color}10` }}
                  >
                    <span className="text-[11px] font-extrabold" style={{ color: cat.color }}>
                      {cat.category}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-slate-600 mt-0.5">
                      {idx === 0
                        ? `0 - ${cat.max}`
                        : idx === AQI_CATEGORIES.length - 1
                        ? '251+'
                        : `${AQI_CATEGORIES[idx - 1].max + 1} - ${cat.max}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Station Cards Column (5 cols) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg text-slate-900">
                Monitoring Zones ({stations.length})
              </h2>
              <span className="text-xs text-slate-400 font-medium">Ranked by Risk Assessment</span>
            </div>

            {stations.length > 0 ? (
              <div className="space-y-3 max-h-[660px] overflow-y-auto pr-1">
                {sortedStations.map((station) => (
                  <StationCard key={station.id} station={station} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm text-center space-y-3">
                <MapPin className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="font-bold text-slate-800 text-sm">
                  No Monitoring Zones in {currentRegion}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  Dedicated regional air quality monitoring grids are operational for Delhi, Maharashtra, and Gujarat. Real-time meteorological telemetry is active on the spatial map.
                </p>
                {isAuthority && (
                  <div className="pt-2">
                    <button
                      onClick={() => {
                        setZoneForm({
                          name: '',
                          latitude: regionMeta.latitude.toFixed(4),
                          longitude: regionMeta.longitude.toFixed(4),
                          zone_profile: 'Residential',
                          description: '',
                        });
                        setIsAddZoneOpen(true);
                      }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                    >
                      + Add New Monitoring Zone to {currentRegion}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Authority Add Zone Modal */}
        {isAddZoneOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in duration-150">
              <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-sky-400" />
                  <h3 className="font-bold text-sm tracking-wide">
                    Add Monitoring Zone — {currentRegion}
                  </h3>
                </div>
                <button
                  onClick={() => setIsAddZoneOpen(false)}
                  className="text-slate-400 hover:text-white text-lg font-bold"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddZoneSubmit} className="p-6 space-y-4 text-xs">
                {addZoneError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{addZoneError}</span>
                  </div>
                )}

                {addZoneSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{addZoneSuccess}</span>
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Zone Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Thane, Borivali, Gandhinagar North"
                    value={zoneForm.name}
                    onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Region</label>
                  <input
                    type="text"
                    readOnly
                    value={currentRegion}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl text-slate-500 font-medium cursor-not-allowed"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Automatically associated with the currently selected operational region.
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Latitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      required
                      value={zoneForm.latitude}
                      onChange={(e) => setZoneForm({ ...zoneForm, latitude: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Longitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      required
                      value={zoneForm.longitude}
                      onChange={(e) => setZoneForm({ ...zoneForm, longitude: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Zone Type</label>
                  <select
                    value={zoneForm.zone_profile}
                    onChange={(e) => setZoneForm({ ...zoneForm, zone_profile: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none font-medium"
                  >
                    <option value="Residential">Residential</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Industrial">Industrial</option>
                    <option value="Green Area">Green Area</option>
                    <option value="Traffic Corridor">Traffic Corridor</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Description (Optional)</label>
                  <textarea
                    rows={2}
                    placeholder="Geospatial notes, proximity to arterial roads or industrial clusters..."
                    value={zoneForm.description}
                    onChange={(e) => setZoneForm({ ...zoneForm, description: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsAddZoneOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addZoneLoading}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-semibold shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {addZoneLoading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    <span>{addZoneLoading ? 'Initializing Zone...' : 'Add Zone'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
