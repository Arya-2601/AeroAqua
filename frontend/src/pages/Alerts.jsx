import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getRiskBadgeClasses } from '../utils/aqi';
import { formatISTDateTime } from '../utils/dateTime';
import {
  Bell,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Radio,
  StopCircle,
  CheckCircle,
  Shield,
  Eye,
  Megaphone,
} from 'lucide-react';

export default function Alerts() {
  const { isAuthority, isCitizen, currentRegion } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [statusFeedback, setStatusFeedback] = useState(null);

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
      // Immediately update UI: mark as resolved and remove from active broadcast
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
      // If showing active only, refresh list to exclude resolved alert
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

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center space-x-2">
              <span className={`p-2 rounded-xl ${isAuthority ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                {isAuthority ? <Megaphone className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {isAuthority ? 'Authority Broadcast Command' : 'Official Public Advisories'}
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {isAuthority
                ? 'Review detected environmental risks, broadcast advisories to citizens, or revoke/resolve alerts.'
                : `Active emergency notices and environmental warnings issued for ${currentRegion}.`}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {isAuthority && (
              <button
                onClick={() => setShowActiveOnly(!showActiveOnly)}
                className="text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              >
                {showActiveOnly ? 'Show All History' : 'Show Active Only'}
              </button>
            )}
            <button
              onClick={fetchAlerts}
              className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100 shadow-sm"
              title="Refresh alerts"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {statusFeedback && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between border ${
              statusFeedback.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            <span>{typeof statusFeedback === 'string' ? statusFeedback : statusFeedback.text}</span>
            <button
              onClick={() => setStatusFeedback(null)}
              className="text-slate-500 hover:text-slate-900 font-bold ml-2"
            >
              &times;
            </button>
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-2xl p-12 text-center text-slate-500 border border-slate-200">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-600" />
            <span className="text-sm font-medium">Loading alerts &amp; broadcasts...</span>
          </div>
        ) : alerts.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
            <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="font-bold text-slate-800 text-lg">No Active Warnings</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              {isAuthority
                ? `No active alerts for ${currentRegion}. All monitored parameters operating within normal thresholds.`
                : `No active emergency broadcasts for ${currentRegion}. Environmental parameters are within municipal limits.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => {
              const isBroadcasting = alert.is_broadcast || alert.status === 'BROADCAST';
              const isResolved = alert.status === 'RESOLVED' || !alert.is_active;

              return (
                <div
                  key={alert.id}
                  className={`bg-white rounded-2xl p-5 border shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isBroadcasting ? 'border-amber-300 ring-2 ring-amber-100' : 'border-slate-200'
                  }`}
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${getRiskBadgeClasses(
                          alert.risk_level
                        )}`}
                      >
                        {alert.risk_level}
                      </span>

                      {/* Broadcast status badge */}
                      {isBroadcasting ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 animate-pulse">
                          <Radio className="w-3 h-3 text-rose-600" />
                          BROADCAST ACTIVE
                        </span>
                      ) : isResolved ? (
                        <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          RESOLVED
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700">
                          PENDING BROADCAST
                        </span>
                      )}

                      <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {alert.station_name}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {formatISTDateTime(alert.created_at)}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-base">{alert.title}</h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {alert.message}
                    </p>
                  </div>

                  <div className="shrink-0 flex flex-col sm:flex-row items-end sm:items-center gap-4 border-t md:border-t-0 pt-3 md:pt-0">
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">
                        PM2.5 Trigger
                      </span>
                      <span className="text-xl font-black font-mono text-slate-900">
                        {alert.current_pm25 !== null && alert.current_pm25 !== undefined ? `${alert.current_pm25} µg/m³` : '—'}
                      </span>
                    </div>

                    {/* Authority Controls */}
                    {isAuthority && (
                      <div className="flex items-center gap-2">
                        {isResolved ? (
                          <>
                            <span className="px-3 py-1.5 bg-slate-100 text-slate-500 border border-slate-200 rounded-xl text-xs font-bold">
                              Resolved
                            </span>
                            <button
                              type="button"
                              disabled
                              title="Resolved alerts cannot be broadcast. Create or activate a new alert if a new public warning is required."
                              className="px-3 py-1.5 bg-slate-50 text-slate-400 border border-slate-200 rounded-xl text-xs font-bold cursor-not-allowed"
                            >
                              Broadcast Disabled
                            </button>
                          </>
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
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all disabled:opacity-50"
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
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Resolve</span>
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    {alert.station_id && (
                      <Link
                        to={`/station/${alert.station_id}`}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
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
    </div>
  );
}
