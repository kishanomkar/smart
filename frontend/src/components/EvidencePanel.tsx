import React from 'react';
import { Info, TrendingUp, TrendingDown } from 'lucide-react';

interface EvidenceItem {
  feature: string;
  display_name: string;
  value: number;
  shap_value: number;
  direction: string;
  rank: number;
}

interface EvidencePanelProps {
  features: EvidenceItem[];
  available: boolean;
  reason?: string;
}

export const EvidencePanel: React.FC<EvidencePanelProps> = ({ features, available, reason }) => {
  if (!available) {
    return (
      <div className="p-6 rounded-2xl bg-white dark:bg-cyber-card border border-light-border dark:border-cyber-border flex flex-col items-center justify-center text-center h-full min-h-[300px]">
        <Info className="w-10 h-10 text-slate-400 mb-3" />
        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">Explainability Offline</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">
          {reason || "Insufficient data to generate SHAP values for the current state."}
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-cyber-card border border-light-border dark:border-cyber-border shadow-sm h-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">XAI Evidence Panel</h3>
        <span className="text-[10px] font-bold uppercase px-2 py-1 rounded bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
          Kernel SHAP
        </span>
      </div>

      <div className="space-y-4">
        {features.map((f) => (
          <div key={f.feature} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-light-border dark:border-cyber-border transition-all hover:border-blue-400 dark:hover:border-blue-500">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 w-4">{f.rank}</span>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{f.display_name}</span>
              </div>
              {f.direction === 'increased_risk' ? (
                <TrendingUp className="w-4 h-4 text-red-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-green-500" />
              )}
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Value: {f.value.toFixed(4)}</span>
              <span className={`font-mono font-bold ${f.direction === 'increased_risk' ? 'text-red-500' : 'text-green-500'}`}>
                {f.shap_value > 0 ? `+${f.shap_value.toFixed(4)}` : f.shap_value.toFixed(4)}
              </span>
            </div>
            {/* Simple bar representing the SHAP value */}
            <div className="mt-2 h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${f.direction === 'increased_risk' ? 'bg-red-500' : 'bg-green-500'}`}
                style={{
                  width: `${Math.min(Math.abs(f.shap_value) * 100, 100)}%`,
                  marginLeft: f.shap_value < 0 ? 'auto' : '0'
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
