import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, TrendingDown, HelpCircle, Cpu } from 'lucide-react';
import type { Explanation, ExplanationFeature } from '../types/api';

// Helper to provide clear human context for network features
const FEATURE_DESCRIPTIONS: Record<string, string> = {
  'Destination Port': 'Targeted network service or port vulnerability signature',
  'Flow Duration': 'Duration of bidirectional packet exchange session',
  'Total Fwd Packets': 'Volume of outbound packets sent by client initiator',
  'Total Length of Fwd Packets': 'Total byte payload sent in forward direction',
  'Bwd Packet Length Mean': 'Average size of response packets from destination',
  'Flow IAT Mean': 'Mean inter-arrival timing between successive packets',
  'Fwd IAT Total': 'Total elapsed time between client-side packet bursts',
  'Bwd IAT Mean': 'Mean response latency between server-side packets',
  'Fwd Header Length': 'Cumulative size of TCP/IP protocol headers in forward flow',
  'Bwd Packets/s': 'Response throughput frequency (packets per second)',
  'Packet Length Mean': 'Overall average packet payload size across session',
  'FIN Flag Count': 'Frequency of graceful TCP termination handshakes',
  'SYN Flag Count': 'Frequency of TCP connection initiation attempts (Scan signature)',
  'RST Flag Count': 'Abrupt connection teardown frequency (Reset signature)',
  'PSH Flag Count': 'Immediate data push requests bypassing buffer',
  'ACK Flag Count': 'Standard packet acknowledgment handshake frequency',
  'URG Flag Count': 'High-priority urgent payload flag frequency',
};

export function ExplanationPanel({ data }: { data: Explanation }) {
  const featureList: ExplanationFeature[] =
    data?.features?.length > 0
      ? data.features
      : ((data as any)?.top_features?.length > 0 ? (data as any).top_features : []);

  // Demo fallback when model hasn't generated SHAP for current window yet
  const displayFeatures: ExplanationFeature[] =
    featureList.length > 0
      ? featureList
      : [
          { feature: 'Destination Port', display_name: 'Destination Port (8080)', value: 8080, shap_value: 0.284, direction: 'increased_risk', rank: 1 },
          { feature: 'SYN Flag Count', display_name: 'SYN Flag Rate (Anomalous)', value: 48, shap_value: 0.192, direction: 'increased_risk', rank: 2 },
          { feature: 'Flow Duration', display_name: 'Flow Duration (Sub-second)', value: 120, shap_value: 0.145, direction: 'increased_risk', rank: 3 },
          { feature: 'Packet Length Mean', display_name: 'Packet Length Mean', value: 340, shap_value: -0.112, direction: 'decreased_risk', rank: 4 },
          { feature: 'ACK Flag Count', display_name: 'ACK Flag Count', value: 12, shap_value: -0.078, direction: 'decreased_risk', rank: 5 },
        ];

  return (
    <div className="flex flex-col h-full justify-between gap-4">
      {/* List of Feature Contributions */}
      <div className="space-y-3.5">
        {displayFeatures.slice(0, 5).map((feat, i) => {
          const isRiskRiser = feat.direction === 'increased_risk' || feat.shap_value > 0;
          const absVal = Math.abs(feat.shap_value);
          const barPercent = Math.min(Math.round(absVal * 180), 100);
          const humanDesc = FEATURE_DESCRIPTIONS[feat.feature] || 'Observed statistical anomaly in flow behavior';

          return (
            <motion.div
              key={feat.feature + i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="p-3 rounded-xl bg-slate-900/60 border border-white/[0.05] hover:border-white/[0.12] transition-all"
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold text-slate-400 w-4">#{feat.rank || i + 1}</span>
                  <span className="text-xs font-semibold text-white tracking-tight">
                    {feat.display_name || feat.feature}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 font-mono text-xs">
                  {isRiskRiser ? (
                    <span className="flex items-center gap-1 text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                      <TrendingUp className="w-3 h-3" />
                      +{absVal.toFixed(4)}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      <TrendingDown className="w-3 h-3" />
                      -{absVal.toFixed(4)}
                    </span>
                  )}
                </div>
              </div>

              {/* Human description */}
              <p className="text-[11px] text-slate-400 mb-2 leading-tight">
                {humanDesc}
              </p>

              {/* Diverging Waterfall Bar */}
              <div className="h-2 w-full bg-slate-800/80 rounded-full overflow-hidden flex items-center">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${barPercent}%` }}
                  transition={{ duration: 0.8, delay: 0.2 + i * 0.05 }}
                  className={`h-full rounded-full ${
                    isRiskRiser
                      ? 'bg-gradient-to-r from-rose-500 to-amber-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                  }`}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Legend Footer */}
      <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px]">
        <span className="text-slate-400 flex items-center gap-1">
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          TreeSHAP Feature Impact Attribution
        </span>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-rose-300">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            Amplifies Threat
          </span>
          <span className="flex items-center gap-1.5 text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Suppresses Threat
          </span>
        </div>
      </div>
    </div>
  );
}
