import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, AlertOctagon, ChevronRight } from 'lucide-react';

export default function AlertBanner({ alerts = [] }) {
  // Find highest severity active alert (CRITICAL or WARNING)
  const highAlerts = alerts.filter(
    (a) => a.is_active && (a.risk_level === 'CRITICAL' || a.risk_level === 'WARNING')
  );

  if (highAlerts.length === 0) return null;

  const topAlert = highAlerts[0];
  const isCritical = topAlert.risk_level === 'CRITICAL';

  return (
    <div
      className={`border-b transition-all duration-300 ${
        isCritical
          ? 'bg-[#1e1b1e] text-white border-rose-900/60 border-l-4 border-l-rose-500'
          : 'bg-[#1f1d18] text-white border-amber-900/60 border-l-4 border-l-amber-500'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <span className={`p-1.5 rounded-lg shrink-0 ${isCritical ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'}`}>
              {isCritical ? (
                <AlertOctagon className="w-5 h-5 text-rose-400" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              )}
            </span>
            <div className="truncate">
              <span className="font-extrabold uppercase tracking-wide text-xs px-2 py-0.5 rounded bg-black/30 mr-2">
                {topAlert.risk_level}
              </span>
              <span className="font-semibold text-sm sm:text-base">
                {topAlert.title}
              </span>
              <span className="hidden md:inline text-white/90 text-sm ml-2">
                — {topAlert.station_name}: PM2.5 at {topAlert.current_pm25} µg/m³
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              to={`/station/${topAlert.station_id}`}
              className="inline-flex items-center space-x-1 text-xs sm:text-sm font-semibold bg-white/20 hover:bg-white/30 backdrop-blur-sm px-3 py-1.5 rounded-md transition-colors"
            >
              <span>View details</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
