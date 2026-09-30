import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import AlertBanner from '../components/AlertBanner';
import PollutionMap from '../components/PollutionMap';
import StationCard from '../components/StationCard';
import SimulateSpikeButton from '../components/SimulateSpikeButton';
import { AQI_CATEGORIES } from '../utils/aqi';
import {
  Activity,
  AlertTriangle,
  Bell,
  MapPin,
  RefreshCw,
  Flame,
  ShieldAlert,
} from 'lucide-react';

export default function Dashboard() {
  const [stations, setStations] = useState([]);
  const [events, setEvents] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const fetchData = useCallback(async () => {
    try {
      const [stData, evData, alData] = await Promise.all([
        api.getStations(),
        api.getEvents('all'),
        api.getAlerts(true),
      ]);
      setStations(stData);
      setEvents(evData);
      setAlerts(alData);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchData();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchData]);

  // Derived metrics
  const activeAnomaliesCount = stations.filter((s) => s.is_anomaly).length;
  const activeAlertsCount = alerts.filter((a) => a.is_active).length;

  // Highest PM2.5 station
  const highestStation = stations.reduce(
    (max, s) => (s.current_pm25 > (max?.current_pm25 || 0) ? s : max),
    null
  );

  // Sort stations: worst risk / anomaly first
  const sortedStations = [...stations].sort((a, b) => {
    const riskOrder = { CRITICAL: 4, WARNING: 3, WATCH: 2, NORMAL: 1 };
    const rA = riskOrder[a.risk_level] || 0;
    const rB = riskOrder[b.risk_level] || 0;
    if (rA !== rB) return rB - rA;
    return b.current_pm25 - a.current_pm25;
  });

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Top Alert Banner */}
      <AlertBanner alerts={alerts} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-sans">
              City Environmental Command Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Real-time anomaly detection, multi-source context fusion, and predictive risk forecasting.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={fetchData}
              title="Refresh now"
              className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 shadow-sm transition-all"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <SimulateSpikeButton stations={stations} onDataUpdated={fetchData} />
          </div>
        </div>

        {/* Summary Metric Cards Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Stations */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-sky-50 text-sky-600 rounded-xl">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Active Stations
              </span>
              <span className="text-2xl font-black text-slate-900 font-mono">
                {stations.length} Zones
              </span>
            </div>
          </div>

          {/* Active Anomalies */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className={`p-3 rounded-xl ${activeAnomaliesCount > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-500'}`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Active Anomalies
              </span>
              <div className="flex items-baseline space-x-1.5">
                <span className={`text-2xl font-black font-mono ${activeAnomaliesCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                  {activeAnomaliesCount}
                </span>
                <span className="text-xs text-slate-500 font-medium">flagged</span>
              </div>
            </div>
          </div>

          {/* Active Alerts */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className={`p-3 rounded-xl ${activeAlertsCount > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-500'}`}>
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Active Warnings
              </span>
              <div className="flex items-baseline space-x-1.5">
                <span className={`text-2xl font-black font-mono ${activeAlertsCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                  {activeAlertsCount}
                </span>
                <span className="text-xs text-slate-500 font-medium">issued</span>
              </div>
            </div>
          </div>

          {/* Highest PM2.5 */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-red-50 text-red-600 rounded-xl">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Highest PM2.5
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
                <span className="text-sm font-bold text-slate-400">—</span>
              )}
            </div>
          </div>
        </div>

        {/* Map and Stations Grid Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Map Column (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg text-slate-900">
                Spatial Fusion Map (Delhi Metropolitan)
              </h2>
              <span className="text-xs text-slate-500">
                Auto-refreshed: {lastRefreshed.toLocaleTimeString()}
              </span>
            </div>

            <PollutionMap
              stations={stations}
              events={events}
              center={[28.6139, 77.2090]}
              zoom={11}
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
                Monitoring Stations ({stations.length})
              </h2>
              <span className="text-xs text-slate-400 font-medium">Sorted by risk level</span>
            </div>

            <div className="space-y-3 max-h-[660px] overflow-y-auto pr-1">
              {sortedStations.map((station) => (
                <StationCard key={station.id} station={station} />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
