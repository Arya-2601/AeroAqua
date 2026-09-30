import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { getRiskBadgeClasses } from '../utils/aqi';
import { Bell, AlertTriangle, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const data = await api.getAlerts(showActiveOnly);
      setAlerts(data);
    } catch (err) {
      console.error('Error fetching alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [showActiveOnly]);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                <Bell className="w-5 h-5" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Early-Warning Risk Alerts
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Automated notifications generated when stations exceed threshold risk criteria.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowActiveOnly(!showActiveOnly)}
              className="text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            >
              {showActiveOnly ? 'Show All History' : 'Show Active Only'}
            </button>
            <button
              onClick={fetchAlerts}
              className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 shadow-sm"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl p-12 text-center text-slate-500 border border-slate-200">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-600" />
            <span className="text-sm font-medium">Loading alerts...</span>
          </div>
        ) : alerts.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
            <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="font-bold text-slate-800 text-lg">No Active Warnings</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              All stations are currently operating within acceptable variance of their historical baselines.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center space-x-2.5">
                    <span
                      className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${getRiskBadgeClasses(
                        alert.risk_level
                      )}`}
                    >
                      {alert.risk_level}
                    </span>
                    <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      {alert.station_name}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(alert.created_at).toLocaleString()}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-base">{alert.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {alert.message}
                  </p>
                </div>

                <div className="shrink-0 flex items-center space-x-4 border-t md:border-t-0 pt-3 md:pt-0">
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Trigger PM2.5
                    </span>
                    <span className="text-xl font-black font-mono text-slate-900">
                      {alert.current_pm25} µg/m³
                    </span>
                  </div>

                  <Link
                    to={`/station/${alert.station_id}`}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                  >
                    <span>View Station</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
