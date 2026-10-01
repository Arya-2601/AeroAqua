import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import AlertBanner from '../components/AlertBanner';
import PollutionMap from '../components/PollutionMap';
import StationCard from '../components/StationCard';
import RemoveZoneModal from '../components/RemoveZoneModal';
import AddZoneMapModal from '../components/AddZoneMapModal';
import ExplainableAlertModal from '../components/ExplainableAlertModal';
import WhatIfScenarioModal from '../components/WhatIfScenarioModal';
import PublicReportModal from '../components/PublicReportModal';
import PublicZoneRequestModal from '../components/PublicZoneRequestModal';
import { useAuth } from '../context/AuthContext';
import { getRegionMeta } from '../utils/regions';
import { AQI_CATEGORIES, getRiskBadgeClasses } from '../utils/aqi';
import { formatISTTime, formatISTDateTime } from '../utils/dateTime';
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
  CheckCircle2,
  Sparkles,
  HelpCircle,
  Send,
  ClipboardList,
  Eye,
  Check,
  Ban,
  FlaskConical,
  Building2,
  TrendingUp,
  Search,
  Phone,
  Mail,
  Edit3,
} from 'lucide-react';

export default function Dashboard() {
  const { user, isAuthority, currentRegion, setCurrentRegion } = useAuth();
  const [stations, setStations] = useState([]);
  const [events, setEvents] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [regionalWeather, setRegionalWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  // Search Filter for Monitoring Zones
  const [searchQuery, setSearchQuery] = useState('');

  // Authority Operations Tabs
  const [zoneRequests, setZoneRequests] = useState([]);
  const [citizenReports, setCitizenReports] = useState([]);
  const [authorityTab, setAuthorityTab] = useState('zones'); // 'zones', 'requests', 'reports'

  // Review Modal state for Authority
  const [selectedRequestForReview, setSelectedRequestForReview] = useState(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [selectedReportForReview, setSelectedReportForReview] = useState(null);
  const [reportNotesInput, setReportNotesInput] = useState('');

  // Modals state
  const [zoneToRemove, setZoneToRemove] = useState(null);
  const [isRemoveZoneOpen, setIsRemoveZoneOpen] = useState(false);
  const [removeZoneLoading, setRemoveZoneLoading] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);

  // Map & Add Zone State
  const [isMapSelectionMode, setIsMapSelectionMode] = useState(false);
  const [isAddZoneModalOpen, setIsAddZoneModalOpen] = useState(false);
  const [selectedMapCoords, setSelectedMapCoords] = useState(null);

  // Modals for Public & Simulation
  const [isWhatIfOpen, setIsWhatIfOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isZoneRequestModalOpen, setIsZoneRequestModalOpen] = useState(false);
  const [selectedAlertForExplanation, setSelectedAlertForExplanation] = useState(null);

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

      // If authority, also fetch zone requests & citizen reports
      if (isAuthority) {
        try {
          const [zrData, repData] = await Promise.all([
            api.getZoneRequests(currentRegion),
            api.getCitizenReports(currentRegion),
          ]);
          setZoneRequests(zrData);
          setCitizenReports(repData);
        } catch (e) {
          console.warn('Authority metadata fetch issue:', e);
        }
      }

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

  const handleRequestRemoveZone = (zone) => {
    setZoneToRemove(zone);
    setIsRemoveZoneOpen(true);
  };

  const handleConfirmRemoveZone = async (stationId) => {
    setRemoveZoneLoading(true);
    try {
      await api.removeStation(stationId);
      // Immediately remove from active state without manual page refresh
      setStations((prev) => prev.filter((s) => s.id !== stationId));
      setIsRemoveZoneOpen(false);
      setZoneToRemove(null);
      setActionNotice({
        type: 'success',
        message: 'Zone successfully deactivated and removed from active monitoring grid.',
      });
      setTimeout(() => {
        setActionNotice(null);
      }, 4000);
    } catch (err) {
      console.error('Failed to remove zone:', err);
      const detail = err.response?.data?.detail || 'Failed to remove zone. Authorization required.';
      setActionNotice({
        type: 'error',
        message: detail,
      });
    } finally {
      setRemoveZoneLoading(false);
    }
  };

  // Map Click handler for Authority Add Zone
  const handleMapLocationSelect = (latlng) => {
    setSelectedMapCoords(latlng);
    setIsAddZoneModalOpen(true);
    setIsMapSelectionMode(false);
  };

  // Authority Zone Request Actions
  const handleUpdateZoneRequestStatus = async (requestId, status, rejectionReason = '') => {
    try {
      const payload = {
        status,
        rejection_reason: rejectionReason || undefined,
      };
      await api.updateZoneRequestStatus(requestId, payload);
      setZoneRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status, rejection_reason: rejectionReason } : r))
      );
      setSelectedRequestForReview(null);
      setRejectionReasonInput('');
      setActionNotice({
        type: 'success',
        message: `Zone petition marked as ${status}.`,
      });
      setTimeout(() => setActionNotice(null), 3500);
    } catch (err) {
      setActionNotice({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to update request status.',
      });
    }
  };

  const handleCreateZoneFromRequest = async (requestId) => {
    try {
      const res = await api.createZoneFromRequest(requestId);
      setActionNotice({
        type: 'success',
        message: `New Zone established from petition: ${res.station_name}!`,
      });
      setZoneRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: 'Approved' } : r))
      );
      setSelectedRequestForReview(null);
      await fetchData();
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err) {
      setActionNotice({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to create zone from request.',
      });
    }
  };

  // Authority Citizen Report Actions
  const handleUpdateReportStatus = async (reportId, status, notes = '') => {
    try {
      await api.updateCitizenReportStatus(reportId, { status, authority_notes: notes || undefined });
      setCitizenReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status, authority_notes: notes } : r))
      );
      setSelectedReportForReview(null);
      setReportNotesInput('');
      setActionNotice({
        type: 'success',
        message: `Incident report updated to ${status}.`,
      });
      setTimeout(() => setActionNotice(null), 3500);
    } catch (err) {
      setActionNotice({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to update report status.',
      });
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

  // Filtered & Sorted Stations for Search
  const filteredStations = stations.filter((st) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      st.name.toLowerCase().includes(q) ||
      (st.region && st.region.toLowerCase().includes(q)) ||
      (st.zone_profile && st.zone_profile.toLowerCase().includes(q))
    );
  });

  const sortedStations = [...filteredStations].sort((a, b) => {
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
        {/* Action Notice Toast */}
        {actionNotice && (
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold shadow-xs animate-in fade-in duration-200 ${
              actionNotice.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-center space-x-2">
              {actionNotice.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{actionNotice.message}</span>
            </div>
            <button
              onClick={() => setActionNotice(null)}
              className="p-1 text-slate-400 hover:text-slate-700"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Public Visitor or Authority Mode Header Bar */}
        {!isAuthority ? (
          /* Public Portal Header Card */
          <div className="p-4 sm:p-5 rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 via-white to-teal-50 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-sky-100 text-sky-800 border border-sky-300">
                  Public Environmental Portal
                </span>
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  Real-Time Air Quality, Meteorological Telemetry &amp; Maps ({currentRegion})
                </h2>
              </div>
              <p className="text-xs text-slate-600 max-w-2xl">
                Explore real-time PM2.5, ground monitoring grids, and official advisories for {currentRegion}. Submit incident observations or petition for new coverage below.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={() => setIsReportModalOpen(true)}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-2xs flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5 text-rose-600" />
                <span>Report Environmental Issue</span>
              </button>

              <button
                type="button"
                onClick={() => setIsZoneRequestModalOpen(true)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white shadow-xs flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Request New Zone</span>
              </button>
            </div>
          </div>
        ) : (
          /* Authority Operations Control Bar */
          <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-200 text-amber-950">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold uppercase tracking-wider text-amber-950 block">
                  Authority Command Operations — {currentRegion}
                </span>
                <span className="text-slate-600">
                  Authorized control room for {currentRegion} • Station management, public petition verification, incident response &amp; What-If scenarios.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-slate-500 font-mono text-[11px]">
                Telemetry Sync: {formatISTTime(lastRefreshed)}
              </span>
            </div>
          </div>
        )}

        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-sans">
                {isAuthority ? 'Authority Operations Hub' : 'Environmental Intelligence Grid'}
              </h1>
              {hasLiveCoverage ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {stations.length} Monitoring Stations
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-700 border border-slate-300">
                  Meteorological Telemetry Active
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Multi-zone ambient telemetry, contextual correlation, and forecasting for {currentRegion}.
            </p>
          </div>

          <div className="flex items-center space-x-2.5 flex-wrap">
            {/* Refresh Button */}
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
              title="Re-fetch latest telemetry"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-sky-600' : 'text-slate-500'}`} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>

            {/* Authority Add Zone Controls */}
            {isAuthority && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMapCoords(null);
                    setIsAddZoneModalOpen(true);
                  }}
                  className="inline-flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 rounded-xl text-xs font-bold shadow-2xs"
                  title="Manual coordinate entry"
                >
                  <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Add Zone Manually</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsMapSelectionMode(!isMapSelectionMode);
                    if (!isMapSelectionMode) {
                      setActionNotice({
                        type: 'success',
                        message: 'Map Selection Mode Active: Click any point on the Leaflet map to capture coordinates.',
                      });
                    }
                  }}
                  className={`inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold shadow-sm transition-all ${
                    isMapSelectionMode
                      ? 'bg-amber-600 text-white ring-2 ring-amber-400 animate-pulse'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                  title="Add zone by clicking on the map"
                >
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isMapSelectionMode ? 'Click Map Target...' : 'Add Zone by Map'}</span>
                </button>
              </>
            )}

            {/* Authority What-If Scenario Button */}
            {isAuthority && hasLiveCoverage && (
              <button
                type="button"
                onClick={() => setIsWhatIfOpen(true)}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                title="Run What-If Scenario simulation"
              >
                <FlaskConical className="w-3.5 h-3.5 text-purple-200" />
                <span>Run What-If Scenario</span>
              </button>
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
                {isAuthority ? 'Platform Alerts' : 'Active Advisories'}
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
                <span className="text-xs font-bold text-slate-400">—</span>
              )}
            </div>
          </div>
        </div>

        {/* Authority Tabs: Monitoring Zones vs Zone Requests vs Environmental Reports */}
        {isAuthority && (
          <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
            <button
              type="button"
              onClick={() => setAuthorityTab('zones')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                authorityTab === 'zones'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Monitoring Zones ({stations.length})
            </button>

            <button
              type="button"
              onClick={() => setAuthorityTab('requests')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                authorityTab === 'requests'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-sky-400" />
              <span>Zone Petitions ({zoneRequests.length})</span>
              {zoneRequests.filter((r) => r.status === 'Pending').length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-black">
                  {zoneRequests.filter((r) => r.status === 'Pending').length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setAuthorityTab('reports')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                authorityTab === 'reports'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5 text-amber-400" />
              <span>Environmental Reports ({citizenReports.length})</span>
              {citizenReports.filter((r) => r.status === 'Pending').length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-black">
                  {citizenReports.filter((r) => r.status === 'Pending').length}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Main Map and Station Cards Section (Active for Public or when 'zones' tab is selected) */}
        {(!isAuthority || authorityTab === 'zones') && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Map Column (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-lg text-slate-900">
                    Spatial Telemetry Map ({currentRegion})
                  </h2>
                  <span className="text-xs text-slate-500">
                    Interactive stations, active events, and requested coverage zones
                  </span>
                </div>
                <span className="text-xs text-slate-500 font-mono">
                  Updated: {formatISTTime(lastRefreshed)}
                </span>
              </div>

              <PollutionMap
                stations={stations}
                events={events}
                center={[regionMeta.latitude, regionMeta.longitude]}
                zoom={regionMeta.zoom}
                regionName={currentRegion}
                isSelectionMode={isMapSelectionMode}
                coords={selectedMapCoords}
                onMapClick={handleMapLocationSelect}
                zoneRequests={zoneRequests}
              />

              {/* Data Provenance & Scale Legend */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    PM2.5 Index Ranges (µg/m³)
                  </span>
                  <div className="flex items-center gap-2 text-[10px] font-bold">
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      LIVE OpenAQ / Open-Meteo
                    </span>
                    <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                      SIMULATION
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                      HISTORICAL CGWB
                    </span>
                  </div>
                </div>

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

            {/* Station Cards Column (5 cols) with Search Bar */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-lg text-slate-900">
                  Monitoring Zones ({filteredStations.length})
                </h2>
                <span className="text-xs text-slate-400 font-medium">Ranked by Risk Assessment</span>
              </div>

              {/* Search Monitoring Zones Bar */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search zones by name, city, area..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-sky-500 shadow-2xs font-medium"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {sortedStations.length > 0 ? (
                <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
                  {sortedStations.map((station) => (
                    <StationCard
                      key={station.id}
                      station={station}
                      isAuthority={isAuthority}
                      onRequestRemoveZone={handleRequestRemoveZone}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm text-center space-y-2">
                  <MapPin className="w-8 h-8 text-slate-300 mx-auto" />
                  <h3 className="font-bold text-slate-800 text-xs">
                    No monitoring zone found.
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Try searching for another locality or clear the search query.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Authority Zone Requests Review Table */}
        {isAuthority && authorityTab === 'requests' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-sky-600" />
                  Public Zone Coverage Requests — {currentRegion}
                </h2>
                <p className="text-xs text-slate-500">
                  Review public petitions with verified contact credentials and prioritize new monitoring stations.
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400">
                Total Requests: {zoneRequests.length}
              </span>
            </div>

            {zoneRequests.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No coverage petitions submitted for {currentRegion} yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px] bg-slate-50">
                      <th className="p-3">Ref ID</th>
                      <th className="p-3">Applicant &amp; Contact</th>
                      <th className="p-3">Area / Locality</th>
                      <th className="p-3">City &amp; Pincode</th>
                      <th className="p-3">Reason / Description</th>
                      <th className="p-3">Submitted</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {zoneRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-mono font-bold text-sky-700">
                          {req.reference_id || `ZR-${req.id}`}
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{req.applicant_name || 'Public Citizen'}</div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                            {req.email && <span>{req.email}</span>}
                            {req.phone && <span>{req.phone}</span>}
                          </div>
                        </td>
                        <td className="p-3 font-semibold text-slate-800">{req.area_locality}</td>
                        <td className="p-3 text-slate-600">
                          {req.city} {req.pincode ? `(${req.pincode})` : ''}
                        </td>
                        <td className="p-3 text-slate-600 max-w-xs truncate" title={req.reason || req.description}>
                          {req.reason || req.description || 'General monitoring petition'}
                        </td>
                        <td className="p-3 font-mono text-slate-400 text-[11px]">
                          {formatISTDateTime(req.created_at)}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                              req.status === 'Approved'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : req.status === 'Rejected'
                                ? 'bg-slate-100 text-slate-600 border-slate-200'
                                : req.status === 'Under Review'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-sky-50 text-sky-800 border-sky-200'
                            }`}
                          >
                            {req.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedRequestForReview(req)}
                            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors"
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Authority Citizen Reports Review Table */}
        {isAuthority && authorityTab === 'reports' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-amber-600" />
                  Public Environmental Incident Reports — {currentRegion}
                </h2>
                <p className="text-xs text-slate-500">
                  Citizen incident observations, discharge reports, and field pollution logs for {currentRegion}.
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400">
                Total Reports: {citizenReports.length}
              </span>
            </div>

            {citizenReports.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No incident reports logged for {currentRegion} yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px] bg-slate-50">
                      <th className="p-3">Ref ID</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Reporter &amp; Contact</th>
                      <th className="p-3">Area / Street</th>
                      <th className="p-3">Description</th>
                      <th className="p-3">Time</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {citizenReports.map((rep) => (
                      <tr key={rep.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-mono font-bold text-rose-700">
                          {rep.reference_id || `REP-${rep.id}`}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded font-bold uppercase text-[10px] bg-slate-100 text-slate-800 border border-slate-200">
                            {rep.category.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{rep.reporter_name || 'Public Citizen'}</div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                            {rep.email && <span>{rep.email}</span>}
                            {rep.phone && <span>{rep.phone}</span>}
                          </div>
                        </td>
                        <td className="p-3 font-semibold text-slate-900">
                          {rep.area_locality}, {rep.city}
                        </td>
                        <td className="p-3 text-slate-600 max-w-xs truncate" title={rep.description}>
                          {rep.description}
                        </td>
                        <td className="p-3 font-mono text-slate-400 text-[11px]">
                          {formatISTDateTime(rep.created_at)}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                              rep.status === 'Resolved'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : rep.status === 'Rejected'
                                ? 'bg-slate-100 text-slate-600 border-slate-200'
                                : rep.status === 'Under Review'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}
                          >
                            {rep.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedReportForReview(rep);
                              setReportNotesInput(rep.authority_notes || '');
                            }}
                            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors"
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Authority Zone Request Review Modal */}
        {selectedRequestForReview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
              <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-amber-400" />
                  <h3 className="font-bold text-sm">
                    Review Zone Petition — {selectedRequestForReview.reference_id || `ZR-${selectedRequestForReview.id}`}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedRequestForReview(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4 overflow-y-auto text-xs">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[10px] block">Applicant</span>
                      <span className="font-bold text-slate-900">{selectedRequestForReview.applicant_name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[10px] block">Contact</span>
                      <span className="text-slate-700">{selectedRequestForReview.email || selectedRequestForReview.phone || '—'}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[10px] block">Area / Locality</span>
                      <span className="font-bold text-slate-900">{selectedRequestForReview.area_locality}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[10px] block">State &amp; City</span>
                      <span className="text-slate-700">{selectedRequestForReview.city}, {selectedRequestForReview.region}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase text-[10px] block">Reason / Details</span>
                    <p className="text-slate-700 leading-relaxed mt-0.5">{selectedRequestForReview.reason || selectedRequestForReview.description || 'Public petition for sensor coverage.'}</p>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Optional Rejection Reason / Authority Remarks</label>
                  <textarea
                    rows={2}
                    placeholder="Provide reason if rejecting, or notes for deployment team..."
                    value={rejectionReasonInput}
                    onChange={(e) => setRejectionReasonInput(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleUpdateZoneRequestStatus(selectedRequestForReview.id, 'Rejected', rejectionReasonInput)}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                  >
                    Reject Petition
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateZoneRequestStatus(selectedRequestForReview.id, 'Under Review', rejectionReasonInput)}
                    className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl font-bold"
                  >
                    Mark Under Review
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCreateZoneFromRequest(selectedRequestForReview.id)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve &amp; Create Zone</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Authority Report Review Modal */}
        {selectedReportForReview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
              <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-amber-400" />
                  <h3 className="font-bold text-sm">
                    Review Incident Report — {selectedReportForReview.reference_id || `REP-${selectedReportForReview.id}`}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedReportForReview(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4 overflow-y-auto text-xs">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[10px] block">Reporter</span>
                      <span className="font-bold text-slate-900">{selectedReportForReview.reporter_name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[10px] block">Category</span>
                      <span className="font-bold text-rose-700 uppercase">{selectedReportForReview.category.replace('_', ' ')}</span>
                    </div>
                  </div>
                  <div className="pt-1 border-t border-slate-100">
                    <span className="text-slate-400 font-bold uppercase text-[10px] block">Location</span>
                    <span className="font-bold text-slate-900">{selectedReportForReview.area_locality}, {selectedReportForReview.city}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase text-[10px] block">Description</span>
                    <p className="text-slate-700 leading-relaxed mt-0.5">{selectedReportForReview.description}</p>
                  </div>
                  {selectedReportForReview.photo_url && (
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[10px] block">Attached Photo URL</span>
                      <a href={selectedReportForReview.photo_url} target="_blank" rel="noopener noreferrer" className="text-sky-600 underline truncate block">
                        {selectedReportForReview.photo_url}
                      </a>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Authority Notes / Inspection Remarks</label>
                  <textarea
                    rows={2}
                    placeholder="Enter dispatch notes, resolution summary, or rejection remarks..."
                    value={reportNotesInput}
                    onChange={(e) => setReportNotesInput(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleUpdateReportStatus(selectedReportForReview.id, 'Rejected', reportNotesInput)}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                  >
                    Reject Report
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateReportStatus(selectedReportForReview.id, 'Under Review', reportNotesInput)}
                    className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl font-bold"
                  >
                    Set Under Review
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateReportStatus(selectedReportForReview.id, 'Resolved', reportNotesInput)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Mark as Resolved</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Authority Add Zone Modal (Option A Manual or Option B Map Click) */}
        <AddZoneMapModal
          isOpen={isAddZoneModalOpen}
          onClose={() => {
            setIsAddZoneModalOpen(false);
            setSelectedMapCoords(null);
          }}
          coords={selectedMapCoords}
          currentRegion={currentRegion}
          onZoneCreated={(newStation) => {
            setStations((prev) => [...prev, newStation]);
            setActionNotice({
              type: 'success',
              message: `New Zone "${newStation.name}" successfully established in ${currentRegion}!`,
            });
            setTimeout(() => setActionNotice(null), 4000);
          }}
        />

        {/* Authority Remove Zone Modal */}
        <RemoveZoneModal
          isOpen={isRemoveZoneOpen}
          zone={zoneToRemove}
          onClose={() => {
            if (!removeZoneLoading) {
              setIsRemoveZoneOpen(false);
              setZoneToRemove(null);
            }
          }}
          onConfirm={handleConfirmRemoveZone}
          isSubmitting={removeZoneLoading}
        />

        {/* What-If Scenario Modal */}
        <WhatIfScenarioModal
          isOpen={isWhatIfOpen}
          onClose={() => setIsWhatIfOpen(false)}
          stations={stations}
          onScenarioCompleted={fetchData}
        />

        {/* Public Report Issue Modal */}
        <PublicReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          currentRegion={currentRegion}
          onReportSubmitted={() => {
            setActionNotice({
              type: 'success',
              message: 'Your incident report has been submitted for authority review.',
            });
            setTimeout(() => setActionNotice(null), 4000);
          }}
        />

        {/* Public Zone Request Modal */}
        <PublicZoneRequestModal
          isOpen={isZoneRequestModalOpen}
          onClose={() => setIsZoneRequestModalOpen(false)}
          currentRegion={currentRegion}
          onRequestSubmitted={() => {
            setActionNotice({
              type: 'success',
              message: 'Your zone coverage request has been recorded for authority review.',
            });
            setTimeout(() => setActionNotice(null), 4000);
          }}
        />

        {/* Explainable Alert Modal */}
        <ExplainableAlertModal
          alert={selectedAlertForExplanation}
          isOpen={!!selectedAlertForExplanation}
          onClose={() => setSelectedAlertForExplanation(null)}
        />
      </main>
    </div>
  );
}
