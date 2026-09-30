import React, { useState, useEffect } from 'react';
import api from '../services/api';
import EventList from '../components/EventList';
import { Calendar, Filter, Sparkles, RefreshCw } from 'lucide-react';

export default function Events() {
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const data = await api.getEvents(filter);
      setEvents(data);
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [filter]);

  const tabs = [
    { id: 'all', label: 'All Events' },
    { id: 'active', label: 'Active Now' },
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'ended', label: 'Past Events' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Calendar className="w-5 h-5" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Metropolitan Events & Geospatial Triggers
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Local sports games, concerts, festivals, and infrastructure closures correlated with air quality readings.
            </p>
          </div>

          <button
            onClick={fetchEvents}
            className="self-start sm:self-auto inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Events</span>
          </button>
        </div>

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
          <EventList events={events} />
        )}
      </main>
    </div>
  );
}
