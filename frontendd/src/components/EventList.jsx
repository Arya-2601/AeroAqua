import React from 'react';
import {
  Calendar,
  Users,
  MapPin,
  Activity,
  Music,
  Trophy,
  Tent,
  Construction,
  AlertOctagon,
  Clock,
  XCircle,
  Radio,
  Tag,
} from 'lucide-react';
import { formatISTDateTime } from '../utils/dateTime';

export default function EventList({ events = [], onCancelEvent, isAuthority }) {
  if (events.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center text-slate-500 shadow-2xs">
        <Calendar className="w-10 h-10 mx-auto mb-2 text-slate-300" />
        <h3 className="font-bold text-slate-800 text-sm">No Events Found</h3>
        <p className="text-xs text-slate-400 mt-1">There are no events registered in this status or region category.</p>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    const s = (status || '').toUpperCase();
    switch (s) {
      case 'ACTIVE':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-200/60 font-black';
      case 'UPCOMING':
        return 'bg-sky-50 text-sky-800 border-sky-300 font-bold';
      case 'ENDED':
        return 'bg-slate-100 text-slate-600 border-slate-200 font-medium';
      case 'CANCELLED':
        return 'bg-rose-50 text-rose-700 border-rose-200 font-medium';
      default:
        return 'bg-slate-100 text-slate-700 font-medium';
    }
  };

  const getEventTypeIcon = (type) => {
    switch (type) {
      case 'sports':
        return <Trophy className="w-3.5 h-3.5 text-amber-600" />;
      case 'concert':
        return <Music className="w-3.5 h-3.5 text-purple-600" />;
      case 'festival':
        return <Tent className="w-3.5 h-3.5 text-emerald-600" />;
      case 'construction':
        return <Construction className="w-3.5 h-3.5 text-orange-600" />;
      case 'road_closure':
        return <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-blue-600" />;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {events.map((ev) => {
        const statusUpper = (ev.status || 'UPCOMING').toUpperCase();
        const isEnded = statusUpper === 'ENDED' || statusUpper === 'CANCELLED';

        return (
          <div
            key={ev.id}
            className={`bg-white rounded-2xl p-5 border shadow-2xs transition-all flex flex-col justify-between hover:shadow-md ${
              statusUpper === 'ACTIVE'
                ? 'border-emerald-300 ring-1 ring-emerald-100 bg-gradient-to-b from-white to-emerald-50/20'
                : 'border-slate-200'
            }`}
          >
            <div className="space-y-3">
              {/* Top Row: Type and Status */}
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold capitalize">
                  {getEventTypeIcon(ev.event_type)}
                  <span>{ev.event_type.replace('_', ' ')}</span>
                </span>

                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] border uppercase tracking-wider ${getStatusBadge(
                    ev.status
                  )}`}
                >
                  {statusUpper}
                </span>
              </div>

              {/* Event Name */}
              <h3 className="font-bold text-base text-slate-900 leading-snug line-clamp-2">
                {ev.event_name}
              </h3>

              {/* Linked State & Zone */}
              <div className="flex items-center text-xs text-slate-600 gap-1.5 flex-wrap">
                <MapPin className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                <span className="font-semibold text-slate-800">
                  {ev.region || 'Delhi'}
                </span>
                {ev.zone_name && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="text-sky-700 font-medium bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200/60">
                      {ev.zone_name}
                    </span>
                  </>
                )}
                <span className="text-slate-400 text-[11px] block w-full mt-0.5">
                  Coords: {ev.latitude?.toFixed(4)}, {ev.longitude?.toFixed(4)} ({ev.affected_radius_km || 2} km radius)
                </span>
              </div>

              {/* Exact IST Timestamps */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs space-y-1.5 font-medium">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-slate-400 uppercase text-[10px] font-bold shrink-0">Start:</span>
                  <span className="text-slate-900 font-medium text-right text-[11px]">
                    {formatISTDateTime(ev.start_time)}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-2 pt-1 border-t border-slate-200/60">
                  <span className="text-slate-400 uppercase text-[10px] font-bold shrink-0">End:</span>
                  <span className="text-slate-900 font-medium text-right text-[11px]">
                    {formatISTDateTime(ev.end_time)}
                  </span>
                </div>
              </div>

              {/* Description */}
              {ev.description && (
                <p className="text-xs text-slate-600 bg-blue-50/40 p-2.5 rounded-xl border border-blue-100/60 leading-relaxed">
                  {ev.description}
                </p>
              )}

              {/* Crowd Info */}
              {ev.expected_crowd > 0 && (
                <div className="flex items-center text-xs text-slate-500 gap-1.5 pt-1">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span>Expected Attendance: <strong className="text-slate-700 font-semibold">{ev.expected_crowd.toLocaleString()}</strong></span>
                </div>
              )}
            </div>

            {/* Authority Action: Cancel */}
            {isAuthority && !isEnded && (
              <div className="pt-3 mt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => onCancelEvent(ev.id)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg transition-colors border border-transparent hover:border-rose-200"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Cancel Event</span>
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
