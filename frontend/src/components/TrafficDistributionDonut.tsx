import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';

interface TrafficDistributionProps {
  flows?: Array<{ protocol?: string | null; prediction?: string | null }>;
}

const PROTOCOL_COLORS = ['#38bdf8', '#818cf8', '#f59e0b', '#34d399'];
const THREAT_COLORS = ['#10b981', '#f43f5e', '#f97316', '#a855f7', '#fbbf24'];

export const TrafficDistributionDonut: React.FC<TrafficDistributionProps> = ({ flows = [] }) => {
  // Compute protocol distribution
  const protoCounts: Record<string, number> = {};
  const threatCounts: Record<string, number> = {};

  if (flows && flows.length > 0) {
    flows.forEach((f) => {
      const proto = f.protocol || 'TCP';
      protoCounts[proto] = (protoCounts[proto] || 0) + 1;

      const pred = f.prediction || 'BENIGN';
      threatCounts[pred] = (threatCounts[pred] || 0) + 1;
    });
  }

  const protoData = Object.keys(protoCounts).length
    ? Object.entries(protoCounts).map(([name, value]) => ({ name, value }))
    : [
        { name: 'TCP', value: 72 },
        { name: 'UDP', value: 24 },
        { name: 'ICMP', value: 4 },
      ];

  const threatData = Object.keys(threatCounts).length
    ? Object.entries(threatCounts).map(([name, value]) => ({ name, value }))
    : [
        { name: 'BENIGN', value: 85 },
        { name: 'PortScan', value: 9 },
        { name: 'DoS / DDoS', value: 4 },
        { name: 'Botnet', value: 2 },
      ];

  return (
    <div className="glass-panel rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <PieIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-white">Telemetry Breakdown</h3>
            <p className="text-[11px] text-slate-400">Protocol & Attack Class Distribution</p>
          </div>
        </div>
      </div>

      {/* Dual Donut Visualizer */}
      <div className="grid grid-cols-2 gap-4 my-2">
        {/* Protocol Donut */}
        <div className="flex flex-col items-center">
          <div className="h-36 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={protoData}
                  cx="50%"
                  cy="50%"
                  innerRadius={36}
                  outerRadius={54}
                  paddingAngle={4}
                  dataKey="value"
                  animationDuration={1200}
                >
                  {protoData.map((_, index) => (
                    <Cell
                      key={`proto-cell-${index}`}
                      fill={PROTOCOL_COLORS[index % PROTOCOL_COLORS.length]}
                      stroke="rgba(0,0,0,0.4)"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const d = payload[0];
                    return (
                      <div className="glass-panel p-2 rounded-lg border border-cyan-500/30 text-[11px] font-mono shadow-lg">
                        <span className="text-white font-bold">{d.name}: </span>
                        <span className="text-cyan-400 font-extrabold">{d.value} flows</span>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
              <span className="text-[10px] font-bold text-slate-400 uppercase">PROTO</span>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-2 mt-1">
            {protoData.map((p, i) => (
              <span key={p.name} className="flex items-center gap-1 text-[10px] font-mono text-slate-300">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PROTOCOL_COLORS[i % PROTOCOL_COLORS.length] }} />
                {p.name}
              </span>
            ))}
          </div>
        </div>

        {/* Threat Class Donut */}
        <div className="flex flex-col items-center">
          <div className="h-36 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={threatData}
                  cx="50%"
                  cy="50%"
                  innerRadius={36}
                  outerRadius={54}
                  paddingAngle={4}
                  dataKey="value"
                  animationDuration={1400}
                >
                  {threatData.map((_, index) => (
                    <Cell
                      key={`threat-cell-${index}`}
                      fill={THREAT_COLORS[index % THREAT_COLORS.length]}
                      stroke="rgba(0,0,0,0.4)"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const d = payload[0];
                    return (
                      <div className="glass-panel p-2 rounded-lg border border-rose-500/30 text-[11px] font-mono shadow-lg">
                        <span className="text-white font-bold">{d.name}: </span>
                        <span className="text-rose-400 font-extrabold">{d.value}</span>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
              <span className="text-[10px] font-bold text-slate-400 uppercase">CLASS</span>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-2 mt-1">
            {threatData.slice(0, 3).map((t, i) => (
              <span key={t.name} className="flex items-center gap-1 text-[10px] font-mono text-slate-300">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: THREAT_COLORS[i % THREAT_COLORS.length] }} />
                {t.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-white/[0.06] text-[11px] text-slate-400 flex items-center justify-between">
        <span>Active Flow Sample</span>
        <span className="font-mono text-cyan-300 font-bold">100 Flows Aggregated</span>
      </div>
    </div>
  );
};
