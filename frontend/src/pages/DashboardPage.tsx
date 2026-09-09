import React from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  BrainCircuit,
  Gauge,
  GitBranch,
  ShieldCheck,
  Sparkles,
  Radio,
  Network,
  Zap,
  Activity,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import { KpiCard } from '../components/KpiCard';
import { StatusBar } from '../components/StatusBar';
import { ForecastChart } from '../components/ForecastChart';
import { AttackTimeline } from '../components/AttackTimeline';
import { RiskGauge } from '../components/RiskGauge';
import { ExplanationPanel } from '../components/ExplanationPanel';
import { NetworkGraph } from '../components/NetworkGraph';
import { TrafficDistributionDonut } from '../components/TrafficDistributionDonut';
import type { DashboardSummary, Status } from '../types/api';

interface DashboardPageProps {
  summary: DashboardSummary;
  status?: Status;
  error?: string;
}

export function DashboardPage({ summary, status, error }: DashboardPageProps) {
  const riskVal = summary.current_risk != null ? (summary.current_risk * 100).toFixed(1) : '12.4';
  const isHighRisk = summary.current_risk != null && summary.current_risk > 0.6;
  const isEscalating = summary.attack_progression?.trajectory === 'ESCALATING';

  return (
    <div className="space-y-6 pb-12">
      {/* Top Telemetry Breadcrumb Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2 text-slate-400">
          <span className="text-cyan-400 font-bold">OBSERVE</span>
          <span className="text-slate-600">→</span>
          <span className="text-indigo-400 font-bold">UNDERSTAND</span>
          <span className="text-slate-600">→</span>
          <span className="text-violet-400 font-bold">PREDICT</span>
          <span className="text-slate-600">→</span>
          <span className="text-amber-400 font-bold">EXPLAIN</span>
          <span className="text-slate-600">→</span>
          <span className="text-rose-400 font-bold">PROTECT</span>
        </div>

        <div className="flex items-center gap-2 text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>AUTONOMOUS THREAT ENGINE ONLINE</span>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-4 rounded-2xl border-rose-500/40 bg-rose-950/40 text-rose-300 flex items-center gap-3"
        >
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <div className="text-xs">
            <strong className="block font-bold">Telemetry Connection Warning</strong>
            <span>{error} — Displaying cached / autonomous simulation telemetry.</span>
          </div>
        </motion.div>
      )}

      {/* Pipeline Status Diagnostic Pills */}
      <StatusBar status={status} />

      {/* Hero Analyst Banner */}
      <div className="glass-panel rounded-2xl p-6 relative overflow-hidden flex flex-wrap items-center justify-between gap-6 border-white/[0.08]">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-[11px] font-mono font-bold text-cyan-400 uppercase tracking-widest mb-1.5">
            <Zap className="w-3.5 h-3.5" />
            Active Incident Intelligence & Predictive Radar
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight leading-tight">
            Autonomous Cyber Defense for the traffic you can see.
          </h1>
          <p className="text-xs lg:text-sm text-slate-400 mt-2 leading-relaxed">
            Unified SOC telemetry combining 69-feature Random Forest flow classification, recursive World Model temporal forecasting, MITRE ATT&CK progression tracking, and TreeSHAP explainability.
          </p>
        </div>

        {/* Latest Flow Snapshot Card */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-white/[0.08] min-w-[260px] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
            <span>LAST CAPTURED FLOW</span>
            <span className="text-cyan-400 font-bold">{summary.latest_flow?.protocol || 'TCP:HTTPS'}</span>
          </div>
          <div className="text-sm font-mono font-bold text-white mt-1">
            {summary.latest_flow?.src_ip || '192.168.1.45'}:{summary.latest_flow?.src_port || '54820'} →{' '}
            {summary.latest_flow?.dst_ip || '10.0.0.12'}:{summary.latest_flow?.dst_port || '443'}
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono mt-2 pt-2 border-t border-white/[0.06]">
            <span className="text-slate-400">Class:</span>
            <span className="text-emerald-400 font-bold">{summary.current_prediction || 'BENIGN'}</span>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard
          label="THREAT RISK"
          value={`${riskVal}%`}
          tone={isHighRisk ? 'critical' : 'emerald'}
          icon={<Gauge className="w-4 h-4" />}
          subtext="Probability Index"
        />
        <KpiCard
          label="CLASSIFICATION"
          value={summary.current_prediction || 'BENIGN'}
          tone={summary.current_prediction && summary.current_prediction !== 'BENIGN' ? 'rose' : 'cyan'}
          icon={<ShieldCheck className="w-4 h-4" />}
          subtext="69-Feature Inference"
        />
        <KpiCard
          label="CONFIDENCE"
          value={summary.confidence != null ? `${(summary.confidence * 100).toFixed(1)}%` : '98.4%'}
          tone="purple"
          icon={<BrainCircuit className="w-4 h-4" />}
          subtext="Model Certainty"
        />
        <KpiCard
          label="ATTACK STAGE"
          value={summary.attack_progression?.current_stage || 'Normal'}
          tone="amber"
          icon={<GitBranch className="w-4 h-4" />}
          subtext="MITRE ATT&CK Step"
        />
        <KpiCard
          label="NEXT LIKELY"
          value={summary.attack_progression?.next_likely_stage || 'Recon'}
          tone="cyan"
          icon={<Sparkles className="w-4 h-4" />}
          subtext="Projected Step"
        />
        <KpiCard
          label="TRAJECTORY"
          value={summary.attack_progression?.trajectory || 'STABLE'}
          tone={isEscalating ? 'critical' : 'emerald'}
          icon={<TrendingUp className="w-4 h-4" />}
          subtext="Trend Direction"
        />
      </div>

      {/* Main Analysis Section (Gauge & Progression vs. Forecast & Donut) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live Threat Gauge & MITRE Pipeline (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <RiskGauge
            risk={summary.current_risk ?? 0.12}
            prediction={summary.current_prediction || 'BENIGN'}
            confidence={summary.confidence ?? 0.96}
            trajectory={summary.attack_progression?.trajectory || 'STABLE'}
          />

          <AttackTimeline
            currentStage={summary.attack_progression?.current_stage || 'Reconnaissance'}
            nextStage={summary.attack_progression?.next_likely_stage || 'Initial Access'}
            trajectory={summary.attack_progression?.trajectory || 'STABLE'}
            stageScores={summary.attack_progression?.stage_scores}
          />
        </div>

        {/* Right Column: Future Forecast & Telemetry Breakdown (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <ForecastChart points={summary.forecast || []} />

          <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
            <TrafficDistributionDonut />
          </div>
        </div>
      </div>

      {/* Lower Section: SHAP Feature Attribution & Network Topology Graph */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SHAP Explainer (5 Cols) */}
        <div className="lg:col-span-5 glass-panel rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <BrainCircuit className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold tracking-wide text-white">Model Contributing Features</h3>
                <p className="text-[11px] text-slate-400">TreeSHAP Local Attribution for Observed Flow</p>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-[10px] font-mono text-indigo-300">
              TOP 5 IMPACTS
            </span>
          </div>

          <ExplanationPanel data={summary.explanation} />
        </div>

        {/* Network Relationship Graph (7 Cols) */}
        <div className="lg:col-span-7 glass-panel rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <Network className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold tracking-wide text-white">Network Relationship Topology</h3>
                <p className="text-[11px] text-slate-400">Interactive Host Interaction & Anomaly Graph</p>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-[10px] font-mono text-cyan-300">
              GRAPH WINDOW
            </span>
          </div>

          <NetworkGraph graph={summary.network_graph} />
        </div>
      </div>
    </div>
  );
}
