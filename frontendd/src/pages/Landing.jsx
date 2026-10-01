import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Globe,
  Shield,
  ArrowRight,
  Wind,
  Droplets,
  Activity,
  MapPin,
  Send,
  Sliders,
  CheckCircle2,
} from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-center items-center px-4 py-12 bg-gradient-to-b from-slate-900 via-[#071A2F] to-slate-950 text-white">
      <div className="max-w-4xl w-full space-y-10 text-center">
        {/* Brand Header */}
        <div className="space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs font-bold uppercase tracking-wider">
            <Wind className="w-3.5 h-3.5 text-sky-400" />
            <span>Environmental Telemetry &amp; Authority Operations</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight font-sans">
            Aero<span className="text-sky-400">Aqua</span> Platform Access
          </h1>

          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Multi-zone ambient air intelligence, historical groundwater records, context correlation engine, and state authority command console for Delhi, Maharashtra, and Gujarat.
          </p>
        </div>

        {/* Exactly TWO Large Role Cards: PUBLIC vs AUTHORITY */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left pt-2">
          {/* CARD 1: PUBLIC */}
          <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl p-7 sm:p-8 border border-slate-700 hover:border-sky-500/60 shadow-xl transition-all duration-200 flex flex-col justify-between group hover:-translate-y-1">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center">
                <Globe className="w-6 h-6 stroke-[2.2]" />
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-sky-400">
                  Open Public Access
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  PUBLIC
                </h2>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Explore environmental conditions, view monitoring zones, report environmental issues, and request new monitoring coverage.
              </p>

              <div className="pt-2 space-y-2 text-xs text-slate-400 border-t border-slate-700/60">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>Real-time PM2.5, AQI &amp; Meteorological maps</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>Historical groundwater quality records (2012–2021)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>Submit environmental reports &amp; zone petitions</span>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <Link
                to="/dashboard"
                className="w-full py-3 px-4 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all flex items-center justify-center space-x-2 group-hover:shadow-sky-500/20 group-hover:shadow-lg"
              >
                <span>Continue as Public</span>
                <ArrowRight className="w-4 h-4 text-sky-200 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          {/* CARD 2: AUTHORITY */}
          <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl p-7 sm:p-8 border border-slate-700 hover:border-amber-500/60 shadow-xl transition-all duration-200 flex flex-col justify-between group hover:-translate-y-1">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                <Shield className="w-6 h-6 stroke-[2.2]" />
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                  State Administration &amp; Operations
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  AUTHORITY
                </h2>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Manage monitoring zones, review public requests, manage alerts, events and environmental operations.
              </p>

              <div className="pt-2 space-y-2 text-xs text-slate-400 border-t border-slate-700/60">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Map-click &amp; manual zone creation / deactivation</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Public zone petition review &amp; issue moderation</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>What-If scenario simulation &amp; public broadcasting</span>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <Link
                to="/login"
                className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-500 text-slate-950 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all flex items-center justify-center space-x-2 group-hover:shadow-amber-500/20 group-hover:shadow-lg"
              >
                <span>Authority Sign In</span>
                <ArrowRight className="w-4 h-4 text-slate-950 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
