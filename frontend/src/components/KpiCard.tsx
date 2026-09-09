import React, { type ReactNode } from 'react';
import { motion } from 'framer-motion';

interface KpiCardProps {
  label: string;
  value: string;
  tone?: 'critical' | 'cyan' | 'emerald' | 'amber' | 'purple' | string;
  icon?: ReactNode;
  subtext?: string;
}

export function KpiCard({ label, value, tone = 'cyan', icon, subtext }: KpiCardProps) {
  let glowBorder = 'border-white/[0.08] hover:border-cyan-500/40';
  let iconBg = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
  let valColor = 'text-white';

  if (tone === 'critical' || tone === 'rose') {
    glowBorder = 'border-rose-500/30 hover:border-rose-500/60 shadow-[0_0_20px_rgba(244,63,94,0.12)]';
    iconBg = 'bg-rose-500/15 text-rose-400 border-rose-500/30';
    valColor = 'text-rose-300';
  } else if (tone === 'emerald') {
    glowBorder = 'border-emerald-500/30 hover:border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.12)]';
    iconBg = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    valColor = 'text-emerald-300';
  } else if (tone === 'amber') {
    glowBorder = 'border-amber-500/30 hover:border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.12)]';
    iconBg = 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    valColor = 'text-amber-300';
  } else if (tone === 'purple') {
    glowBorder = 'border-purple-500/30 hover:border-purple-500/60 shadow-[0_0_20px_rgba(168,85,247,0.12)]';
    iconBg = 'bg-purple-500/15 text-purple-400 border-purple-500/30';
    valColor = 'text-purple-300';
  }

  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className={`glass-panel rounded-2xl p-4 flex flex-col justify-between border ${glowBorder} relative overflow-hidden`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
          {label}
        </span>
        {icon && (
          <div className={`p-2 rounded-xl border flex items-center justify-center ${iconBg}`}>
            {icon}
          </div>
        )}
      </div>

      <div className="mt-1">
        <div className={`text-2xl font-black font-mono tracking-tight truncate ${valColor}`}>
          {value}
        </div>
        {subtext && (
          <p className="text-[10px] text-slate-400 mt-1 truncate">
            {subtext}
          </p>
        )}
      </div>
    </motion.div>
  );
}
