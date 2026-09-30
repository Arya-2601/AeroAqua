import React from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Circle, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { getAqiMeta, getRiskBadgeClasses } from '../utils/aqi';
import { AlertCircle, ArrowUpRight, Calendar, Users, Eye } from 'lucide-react';

// Create SVG-based DivIcons for events
function createEventIcon(type, status) {
  let emoji = '📍';
  if (type === 'sports') emoji = '🏟️';
  else if (type === 'concert' || type === 'festival') emoji = '🎪';
  else if (type === 'construction') emoji = '🚧';
  else if (type === 'road_closure') emoji = '⛔';

  const isActive = status === 'active';
  const ringColor = isActive ? 'ring-2 ring-indigo-500 bg-indigo-50' : 'bg-slate-100 ring-1 ring-slate-300';

  return L.divIcon({
    className: 'custom-event-icon',
    html: `
      <div class="flex items-center justify-center w-8 h-8 rounded-full shadow-lg ${ringColor} text-sm transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-125">
        <span>${emoji}</span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

export default function PollutionMap({
  stations = [],
  events = [],
  center = [28.6139, 77.2090],
  zoom = 12,
  onSelectStation,
}) {
  return (
    <div className="relative w-full h-[520px] rounded-xl overflow-hidden shadow-sm border border-slate-200 bg-slate-100">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={false}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* 1. Render Event Radius and Markers */}
        {events.map((ev) => {
          const radiusMeters = (ev.affected_radius_km || 2.0) * 1000;
          const isActive = ev.status === 'active';

          return (
            <React.Fragment key={`event-group-${ev.id}`}>
              {/* Event influence circle */}
              <Circle
                center={[ev.latitude, ev.longitude]}
                radius={radiusMeters}
                pathOptions={{
                  color: isActive ? '#6366f1' : '#94a3b8',
                  fillColor: isActive ? '#818cf8' : '#cbd5e1',
                  fillOpacity: isActive ? 0.14 : 0.06,
                  dashArray: isActive ? '5, 5' : '3, 6',
                  weight: isActive ? 1.5 : 1,
                }}
              />

              {/* Event Icon Marker */}
              <Marker
                position={[ev.latitude, ev.longitude]}
                icon={createEventIcon(ev.event_type, ev.status)}
              >
                <Popup className="custom-popup">
                  <div className="p-1 min-w-[200px]">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        {ev.event_type}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          isActive
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {ev.status}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-800 text-sm mb-1">{ev.event_name}</h4>
                    <div className="text-xs text-slate-600 space-y-0.5">
                      <div className="flex items-center space-x-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>{ev.expected_crowd.toLocaleString()} expected</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Radius: {ev.affected_radius_km} km</span>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          );
        })}

        {/* 2. Render Station Markers */}
        {stations.map((st) => {
          const aqiMeta = getAqiMeta(st.current_pm25);
          const scaledRadius = Math.max(14, Math.min(28, (st.current_pm25 / 180) * 28));

          return (
            <React.Fragment key={`station-${st.id}`}>
              {/* Outer Pulsing Ring for Anomalous Station */}
              {st.is_anomaly && (
                <CircleMarker
                  center={[st.latitude, st.longitude]}
                  radius={scaledRadius + 14}
                  pathOptions={{
                    color: '#ef4444',
                    fillColor: '#f87171',
                    fillOpacity: 0.25,
                    weight: 2,
                    dashArray: '3, 3',
                  }}
                />
              )}

              {/* Main Station Marker */}
              <CircleMarker
                center={[st.latitude, st.longitude]}
                radius={scaledRadius}
                pathOptions={{
                  fillColor: aqiMeta.color,
                  color: st.is_anomaly ? '#dc2626' : '#ffffff',
                  weight: st.is_anomaly ? 3.5 : 2,
                  fillOpacity: 0.9,
                }}
              >
                <Popup className="custom-popup">
                  <div className="p-2 min-w-[220px]">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-slate-900 text-base">{st.name}</span>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${getRiskBadgeClasses(st.risk_level)}`}>
                        {st.risk_level}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 mb-2">{st.zone_profile}</p>

                    <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200/80 mb-3">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs font-medium text-slate-600">Current PM2.5</span>
                        <div className="flex items-baseline space-x-1">
                          <span className="text-xl font-extrabold text-slate-900 font-mono">
                            {st.current_pm25}
                          </span>
                          <span className="text-[10px] text-slate-500">µg/m³</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-200 text-xs">
                        <span className="font-semibold" style={{ color: aqiMeta.color }}>
                          {aqiMeta.category}
                        </span>
                        {st.is_anomaly ? (
                          <span className="text-rose-600 font-bold flex items-center space-x-0.5">
                            <AlertCircle className="w-3 h-3" />
                            <span>+{st.deviation_pct}% spike</span>
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Normal pattern</span>
                        )}
                      </div>
                    </div>

                    <Link
                      to={`/station/${st.id}`}
                      className="w-full flex items-center justify-center space-x-1.5 py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Station Details</span>
                      <ArrowUpRight className="w-3 h-3 opacity-70" />
                    </Link>
                  </div>
                </Popup>
              </CircleMarker>
            </React.Fragment>
          );
        })}
      </MapContainer>

      {/* Floating Map Legend */}
      <div className="absolute bottom-4 left-4 z-[400] bg-white/95 backdrop-blur-md px-3 py-2.5 rounded-lg shadow-md border border-slate-200 text-xs">
        <span className="font-bold text-slate-700 block mb-1">Map Key</span>
        <div className="flex items-center space-x-3 text-[11px] text-slate-600">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500 ring-2 ring-red-400"></span>
            <span>Anomaly Alert</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
            <span>Station</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span>🏟️</span>
            <span>Event Area</span>
          </div>
        </div>
      </div>
    </div>
  );
}
