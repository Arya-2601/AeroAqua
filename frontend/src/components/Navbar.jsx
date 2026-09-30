import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Wind, Bell, Calendar, MapPin, Droplets, Shield, User, LogOut } from 'lucide-react';
import { useAuth, AVAILABLE_REGIONS } from '../context/AuthContext';

export default function Navbar({ activeAlertCount = 0 }) {
  const location = useLocation();
  const { user, isAuthority, currentRegion, setCurrentRegion, logout } = useAuth();

  const navLinks = [
    { to: '/', label: 'Air Intelligence', icon: Wind },
    { to: '/groundwater', label: 'Groundwater', icon: Droplets },
    { to: '/events', label: 'Events & Context', icon: Calendar },
    { to: '/alerts', label: isAuthority ? 'Authority Broadcasts' : 'Alerts & Directives', icon: Bell, badge: activeAlertCount },
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="p-2 bg-gradient-to-tr from-blue-600 to-sky-400 rounded-xl text-white shadow-sm transition-transform group-hover:scale-105">
              <Wind className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold tracking-tight text-white font-sans">
                  Aero<span className="text-sky-400">Aqua</span>
                </span>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded-full tracking-wider uppercase">
                  Platform
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Air + Groundwater Intelligence Platform
              </p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-slate-800 text-sky-400 shadow-sm border border-slate-700'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                  {link.badge > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-rose-500 text-white animate-pulse">
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right Controls: Region Selector + Role Pill / Login */}
          <div className="flex items-center space-x-3">
            {/* Region Selector */}
            <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl px-2 py-1 text-xs">
              <MapPin className="w-3.5 h-3.5 text-sky-400 mr-1.5 flex-shrink-0" />
              <select
                aria-label="Filter by operational region"
                value={currentRegion}
                onChange={(e) => setCurrentRegion(e.target.value)}
                className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer pr-1"
              >
                {AVAILABLE_REGIONS.map((r) => (
                  <option key={r.id} value={r.id} className="bg-slate-900 text-slate-200">
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Role / Login Status */}
            {user ? (
              <div className="flex items-center space-x-1.5">
                <Link
                  to="/login"
                  title="Switch Role or Region in Portal"
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    isAuthority
                      ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {isAuthority ? (
                    <>
                      <Shield className="w-3.5 h-3.5 text-amber-400" />
                      <span>Authority</span>
                    </>
                  ) : (
                    <>
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>Citizen</span>
                    </>
                  )}
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  title="Sign out of portal"
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 border border-slate-700 rounded-xl transition-all"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
