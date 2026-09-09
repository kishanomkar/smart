import React from 'react';
import { ShieldCheck, Cpu, BrainCircuit, Activity, Zap, CheckCircle2 } from 'lucide-react';
import type { Status } from '../types/api';

const MODULES = [
  { key: 'capture', label: 'PACKET CAPTURE', icon: Activity },
  { key: 'random_forest', label: 'RANDOM FOREST (69F)', icon: ShieldCheck },
  { key: 'world_model', label: 'WORLD MODEL FORECASTER', icon: BrainCircuit },
  { key: 'shap', label: 'KERNEL SHAP EXPLAINER', icon: Cpu },
  { key: 'attack_progression', label: 'ATTACK PROGRESSION', icon: Zap },
] as const;

export function StatusBar({ status }: { status?: Status }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
      {MODULES.map(({ key, label, icon: Icon }) => {
        const rawValue = status?.[key] || 'AVAILABLE';
        const isGood = ['LOADED', 'AVAILABLE', 'RUNNING', 'ACTIVE'].includes(rawValue);
        const isWarning = rawValue === 'UNAVAILABLE' || rawValue === 'NO_DATA';

        return (
          <div
            key={key}
            className="glass-panel p-3 rounded-xl flex items-center justify-between border border-white/[0.06] hover:border-white/[0.12] transition-all"
          >
            <div className="flex items-center gap-2">
              <Icon className={`w-3.5 h-3.5 ${isGood ? 'text-cyan-400' : 'text-amber-400'}`} />
              <span className="text-[10px] font-mono font-bold tracking-wider text-slate-300 truncate max-w-[120px]">
                {label}
              </span>
            </div>

            <span
              className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold ${
                isGood
                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                  : isWarning
                  ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
                  : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
              }`}
            >
              {rawValue}
            </span>
          </div>
        );
      })}
    </div>
  );
}
