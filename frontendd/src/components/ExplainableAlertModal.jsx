import React from 'react';
import {
  HelpCircle,
  X,
  AlertTriangle,
  TrendingUp,
  Activity,
  Wind,
  Car,
  Calendar,
  Factory,
  Navigation,
  ShieldCheck,
  Info,
  Clock,
  Radio,
  Sparkles,
} from 'lucide-react';
import { getRiskBadgeClasses, getAqiMeta } from '../utils/aqi';
import { formatISTDateTime } from '../utils/dateTime';

export default function ExplainableAlertModal({ isOpen, alert, onClose }) {
  if (!isOpen || !alert) return null;

  const expl = alert.explanation || {};
  const currentPm25 = alert.current_pm25 ?? expl.current_pm25 ?? 0.0;
  const aqiMeta = getAqiMeta(currentPm25);
  const deviation = alert.deviation_pct ?? expl.deviation_pct ?? 0.0;
  const severity = alert.anomaly_severity || expl.anomaly_severity || alert.risk_level || 'MODERATE';
  const provenance = alert.provenance || expl.provenance || 'LIVE';
  const factors = expl.factors || [];
  const recs = expl.recommendations || [
    'Consider reducing prolonged outdoor exposure.',
    'Check the 6-hour forecast before planning outdoor activities.',
    'Follow official instructions if an authority issues an emergency advisory.',
  ];

  const getProvenanceBadge = (prov) => {
    if (prov === 'SIMULATION') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-300">
          SIMULATION • Authority What-If
        </span>
      );
    }
    if (prov === 'HISTORICAL') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
          HISTORICAL • CGWB/CPCB
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
        LIVE • OpenAQ Telemetry
      </span>
    );
  };

  const getFactorIcon = (type) => {
    switch (type) {
      case 'event':
        return <Calendar className="w-3.5 h-3.5 text-purple-600" />;
      case 'traffic':
        return <Car className="w-3.5 h-3.5 text-amber-600" />;
      case 'wind':
        return <Wind className="w-3.5 h-3.5 text-sky-600" />;
      case 'roads':
        return <Navigation className="w-3.5 h-3.5 text-emerald-600" />;
      case 'industry':
        return <Factory className="w-3.5 h-3.5 text-slate-600" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-blue-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-sky-500/20 text-sky-400 rounded-lg border border-sky-500/30">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base tracking-wide text-white">
                Why am I seeing this alert?
              </h3>
              <p className="text-[11px] text-slate-400">
                Transparent environmental anomaly breakdown &amp; provenance
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 space-y-5 overflow-y-auto text-xs">
          {/* Top Summary Banner */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${getRiskBadgeClasses(alert.risk_level)}`}>
                  {alert.risk_level} ALERT
                </span>
                <span className="font-bold text-slate-800 text-sm">{alert.station_name || alert.region}</span>
              </div>
              {getProvenanceBadge(provenance)}
            </div>

            <h4 className="font-bold text-slate-900 text-sm leading-snug">{alert.title}</h4>
            <p className="text-slate-600 leading-relaxed">{alert.message}</p>
          </div>

          {/* 4 Quantitative Telemetry Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* 1. Current PM2.5 */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                Current Condition
              </span>
              <div className="flex items-baseline space-x-1">
                <span className="text-xl font-black text-slate-900 font-mono">{currentPm25}</span>
                <span className="text-[10px] text-slate-500">µg/m³</span>
              </div>
              <span className="text-[10px] font-bold mt-1 block" style={{ color: aqiMeta.color }}>
                {aqiMeta.category}
              </span>
            </div>

            {/* 2. Historical Deviation */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                Historical Deviation
              </span>
              <div className="flex items-baseline space-x-1">
                <span className={`text-xl font-black font-mono ${deviation > 30 ? 'text-rose-600' : 'text-slate-800'}`}>
                  {deviation > 0 ? `+${deviation}%` : `${deviation}%`}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                vs. same-hour baseline
              </span>
            </div>

            {/* 3. Anomaly Severity */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                Anomaly Severity
              </span>
              <span className="text-sm font-black uppercase text-rose-600 block mt-1">
                {severity}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                {expl.z_score ? `${expl.z_score}σ standard deviation` : 'Statistical threshold'}
              </span>
            </div>

            {/* 4. Forecast Trend */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                Forecast Outlook
              </span>
              <div className="space-y-0.5 font-mono text-[11px] font-bold text-slate-700">
                {expl.forecast_1h && <div>+1h: {expl.forecast_1h} µg/m³</div>}
                {expl.forecast_3h && <div>+3h: {expl.forecast_3h} µg/m³</div>}
                {expl.forecast_6h && <div className="text-rose-600">+6h: {expl.forecast_6h} µg/m³</div>}
                {!expl.forecast_1h && !expl.forecast_3h && !expl.forecast_6h && <div>Elevated Trend</div>}
              </div>
            </div>
          </div>

          {/* Environmental Context Factors */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center space-x-1.5 font-bold text-slate-800 text-xs">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Potentially Relevant Environmental Factors (Context Engine)</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Spatial &amp; temporal alignment identified by our non-causal Context Engine:
            </p>

            {factors.length > 0 ? (
              <div className="space-y-2 pt-1">
                {factors.slice(0, 4).map((factor, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-start space-x-2.5"
                  >
                    <span className="p-1 bg-slate-100 rounded text-slate-600 mt-0.5">
                      {getFactorIcon(factor.type)}
                    </span>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-800 text-[11px]">{factor.text}</p>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                        Factor: {factor.type} • Potentially relevant factor
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-2 bg-white rounded-lg border border-slate-200 text-slate-500 text-[11px]">
                Low wind dispersion and elevated regional background concentration detected.
              </div>
            )}
          </div>

          {/* What You Should Know */}
          <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl text-blue-950 space-y-1">
            <div className="flex items-center space-x-1.5 font-bold text-xs text-blue-900">
              <Info className="w-4 h-4 text-blue-700" />
              <span>What you should know</span>
            </div>
            <p className="text-[11px] text-blue-900/90 leading-relaxed">
              {expl.what_you_should_know || 'Pollution is currently unusually high compared with the zone’s historical pattern.'}
            </p>
          </div>

          {/* What You Can Do (Action Cards) */}
          <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-950 space-y-2.5">
            <div className="flex items-center space-x-1.5 font-bold text-xs text-emerald-900">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>What you can do (Action Recommendations)</span>
            </div>
            <div className="space-y-1.5">
              {recs.map((rec, idx) => (
                <div key={idx} className="flex items-start space-x-2 text-[11px] text-emerald-900/90">
                  <span className="font-bold text-emerald-700 mt-0.5">•</span>
                  <span>{rec}</span>
                </div>
              ))}
            </div>
            <span className="text-[10px] text-emerald-700 block italic pt-1">
              * General informational recommendations only. Always heed official emergency advisories.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-[10px] text-slate-400 font-mono">
            Alert generated: {formatISTDateTime(alert.created_at)}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs"
          >
            Close Explanation
          </button>
        </div>
      </div>
    </div>
  );
}
