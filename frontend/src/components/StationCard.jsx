import React from 'react';
import { Link } from 'react-router-dom';
import { getAqiMeta, getRiskBadgeClasses } from '../utils/aqi';
import { formatISTTime } from '../utils/dateTime';
import { AlertCircle, ArrowUpRight, CheckCircle2, Trash2, MapPin, Radio } from 'lucide-react';

export default function StationCard({ station, isAuthority = false, onRequestRemoveZone }) {
  const aqiMeta = getAqiMeta(station.current_pm25);

  const handleRemoveClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onRequestRemoveZone) {
      onRequestRemoveZone(station);
    }
  };

  return (
    <div
      className={`block p-4 rounded-xl border bg-white shadow-xs hover:shadow-md transition-all duration-200 relative overflow-hidden group ${
        station.is_anomaly
          ? 'border-rose-300 ring-1 ring-rose-200/70 bg-gradient-to-br from-white to-rose-50/20'
          : 'border-slate-200/90 hover:border-slate-300'
      }`}
    >
      {/* Category color accent bar */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ backgroundColor: aqiMeta.color }}
      />

      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            <Link
              to={`/station/${station.id}`}
              className="font-bold text-sm sm:text-base text-slate-900 group-hover:text-sky-600 transition-colors truncate"
              title={station.name}
            >
              {station.name.toUpperCase()}
            </Link>
            <span
              className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider border ${getRiskBadgeClasses(
                station.risk_level
              )}`}
            >
              {station.risk_level}
            </span>
          </div>

          <div className="flex items-center text-xs text-slate-500 mt-0.5 space-x-1.5 truncate">
            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="truncate">
              {station.region || 'Delhi'} • {station.zone_profile}
            </span>
          </div>
        </div>

        {/* Actions row: View Details and Authority Remove Zone */}
        <div className="flex items-center space-x-1 shrink-0">
          {/* Authority Remove Zone Button - strictly hidden from citizens */}
          {isAuthority && (
            <button
              type="button"
              onClick={handleRemoveClick}
              title={`Remove ${station.name} from monitoring grid`}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200"
              aria-label={`Remove zone ${station.name}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          <Link
            to={`/station/${station.id}`}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="Inspect Station Intelligence"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Main Metric Row: PM2.5 and Operational Anomaly Status */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-end justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
            Current PM2.5
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">
              {station.current_pm25}
            </span>
            <span className="text-xs font-semibold text-slate-500">µg/m³</span>
          </div>
          <div className="flex items-center space-x-1.5 mt-1">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: aqiMeta.color }}
            />
            <span className="text-xs font-bold" style={{ color: aqiMeta.color }}>
              {aqiMeta.category}
            </span>
          </div>
        </div>

        {/* Operational Status (Baseline removed per PART 9) */}
        <div className="text-right flex flex-col items-end">
          {station.is_anomaly ? (
            <div className="bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1 text-right">
              <span className="text-[10px] font-bold text-rose-700 flex items-center space-x-1 justify-end uppercase tracking-wider">
                <AlertCircle className="w-3 h-3 text-rose-600" />
                <span>ANOMALY DETECTED</span>
              </span>
              <span className="text-[9px] text-rose-600/90 font-medium block mt-0.5">
                Elevated Environmental Signal
              </span>
            </div>
          ) : (
            <div className="text-right bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1">
              <span className="text-[10px] text-emerald-700 font-bold flex items-center space-x-1 justify-end uppercase tracking-wider">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>NOMINAL PATTERN</span>
              </span>
              <span className="text-[9px] text-slate-500 block mt-0.5">
                Expected Ambient Range
              </span>
            </div>
          )}

          {station.last_updated && (
            <span className="text-[10px] text-slate-400 font-mono mt-1.5 flex items-center space-x-1">
              <Radio className="w-2.5 h-2.5 text-slate-400" />
              <span>{formatISTTime(station.last_updated)}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
