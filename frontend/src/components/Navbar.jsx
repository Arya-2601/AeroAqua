import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Wind, Bell, Calendar, MapPin, Activity } from 'lucide-react';

export default function Navbar({ activeAlertCount = 0 }) {
  const location = useLocation();

  const navLinks = [
    { to: '/', label: 'Dashboard', icon: MapPin },
    { to: '/events', label: 'Events & Context', icon: Calendar },
    { to: '/alerts', label: 'Alerts', icon: Bell, badge: activeAlertCount },
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center space-x-3 group">
            <span className="text-2xl transform transition-transform group-hover:scale-110">🌍</span>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold tracking-tight text-white font-sans">
                  Aero<span className="text-sky-400">Aqua</span>
                </span>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded-full tracking-wider uppercase">
                  Air MVP
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Environmental Intelligence • Detect • Correlate • Predict • Alert
              </p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="flex items-center space-x-1 sm:space-x-3">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-slate-800 text-sky-400 shadow-sm border border-slate-700'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                  {link.badge > 0 && (
                    <span className="ml-1.5 px-2 py-0.5 text-xs font-bold rounded-full bg-rose-500 text-white animate-pulse">
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Live Engine Indicator */}
          <div className="hidden lg:flex items-center space-x-2 bg-slate-800/80 border border-slate-700/60 px-3 py-1.5 rounded-full text-xs text-slate-300">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-mono text-emerald-400">LIVE</span>
            <span className="text-slate-500">|</span>
            <span>Delhi Grid (6 Zones)</span>
          </div>
        </div>
      </div>
    </header>
  );
}
