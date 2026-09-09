import React from 'react';
import { motion } from 'framer-motion';
import {
  ShieldAlert,
  Search,
  KeyRound,
  Radio,
  FileSpreadsheet,
  AlertTriangle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface AttackTimelineProps {
  currentStage: string;
  nextStage: string;
  trajectory: string;
  stageScores?: Record<string, number>;
}

const STAGES = [
  { id: 'Reconnaissance', label: 'Reconnaissance', icon: Search, mitre: 'TA0043', color: '#38bdf8' },
  { id: 'Initial Access', label: 'Initial Access', icon: KeyRound, mitre: 'TA0001', color: '#f59e0b' },
  { id: 'Lateral Movement', label: 'Lateral Movement', icon: AlertTriangle, mitre: 'TA0008', color: '#f97316' },
  { id: 'Command and Control', label: 'C2 Control', icon: Radio, mitre: 'TA0011', color: '#f43f5e' },
  { id: 'Exfiltration', label: 'Exfiltration', icon: FileSpreadsheet, mitre: 'TA0010', color: '#a855f7' },
];

export const AttackTimeline: React.FC<AttackTimelineProps> = ({
  currentStage,
  nextStage,
  trajectory,
  stageScores = {},
}) => {
  const currentIdx = STAGES.findIndex((s) => s.id === currentStage);
  const nextIdx = STAGES.findIndex((s) => s.id === nextStage);

  const isEscalating = trajectory === 'ESCALATING';

  return (
    <div className="glass-panel rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between">
      {/* Ambient Glow */}
      <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-64 h-32 rounded-full bg-violet-600/10 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-white">MITRE ATT&CK Progression</h3>
            <p className="text-[11px] text-slate-400">Multi-stage Kill-chain State Tracker</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 text-[11px] font-bold tracking-wider uppercase rounded-full border flex items-center gap-1.5 ${
              isEscalating
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 animate-pulse'
                : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isEscalating ? 'bg-rose-400' : 'bg-emerald-400'}`} />
            {trajectory}
          </span>
        </div>
      </div>

      {/* Pipeline Stage Tracker */}
      <div className="relative py-6 px-2 z-10">
        {/* Background Conduit Track */}
        <div className="absolute top-[42px] left-8 right-8 h-1.5 bg-slate-800/80 rounded-full z-0 overflow-hidden">
          {/* Animated active gradient bar */}
          <motion.div
            className="h-full bg-gradient-to-r from-cyan-400 via-amber-400 to-rose-500"
            initial={{ width: '0%' }}
            animate={{
              width:
                currentIdx >= 0
                  ? `${(currentIdx / (STAGES.length - 1)) * 100}%`
                  : '0%',
            }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>

        {/* Stage Nodes */}
        <div className="grid grid-cols-5 gap-2 relative z-10">
          {STAGES.map((st, idx) => {
            const Icon = st.icon;
            const isActive = st.id === currentStage;
            const isNext = st.id === nextStage;
            const isPassed = currentIdx > idx;
            const score = stageScores[st.id] ?? (isActive ? 0.85 : isPassed ? 1.0 : isNext ? 0.45 : 0.05);

            let nodeStyle = 'bg-slate-900/90 border-slate-700/60 text-slate-500';
            let iconColor = 'text-slate-500';
            let ringGlow = '';

            if (isActive) {
              nodeStyle = 'bg-slate-950 border-rose-500 text-white scale-110 shadow-lg shadow-rose-500/30';
              iconColor = 'text-rose-400';
              ringGlow = 'ring-4 ring-rose-500/20';
            } else if (isNext) {
              nodeStyle = 'bg-slate-950 border-amber-400 text-amber-300 animate-pulse';
              iconColor = 'text-amber-400';
              ringGlow = 'ring-2 ring-amber-400/20';
            } else if (isPassed) {
              nodeStyle = 'bg-slate-900 border-cyan-500/80 text-cyan-300';
              iconColor = 'text-cyan-400';
            }

            return (
              <div key={st.id} className="flex flex-col items-center text-center group cursor-pointer">
                {/* Node Milestone Circle */}
                <motion.div
                  whileHover={{ scale: 1.15 }}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all duration-300 ${nodeStyle} ${ringGlow}`}
                >
                  <Icon className={`w-5 h-5 ${iconColor}`} />
                </motion.div>

                {/* Mitre Badge */}
                <span className="text-[9px] font-mono text-slate-400 mt-2 px-1.5 py-0.5 rounded bg-white/[0.04]">
                  {st.mitre}
                </span>

                {/* Stage Name */}
                <span
                  className={`text-xs font-semibold mt-1 tracking-tight ${
                    isActive
                      ? 'text-rose-300'
                      : isNext
                      ? 'text-amber-300'
                      : isPassed
                      ? 'text-slate-200'
                      : 'text-slate-500'
                  }`}
                >
                  {st.label}
                </span>

                {/* Score Progress Pill */}
                <div className="w-14 h-1 bg-slate-800 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-cyan-400 transition-all duration-500"
                    style={{
                      width: `${Math.min(score * 100, 100)}%`,
                      backgroundColor: isActive ? '#f43f5e' : isNext ? '#f59e0b' : '#38bdf8',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stage Summary Footer */}
      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/[0.06] text-xs relative z-10">
        <div className="p-3 rounded-xl bg-slate-900/50 border border-white/[0.04]">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
            Current Stage
          </span>
          <span className="font-bold text-slate-100 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            {currentStage || 'Reconnaissance'}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/50 border border-white/[0.04]">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
            Next Likely Progression
          </span>
          <span className="font-bold text-amber-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            {nextStage || 'Initial Access'}
          </span>
        </div>
      </div>
    </div>
  );
};
