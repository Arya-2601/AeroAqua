import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import AnomalyPanel from '../components/AnomalyPanel';
import ContextPanel from '../components/ContextPanel';
import ForecastChart from '../components/ForecastChart';
import HistoryChart from '../components/HistoryChart';
import { getAqiMeta, getRiskBadgeClasses } from '../utils/aqi';
import { formatISTTime, formatISTDateTime } from '../utils/dateTime';
import {
  ArrowLeft,
  AlertTriangle,
  Wind,
  Car,
  Compass,
  Building,
  RefreshCw,
  Bell,
  Thermometer,
  Droplets,
  Database,
  MapPin,
} from 'lucide-react';

export default function StationDetail() {
  const { id } = useParams();
  const stationId = Number(id);

  const [station, setStation] = useState(null);
  const [readings, setReadings] = useState([]);
  const [context, setContext] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshNotice, setRefreshNotice] = useState(null);

  const loadStationData = async () => {
    try {
      const [stData, rdData, ctxData, fcData, alData] = await Promise.all([
        api.getStation(stationId),
        api.getStationReadings(stationId, 48),
        api.getStationContext(stationId),
        api.getStationForecast(stationId),
        api.getAlerts(true),
      ]);
      setStation(stData);
      setReadings(rdData.readings || []);
      setContext(ctxData);
      setForecast(fcData);
      setAlerts(alData.filter((a) => a.station_id === stationId && a.is_active));
    } catch (err) {
      console.error('Error loading station detail:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshStation = async () => {
    setRefreshing(true);
    setRefreshNotice(null);
    try {
      const liveRes = await api.refreshStation(stationId);
      setRefreshNotice(liveRes.message || 'Telemetry updated from live Open-Meteo and OpenAQ APIs.');
      await loadStationData();
      setTimeout(() => setRefreshNotice(null), 4000);
    } catch (err) {
      console.error('Error refreshing station live:', err);
      await loadStationData();
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStationData();
  }, [stationId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">
        <div className="flex items-center space-x-2 text-sm font-semibold">
          <RefreshCw className="w-5 h-5 animate-spin text-sky-600" />
          <span>Loading station environmental intelligence...</span>
        </div>
      </div>
    );
  }

  if (!station) {
    return (
      <div className="min-h-screen p-8 text-center bg-slate-50">
        <h2 className="text-xl font-bold text-slate-800">Station Not Found</h2>
        <Link to="/" className="text-sky-600 text-sm font-semibold mt-4 inline-block">
          &larr; Return to Dashboard
        </Link>
      </div>
    );
  }

  const aqiMeta = getAqiMeta(station.current_pm25);
  const activeAlert = alerts.length > 0 ? alerts[0] : null;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Refresh Notice Banner */}
        {refreshNotice && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-between animate-in fade-in">
            <span>{refreshNotice}</span>
            <button onClick={() => setRefreshNotice(null)} className="text-emerald-600 hover:text-emerald-900">&times;</button>
          </div>
        )}

        {/* Back Link & Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 flex-wrap gap-3">
          <Link
            to="/"
            className="inline-flex items-center space-x-2 text-sm font-semibold text-slate-600 hover:text-slate-900 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-sm transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>

          <button
            onClick={handleRefreshStation}
            disabled={refreshing}
            className="inline-flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 shadow-sm disabled:opacity-50"
            title="Fetch live observations from OpenAQ v3 and Open-Meteo"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
            <span>{refreshing ? 'Updating from APIs...' : 'Refresh Station'}</span>
          </button>
        </div>

        {/* Station Hero Bar */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center space-x-3 mb-1 flex-wrap gap-y-1">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                {station.name}
              </h1>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${getRiskBadgeClasses(
                  station.risk_level
                )}`}
              >
                {station.risk_level} RISK
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                {station.data_source || 'Regional Monitoring Data'}
              </span>
            </div>
            <p className="text-sm text-slate-500">
              Region: <strong className="text-slate-800">{station.region || 'Delhi'}</strong> • Zone Profile: <strong className="text-slate-700">{station.zone_profile}</strong> •
              Coordinates: {station.latitude}, {station.longitude}
            </p>
          </div>

          <div className="flex items-center space-x-6 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Latest Reading
              </span>
              <div className="flex items-baseline space-x-1.5">
                <span className="text-4xl font-black font-mono text-slate-900">
                  {station.current_pm25}
                </span>
                <span className="text-xs text-slate-500 font-semibold">µg/m³</span>
              </div>
              <div className="flex items-center space-x-1.5 mt-1">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: aqiMeta.color }}
                />
                <span className="text-xs font-bold" style={{ color: aqiMeta.color }}>
                  {aqiMeta.category}
                </span>
              </div>
            </div>

            {/* Quick Weather Signals */}
            {station.latest_weather && (
              <div className="hidden sm:block text-xs text-slate-500 space-y-1 font-mono border-l border-slate-100 pl-4">
                <div className="flex items-center space-x-1">
                  <Thermometer className="w-3.5 h-3.5 text-slate-400" />
                  <span>{station.latest_weather.temperature}°C</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Wind className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {station.latest_weather.wind_speed} m/s ({station.latest_weather.wind_direction}°)
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <Car className="w-3.5 h-3.5 text-slate-400" />
                  <span>Traffic: {station.latest_traffic?.traffic_index || 50}/100</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Early-Warning Alert Box if Active */}
        {activeAlert && (
          <div className="p-4 rounded-xl bg-white border-l-4 border-rose-600 border-y border-r border-slate-200 shadow-sm flex items-start space-x-3">
            <span className="p-2 bg-rose-50 rounded-xl text-rose-600 shrink-0 mt-0.5">
              <Bell className="w-5 h-5 text-rose-600" />
            </span>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                  ACTIVE EARLY WARNING
                </span>
                <span className="text-xs font-semibold text-slate-500 font-mono">
                  {formatISTTime(activeAlert.created_at)}
                </span>
              </div>
              <h4 className="font-bold text-slate-900 text-base">{activeAlert.title}</h4>
              <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                {activeAlert.message}
              </p>
            </div>
          </div>
        )}

        {/* 1. Anomaly Panel */}
        <AnomalyPanel
          anomaly={context?.anomaly}
          currentPm25={station.current_pm25}
        />

        {/* 2. 48-Hour History Chart with Baseline Band */}
        <HistoryChart readings={readings} hours={48} />

        {/* 3. Predictive Forecast Chart */}
        <ForecastChart forecastData={forecast} />

        {/* 4. Context Correlation Panel */}
        <ContextPanel context={context} />
      </div>
    </div>
  );
}
