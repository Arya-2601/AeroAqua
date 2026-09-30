import React from 'react';
import { Calendar, Users, MapPin, Tag, Activity, Music, Trophy, Tent, Construction, AlertOctagon, Clock, XCircle } from 'lucide-react';
import { formatISTDateTime } from '../utils/dateTime';

export default function EventList({ events = [], onCancelEvent, isAuthority }) {
  if (events.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center text-slate-500 shadow-sm">
        <Calendar className="w-10 h-10 mx-auto mb-2 text-slate-300" />
        <h3 className="font-bold text-slate-800 text-base">No Events Found</h3>
        <p className="text-xs text-slate-400 mt-1">There are no events matching the active filter criteria.</p>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    const s = (status || '').toUpperCase();
    switch (s) {
      case 'ACTIVE':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 font-black';
      case 'UPCOMING':
        return 'bg-sky-100 text-sky-800 border-sky-300 font-bold';
      case 'ENDED':
        return 'bg-slate-100 text-slate-600 border-slate-200 font-medium';
      case 'CANCELLED':
        return 'bg-red-100 text-red-700 border-red-200 font-medium';
      default:
        return 'bg-slate-100 text-slate-700 font-medium';
    }
  };

  const getEventTypeIcon = (type) => {
    switch (type) {
      case 'sports':
        return <Trophy className="w-4 h-4 text-amber-600" />;
      case 'concert':
        return <Music className="w-4 h-4 text-purple-600" />;
      case 'festival':
        return <Tent className="w-4 h-4 text-emerald-600" />;
      case 'construction':
        return <Construction className="w-4 h-4 text-orange-600" />;
      case 'road_closure':
        return <AlertOctagon className="w-4 h-4 text-rose-600" />;
      default:
        return <Activity className="w-4 h-4 text-blue-600" />;
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
            className={`bg-white rounded-2xl p-5 border shadow-sm transition-all flex flex-col justify-between hover:shadow-md ${
              statusUpper === 'ACTIVE'
                ? 'border-emerald-300 ring-2 ring-emerald-50'
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

              {/* Location */}
              <div className="flex items-center text-xs text-slate-600 gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">
                  Location: {ev.latitude?.toFixed(4)}, {ev.longitude?.toFixed(4)} ({ev.affected_radius_km || 2} km radius)
                </span>
              </div>

              {/* Date Times */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs space-y-1.5 font-medium">
                <div className="flex items-start justify-between">
                  <span className="text-slate-400 uppercase text-[10px] font-bold">Start:</span>
                  <span className="text-slate-800 font-mono text-[11px]">{formatISTDateTime(ev.start_time)}</span>
                </div>
                <div className="flex items-start justify-between">
                  <span className="text-slate-400 uppercase text-[10px] font-bold">End:</span>
                  <span className="text-slate-800 font-mono text-[11px]">{formatISTDateTime(ev.end_time)}</span>
                </div>
              </div>

              {/* Description if present */}
              {ev.description && (
                <p className="text-xs text-slate-600 italic bg-blue-50/50 p-2 rounded-lg border border-blue-100/60">
                  {ev.description}
                </p>
              )}

              {/* Crowd Info */}
              {ev.expected_crowd > 0 && (
                <div className="flex items-center text-xs text-slate-500 gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span>Expected Attendance: <strong>{ev.expected_crowd.toLocaleString()}</strong></span>
                </div>
              )}
            </div>

            {/* Authority Actions */}
            {isAuthority && !isEnded && (
              <div className="pt-3 mt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => onCancelEvent(ev.id)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2.5 py-1 rounded-lg transition-colors"
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
