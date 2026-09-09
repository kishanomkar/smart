import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Zap, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import type { Progression } from '../types/api';

const stages = ['Reconnaissance', 'Initial Access', 'Lateral Movement', 'Command and Control', 'Exfiltration'];

export function ProgressionPanel({ data }: { data: Progression }) {
  const currentIdx = stages.indexOf(data.current_stage);
  const nextIdx = stages.indexOf(data.next_likely_stage);

  return (
    <div className="flex flex-col h-full gap-5">
      {/* Visual Pipeline */}
      <div className="relative flex items-center justify-between w-full py-6 px-2">
        {/* The connecting line */}
        <div className="absolute top-[38px] left-6 right-6 h-1.5 bg-slate-800 rounded-full z-0 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-cyan-400 via-amber-400 to-rose-500"
            initial={{ width: '0%' }}
            animate={{
              width:
                currentIdx >= 0
                  ? `${(currentIdx / (stages.length - 1)) * 100}%`
                  : '0%',
            }}
            transition={{ duration: 1.2, ease: 'easeInOut' }}
          />
        </div>

        {stages.map((stage, index) => {
          const isActive = data.current_stage === stage;
          const isNext = data.next_likely_stage === stage;
          const isPast = currentIdx > index;
          const score = data.stage_scores?.[stage] ?? (isActive ? 0.88 : isPast ? 1.0 : isNext ? 0.42 : 0.04);

          let circleStyle = 'bg-slate-900 border-slate-700 text-slate-500';
          if (isActive) {
            circleStyle = 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-lg shadow-rose-500/40 ring-4 ring-rose-500/20';
          } else if (isNext) {
            circleStyle = 'bg-amber-500/20 border-amber-400 text-amber-300 ring-2 ring-amber-400/20';
          } else if (isPast) {
            circleStyle = 'bg-cyan-500/20 border-cyan-400 text-cyan-300';
          }

          return (
            <div key={stage} className="relative z-10 flex flex-col items-center gap-2 group">
              <motion.div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${circleStyle}`}
                whileHover={{ scale: 1.15 }}
              >
                <span className="text-xs font-bold font-mono">
                  {String(index + 1).padStart(2, '0')}
                </span>
              </motion.div>

              <div className="flex flex-col items-center text-center max-w-[80px]">
                <span
                  className={`text-[11px] font-semibold leading-tight ${
                    isActive
                      ? 'text-rose-300'
                      : isNext
                      ? 'text-amber-300'
                      : isPast
                      ? 'text-slate-200'
                      : 'text-slate-500'
                  }`}
                >
                  {stage}
                </span>
                <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                  {(score * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Behavioural Evidence Box */}
      <div className="flex-1 bg-slate-900/60 border border-white/[0.06] rounded-xl p-4 overflow-y-auto max-h-[220px]">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-cyan-400" />
          Real-time Behavioral Evidence & Correlated Indicators
        </h3>
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {data.evidence && data.evidence.length > 0 ? (
              data.evidence.map((item, i) => (
                <motion.div
                  key={item + i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ delay: i * 0.08 }}
                  className="text-xs text-slate-200 p-2.5 rounded-lg bg-slate-800/60 border-l-2 border-cyan-400 flex items-start gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </motion.div>
              ))
            ) : (
              <div className="text-xs text-slate-500 italic py-4 text-center">
                No active anomalous behavioral signals triggered in the current inspection window.
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
