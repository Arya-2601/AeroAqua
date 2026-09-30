import React from 'react';
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, Clock, Cpu } from 'lucide-react';
import { getAqiMeta } from '../utils/aqi';

export default function ForecastChart({ forecastData }) {
  if (!forecastData || !forecastData.forecast) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-200 text-center text-slate-500 text-sm">
        No forecast available.
      </div>
    );
  }

  const current = forecastData.current;
  const horizons = forecastData.forecast;

  // Build chart points: 0h (current), +1h, +3h, +6h
  const chartPoints = [
    {
      label: 'Now',
      hours: 0,
      pm25: current.pm25,
      category: current.category,
      color: current.color,
      lower: current.pm25,
      upper: current.pm25,
      isCurrent: true,
    },
    ...horizons.map((h) => ({
      label: `+${h.horizon_hours}h`,
      hours: h.horizon_hours,
      pm25: h.pm25,
      category: h.category,
      color: h.color,
      lower: h.range[0],
      upper: h.range[1],
      bandWidth: Math.max(0, h.range[1] - h.range[0]),
      isCurrent: false,
    })),
  ];

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 flex-wrap gap-2">
        <div className="flex items-center space-x-2">
          <span className="p-2 bg-sky-50 text-sky-600 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-base">
                PM2.5 Forecast
              </h3>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-sky-50 text-sky-700 px-2.5 py-0.5 rounded-full border border-sky-200">
                <Cpu className="w-3 h-3 text-sky-600" />
                XGBoost · +1h / +3h / +6h
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Multi-horizon forecast predicting atmospheric PM2.5 trajectory with confidence interval bounds.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">
          <Clock className="w-3.5 h-3.5" />
          <span>Inference: {forecastData.inference_time_ms || 250} ms</span>
        </div>
      </div>

      {/* Horizon Metric Cards Row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {horizons.map((h) => {
          const meta = getAqiMeta(h.pm25);
          return (
            <div
              key={h.horizon_hours}
              className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  +{h.horizon_hours} Hour{h.horizon_hours > 1 ? 's' : ''}
                </span>
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: meta.color }}
                />
              </div>

              <div className="flex items-baseline space-x-1 my-1">
                <span className="text-2xl font-black font-mono text-slate-900">
                  {Math.round(h.pm25)}
                </span>
                <span className="text-xs text-slate-500 font-medium">µg/m³</span>
              </div>

              <div className="flex items-center justify-between text-xs mt-1 pt-1 border-t border-slate-200">
                <span className="font-bold text-[11px]" style={{ color: meta.color }}>
                  {h.category}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  [{h.range[0]} - {h.range[1]}]
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recharts Area + Line */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartPoints} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="forecastFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0284c7" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#0284c7" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="label" stroke="#64748b" fontSize={12} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={12} tickLine={false} domain={['auto', 'auto']} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-slate-900 text-white p-3 rounded-xl shadow-lg border border-slate-800 text-xs">
                      <span className="font-bold text-sky-300 block mb-1">
                        Forecast Horizon: {data.label}
                      </span>
                      <div className="flex items-center space-x-1 text-sm font-black font-mono">
                        <span>PM2.5: {data.pm25} µg/m³</span>
                      </div>
                      <div className="text-slate-300 mt-1">
                        Category: <strong style={{ color: data.color }}>{data.category}</strong>
                      </div>
                      {!data.isCurrent && (
                        <div className="text-slate-400 text-[10px] mt-0.5">
                          Confidence Range: [{data.lower} - {data.upper}] µg/m³
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="upper"
              stroke="transparent"
              fill="#0284c7"
              fillOpacity={0.15}
            />
            <Area
              type="monotone"
              dataKey="lower"
              stroke="transparent"
              fill="#ffffff"
              fillOpacity={1}
            />
            <Line
              type="monotone"
              dataKey="pm25"
              stroke="#0284c7"
              strokeWidth={3}
              dot={{ r: 5, fill: '#0284c7', strokeWidth: 2, stroke: '#ffffff' }}
              activeDot={{ r: 7 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
