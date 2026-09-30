import React from 'react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { History, Calendar, AlertTriangle } from 'lucide-react';

export default function HistoryChart({ readings = [], hours = 48 }) {
  if (!readings || readings.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-200 text-center text-slate-500 text-sm">
        No historical readings available for this station.
      </div>
    );
  }

  // Format data for Recharts
  const chartData = readings.map((r) => {
    const dt = new Date(r.timestamp);
    const timeLabel = `${String(dt.getHours()).padStart(2, '0')}:00`;
    const dateLabel = `${dt.getMonth() + 1}/${dt.getDate()}`;

    return {
      timestamp: r.timestamp,
      label: `${dateLabel} ${timeLabel}`,
      pm25: r.pm25,
      baseline_mean: r.baseline_mean,
      baseline_upper: r.baseline_upper,
      is_anomaly: r.is_anomaly,
      anomalyVal: r.is_anomaly ? r.pm25 : null,
    };
  });

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 flex-wrap gap-2">
        <div className="flex items-center space-x-2">
          <span className="p-2 bg-slate-100 text-slate-700 rounded-xl">
            <History className="w-5 h-5" />
          </span>
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              Air Quality & Baseline Band ({hours}h History)
            </h3>
            <p className="text-xs text-slate-500">
              Recorded PM2.5 compared with dynamic 14-day hourly baseline band (Mean + 2.5·std threshold)
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-1.5 text-slate-600">
            <span className="w-3 h-0.5 bg-sky-600"></span>
            <span>Recorded PM2.5</span>
          </div>
          <div className="flex items-center space-x-1.5 text-slate-600">
            <span className="w-3 h-2 bg-amber-100 border border-amber-300"></span>
            <span>Normal Baseline Band</span>
          </div>
          <div className="flex items-center space-x-1.5 text-rose-600 font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
            <span>Spike Anomaly</span>
          </div>
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="label"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              minTickGap={30}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              domain={[0, 'auto']}
              unit=" µg"
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  return (
                    <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-800 text-xs">
                      <div className="text-slate-400 mb-1">{d.label}</div>
                      <div className="flex items-baseline space-x-1 text-sm font-bold text-sky-400">
                        <span>PM2.5: {d.pm25} µg/m³</span>
                      </div>
                      <div className="text-amber-300 mt-1">
                        Baseline Upper Band: {d.baseline_upper} µg/m³
                      </div>
                      <div className="text-slate-400">
                        Baseline Mean: {d.baseline_mean} µg/m³
                      </div>
                      {d.is_anomaly && (
                        <div className="mt-1 text-rose-400 font-bold flex items-center space-x-1">
                          <AlertTriangle className="w-3 h-3 text-rose-400 inline" />
                          <span>Anomaly Exceeds Threshold</span>
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            {/* Shaded Normal Baseline Area */}
            <Area
              type="monotone"
              dataKey="baseline_upper"
              stroke="#fbbf24"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              fill="#fef3c7"
              fillOpacity={0.4}
              name="Baseline Upper (Threshold)"
            />
            {/* Historical Mean */}
            <Line
              type="monotone"
              dataKey="baseline_mean"
              stroke="#d97706"
              strokeDasharray="3 3"
              strokeWidth={1}
              dot={false}
              name="Baseline Mean"
            />
            {/* Recorded PM2.5 line */}
            <Line
              type="monotone"
              dataKey="pm25"
              stroke="#0284c7"
              strokeWidth={2.5}
              dot={false}
              name="Recorded PM2.5"
            />
            {/* Anomalous Points Highlighted */}
            <Line
              type="monotone"
              dataKey="anomalyVal"
              stroke="transparent"
              dot={{ r: 6, fill: '#ef4444', stroke: '#ffffff', strokeWidth: 2 }}
              name="Anomaly Point"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
