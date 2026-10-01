import React from 'react';
import { Link } from 'react-router-dom';
import { Wind, Shield, Droplets, Bell, Calendar, Activity } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-[#071A2F] text-slate-400 text-xs border-t border-slate-800/80 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Info */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2 text-white font-bold text-base">
              <div className="p-1.5 bg-[#087EA4] rounded-lg text-white">
                <Wind className="w-4 h-4" />
              </div>
              <span className="tracking-tight">AeroAqua</span>
            </div>
            <p className="text-slate-300 font-semibold text-xs">
              Environmental Intelligence Platform
            </p>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Real-time atmospheric telemetry, XGBoost predictive forecasting, and state-level aquifer monitoring.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-3">
              Navigation
            </h4>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="hover:text-white transition-colors flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-[#27B8C7]" />
                  Air Intelligence
                </Link>
              </li>
              <li>
                <Link to="/groundwater" className="hover:text-white transition-colors flex items-center gap-1.5">
                  <Droplets className="w-3.5 h-3.5 text-[#27B8C7]" />
                  Groundwater
                </Link>
              </li>
              <li>
                <Link to="/events" className="hover:text-white transition-colors flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#27B8C7]" />
                  Events &amp; Context
                </Link>
              </li>
              <li>
                <Link to="/alerts" className="hover:text-white transition-colors flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-[#27B8C7]" />
                  Alerts
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-3">
              Legal &amp; Policy
            </h4>
            <ul className="space-y-2">
              <li>
                <a href="#privacy" className="hover:text-white transition-colors">
                  Privacy
                </a>
              </li>
              <li>
                <a href="#terms" className="hover:text-white transition-colors">
                  Terms &amp; Conditions
                </a>
              </li>
              <li>
                <a href="#contact" className="hover:text-white transition-colors">
                  Contact Us
                </a>
              </li>
            </ul>
          </div>

          {/* Provenance */}
          <div>
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-3">
              Data Provenance
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed mb-2">
              <strong className="text-slate-200">Groundwater:</strong> Central Ground Water Board (2012–2021) via Kaggle India Ground Water Quality.
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              <strong className="text-slate-200">Atmosphere &amp; Weather:</strong> OpenAQ v3 live API &amp; Open-Meteo High-Resolution Forecasting.
            </p>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]">
          <p>© {new Date().getFullYear()} AeroAqua. All rights reserved.</p>
          <p className="text-slate-400">
            Asia/Kolkata (IST) Standardized Telemetry • Environmental Non-Causal Framework
          </p>
        </div>
      </div>
    </footer>
  );
}
