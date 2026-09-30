import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Wind,
  Bell,
  Calendar,
  MapPin,
  Droplets,
  Shield,
  User,
  LogOut,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react';
import { useAuth, AVAILABLE_REGIONS } from '../context/AuthContext';

export default function Navbar({ activeAlertCount = 0 }) {
  const location = useLocation();
  const { user, isAuthority, currentRegion, setCurrentRegion, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { to: '/', label: 'Air Intelligence', icon: Wind },
    { to: '/groundwater', label: 'Groundwater', icon: Droplets },
    { to: '/events', label: 'Events & Context', icon: Calendar },
    {
      to: '/alerts',
      label: isAuthority ? 'Authority Broadcasts' : 'Alerts & Directives',
      icon: Bell,
      badge: activeAlertCount,
    },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#071A2F]/95 backdrop-blur-md border-b border-slate-800 text-white shadow-xs transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-15">
          {/* Brand Logo */}
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center space-x-2.5 group"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-500 to-teal-400 flex items-center justify-center shadow-xs transition-transform group-hover:scale-105">
              <Wind className="w-4 h-4 text-slate-950 stroke-[2.5]" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center space-x-1.5 leading-none">
                <span className="text-base font-extrabold tracking-tight text-white font-sans">
                  Aero<span className="text-sky-400">Aqua</span>
                </span>
                <span className="px-1.5 py-0.2 text-[9px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/25 rounded-full uppercase tracking-wider">
                  Platform
                </span>
              </div>
              <span className="text-[10px] text-slate-400 hidden sm:block tracking-wide mt-0.5">
                Environmental Intelligence
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-slate-800/90 text-sky-400 border border-slate-700/80 shadow-2xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/40'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{link.label}</span>
                  {link.badge > 0 && (
                    <span className="px-1.5 py-0.2 text-[9px] font-black rounded-full bg-rose-500 text-white animate-pulse">
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right Controls: Region Selector + Role / User Toggle */}
          <div className="flex items-center space-x-2.5">
            {/* Region Selector */}
            <div className="relative flex items-center bg-slate-800/80 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs">
              <MapPin className="w-3.5 h-3.5 text-sky-400 mr-1.5 shrink-0" />
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

            {/* Role & Auth */}
            {user ? (
              <div className="hidden sm:flex items-center space-x-1.5">
                <Link
                  to="/login"
                  title="Switch Role or Region in Portal"
                  className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                    isAuthority
                      ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                      : 'bg-slate-800/80 text-slate-300 border-slate-700/80 hover:bg-slate-700'
                  }`}
                >
                  {isAuthority ? (
                    <>
                      <Shield className="w-3 h-3 text-amber-400" />
                      <span>Authority</span>
                    </>
                  ) : (
                    <>
                      <User className="w-3 h-3 text-slate-400" />
                      <span>Citizen</span>
                    </>
                  )}
                </Link>

                <button
                  type="button"
                  onClick={logout}
                  title="Sign out of portal"
                  className="p-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-rose-400 border border-slate-700/80 rounded-lg transition-colors"
                  aria-label="Log out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="hidden sm:inline-flex px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                Sign In
              </Link>
            )}

            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700/80"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-t border-slate-800 px-4 pt-3 pb-4 space-y-2 animate-in fade-in duration-150">
          <nav className="space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-slate-800 text-sky-400 font-bold border border-slate-700'
                      : 'text-slate-300 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{link.label}</span>
                  </div>
                  {link.badge > 0 && (
                    <span className="px-1.5 py-0.2 text-[9px] font-black rounded-full bg-rose-500 text-white">
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="text-xs font-semibold text-sky-400 hover:underline flex items-center gap-1"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{user ? `Role: ${user.role.toUpperCase()}` : 'Sign In / Switch Role'}</span>
            </Link>

            {user && (
              <button
                type="button"
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="text-xs font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1"
              >
                <LogOut className="w-3 h-3" />
                <span>Log out</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
