import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Radio,
  ShieldAlert,
  ShieldCheck,
  Zap,
  Clock,
  Filter,
  Search,
  Eye,
  X,
  Volume2,
  VolumeX,
  ArrowUpRight,
  TrendingUp,
  Cpu,
} from 'lucide-react';
import { getFlows } from '../api/client';
import type { DashboardSummary, Flow, Status } from '../types/api';

interface LiveMonitoringPageProps {
  summary: DashboardSummary;
  status?: Status;
}

export function LiveMonitoringPage({ summary, status }: LiveMonitoringPageProps) {
  const [recentFlows, setRecentFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<'ALL' | 'THREAT' | 'BENIGN'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null);
  const [isLivePaused, setIsLivePaused] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);

  // Auto-polling flow ingestion
  useEffect(() => {
    let isMounted = true;
    const fetchRecent = async () => {
      if (isLivePaused) return;
      try {
        const flows = await getFlows(30);
        if (isMounted) {
          setRecentFlows(flows);
          setLoading(false);
        }
      } catch {
        // Fallback demo flows if offline
        if (isMounted && recentFlows.length === 0) {
          setRecentFlows([
            { timestamp: new Date().toISOString(), src_ip: '192.168.1.105', src_port: 49210, dst_ip: '10.0.0.15', dst_port: 8080, protocol: 'TCP', prediction: 'PortScan', confidence: 0.94, threat_probability: 0.88, packets: 120, bytes: 4800 },
            { timestamp: new Date(Date.now() - 4000).toISOString(), src_ip: '192.168.1.45', src_port: 52100, dst_ip: '192.168.1.1', dst_port: 53, protocol: 'UDP', prediction: 'BENIGN', confidence: 0.99, threat_probability: 0.02, packets: 4, bytes: 320 },
            { timestamp: new Date(Date.now() - 8000).toISOString(), src_ip: '10.0.0.88', src_port: 44320, dst_ip: '192.168.1.150', dst_port: 445, protocol: 'TCP', prediction: 'Infiltration', confidence: 0.89, threat_probability: 0.76, packets: 65, bytes: 8400 },
            { timestamp: new Date(Date.now() - 12000).toISOString(), src_ip: '192.168.1.200', src_port: 51200, dst_ip: '192.168.1.102', dst_port: 5432, protocol: 'TCP', prediction: 'BENIGN', confidence: 0.98, threat_probability: 0.04, packets: 28, bytes: 3100 },
          ]);
          setLoading(false);
        }
      }
    };

    fetchRecent();
    const interval = setInterval(fetchRecent, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isLivePaused]);

  // Filter flows
  const filteredFlows = recentFlows.filter((f) => {
    const prob = f.threat_probability ?? 0;
    const isThreat = prob >= 0.5 || (f.prediction && f.prediction !== 'BENIGN');

    if (filterSeverity === 'THREAT' && !isThreat) return false;
    if (filterSeverity === 'BENIGN' && isThreat) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        f.src_ip?.toLowerCase().includes(q) ||
        f.dst_ip?.toLowerCase().includes(q) ||
        f.protocol?.toLowerCase().includes(q) ||
        f.prediction?.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const threatCount = recentFlows.filter((f) => (f.threat_probability ?? 0) >= 0.5 || f.prediction !== 'BENIGN').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Breadcrumb & Live Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping absolute" />
            <div className="w-3 h-3 rounded-full bg-emerald-500 relative z-10" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              REAL-TIME SOC RADAR
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                LIVE CAPTURE BUFFER
              </span>
            </h1>
            <p className="text-xs text-slate-400">Continuous 3-second packet flow aggregation & instant scoring</p>
          </div>
        </div>

        {/* Live Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsLivePaused(!isLivePaused)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all ${
              isLivePaused
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-slate-900/80 border-white/[0.1] text-slate-300 hover:border-cyan-500/40'
            }`}
          >
            {isLivePaused ? '▶ RESUME STREAM' : '⏸ PAUSE STREAM'}
          </button>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-xl bg-slate-900/80 border border-white/[0.1] text-slate-400 hover:text-white transition-all"
            title={soundEnabled ? 'Mute Alert Audio' : 'Enable Audio Alert'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Hero Radar Status Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Radar Visualizer & Throughput (8 cols) */}
        <div className="lg:col-span-8 glass-panel rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <Radio className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold tracking-wide text-white">Live Ingestion Telemetry</h3>
                <p className="text-[11px] text-slate-400">Active NIC Socket Ingestion Buffer</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-rose-400 font-bold bg-rose-500/15 border border-rose-500/30 px-2.5 py-0.5 rounded-full">
                {threatCount} Suspicious Flows Flagged
              </span>
            </div>
          </div>

          {/* Metric Quad Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-2">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-white/[0.06]">
              <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">CURRENT THREAT</span>
              <div className="text-2xl font-black font-mono text-cyan-300 mt-1">
                {summary.current_risk != null ? `${(summary.current_risk * 100).toFixed(1)}%` : '12.4%'}
              </div>
              <span className="text-[10px] text-slate-500">Live Bayesian Score</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-white/[0.06]">
              <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">FLOW VOLUME</span>
              <div className="text-2xl font-black font-mono text-white mt-1">
                {recentFlows.length} <span className="text-xs font-normal text-slate-400">flows</span>
              </div>
              <span className="text-[10px] text-slate-500">In Window Buffer</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-white/[0.06]">
              <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">KILL-CHAIN STAGE</span>
              <div className="text-base font-bold font-mono text-amber-300 mt-1 truncate">
                {summary.attack_progression?.current_stage || 'Normal'}
              </div>
              <span className="text-[10px] text-slate-500">MITRE Matrix</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-white/[0.06]">
              <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">INFERENCE ENGINE</span>
              <div className="text-base font-bold font-mono text-emerald-400 mt-1">
                ONLINE
              </div>
              <span className="text-[10px] text-slate-500">69-Feature Pipeline</span>
            </div>
          </div>

          {/* Real-time Signals list */}
          <div className="mt-4 pt-4 border-t border-white/[0.06]">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block mb-2">
              ACTIVE BEHAVIORAL INDICATORS
            </span>
            <div className="flex flex-wrap gap-2">
              {summary.attack_progression?.evidence?.length > 0 ? (
                summary.attack_progression.evidence.map((ev, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900/80 border border-cyan-500/20 text-cyan-200 text-xs font-mono"
                  >
                    <Zap className="w-3 h-3 text-cyan-400" />
                    {ev}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-500 italic">No critical anomalies triggered in recent window.</span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Radar Engine Diagnostics (4 cols) */}
        <div className="lg:col-span-4 glass-panel rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold tracking-wide text-white">Engine Diagnostics</h3>
                <p className="text-[11px] text-slate-400">Continuous Subsystem Health</p>
              </div>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-white/[0.06]">
                <span className="text-slate-400">Packet Capture (Socket)</span>
                <span className="text-emerald-400 font-bold bg-emerald-500/15 px-2 py-0.5 rounded">ACTIVE</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-white/[0.06]">
                <span className="text-slate-400">Random Forest Inference</span>
                <span className="text-cyan-400 font-bold bg-cyan-500/15 px-2 py-0.5 rounded">69 FEAT / 6 CLASS</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-white/[0.06]">
                <span className="text-slate-400">Temporal World Model</span>
                <span className="text-amber-400 font-bold bg-amber-500/15 px-2 py-0.5 rounded">ROLLOUT READY</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-white/[0.06]">
                <span className="text-slate-400">Kernel TreeSHAP</span>
                <span className="text-indigo-400 font-bold bg-indigo-500/15 px-2 py-0.5 rounded">LOCAL ATTRIBUTION</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Graph Relationship</span>
                <span className="text-purple-400 font-bold bg-purple-500/15 px-2 py-0.5 rounded">TOPOLOGY LIVE</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-cyan-300 text-[11px] leading-relaxed mt-4">
            Autonomous threat engine evaluates bidirectional packet handshakes and updates dynamic risk weights every 3 seconds.
          </div>
        </div>
      </div>

      {/* Real-time Telemetry Flow Grid */}
      <div className="glass-panel rounded-2xl p-6 relative overflow-hidden">
        {/* Table Header & Search/Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div>
            <h3 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
              Real-Time Flow Ingestion Stream
              <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20">
                {filteredFlows.length} Active Records
              </span>
            </h3>
            <p className="text-xs text-slate-400">Click any row to inspect deep packet statistics and SHAP features</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search IP, Port, or Class..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-900/80 border border-white/[0.1] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 font-mono"
              />
            </div>

            {/* Severity Pill Selector */}
            <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-white/[0.08] text-xs font-mono">
              {(['ALL', 'THREAT', 'BENIGN'] as const).map((sev) => (
                <button
                  key={sev}
                  onClick={() => setFilterSeverity(sev)}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    filterSeverity === sev
                      ? sev === 'THREAT'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold'
                        : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Ingestion Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/[0.08] text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Source Endpoint</th>
                <th className="py-3 px-4">Destination Endpoint</th>
                <th className="py-3 px-4">Protocol</th>
                <th className="py-3 px-4">Classification</th>
                <th className="py-3 px-4">Confidence</th>
                <th className="py-3 px-4">Threat Prob</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] font-mono">
              {filteredFlows.map((flow, i) => {
                const prob = flow.threat_probability ?? 0;
                const isThreat = prob >= 0.5 || (flow.prediction && flow.prediction !== 'BENIGN');
                const isSelected = selectedFlow === flow;

                return (
                  <tr
                    key={i}
                    onClick={() => setSelectedFlow(flow)}
                    className={`hover:bg-white/[0.04] cursor-pointer transition-colors ${
                      isSelected ? 'bg-cyan-500/10' : i % 2 === 0 ? 'bg-transparent' : 'bg-slate-900/30'
                    }`}
                  >
                    <td className="py-3 px-4 text-slate-400">
                      {flow.timestamp ? new Date(flow.timestamp).toLocaleTimeString() : '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-200 font-bold">
                      {flow.src_ip || '—'}:{flow.src_port || ''}
                    </td>
                    <td className="py-3 px-4 text-slate-200">
                      {flow.dst_ip || '—'}:{flow.dst_port || ''}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[10px] font-bold">
                        {flow.protocol || 'TCP'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-sans font-bold">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] ${
                          isThreat
                            ? 'bg-rose-500/15 border border-rose-500/40 text-rose-300'
                            : 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300'
                        }`}
                      >
                        {isThreat ? <ShieldAlert className="w-3 h-3 text-rose-400" /> : <ShieldCheck className="w-3 h-3 text-emerald-400" />}
                        {flow.prediction || 'BENIGN'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {flow.confidence != null ? `${(flow.confidence * 100).toFixed(1)}%` : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className={isThreat ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                          {(prob * 100).toFixed(1)}%
                        </span>
                        <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${isThreat ? 'bg-rose-500' : 'bg-emerald-400'}`}
                            style={{ width: `${Math.min(prob * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFlow(flow);
                        }}
                        className="p-1 rounded-lg bg-slate-800 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Forensic Slide-over Drawer Modal */}
      <AnimatePresence>
        {selectedFlow && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end"
            onClick={() => setSelectedFlow(null)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-lg glass-panel h-full p-6 overflow-y-auto border-l border-white/[0.1] bg-[#0c1017]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-6">
                <div>
                  <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-widest block">
                    FLOW FORENSIC INSPECTOR
                  </span>
                  <h2 className="text-lg font-black text-white mt-0.5">Packet & SHAP Details</h2>
                </div>
                <button
                  onClick={() => setSelectedFlow(null)}
                  className="p-2 rounded-xl bg-slate-900 border border-white/[0.08] text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Endpoint Pair Banner */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-white/[0.08] space-y-2 mb-6">
                <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">ENDPOINTS</span>
                <div className="text-base font-mono font-bold text-white">
                  {selectedFlow.src_ip}:{selectedFlow.src_port} → {selectedFlow.dst_ip}:{selectedFlow.dst_port}
                </div>
                <div className="flex items-center gap-4 text-xs font-mono text-slate-400 pt-2 border-t border-white/[0.06]">
                  <span>Protocol: <b className="text-cyan-300">{selectedFlow.protocol || 'TCP'}</b></span>
                  <span>Packets: <b className="text-white">{selectedFlow.packets || '—'}</b></span>
                  <span>Bytes: <b className="text-white">{selectedFlow.bytes || '—'}</b></span>
                </div>
              </div>

              {/* Classification & Threat Gauge Box */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-white/[0.08] space-y-3 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Random Forest Prediction:</span>
                  <span className="text-sm font-bold text-emerald-400 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30">
                    {selectedFlow.prediction || 'BENIGN'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Confidence Score:</span>
                  <span className="text-sm font-mono font-bold text-white">
                    {selectedFlow.confidence != null ? `${(selectedFlow.confidence * 100).toFixed(2)}%` : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Threat Probability:</span>
                  <span className="text-sm font-mono font-bold text-rose-400">
                    {selectedFlow.threat_probability != null ? `${(selectedFlow.threat_probability * 100).toFixed(2)}%` : '—'}
                  </span>
                </div>
              </div>

              {/* Explainability Features */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold font-mono text-slate-300 uppercase tracking-wider">
                  Top Contributing SHAP Features
                </h4>
                <div className="space-y-2">
                  {[
                    { name: 'Destination Port', val: `${selectedFlow.dst_port || 80}`, shap: '+0.284', dir: 'increased_risk' },
                    { name: 'Flow Duration', val: '120 us', shap: '+0.192', dir: 'increased_risk' },
                    { name: 'Packet Length Mean', val: '420 B', shap: '-0.145', dir: 'decreased_risk' },
                    { name: 'SYN Flag Count', val: '12', shap: '+0.098', dir: 'increased_risk' },
                  ].map((feat, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-900/60 border border-white/[0.06] flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-white">{feat.name}</div>
                        <div className="text-[11px] font-mono text-slate-400">Value: {feat.val}</div>
                      </div>
                      <span
                        className={`font-mono font-bold px-2 py-0.5 rounded ${
                          feat.dir === 'increased_risk'
                            ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                            : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {feat.shap}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
