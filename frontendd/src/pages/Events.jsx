import React, { useState, useEffect } from 'react';
import api from '../services/api';
import EventList from '../components/EventList';
import { useAuth } from '../context/AuthContext';
import { createISTIsoString, formatISTDate } from '../utils/dateTime';
import {
  Calendar,
  Filter,
  RefreshCw,
  Plus,
  AlertTriangle,
  Shield,
  Check,
  MapPin,
  Clock,
  Layers,
  X,
} from 'lucide-react';

const SUPPORTED_STATES = ['Delhi', 'Maharashtra', 'Gujarat'];

export default function Events() {
  const { isAuthority, currentRegion } = useAuth();
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [formError, setFormError] = useState(null);

  // Available zones for selected form state
  const [availableZones, setAvailableZones] = useState([]);

  // New Event Form State with linked State and Zone / City
  const todayStr = new Date().toISOString().split('T')[0];
  const [newEvent, setNewEvent] = useState({
    event_name: '',
    event_type: 'sports',
    state: currentRegion || 'Maharashtra',
    zone_name: '',
    expected_crowd: 15000,
    impact_radius_km: 3.5,
    latitude: 18.9712,
    longitude: 72.8222,
    startDate: todayStr,
    startTime: '06:00',
    endDate: todayStr,
    endTime: '11:00',
    description: '',
  });

  // Fetch zones when form state changes
  useEffect(() => {
    const fetchZonesForState = async () => {
      try {
        const stateToQuery = newEvent.state || currentRegion || 'Delhi';
        const stList = await api.getStations(stateToQuery);
        setAvailableZones(stList);
        if (stList.length > 0) {
          const first = stList[0];
          setNewEvent((prev) => ({
            ...prev,
            zone_name: first.name,
            latitude: first.latitude,
            longitude: first.longitude,
          }));
        }
      } catch (err) {
        console.error('Failed to load stations for state', err);
      }
    };
    fetchZonesForState();
  }, [newEvent.state]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      // Isolate events to current region
      const data = await api.getEvents(filter, currentRegion);
      setEvents(data);
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [filter, currentRegion]);

  const handleStateChange = (selectedState) => {
    setNewEvent((prev) => ({
      ...prev,
      state: selectedState,
    }));
  };

  const handleZoneSelect = (zoneName) => {
    const matched = availableZones.find((z) => z.name === zoneName);
    if (matched) {
      setNewEvent((prev) => ({
        ...prev,
        zone_name: matched.name,
        latitude: matched.latitude,
        longitude: matched.longitude,
      }));
    } else {
      setNewEvent((prev) => ({ ...prev, zone_name: zoneName }));
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setFormError(null);

    // Validate Start Date & Time and End Date & Time
    if (!newEvent.startDate || !newEvent.startTime) {
      setFormError('Please provide a valid Start Date and Start Time.');
      return;
    }
    if (!newEvent.endDate || !newEvent.endTime) {
      setFormError('Please provide a valid End Date and End Time.');
      return;
    }

    // Construct timezone-aware ISO 8601 strings in Asia/Kolkata (IST)
    const startIso = createISTIsoString(newEvent.startDate, newEvent.startTime);
    const endIso = createISTIsoString(newEvent.endDate, newEvent.endTime);

    const startDateTime = new Date(startIso);
    const endDateTime = new Date(endIso);

    if (isNaN(startDateTime.getTime())) {
      setFormError('Invalid Start Date or Time.');
      return;
    }
    if (isNaN(endDateTime.getTime())) {
      setFormError('Invalid End Date or Time.');
      return;
    }
    if (endDateTime < startDateTime) {
      setFormError('Validation Error: End date/time cannot be before start date/time.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        event_name: newEvent.event_name.trim(),
        event_type: newEvent.event_type,
        region: newEvent.state,
        zone_name: newEvent.zone_name || undefined,
        expected_crowd: Number(newEvent.expected_crowd) || 0,
        affected_radius_km: Number(newEvent.impact_radius_km) || 2.0,
        latitude: Number(newEvent.latitude),
        longitude: Number(newEvent.longitude),
        start_time: startIso,
        end_time: endIso,
        description: newEvent.description.trim() || undefined,
      };

      await api.createEvent(payload);
      setSuccessMsg(`Event '${newEvent.event_name}' registered successfully for ${newEvent.state} (${newEvent.zone_name}).`);
      setIsModalOpen(false);

      // Reset form
      setNewEvent((prev) => ({
        ...prev,
        event_name: '',
        description: '',
      }));

      await fetchEvents();
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err) {
      console.error('Failed to create event', err);
      const detail = err.response?.data?.detail || 'Event registration failed. Please verify authorization and inputs.';
      setFormError(typeof detail === 'string' ? detail : 'Event registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelEvent = async (eventId) => {
    if (!window.confirm('Cancel this scheduled event?')) return;
    try {
      await api.cancelEvent(eventId);
      await fetchEvents();
    } catch (err) {
      console.error('Failed to cancel event', err);
      alert('Failed to cancel event.');
    }
  };

  const tabs = [
    { id: 'all', label: 'All Scheduled Events' },
    { id: 'active', label: 'Active Now' },
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'ended', label: 'Past & Concluded' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-2 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-200/60">
                <Calendar className="w-5 h-5" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-sans">
                Metropolitan Events &amp; Geospatial Context
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Active sports marathons, cultural festivals, gatherings, and road closures correlated with environmental readings in <strong className="text-slate-800">{currentRegion}</strong>.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={fetchEvents}
              disabled={loading}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-2xs transition-all disabled:opacity-50"
              title="Refresh events list"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sky-600' : 'text-slate-500'}`} />
              <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
            </button>

            {isAuthority && (
              <button
                type="button"
                onClick={() => {
                  setFormError(null);
                  setIsModalOpen(true);
                }}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
              >
                <Plus className="w-3.5 h-3.5 text-sky-400" />
                <span>Register Event</span>
              </button>
            )}
          </div>
        </div>

        {/* Success Feedback */}
        {successMsg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-semibold flex items-center justify-between animate-in fade-in duration-150">
            <div className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-slate-400 hover:text-slate-700 p-1">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Filter Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-2 flex-wrap gap-3">
          <div className="flex items-center space-x-2 overflow-x-auto pb-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  filter === tab.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Region Scope: <strong className="text-slate-800">{currentRegion}</strong> • {events.length} {events.length === 1 ? 'Event' : 'Events'}
          </div>
        </div>

        {/* Events Grid */}
        <EventList events={events} onCancelEvent={handleCancelEvent} isAuthority={isAuthority} />

        {/* Authority Register Event Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full border border-slate-200 overflow-hidden transform transition-all my-6">
              <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 bg-sky-500/20 text-sky-400 rounded-lg border border-sky-500/30">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm tracking-wide">Register Local Metropolitan Event</h3>
                    <p className="text-[11px] text-slate-400">Interpreted in India Standard Time (Asia/Kolkata)</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1"
                  aria-label="Close dialog"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateEvent} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Event Name */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Event Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mumbai Marathon, Surat Cultural Festival"
                    value={newEvent.event_name}
                    onChange={(e) => setNewEvent({ ...newEvent, event_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                  />
                </div>

                {/* Event Type */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Event Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newEvent.event_type}
                    onChange={(e) => setNewEvent({ ...newEvent, event_type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none font-medium"
                  >
                    <option value="sports">Sports / Marathon</option>
                    <option value="festival">Festival / Cultural Fair</option>
                    <option value="concert">Concert / Live Music</option>
                    <option value="gathering">Public Gathering / Conference</option>
                    <option value="construction">Major Infrastructure Construction</option>
                    <option value="road_closure">Arterial Road Closure</option>
                  </select>
                </div>

                {/* Linked State & Zone */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      State / Region <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={newEvent.state}
                      onChange={(e) => handleStateChange(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none font-medium"
                    >
                      {SUPPORTED_STATES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Zone / City <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={newEvent.zone_name}
                      onChange={(e) => handleZoneSelect(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none font-medium"
                    >
                      {availableZones.map((z) => (
                        <option key={z.id} value={z.name}>
                          {z.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2 text-[11px] text-slate-500 font-mono">
                    Target Center: {newEvent.latitude.toFixed(4)}°N, {newEvent.longitude.toFixed(4)}°E
                  </div>
                </div>

                {/* Start Date & Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Start Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={newEvent.startDate}
                      onChange={(e) => setNewEvent({ ...newEvent, startDate: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none font-medium font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Start Time (IST) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="time"
                      required
                      value={newEvent.startTime}
                      onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none font-medium font-mono"
                    />
                  </div>
                </div>

                {/* End Date & Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      End Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={newEvent.endDate}
                      onChange={(e) => setNewEvent({ ...newEvent, endDate: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none font-medium font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      End Time (IST) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="time"
                      required
                      value={newEvent.endTime}
                      onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none font-medium font-mono"
                    />
                  </div>
                </div>

                {/* Crowd & Influence Radius */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Expected Attendance</label>
                    <input
                      type="number"
                      min="0"
                      step="500"
                      value={newEvent.expected_crowd}
                      onChange={(e) => setNewEvent({ ...newEvent, expected_crowd: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Influence Radius (km)</label>
                    <input
                      type="number"
                      min="0.5"
                      max="20"
                      step="0.5"
                      value={newEvent.impact_radius_km}
                      onChange={(e) => setNewEvent({ ...newEvent, impact_radius_km: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none font-mono"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Description &amp; Operational Directives</label>
                  <textarea
                    rows={2}
                    placeholder="Route path, road detours, vehicular restrictions..."
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-semibold shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {submitting ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    <span>{submitting ? 'Registering...' : 'Register Event'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
