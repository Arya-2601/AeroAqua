import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

export const api = {
  // Health
  getHealth: async () => {
    const res = await client.get('/api/health');
    return res.data;
  },

  // Stations
  getStations: async () => {
    const res = await client.get('/api/stations');
    return res.data;
  },

  getStation: async (id) => {
    const res = await client.get(`/api/stations/${id}`);
    return res.data;
  },

  getStationReadings: async (id, hours = 48) => {
    const res = await client.get(`/api/stations/${id}/readings`, {
      params: { hours },
    });
    return res.data;
  },

  getStationContext: async (id) => {
    const res = await client.get(`/api/stations/${id}/context`);
    return res.data;
  },

  getStationForecast: async (id) => {
    const res = await client.get(`/api/stations/${id}/forecast`);
    return res.data;
  },

  // Anomalies
  getAnomalies: async (active = true) => {
    const res = await client.get('/api/anomalies', {
      params: { active },
    });
    return res.data;
  },

  // Events
  getEvents: async (status = 'all') => {
    const res = await client.get('/api/events', {
      params: { status },
    });
    return res.data;
  },

  // Alerts
  getAlerts: async (active = true) => {
    const res = await client.get('/api/alerts', {
      params: { active },
    });
    return res.data;
  },

  // Simulation
  simulateSpike: async (stationId, magnitudePct = 70.0) => {
    const res = await client.post('/api/simulate/spike', {
      station_id: Number(stationId),
      magnitude_pct: Number(magnitudePct),
    });
    return res.data;
  },

  simulateReset: async () => {
    const res = await client.post('/api/simulate/reset');
    return res.data;
  },
};

export default api;
