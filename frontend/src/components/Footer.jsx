import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, ShieldCheck, Database, Droplets, Wind } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 text-xs border-t border-slate-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Info */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2 text-white font-bold text-base">
              <div className="p-1.5 bg-blue-600 rounded-lg text-white">
                <Wind className="w-4 h-4" />
              </div>
              <span>AeroAqua</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              API-Powered Air + Groundwater Intelligence Platform providing cross-domain environmental monitoring, XGBoost forecasting, and authority emergency broadcasting.
            </p>
          </div>

          {/* Platform Navigation */}
          <div>
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-3">
              Intelligence Portals
            </h4>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="hover:text-white transition-colors">
                  Air Quality &amp; Weather Dashboard
                </Link>
              </li>
              <li>
                <Link to="/groundwater" className="hover:text-white transition-colors flex items-center gap-1.5">
                  <Droplets className="w-3.5 h-3.5 text-blue-400" />
                  Groundwater Intelligence (2012–2021)
                </Link>
              </li>
              <li>
                <Link to="/alerts" className="hover:text-white transition-colors">
                  Alerts &amp; Authority Broadcasts
                </Link>
              </li>
              <li>
                <Link to="/events" className="hover:text-white transition-colors">
                  Traffic &amp; Industrial Events
                </Link>
              </li>
            </ul>
          </div>

          {/* Account & Administration */}
          <div>
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-3">
              Access &amp; Administration
            </h4>
            <ul className="space-y-2">
              <li>
                <Link to="/login" className="hover:text-white transition-colors flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  Authority Portal &amp; Role Switch
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-white transition-colors">
                  Contact &amp; PCB Liaison
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-white transition-colors">
                  Terms &amp; Non-Causal Disclaimers
                </Link>
              </li>
            </ul>
          </div>

          {/* Data Provenance & Attribution */}
          <div>
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-3">
              Data Attribution
            </h4>
            <p className="text-[11px] text-slate-400 leading-normal mb-2">
              <strong className="text-slate-200">Historical Groundwater:</strong> Central Ground Water Board (2012–2021) via Kaggle India Ground Water Quality.
            </p>
            <p className="text-[11px] text-slate-400 leading-normal">
              <strong className="text-slate-200">Ambient Air &amp; Weather:</strong> OpenAQ v3 API and Open-Meteo High-Resolution Forecasting.
            </p>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]">
          <p>© {new Date().getFullYear()} AeroAqua Intelligence. All rights reserved.</p>
          <p className="text-slate-500">
            Hackathon Grade Environmental Intelligence • Non-Causal Correlation Model
          </p>
        </div>
      </div>
    </footer>
  );
}
