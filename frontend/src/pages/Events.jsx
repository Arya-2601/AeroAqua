import React, { useState, useEffect } from 'react';
import api from '../services/api';
import EventList from '../components/EventList';
import { useAuth } from '../context/AuthContext';
import { Calendar, Filter, RefreshCw, Plus, AlertTriangle, Shield, Check } from 'lucide-react';

export default function Events() {
  const { isAuthority, currentRegion } = useAuth();
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  const [formError, setFormError] = useState(null);

  // New Event Form State with explicit Start Date, Start Time, End Date, End Time, Description
  const todayStr = new Date().toISOString().split('T')[0];
  const [newEvent, setNewEvent] = useState({
    event_name: '',
    event_type: 'gathering',
    expected_crowd: 5000,
    impact_radius_km: 3.5,
    latitude: 28.6139,
    longitude: 77.2090,
    startDate: todayStr,
    startTime: '10:00',
    endDate: todayStr,
    endTime: '18:00',
    description: '',
  });

  const fetchEvents = async () => {
    setLoading(true);
    try {
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

    const startDateTime = new Date(`${newEvent.startDate}T${newEvent.startTime}:00`);
    const endDateTime = new Date(`${newEvent.endDate}T${newEvent.endTime}:00`);

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
        event_name: newEvent.event_name,
        event_type: newEvent.event_type,
        region: currentRegion,
        expected_crowd: Number(newEvent.expected_crowd) || 0,
        affected_radius_km: Number(newEvent.impact_radius_km) || 2.0,
        latitude: Number(newEvent.latitude),
        longitude: Number(newEvent.longitude),
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        description: newEvent.description.trim() || undefined,
      };

      await api.createEvent(payload);
      setSuccessMsg(`Event '${newEvent.event_name}' registered successfully for ${currentRegion}.`);
      setIsModalOpen(false);
      setNewEvent({
        event_name: '',
        event_type: 'gathering',
        expected_crowd: 5000,
        impact_radius_km: 3.5,
        latitude: 28.6139,
        longitude: 77.2090,
        startDate: todayStr,
        startTime: '10:00',
        endDate: todayStr,
        endTime: '18:00',
        description: '',
      });
      await fetchEvents();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error('Failed to create event', err);
      const detail = err.response?.data?.detail || 'Event creation failed. Please check inputs.';
      setFormError(typeof detail === 'string' ? detail : 'Event creation failed.');
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
    { id: 'all', label: 'All Events' },
    { id: 'active', label: 'Active Now' },
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'ended', label: 'Past Events' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Calendar className="w-5 h-5" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Metropolitan Events &amp; Geospatial Context
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Local sports games, concerts, festivals, and infrastructure closures correlated with air quality readings.
            </p>
          </div>

          {isAuthority && (
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Register Event</span>
              </button>
            </div>
          )}
        </div>

        {/* Non-Causal Correlation Disclaimer */}
        <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <strong className="block font-semibold">Demo Event Data &amp; Context Correlation Disclaimer:</strong>
            <span>
              Metropolitan events are ingested to correlate potential localized emission spikes. These factors correlate with but do not confirm causation. Real-world air dispersion depends on micro-meteorology, inversion layers, and multi-factor industrial variables.
            </span>
          </div>
        </div>

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                filter === tab.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Events Table / List */}
        {loading ? (
          <div className="bg-white rounded-2xl p-12 text-center text-slate-500 border border-slate-200">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
            <span className="text-sm font-medium">Loading events...</span>
          </div>
        ) : (
          <EventList
            events={events}
            onCancelEvent={handleCancelEvent}
            isAuthority={isAuthority}
          />
        )}

        {/* Add Event Modal for Authorities */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-amber-400" />
                  <h3 className="font-bold text-sm">Register Metropolitan Event (Authority)</h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-white font-bold text-lg"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleCreateEvent} className="p-6 space-y-4 text-xs">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Event Name</label>
                  <input
                    type="text"
                    required
                    value={newEvent.event_name}
                    onChange={(e) => setNewEvent({ ...newEvent, event_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Construction Event / Stadium Match / Cultural Festival"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Event Type</label>
                    <select
                      value={newEvent.event_type}
                      onChange={(e) => setNewEvent({ ...newEvent, event_type: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                    >
                      <option value="sports">Sports Match</option>
                      <option value="concert">Concert</option>
                      <option value="festival">Festival</option>
                      <option value="gathering">Public Gathering</option>
                      <option value="construction">Construction Zone</option>
                      <option value="road_closure">Road Closure</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Operational Region</label>
                    <input
                      type="text"
                      readOnly
                      value={currentRegion}
                      className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl text-slate-500 font-medium cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Expected Crowd</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={newEvent.expected_crowd}
                      onChange={(e) => setNewEvent({ ...newEvent, expected_crowd: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Influence Radius (km)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={newEvent.impact_radius_km}
                      onChange={(e) => setNewEvent({ ...newEvent, impact_radius_km: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                    />
                  </div>
                </div>

                {/* Start Date & Start Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      required
                      value={newEvent.startDate}
                      onChange={(e) => setNewEvent({ ...newEvent, startDate: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Start Time</label>
                    <input
                      type="time"
                      required
                      value={newEvent.startTime}
                      onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none font-mono"
                    />
                  </div>
                </div>

                {/* End Date & End Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">End Date</label>
                    <input
                      type="date"
                      required
                      value={newEvent.endDate}
                      onChange={(e) => setNewEvent({ ...newEvent, endDate: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">End Time</label>
                    <input
                      type="time"
                      required
                      value={newEvent.endTime}
                      onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Latitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={newEvent.latitude}
                      onChange={(e) => setNewEvent({ ...newEvent, latitude: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Longitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={newEvent.longitude}
                      onChange={(e) => setNewEvent({ ...newEvent, longitude: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Description (Optional)</label>
                  <textarea
                    rows={2}
                    placeholder="Event operational details, expected traffic disruption or venue..."
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setFormError(null);
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-sm disabled:opacity-50"
                  >
                    {submitting ? 'Registering...' : 'Register Event'}
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
