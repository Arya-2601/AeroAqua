import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import StationDetail from './pages/StationDetail';
import Events from './pages/Events';
import Alerts from './pages/Alerts';
import api from './services/api';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  const [activeAlertCount, setActiveAlertCount] = useState(0);

  const fetchAlertCount = async () => {
    try {
      const alerts = await api.getAlerts(true);
      setActiveAlertCount(alerts.length);
    } catch {
      // API might be starting up
    }
  };

  useEffect(() => {
    fetchAlertCount();
    const interval = setInterval(fetchAlertCount, 20000);
    return () => clearInterval(interval);
  }, []);

  return (
    <BrowserRouter>
      <ScrollToTop />
      <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-sky-500 selection:text-white">
        <Navbar activeAlertCount={activeAlertCount} />
        <div className="flex-1">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/station/:id" element={<StationDetail />} />
            <Route path="/events" element={<Events />} />
            <Route path="/alerts" element={<Alerts />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}
