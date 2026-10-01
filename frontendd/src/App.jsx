import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import StationDetail from './pages/StationDetail';
import Groundwater from './pages/Groundwater';
import Events from './pages/Events';
import Alerts from './pages/Alerts';
import Login from './pages/Login';
import Contact from './pages/Contact';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import { AuthProvider, useAuth } from './context/AuthContext';
import api from './services/api';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function MainLayout() {
  const { isAuthority, currentRegion } = useAuth();
  const [activeAlertCount, setActiveAlertCount] = useState(0);

  const fetchAlertCount = async () => {
    try {
      const alerts = isAuthority
        ? await api.getAlerts(true, currentRegion)
        : await api.getBroadcastAlerts(currentRegion);
      setActiveAlertCount(alerts.length);
    } catch {
      // API starting up
    }
  };

  useEffect(() => {
    fetchAlertCount();
    const interval = setInterval(fetchAlertCount, 20000);
    return () => clearInterval(interval);
  }, [isAuthority, currentRegion]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-sky-500 selection:text-white font-sans text-slate-800">
      <Navbar activeAlertCount={activeAlertCount} />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/portal" element={<Dashboard />} />
          <Route path="/groundwater" element={<Groundwater />} />
          <Route path="/station/:id" element={<StationDetail />} />
          <Route path="/events" element={<Events />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/login" element={<Login />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <MainLayout />
      </BrowserRouter>
    </AuthProvider>
  );
}
