import React from 'react';
import { Link } from 'react-router-dom';
import { getAqiMeta, getRiskBadgeClasses } from '../utils/aqi';
import { AlertCircle, ArrowUpRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function StationCard({ station }) {
  const aqiMeta = getAqiMeta(station.current_pm25);

  return (
    <Link
      to={`/station/${station.id}`}
      className={`block p-4 rounded-xl border bg-white shadow-sm hover:shadow-md transition-all duration-200 transform hover:-translate-y-0.5 relative overflow-hidden group ${
        station.is_anomaly ? 'border-rose-400/80 ring-1 ring-rose-300' : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      {/* Top category highlight bar */}
      <div
        className="absolute top-0 left-0 right-0 h-1.5"
        style={{ backgroundColor: aqiMeta.color }}
      />

      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="font-bold text-slate-900 group-hover:text-sky-600 transition-colors">
              {station.name}
            </h3>
            <span
              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${getRiskBadgeClasses(
                station.risk_level
              )}`}
            >
              {station.risk_level}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{station.zone_profile}</p>
        </div>

        <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-2xl font-black text-slate-900 font-mono">
              {station.current_pm25}
            </span>
            <span className="text-xs font-semibold text-slate-500">µg/m³</span>
          </div>
          <div className="flex items-center space-x-1.5 mt-1">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: aqiMeta.color }}
            />
            <span className="text-xs font-bold" style={{ color: aqiMeta.color }}>
              {aqiMeta.category}
            </span>
          </div>
        </div>

        {/* Anomaly Badge or Status */}
        <div className="text-right">
          {station.is_anomaly ? (
            <div className="bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1 text-right">
              <span className="text-[11px] font-bold text-rose-700 flex items-center space-x-1 justify-end">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>ANOMALY</span>
              </span>
              <span className="text-[10px] text-rose-600 font-medium">
                +{station.deviation_pct}% vs baseline
              </span>
            </div>
          ) : (
            <div className="text-right">
              <span className="text-xs text-slate-400 font-medium">Within baseline</span>
              <div className="text-[10px] text-slate-400">Stable pattern</div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
