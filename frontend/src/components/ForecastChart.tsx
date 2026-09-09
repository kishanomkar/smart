import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { motion } from 'framer-motion';
import { TrendingUp, Sparkles, BrainCircuit, ShieldAlert, CheckCircle2 } from 'lucide-react';
import type { ForecastPoint } from '../types/api';

export function ForecastChart({ points }: { points: ForecastPoint[] }) {
  const [hoveredPoint, setHoveredPoint] = useState<any | null>(null);

  // Fallback demo data when World Model has no active forecast rows yet
  const displayPoints = points && points.length > 0 ? points : [
    { horizon: 1, threat_probability: 0.12, predicted_label: 'BENIGN', trend: 'STABLE', forecast_mode: 'world-model' },
    { horizon: 2, threat_probability: 0.18, predicted_label: 'BENIGN', trend: 'STABLE', forecast_mode: 'world-model' },
    { horizon: 3, threat_probability: 0.35, predicted_label: 'RECON', trend: 'RISING', forecast_mode: 'world-model' },
    { horizon: 4, threat_probability: 0.52, predicted_label: 'INITIAL_ACCESS', trend: 'RISING', forecast_mode: 'world-model' },
    { horizon: 5, threat_probability: 0.68, predicted_label: 'LATERAL_MOVE', trend: 'ESCALATING', forecast_mode: 'world-model' },
  ];

  const isSimulated = !points || points.length === 0;

  return (
    <div className="glass-panel rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between h-full min-h-[360px]">
      {/* Ambient background glow */}
      <div className="absolute top-0 right-1/4 w-72 h-72 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white tracking-wide flex items-center gap-2">
              K-Step Future Threat Trajectory
              {isSimulated ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300">
                  LATENT SIMULATION (T+1 → T+5)
                </span>
              ) : (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                  LIVE WORLD MODEL
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400">
              Recursive temporal state prediction across continuous 60s windows
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900/60 border border-white/[0.08] text-slate-300">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            Mode: Recursive State Rollout
          </span>
        </div>
      </div>

      {/* Chart Area */}
      <div className="h-64 w-full relative z-10">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={displayPoints}
            margin={{ top: 10, right: 20, left: -20, bottom: 0 }}
            onMouseMove={(state: any) => {
              if (state && state.activePayload && state.activePayload[0]) {
                setHoveredPoint(state.activePayload[0].payload);
              }
            }}
            onMouseLeave={() => setHoveredPoint(null)}
          >
            <defs>
              <linearGradient id="forecastCyberGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.45} />
                <stop offset="50%" stopColor="#818cf8" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="lineGlow" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="70%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#f43f5e" />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />

            <XAxis
              dataKey="horizon"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
              tickFormatter={(val) => `T+${val} (+${val * 60}s)`}
            />

            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              domain={[0, 1]}
              tickFormatter={(val) => `${Math.round(val * 100)}%`}
            />

            <ReferenceLine
              y={0.7}
              stroke="#f43f5e"
              strokeDasharray="4 4"
              strokeOpacity={0.6}
              label={{
                value: 'CRITICAL THRESHOLD (70%)',
                position: 'top',
                fill: '#f43f5e',
                fontSize: 10,
                fontFamily: 'monospace',
              }}
            />

            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const data = payload[0].payload as ForecastPoint;
                const prob = data.threat_probability ?? 0;
                return (
                  <div className="glass-panel p-3.5 rounded-xl border border-cyan-500/30 text-xs shadow-2xl backdrop-blur-xl">
                    <div className="font-mono text-cyan-400 font-bold mb-1">
                      HORIZON: T+{data.horizon} (+{data.horizon * 60} SECONDS)
                    </div>
                    <div className="flex items-center justify-between gap-4 text-slate-200 mt-1">
                      <span className="text-slate-400">Threat Probability:</span>
                      <span className="font-mono font-extrabold text-white text-sm">
                        {(prob * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4 text-slate-200 mt-1">
                      <span className="text-slate-400">Projected State:</span>
                      <span className="font-mono text-amber-300 font-bold">
                        {data.predicted_label || 'ANOMALOUS'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4 text-slate-200 mt-1">
                      <span className="text-slate-400">Trend Trajectory:</span>
                      <span className={data.trend === 'ESCALATING' ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                        {data.trend || 'STABLE'}
                      </span>
                    </div>
                  </div>
                );
              }}
            />

            <Area
              type="monotone"
              dataKey="threat_probability"
              stroke="url(#lineGlow)"
              strokeWidth={3}
              fill="url(#forecastCyberGradient)"
              animationDuration={1500}
              activeDot={{
                r: 6,
                fill: '#38bdf8',
                stroke: '#ffffff',
                strokeWidth: 2,
                style: { filter: 'drop-shadow(0 0 8px #38bdf8)' },
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Step Badges */}
      <div className="grid grid-cols-5 gap-2 mt-3 pt-3 border-t border-white/[0.06] relative z-10">
        {displayPoints.map((pt) => {
          const prob = pt.threat_probability ?? 0;
          const isHigh = prob >= 0.7;
          const isMed = prob >= 0.4 && prob < 0.7;
          return (
            <div
              key={pt.horizon}
              className={`p-2 rounded-xl text-center border transition-all ${
                isHigh
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  : isMed
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  : 'bg-white/[0.02] border-white/[0.06] text-slate-300'
              }`}
            >
              <div className="text-[10px] font-mono font-bold text-slate-400">T+{pt.horizon}</div>
              <div className="text-xs font-mono font-extrabold mt-0.5">{(prob * 100).toFixed(0)}%</div>
              <div className="text-[9px] truncate mt-0.5 opacity-80">{pt.predicted_label || 'NORMAL'}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
