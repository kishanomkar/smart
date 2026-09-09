import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, ShieldAlert, AlertTriangle, Flame, Activity } from 'lucide-react';

interface RiskGaugeProps {
  risk: number;
  prediction?: string;
  confidence?: number;
  trajectory?: string;
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({
  risk,
  prediction = 'BENIGN',
  confidence = 0.95,
  trajectory = 'STABLE',
}) => {
  const percentage = Math.min(Math.max(Math.round((risk ?? 0) * 100), 0), 100);

  // Determine threat level, colors and human explanation
  let level = 'NORMAL';
  let levelColor = 'text-emerald-400';
  let badgeBg = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
  let glowColor = 'rgba(16, 185, 129, 0.25)';
  let strokeColor = '#10b981';
  let humanNote = 'Network patterns reflect standard operational baseline. No immediate intervention required.';

  if (percentage >= 75) {
    level = 'CRITICAL THREAT';
    levelColor = 'text-rose-400';
    badgeBg = 'bg-rose-500/15 border-rose-500/40 text-rose-400';
    glowColor = 'rgba(244, 63, 94, 0.35)';
    strokeColor = '#f43f5e';
    humanNote = 'Active hostile indicators observed with high likelihood of lateral movement or exfiltration.';
  } else if (percentage >= 45) {
    level = 'ELEVATED RISK';
    levelColor = 'text-amber-400';
    badgeBg = 'bg-amber-500/15 border-amber-500/40 text-amber-400';
    glowColor = 'rgba(245, 158, 11, 0.3)';
    strokeColor = '#f59e0b';
    humanNote = 'Anomalous flow volume and unusual port signatures detected. Recommended analyst scrutiny.';
  } else if (percentage >= 20) {
    level = 'GUARDED';
    levelColor = 'text-cyan-400';
    badgeBg = 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400';
    glowColor = 'rgba(6, 182, 212, 0.25)';
    strokeColor = '#06b6d4';
    humanNote = 'Minor deviations from nominal telemetry. Routine background monitoring active.';
  }

  // SVG Gauge calculations (220 deg arc)
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * (240 / 360);
  const strokeDashoffset = arcLength - (percentage / 100) * arcLength;

  return (
    <div className="glass-panel rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between">
      {/* Ambient background glow */}
      <div
        className="absolute -top-12 -right-12 w-44 h-44 rounded-full blur-3xl pointer-events-none transition-all duration-700"
        style={{ backgroundColor: glowColor }}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.08]">
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-slate-100">Live Threat Index</h3>
            <p className="text-[11px] text-slate-400">Bayesian Real-Time Risk Score</p>
          </div>
        </div>
        <span className={`px-2.5 py-1 text-[11px] font-bold tracking-wider uppercase rounded-full border ${badgeBg}`}>
          {level}
        </span>
      </div>

      {/* Gauge Visualization */}
      <div className="relative flex flex-col items-center justify-center my-2">
        <svg className="w-56 h-44 -rotate-[120deg]" viewBox="0 0 200 200">
          {/* Track Background */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.07)"
            strokeWidth="14"
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
          />

          {/* Animated Value Arc */}
          <motion.circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth="14"
            strokeDasharray={`${arcLength} ${circumference}`}
            initial={{ strokeDashoffset: arcLength }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
            strokeLinecap="round"
            style={{
              filter: `drop-shadow(0 0 10px ${strokeColor})`,
            }}
          />
        </svg>

        {/* Center Counter */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center mt-2 flex flex-col items-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-baseline"
          >
            <span className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white font-mono">{percentage}</span>
            <span className={`text-xl font-bold ml-0.5 ${levelColor}`}>%</span>
          </motion.div>
          <div className="flex items-center gap-1.5 mt-1 px-2.5 py-0.5 rounded-full bg-slate-900/80 border border-slate-700/60 text-[10px] font-mono text-slate-300">
            <span>PRED:</span>
            <span className="font-bold text-slate-900 dark:text-white">{prediction}</span>
          </div>
        </div>
      </div>

      {/* Human Insight & Meta */}
      <div className="space-y-3 pt-3 border-t border-white/[0.06] relative z-10">
        <p className="text-xs text-slate-300 leading-relaxed font-normal bg-slate-900/40 p-3 rounded-xl border border-white/[0.04]">
          {humanNote}
        </p>

        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
          <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04] flex justify-between items-center">
            <span className="text-slate-400">Confidence:</span>
            <span className="text-emerald-400 font-bold">{(confidence * 100).toFixed(1)}%</span>
          </div>
          <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04] flex justify-between items-center">
            <span className="text-slate-400">Trajectory:</span>
            <span className={trajectory === 'ESCALATING' ? 'text-rose-400 font-bold' : 'text-cyan-400 font-bold'}>
              {trajectory}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
