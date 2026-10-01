import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getRiskBadgeClasses } from '../utils/aqi';
import { formatISTDateTime } from '../utils/dateTime';
import ExplainableAlertModal from '../components/ExplainableAlertModal';
import {
  Bell,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Radio,
  StopCircle,
  CheckCircle2,
  Shield,
  Eye,
  Megaphone,
  MapPin,
  Clock,
  TrendingUp,
  X,
  HelpCircle,
  Sparkles,
} from 'lucide-react';

export default function Alerts() {
  const { isAuthority, isCitizen, currentRegion } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [statusFeedback, setStatusFeedback] = useState(null);
  const [selectedAlertForExplanation, setSelectedAlertForExplanation] = useState(null);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      if (isAuthority) {
        // Authority sees alerts in platform for their region (or active)
        const data = await api.getAlerts(showActiveOnly, currentRegion);
        setAlerts(data);
      } else {
        // Citizen sees official broadcast alerts strictly for their region
        const data = await api.getBroadcastAlerts(currentRegion);
        setAlerts(data);
      }
    } catch (err) {
      console.error('Error fetching alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [showActiveOnly, isAuthority, currentRegion]);

  const handleBroadcast = async (alertId) => {
    const target = alerts.find((a) => a.id === alertId);
    if (target && (target.status === 'RESOLVED' || !target.is_active)) {
      setStatusFeedback({
        type: 'error',
        text: 'Resolved alerts cannot be broadcast. Create or activate a new alert if a new public warning is required.',
      });
      return;
    }

    setActionLoadingId(alertId);
    try {
      const res = await api.broadcastAlert(alertId);
      setStatusFeedback({
        type: 'success',
        text: `Alert #${alertId} successfully broadcast to public citizen advisories.`,
      });
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === alertId ? { ...a, is_broadcast: true, status: 'BROADCASTED' } : a
        )
      );
      await fetchAlerts();
    } catch (err) {
      console.error('Failed to broadcast alert', err);
      const detail =
        err.response?.data?.detail ||
        'Broadcast failed. Ensure you are authenticated with authority privileges.';
      setStatusFeedback({ type: 'error', text: detail });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleStopBroadcast = async (alertId) => {
    setActionLoadingId(alertId);
    try {
      const res = await api.stopBroadcastAlert(alertId);
      setStatusFeedback({
        type: 'success',
        text: `Broadcast stopped for Alert #${alertId}. Revoked from citizen feeds.`,
      });
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === alertId ? { ...a, is_broadcast: false, status: 'BROADCAST_STOPPED' } : a
        )
      );
      await fetchAlerts();
    } catch (err) {
      console.error('Failed to stop broadcast', err);
      const detail = err.response?.data?.detail || 'Action failed.';
      setStatusFeedback({ type: 'error', text: detail });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleResolve = async (alertId) => {
    if (!window.confirm('Mark this environmental alert as resolved?')) return;
    setActionLoadingId(alertId);
    try {
      const res = await api.resolveAlert(alertId);
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === alertId
            ? { ...a, status: 'RESOLVED', is_active: false, is_broadcast: false }
            : a
        )
      );
      setStatusFeedback({
        type: 'success',
        text: `Alert #${alertId} marked as RESOLVED. Broadcast terminated.`,
      });
      if (showActiveOnly) {
        setTimeout(fetchAlerts, 600);
      }
    } catch (err) {
      console.error('Failed to resolve alert', err);
      const detail = err.response?.data?.detail || 'Failed to resolve alert.';
      setStatusFeedback({ type: 'error', text: detail });
    } finally {
      setActionLoadingId(null);
    }
  };

  const getAlertSeverityBorder = (riskLevel) => {
    switch ((riskLevel || '').toUpperCase()) {
      case 'CRITICAL':
        return 'border-l-4 border-l-rose-500';
      case 'WARNING':
        return 'border-l-4 border-l-amber-500';
      case 'WATCH':
      case 'INFORMATION':
      case 'INFO':
        return 'border-l-4 border-l-sky-500';
      default:
        return 'border-l-4 border-l-slate-400';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center space-x-2">
              <span className={`p-2 rounded-xl border ${
                isAuthority
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-sky-50 text-sky-800 border-sky-200'
              }`}>
                {isAuthority ? <Megaphone className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-sans">
                {isAuthority ? 'Authority Broadcast Command' : 'Official Public Advisories'}
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {isAuthority
                ? `Operational risk assessment and emergency broadcast console for ${currentRegion}.`
                : `Official municipal notices and public health advisories issued for ${currentRegion}.`}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {isAuthority && (
              <button
                type="button"
                onClick={() => setShowActiveOnly(!showActiveOnly)}
                className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
              >
                {showActiveOnly ? 'Show Full History' : 'Show Active Only'}
              </button>
            )}
            <button
              type="button"
              onClick={fetchAlerts}
              className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 shadow-2xs transition-colors"
              title="Refresh alerts"
              aria-label="Refresh alerts list"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-sky-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Feedback Banner */}
        {statusFeedback && (
          <div
            className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between border shadow-2xs animate-in fade-in duration-150 ${
              statusFeedback.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            <span>{typeof statusFeedback === 'string' ? statusFeedback : statusFeedback.text}</span>
            <button
              onClick={() => setStatusFeedback(null)}
              className="text-slate-400 hover:text-slate-700 ml-2"
              aria-label="Dismiss message"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-2xl p-12 text-center text-slate-500 border border-slate-200 shadow-2xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-600" />
            <span className="text-sm font-medium">Loading alerts and public advisories...</span>
          </div>
        ) : alerts.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-2xs">
            <ShieldCheck className="w-12 h-12 text-emerald-600 mx-auto mb-3 stroke-[1.8]" />
            <h3 className="font-bold text-slate-800 text-base">No Active Alerts</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              No active environmental alerts are currently detected in this region. All monitored stations are operating within safe baseline parameters.
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {alerts.map((alert) => {
              const isBroadcasting = alert.is_broadcast || alert.status === 'BROADCASTED';
              const isResolved = alert.status === 'RESOLVED' || !alert.is_active;
              const provenance = alert.provenance || (alert.title?.includes('SIMULATION') ? 'SIMULATION' : 'LIVE');

              return (
                <div
                  key={alert.id}
                  className={`bg-white rounded-2xl p-5 border shadow-2xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${getAlertSeverityBorder(
                    alert.risk_level
                  )} ${isBroadcasting ? 'ring-1 ring-amber-300' : 'border-slate-200'}`}
                >
                  <div className="space-y-2.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${getRiskBadgeClasses(
                          alert.risk_level
                        )}`}
                      >
                        {alert.risk_level}
                      </span>

                      {/* Data Provenance Badge */}
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                          provenance === 'LIVE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : provenance === 'SIMULATION'
                            ? 'bg-purple-50 text-purple-700 border-purple-300'
                            : 'bg-slate-100 text-slate-600 border-slate-300'
                        }`}
                      >
                        {provenance}
                      </span>

                      {/* Broadcast status badge */}
                      {isBroadcasting ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                          <Radio className="w-3 h-3 text-rose-600" />
                          BROADCAST ACTIVE
                        </span>
                      ) : isResolved ? (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                          RESOLVED
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          PENDING BROADCAST
                        </span>
                      )}

                      <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {alert.region} • {alert.station_name}
                      </span>
                      <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{formatISTDateTime(alert.created_at)}</span>
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-base leading-snug">{alert.title}</h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {alert.message}
                    </p>

                    <div className="flex items-center flex-wrap gap-2 pt-1">
                      {/* Explainable Alert Trigger Button */}
                      <button
                        type="button"
                        onClick={() => setSelectedAlertForExplanation(alert)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-lg text-xs font-bold transition-colors"
                      >
                        <HelpCircle className="w-3.5 h-3.5 text-sky-600" />
                        <span>Why am I seeing this alert?</span>
                      </button>

                      {/* Forecast details if present */}
                      {alert.forecast_pm25_6h !== null && alert.forecast_pm25_6h !== undefined && (
                        <div className="inline-flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                          <TrendingUp className="w-3.5 h-3.5 text-sky-600" />
                          <span>Forecast (+6h): <strong className="font-mono text-slate-800">{alert.forecast_pm25_6h} µg/m³</strong></span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 flex flex-col sm:flex-row items-end sm:items-center gap-4 border-t md:border-t-0 pt-3 md:pt-0">
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                        Current PM2.5
                      </span>
                      <span className="text-xl font-black font-mono text-slate-900">
                        {alert.current_pm25 !== null && alert.current_pm25 !== undefined ? `${alert.current_pm25} µg/m³` : '—'}
                      </span>
                    </div>

                    {/* Authority Controls */}
                    {isAuthority && (
                      <div className="flex items-center gap-2">
                        {isResolved ? (
                          <span className="px-3 py-1.5 bg-slate-100 text-slate-500 border border-slate-200 rounded-xl text-xs font-bold">
                            Resolved
                          </span>
                        ) : (
                          <>
                            {isBroadcasting ? (
                              <button
                                type="button"
                                disabled={actionLoadingId === alert.id}
                                onClick={() => handleStopBroadcast(alert.id)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                              >
                                <StopCircle className="w-3.5 h-3.5" />
                                <span>Stop Broadcast</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={actionLoadingId === alert.id}
                                onClick={() => handleBroadcast(alert.id)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all disabled:opacity-50"
                              >
                                <Radio className="w-3.5 h-3.5" />
                                <span>Broadcast</span>
                              </button>
                            )}

                            <button
                              type="button"
                              disabled={actionLoadingId === alert.id}
                              onClick={() => handleResolve(alert.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Resolve</span>
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    {alert.station_id && (
                      <Link
                        to={`/station/${alert.station_id}`}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all"
                        title="View Station Details"
                      >
                        <span>Station</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Explainable Alert Modal */}
      <ExplainableAlertModal
        alert={selectedAlertForExplanation}
        isOpen={!!selectedAlertForExplanation}
        onClose={() => setSelectedAlertForExplanation(null)}
      />
    </div>
  );
}
