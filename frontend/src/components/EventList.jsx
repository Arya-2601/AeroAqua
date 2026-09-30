import React from 'react';
import { Calendar, Users, MapPin, Tag } from 'lucide-react';

export default function EventList({ events = [] }) {
  if (events.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-slate-500">
        No events matching this filter.
      </div>
    );
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold animate-pulse';
      case 'upcoming':
        return 'bg-sky-100 text-sky-800 border-sky-300 font-semibold';
      case 'ended':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getEventTypeEmoji = (type) => {
    switch (type) {
      case 'sports':
        return '🏟️';
      case 'concert':
        return '🎸';
      case 'festival':
        return '🎪';
      case 'gathering':
        return '👥';
      case 'construction':
        return '🚧';
      case 'road_closure':
        return '⛔';
      default:
        return '📍';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[11px] tracking-wider">
            <tr>
              <th className="px-6 py-3.5">Event Name</th>
              <th className="px-6 py-3.5">Type</th>
              <th className="px-6 py-3.5">Status</th>
              <th className="px-6 py-3.5">Expected Crowd</th>
              <th className="px-6 py-3.5">Time Window</th>
              <th className="px-6 py-3.5">Radius</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {events.map((ev) => {
              const startStr = new Date(ev.start_time).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });
              const endStr = new Date(ev.end_time).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <tr key={ev.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-900 flex items-center space-x-2">
                    <span className="text-xl">{getEventTypeEmoji(ev.event_type)}</span>
                    <span>{ev.event_name}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 capitalize">
                      {ev.event_type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border uppercase tracking-wider ${getStatusBadge(
                        ev.status
                      )}`}
                    >
                      {ev.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 font-medium">
                    <div className="flex items-center space-x-1.5">
                      <Users className="w-4 h-4 text-slate-400" />
                      <span>{ev.expected_crowd.toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-600">
                    <div className="space-y-0.5">
                      <div>Start: {startStr}</div>
                      <div>End: {endStr}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600 font-mono text-xs">
                    {ev.affected_radius_km} km
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
