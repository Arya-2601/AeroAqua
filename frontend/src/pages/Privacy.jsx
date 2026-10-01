import React from 'react';
import { ShieldCheck, Lock, Eye, Database } from 'lucide-react';

export default function Privacy() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="text-center space-y-2">
        <div className="inline-flex p-3 bg-blue-50 text-blue-600 rounded-2xl">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Privacy Policy</h1>
        <p className="text-xs text-slate-500">
          Last revised: September 2026 | AeroAqua Environmental Intelligence Platform
        </p>
      </div>

      <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm space-y-6 text-sm text-slate-700 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-600" />
            1. Nature of Environmental Data
          </h2>
          <p>
            AeroAqua aggregates public domain ambient air monitoring data (via OpenAQ v3), meteorological telemetry (via Open-Meteo), and historical groundwater assessments (CPCB / Kaggle India Ground Water Quality 2012–2021). All environmental datasets ingested represent public atmospheric and hydrological metrics and contain zero personally identifiable information (PII).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Lock className="w-4 h-4 text-blue-600" />
            2. Authority Credentials and Security
          </h2>
          <p>
            Authority access tokens and role credentials are encrypted using industry standard SHA-256 / JWT mechanisms. Authentication tokens are strictly used to authorize emergency alert broadcasting, resolution workflows, and event management operations.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Eye className="w-4 h-4 text-blue-600" />
            3. Public Citizen Telemetry Access
          </h2>
          <p>
            Citizens access air quality indices, risk forecasts, and official municipal broadcasts anonymously. No tracking cookies, location beacons, or invasive biometric identifiers are stored or shared.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">4. Third-Party API Transmissions</h2>
          <p>
            Real-time coordinates for regional weather and ambient air station queries are transmitted directly to Open-Meteo and OpenAQ endpoints via HTTPS in accordance with their respective open data licenses and rate-limiting guidelines.
          </p>
        </section>
      </div>
    </div>
  );
}
