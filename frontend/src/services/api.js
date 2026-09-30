import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

// Attach JWT token automatically if present
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('aeroaqua_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  // Health
  getHealth: async () => {
    const res = await client.get('/api/health');
    return res.data;
  },

  // Auth
  login: async (username, password, role = 'citizen', region = 'Delhi') => {
    const res = await client.post('/api/auth/login', { username, password, role, region });
    return res.data;
  },

  // Stations
  getStations: async (region = null) => {
    const params = region ? { region } : {};
    const res = await client.get('/api/stations', { params });
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

  refreshStation: async (id) => {
    const res = await client.post(`/api/stations/${id}/refresh`);
    return res.data;
  },

  createStation: async (stationData) => {
    const res = await client.post('/api/stations', stationData);
    return res.data;
  },

  removeStation: async (id) => {
    const res = await client.delete(`/api/stations/${id}`);
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
  getEvents: async (status = 'all', region = null) => {
    const params = { status };
    if (region && region.toLowerCase() !== 'all') {
      params.region = region;
    }
    const res = await client.get('/api/events', { params });
    return res.data;
  },

  createEvent: async (eventData) => {
    const res = await client.post('/api/events', eventData);
    return res.data;
  },

  updateEvent: async (id, eventData) => {
    const res = await client.put(`/api/events/${id}`, eventData);
    return res.data;
  },

  cancelEvent: async (id) => {
    const res = await client.delete(`/api/events/${id}`);
    return res.data;
  },

  // Alerts
  getAlerts: async (active = true, region = null) => {
    const params = { active };
    if (region && region.toLowerCase() !== 'all') {
      params.region = region;
    }
    const res = await client.get('/api/alerts', { params });
    return res.data;
  },

  getBroadcastAlerts: async (region = null) => {
    const params = (region && region.toLowerCase() !== 'all') ? { region } : {};
    const res = await client.get('/api/alerts/broadcasts', { params });
    return res.data;
  },

  getRegionalWeather: async (latitude = 28.6139, longitude = 77.2090) => {
    const res = await client.get('/api/weather', {
      params: { latitude, longitude },
    });
    return res.data;
  },

  broadcastAlert: async (id) => {
    const res = await client.post(`/api/alerts/${id}/broadcast`);
    return res.data;
  },

  stopBroadcastAlert: async (id) => {
    const res = await client.post(`/api/alerts/${id}/stop-broadcast`);
    return res.data;
  },

  resolveAlert: async (id) => {
    const res = await client.post(`/api/alerts/${id}/resolve`);
    return res.data;
  },

  // Groundwater (Historical Kaggle 2012-2021)
  getGroundwaterStates: async () => {
    const res = await client.get('/api/groundwater/states');
    return res.data;
  },

  getGroundwaterSummary: async (state = 'DELHI') => {
    const res = await client.get('/api/groundwater/summary', {
      params: { state },
    });
    return res.data;
  },

  getGroundwaterTrends: async (state = 'DELHI', parameter = 'ph') => {
    const res = await client.get('/api/groundwater/trends', {
      params: { state, parameter },
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
