import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  Droplets,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Info,
  Calendar,
  Layers,
  Database,
  ShieldCheck,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Groundwater() {
  const { currentRegion } = useAuth();
  const [states, setStates] = useState([]);
  const [selectedState, setSelectedState] = useState('DELHI');
  const [summary, setSummary] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [activeParam, setActiveParam] = useState('ph');
  const [loading, setLoading] = useState(true);
  const [loadingTrends, setLoadingTrends] = useState(false);
  const [error, setError] = useState(null);

  // Fetch available states on mount
  useEffect(() => {
    const fetchStates = async () => {
      try {
        const data = await api.getGroundwaterStates();
        setStates(data);
        // Default to currentRegion if matching state exists
        const matched = data.find(
          (s) => s.state.toLowerCase() === currentRegion.toLowerCase()
        );
        if (matched) {
          setSelectedState(matched.state);
        } else if (data.length > 0) {
          setSelectedState(data[0].state);
        }
      } catch (err) {
        console.error('Failed to load groundwater states', err);
        setError('Failed to connect to groundwater database.');
      }
    };
    fetchStates();
  }, [currentRegion]);

  // Fetch summary when state changes
  useEffect(() => {
    if (!selectedState) return;
    const fetchSummary = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getGroundwaterSummary(selectedState);
        // Resilient normalization for both object map and array formats
        let normalizedParams = data?.parameters_map || data?.parameters || {};
        if (Array.isArray(data?.parameters)) {
          normalizedParams = data.parameters.reduce((acc, p) => {
            acc[p.key] = {
              ...p,
              latest_mean: p.latest_mean ?? p.latest_value,
              observed_min: p.observed_min ?? p.baseline_mean,
              observed_max: p.observed_max ?? p.baseline_mean,
              status: p.status ?? p.risk_level,
            };
            return acc;
          }, {});
        }
        setSummary({
          ...data,
          parameters: normalizedParams,
        });
      } catch (err) {
        console.error('Error fetching groundwater summary', err);
        setError('Unable to load groundwater data for selected state.');
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, [selectedState]);

  // Fetch trends when state or active parameter changes
  useEffect(() => {
    if (!selectedState) return;
    const fetchTrends = async () => {
      setLoadingTrends(true);
      try {
        const data = await api.getGroundwaterTrends(selectedState, activeParam);
        const list = Array.isArray(data) ? data : (data?.trends || []);
        setTrendData(list);
      } catch (err) {
        console.error('Error fetching groundwater trends', err);
      } finally {
        setLoadingTrends(false);
      }
    };
    fetchTrends();
  }, [selectedState, activeParam]);

  const getRiskBadge = (level) => {
    switch ((level || '').toUpperCase()) {
      case 'CRITICAL':
      case 'HIGH':
        return <span className="px-3 py-1 bg-rose-100 text-rose-800 font-bold rounded-full text-xs">HIGH RISK</span>;
      case 'MODERATE':
      case 'WARNING':
      case 'WATCH':
        return <span className="px-3 py-1 bg-amber-100 text-amber-800 font-bold rounded-full text-xs">MODERATE RISK</span>;
      case 'LOW':
      case 'NORMAL':
        return <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-full text-xs">LOW RISK</span>;
      default:
        return <span className="px-3 py-1 bg-slate-100 text-slate-700 font-bold rounded-full text-xs">INSUFFICIENT DATA</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <Droplets className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Groundwater Quality Intelligence
                </h1>
                <p className="text-sm text-slate-500 font-medium">
                  Historical Groundwater Quality (2012–2021)
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-md">
                <Database className="w-3.5 h-3.5 text-slate-500" />
                Source: Kaggle — India Ground Water Quality Statewise 2012–2021
              </span>
              <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md font-medium">
                <Info className="w-3.5 h-3.5 text-blue-600" />
                Historical Baselines &amp; BIS IS 10500 Potability Standards
              </span>
              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 px-2.5 py-1 rounded-md">
                Notice: 2020 sampling suspended nationwide due to COVID-19
              </span>
            </div>
          </div>

          {/* State Selector */}
          <div className="flex items-center gap-3">
            <label htmlFor="state-select" className="text-sm font-semibold text-slate-700 whitespace-nowrap">
              Select State / UT:
            </label>
            <select
              id="state-select"
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-2.5 font-medium min-w-[200px]"
            >
              {states.map((st) => (
                <option key={st.state} value={st.state}>
                  {st.state} ({st.records_count} records)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-3 text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 text-sm">Loading historical groundwater records...</p>
        </div>
      ) : summary ? (
        <>
          {/* Overall State Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Groundwater Risk</span>
                <div className="mt-2 flex items-center gap-2">
                  {getRiskBadge(summary.groundwater_risk?.level)}
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-600 leading-relaxed">
                {summary.groundwater_risk?.summary || 'Standard aquifer parameters within monitored limits.'}
              </p>
            </div>

            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Monitored Stations</span>
              <p className="mt-2 text-2xl font-bold text-slate-900">{summary.unique_stations_count}</p>
              <p className="mt-1 text-xs text-slate-500">Across state sampling network</p>
            </div>

            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Recorded Samples</span>
              <p className="mt-2 text-2xl font-bold text-slate-900">{summary.total_records}</p>
              <p className="mt-1 text-xs text-slate-500">Span: {summary.year_range?.min} – {summary.year_range?.max}</p>
            </div>

            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Standard Framework</span>
              <p className="mt-2 text-lg font-bold text-slate-900">BIS IS 10500:2012</p>
              <p className="mt-1 text-xs text-slate-500">Indian Potable Water Drinking Standards</p>
            </div>
          </div>

          {/* Core Parameters Cards: pH, Conductivity, Temperature */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* pH Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">pH Level</h3>
                  <span className="text-xs font-medium text-slate-500">BIS Range: 6.5 – 8.5</span>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-slate-900">
                    {summary.parameters?.ph?.latest_mean != null ? summary.parameters.ph.latest_mean : 'N/A'}
                  </span>
                  <span className="text-sm font-semibold text-slate-500">pH</span>
                </div>

                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Baseline Historical Mean</span>
                    <span className="font-semibold text-slate-700">{summary.parameters?.ph?.baseline_mean ?? 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Observed Range (Min - Max)</span>
                    <span className="font-semibold text-slate-700">
                      {summary.parameters?.ph?.observed_min ?? 'N/A'} – {summary.parameters?.ph?.observed_max ?? 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Deviation from Baseline</span>
                    <span className={`font-semibold ${summary.parameters?.ph?.deviation_pct > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
                      {summary.parameters?.ph?.deviation_pct != null ? `${summary.parameters.ph.deviation_pct}%` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Historical Z-Score</span>
                    <span className="font-semibold text-slate-700">{summary.parameters?.ph?.z_score ?? 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                  summary.parameters?.ph?.status === 'NORMAL' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                }`}>
                  Status: {summary.parameters?.ph?.status || 'NORMAL'}
                </span>
              </div>
            </div>

            {/* Conductivity Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">Conductivity (EC)</h3>
                  <span className="text-xs font-medium text-slate-500">BIS Desirable: &lt;750 µmhos/cm</span>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-slate-900">
                    {summary.parameters?.conductivity?.latest_mean != null ? summary.parameters.conductivity.latest_mean : 'N/A'}
                  </span>
                  <span className="text-sm font-semibold text-slate-500">µmhos/cm</span>
                </div>

                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Baseline Historical Mean</span>
                    <span className="font-semibold text-slate-700">{summary.parameters?.conductivity?.baseline_mean ?? 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Observed Range (Min - Max)</span>
                    <span className="font-semibold text-slate-700">
                      {summary.parameters?.conductivity?.observed_min ?? 'N/A'} – {summary.parameters?.conductivity?.observed_max ?? 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Deviation from Baseline</span>
                    <span className={`font-semibold ${summary.parameters?.conductivity?.deviation_pct > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
                      {summary.parameters?.conductivity?.deviation_pct != null ? `${summary.parameters.conductivity.deviation_pct}%` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Historical Z-Score</span>
                    <span className="font-semibold text-slate-700">{summary.parameters?.conductivity?.z_score ?? 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${
                  summary.parameters?.conductivity?.status === 'LOW' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                }`}>
                  Status: {summary.parameters?.conductivity?.status || 'LOW'}
                </span>
                <p className="text-[11px] text-slate-500 leading-relaxed border-t border-slate-100 pt-2">
                  <strong className="text-slate-700 font-semibold">Parameter Context: </strong>
                  Electrical Conductivity (EC) indicates the ability of water to conduct electrical current and is commonly used as an indicator of the concentration of dissolved ions/salts in water.
                </p>
              </div>
            </div>

            {/* Temperature Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">Aquifer Temperature</h3>
                  <span className="text-xs font-medium text-slate-500">Monitored In-Situ Range</span>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-slate-900">
                    {summary.parameters?.temperature?.latest_mean != null ? summary.parameters.temperature.latest_mean : 'N/A'}
                  </span>
                  <span className="text-sm font-semibold text-slate-500">°C</span>
                </div>

                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Baseline Historical Mean</span>
                    <span className="font-semibold text-slate-700">{summary.parameters?.temperature?.baseline_mean ?? 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Observed Range (Min - Max)</span>
                    <span className="font-semibold text-slate-700">
                      {summary.parameters?.temperature?.observed_min ?? 'N/A'} – {summary.parameters?.temperature?.observed_max ?? 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Deviation from Baseline</span>
                    <span className="font-semibold text-slate-700">
                      {summary.parameters?.temperature?.deviation_pct != null ? `${summary.parameters.temperature.deviation_pct}%` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Historical Z-Score</span>
                    <span className="font-semibold text-slate-700">{summary.parameters?.temperature?.z_score ?? 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                  Status: {summary.parameters?.temperature?.status || 'LOW'}
                </span>
                <p className="text-[11px] text-slate-500 leading-relaxed border-t border-slate-100 pt-2">
                  <strong className="text-slate-700 font-semibold">Measurement Note: </strong>
                  Aquifer temperature is the recorded temperature of groundwater at the monitoring location/depth represented in the historical dataset.
                </p>
              </div>
            </div>
          </div>

          {/* Historical Trends Chart Section */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Year-Over-Year Parameter Trends (2012–2021)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  State-level annual averages and ranges across sampling stations
                </p>
              </div>

              {/* Parameter Toggle Tabs */}
              <div className="flex p-1 bg-slate-100 rounded-xl">
                <button
                  onClick={() => setActiveParam('ph')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    activeParam === 'ph' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  pH Level
                </button>
                <button
                  onClick={() => setActiveParam('conductivity')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    activeParam === 'conductivity' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Conductivity (EC)
                </button>
                <button
                  onClick={() => setActiveParam('temperature')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    activeParam === 'temperature' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Temperature
                </button>
              </div>
            </div>

            {loadingTrends ? (
              <div className="h-72 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : trendData.length > 0 ? (
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="year" stroke="#64748b" tick={{ fontSize: 12 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#cbd5e1',
                        borderRadius: '0.75rem',
                        fontSize: '0.85rem',
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="mean"
                      stroke="#2563eb"
                      strokeWidth={2.5}
                      name="Annual Mean"
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="min"
                      stroke="#10b981"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      name="Annual Min"
                    />
                    <Line
                      type="monotone"
                      dataKey="max"
                      stroke="#f59e0b"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      name="Annual Max"
                    />
                    {summary.parameters?.[activeParam]?.baseline_mean != null && (
                      <ReferenceLine
                        y={summary.parameters[activeParam].baseline_mean}
                        stroke="#dc2626"
                        strokeDasharray="3 3"
                        label={{
                          value: `Baseline: ${summary.parameters[activeParam].baseline_mean}`,
                          fill: '#dc2626',
                          fontSize: 11,
                          position: 'top',
                        }}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-10">No trend series available for this parameter.</p>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
