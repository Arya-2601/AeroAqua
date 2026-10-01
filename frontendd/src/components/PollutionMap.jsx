import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Circle, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { getAqiMeta, getRiskBadgeClasses } from '../utils/aqi';
import { AlertCircle, ArrowUpRight, Calendar, Users, Eye, MapPin, MapPinPlus, Plus } from 'lucide-react';

// Controller to smoothly update map center and zoom when region changes
function ChangeView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center.length === 2) {
      map.setView(center, zoom);
    }
  }, [center[0], center[1], zoom, map]);
  return null;
}

// Controller for capturing map clicks in zone selection mode
function MapClickHandler({ isSelectionMode, onMapClick }) {
  useMapEvents({
    click(e) {
      if (isSelectionMode && onMapClick) {
        onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
  });
  return null;
}

// Create SVG-based DivIcons for events
function createEventIcon(type, status) {
  let label = 'EV';
  if (type === 'sports') label = 'SPT';
  else if (type === 'concert' || type === 'festival') label = 'FST';
  else if (type === 'construction') label = 'WRK';
  else if (type === 'road_closure') label = 'CLO';

  const isActive = status === 'active';
  const ringColor = isActive ? 'ring-2 ring-indigo-500 bg-indigo-600 text-white' : 'bg-slate-700 text-slate-200 ring-1 ring-slate-500';

  return L.divIcon({
    className: 'custom-event-icon',
    html: `
      <div class="flex items-center justify-center w-7 h-7 rounded-full shadow-lg ${ringColor} text-[10px] font-bold transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-125">
        <span>${label}</span>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

// Create icon for Citizen Requested Zones
function createRequestedZoneIcon(count = 1) {
  return L.divIcon({
    className: 'custom-requested-icon',
    html: `
      <div class="flex items-center justify-center w-7 h-7 rounded-full shadow-md bg-amber-500 text-slate-950 ring-2 ring-amber-300 font-extrabold text-[10px] transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-125">
        <span>${count}</span>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

// Create target marker icon for newly selected map location
function createSelectedTargetIcon() {
  return L.divIcon({
    className: 'custom-target-icon',
    html: `
      <div class="flex items-center justify-center w-8 h-8 rounded-full bg-rose-600 text-white ring-4 ring-rose-300 shadow-xl font-bold animate-bounce transform -translate-x-1/2 -translate-y-1/2">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

export default function PollutionMap({
  stations = [],
  events = [],
  requestedZones = [],
  zoneRequests = [],
  center = [28.6139, 77.2090],
  zoom = 11,
  regionName = 'Delhi',
  isSelectionMode = false,
  isSelectingLocation = false,
  selectedCoord = null,
  coords = null,
  onMapClick = null,
  onLocationSelected = null,
}) {
  const activeSelectionMode = isSelectionMode || isSelectingLocation;
  const handleMapClickFn = onMapClick || onLocationSelected;
  const activeSelectedCoord = selectedCoord || coords;
  const activeRequestedZones = requestedZones.length > 0 ? requestedZones : zoneRequests;

  return (
    <div className={`relative w-full h-[540px] rounded-2xl overflow-hidden shadow-sm border ${
      activeSelectionMode ? 'border-amber-500 ring-2 ring-amber-300 cursor-crosshair' : 'border-slate-200 bg-slate-100'
    }`}>
      {/* Top Banner when map is in Zone Selection Mode */}
      {activeSelectionMode && (
        <div className="absolute top-3 left-1/2 transform -translate-x-1/2 z-[500] bg-slate-900/95 backdrop-blur-md text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xl border border-amber-400 flex items-center gap-2 animate-bounce">
          <MapPin className="w-4 h-4 text-amber-400" />
          <span>Zone Selection Mode Active: Click any point on the map to set zone coordinates</span>
        </div>
      )}

      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={false}
        className="w-full h-full"
      >
        <ChangeView center={center} zoom={zoom} />
        <MapClickHandler isSelectionMode={activeSelectionMode} onMapClick={handleMapClickFn} />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Selected target marker during zone creation */}
        {activeSelectedCoord && (
          <Marker
            position={[activeSelectedCoord.lat, activeSelectedCoord.lng]}
            icon={createSelectedTargetIcon()}
          >
            <Popup className="custom-popup">
              <div className="p-1 font-bold text-xs text-rose-900">
                Selected Location: {activeSelectedCoord.lat.toFixed(4)}°N, {activeSelectedCoord.lng.toFixed(4)}°E
              </div>
            </Popup>
          </Marker>
        )}

        {/* 1. Render Event Radius and Markers */}
        {events.map((ev) => {
          const radiusMeters = (ev.affected_radius_km || 2.0) * 1000;
          const isActive = ev.status === 'active';

          return (
            <React.Fragment key={`event-group-${ev.id}`}>
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
                    <h4 className="font-bold text-slate-900 text-sm">{ev.title}</h4>
                    <p className="text-xs text-slate-600 mt-1">{ev.description}</p>
                    <div className="text-[10px] text-slate-400 mt-2 flex items-center space-x-1">
                      <Calendar className="w-3 h-3" />
                      <span>Radius: {ev.affected_radius_km} km</span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          );
        })}

        {/* 2. Render Citizen Requested Zones */}
        {activeRequestedZones
          .filter((req) => req.latitude && req.longitude)
          .map((req) => (
            <Marker
              key={`req-zone-${req.id}`}
              position={[req.latitude, req.longitude]}
              icon={createRequestedZoneIcon(req.request_count || 1)}
            >
              <Popup className="custom-popup">
                <div className="p-2 min-w-[210px] space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-amber-100 text-amber-900 border border-amber-300">
                      Citizen Petition
                    </span>
                    <span className="text-[10px] font-bold font-mono text-slate-500">
                      {req.reference_id || `ZR-${req.id}`}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-xs">{req.area_locality}</h4>
                  <p className="text-[11px] text-slate-600">
                    City: {req.city} • Pincode: {req.pincode || '—'}
                  </p>
                  <p className="text-[11px] text-slate-500 italic">
                    {req.reason || 'Public monitoring coverage request'}
                  </p>
                  <div className="pt-1 text-[10px] text-amber-700 font-bold">
                    Status: {req.status} ({req.request_count} citizen {req.request_count === 1 ? 'request' : 'requests'})
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* 3. Render Station Monitoring Circles & Popups */}
        {stations.map((st) => {
          const aqiMeta = getAqiMeta(st.current_pm25);

          return (
            <CircleMarker
              key={`station-${st.id}`}
              center={[st.latitude, st.longitude]}
              radius={st.is_anomaly ? 13 : 9}
              pathOptions={{
                color: st.is_anomaly ? '#e11d48' : aqiMeta.color,
                fillColor: aqiMeta.color,
                fillOpacity: 0.85,
                weight: st.is_anomaly ? 3 : 1.5,
              }}
            >
              <Popup className="custom-popup">
                <div className="p-2 min-w-[200px] space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-xs text-slate-900 truncate">
                      {st.name}
                    </span>
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${getRiskBadgeClasses(
                        st.risk_level
                      )}`}
                    >
                      {st.risk_level}
                    </span>
                  </div>

                  <div className="flex items-baseline space-x-1.5 pt-1 border-t border-slate-100">
                    <span className="text-xl font-black text-slate-900 font-mono">
                      {st.current_pm25}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">µg/m³</span>
                    <span
                      className="ml-auto text-xs font-bold"
                      style={{ color: aqiMeta.color }}
                    >
                      {aqiMeta.category}
                    </span>
                  </div>

                  <div className="text-[10px] text-slate-500">
                    Zone: {st.zone_profile} • {st.region}
                  </div>

                  {st.is_anomaly && (
                    <div className="p-1.5 bg-rose-50 border border-rose-200 rounded-md text-[10px] text-rose-700 font-bold flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
                      <span>Anomaly Signal Detected</span>
                    </div>
                  )}

                  <div className="pt-1.5 border-t border-slate-100">
                    <Link
                      to={`/station/${st.id}`}
                      className="w-full py-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-semibold flex items-center justify-center space-x-1 transition-colors"
                    >
                      <span>Inspect Telemetry</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
