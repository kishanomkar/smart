import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from './api/client'
import type { DashboardSummary, Status } from './types/api'
import { Header, NavTab } from './components/Header'
import { StatusBar } from './components/StatusBar'
import { DashboardPage } from './pages/DashboardPage'
import { LiveMonitoringPage } from './pages/LiveMonitoringPage'
import { FlowDetailsPage } from './pages/FlowDetailsPage'
import { LiveForecastGraph } from './pages/LiveForecastGraph'
import { PcapAnalysisPage } from './pages/PcapAnalysisPage'

const defaultSummary: DashboardSummary = {
  timestamp: new Date().toISOString(),
  current_risk: 0.15,
  current_prediction: 'Normal Traffic',
  confidence: 0.98,
  attack_progression: {
    current_stage: 'Reconnaissance',
    next_likely_stage: 'Initial Access',
    trajectory: 'STABLE',
    stage_scores: {},
    evidence: ['Network baseline telemetry stream active.'],
  },
  forecast: [
    { horizon: 1, threat_probability: 0.12, predicted_label: 'Normal Traffic', trend: 'STABLE', forecast_mode: 'World Model (LSTM)' },
    { horizon: 2, threat_probability: 0.18, predicted_label: 'Normal Traffic', trend: 'STABLE', forecast_mode: 'World Model (LSTM)' },
    { horizon: 3, threat_probability: 0.35, predicted_label: 'Port Scan Recon', trend: 'ESCALATING', forecast_mode: 'World Model (LSTM)' },
  ],
  explanation: {
    available: true,
    prediction: 'Normal',
    confidence: 0.98,
    threat_probability: 0.12,
    features: [
      { feature: 'dst_port', display_name: 'Destination Port (443)', value: 443, shap_value: -0.24, direction: 'decreases_threat', rank: 1 },
      { feature: 'flow_duration', display_name: 'Flow Duration', value: 1204, shap_value: -0.18, direction: 'decreases_threat', rank: 2 },
      { feature: 'syn_flag_count', display_name: 'SYN Flags Count', value: 1, shap_value: 0.08, direction: 'increases_threat', rank: 3 },
    ],
    reason: 'Active inference baseline',
  },
  network_graph: {
    nodes: [
      { id: '192.168.1.45', role: 'INTERNAL_CLIENT' },
      { id: '10.0.0.12', role: 'APPLICATION_GATEWAY' },
      { id: '10.0.0.50', role: 'DATABASE_PRIMARY' },
    ],
    edges: [
      { source: '192.168.1.45', target: '10.0.0.12', protocol: 'TCP', port: 443, packets: 1420, bytes: 85200 },
      { source: '10.0.0.12', target: '10.0.0.50', protocol: 'TCP', port: 5432, packets: 840, bytes: 42100 },
    ],
    summary: { total_nodes: 3, total_edges: 2, active_connections: 2 },
    available: true,
  },
  latest_flow: {
    timestamp: new Date().toISOString(),
    src_ip: '192.168.1.45',
    dst_ip: '10.0.0.12',
    src_port: 54820,
    dst_port: 443,
    protocol: 'TCP:HTTPS',
    prediction: 'BENIGN',
    confidence: 0.98,
    threat_probability: 0.08,
    packets: 1420,
    bytes: 85200,
  },
}

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard')
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [status, setStatus] = useState<Status | undefined>(undefined)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [error, setError] = useState<string | undefined>(undefined)

  const fetchGlobalState = async () => {
    try {
      const [sumData, statusData] = await Promise.allSettled([
        api.getSummary(),
        api.getStatus(),
      ])

      if (sumData.status === 'fulfilled') {
        setSummary(sumData.value)
        setLastSync(new Date().toISOString())
        setError(undefined)
      } else {
        setError('Awaiting connection to AI Backend...')
      }

      if (statusData.status === 'fulfilled') {
        setStatus(statusData.value)
      }
    } catch {
      // Continue running gracefully with cached or fallback state
    }
  }

  useEffect(() => {
    fetchGlobalState()
    const interval = setInterval(fetchGlobalState, 5000)
    return () => clearInterval(interval)
  }, [])

  const currentSummary = summary || defaultSummary

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#07090e] text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200 transition-colors duration-300">
      {/* Background Cyber Ambient Lights — dark mode only */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 dark:block hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[45vw] h-[45vw] bg-cyan-600/10 rounded-full blur-[140px] ambient-glow-cyan" />
        <div className="absolute top-[20%] right-[-10%] w-[40vw] h-[40vw] bg-violet-600/10 rounded-full blur-[160px] ambient-glow-purple" />
        <div className="absolute bottom-[-10%] left-[25%] w-[50vw] h-[35vw] bg-rose-600/5 rounded-full blur-[180px] ambient-glow-rose" />
      </div>

      {/* Top Application Header */}
      <Header
        updated={lastSync}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Body */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 pb-12 z-10">
        {/* Module Subsystem Status Pills */}
        <StatusBar status={status} />

        {/* Dynamic Tab Content with Smooth Transitions */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {activeTab === 'dashboard' && (
              <DashboardPage
                summary={currentSummary}
                status={status}
                error={error}
              />
            )}
            {activeTab === 'live' && (
              <LiveMonitoringPage
                summary={currentSummary}
                status={status}
              />
            )}
            {activeTab === 'flows' && <FlowDetailsPage />}
            {activeTab === 'forecast' && <LiveForecastGraph />}
            {activeTab === 'pcap' && <PcapAnalysisPage />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200/80 dark:border-white/[0.06] bg-white/80 dark:bg-slate-950/60 backdrop-blur py-4 px-6 z-10 transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-500" />
            <span>NETRA AI v1.0.0 // Autonomous Predictive Cyber-Defense & Forensics Engine</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>69-FEATURE RANDOM FOREST</span>
            <span>•</span>
            <span>WORLD MODEL LSTM</span>
            <span>•</span>
            <span>TREESHAP REASONING</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
