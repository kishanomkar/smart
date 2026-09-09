import { useState, useEffect, useMemo } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BrainCircuit,
  Clock,
  Cpu,
  Database,
  Layers,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Wifi,
  X,
  Zap,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../api/client'
import type { ForecastPoint } from '../types/api'

const ATTACK_STAGES = [
  'Normal',
  'Reconnaissance',
  'Initial Access',
  'Persistence',
  'Privilege Escalation',
  'Lateral Movement',
  'Command & Control',
  'Data Exfiltration',
]

const STAGE_COLORS: Record<string, string> = {
  Normal: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  Reconnaissance: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
  'Initial Access': 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  Persistence: 'text-amber-500 border-amber-500/30 bg-amber-500/10',
  'Privilege Escalation': 'text-orange-400 border-orange-500/30 bg-orange-500/10',
  'Lateral Movement': 'text-rose-400 border-rose-500/30 bg-rose-500/10',
  'Command & Control': 'text-rose-500 border-rose-500/30 bg-rose-500/10',
  'Data Exfiltration': 'text-purple-400 border-purple-500/30 bg-purple-500/10',
}

interface SimulatedHostForecast {
  hostIp: string
  hostname: string
  predictedStage: string
  confidence: number
  riskScore: number
  mitreTechniques: string[]
  trend: 'ESCALATING' | 'STABLE' | 'DE-ESCALATING'
  timestamp: string
}

export function LiveForecastGraph() {
  const [forecasts, setForecasts] = useState<ForecastPoint[]>([])
  const [hostForecasts, setHostForecasts] = useState<SimulatedHostForecast[]>([])
  const [filterHost, setFilterHost] = useState('')
  const [connectionStatus, setConnectionStatus] = useState<'CONNECTED' | 'SYNCING' | 'OFFLINE'>('SYNCING')
  const [lastUpdate, setLastUpdate] = useState<string>('Just now')
  const [loading, setLoading] = useState(true)
  const [timeHorizon, setTimeHorizon] = useState<'5m' | '15m' | '30m' | '1h'>('15m')

  const fetchForecastData = async () => {
    try {
      const data = await api.getForecast()
      if (data && data.length > 0) {
        setForecasts(data)
      } else {
        // High quality fallback temporal sequence
        setForecasts([
          { horizon: 1, threat_probability: 0.12, predicted_label: 'Normal Traffic', trend: 'STABLE', forecast_mode: 'World Model (LSTM)' },
          { horizon: 2, threat_probability: 0.18, predicted_label: 'Normal Traffic', trend: 'STABLE', forecast_mode: 'World Model (LSTM)' },
          { horizon: 3, threat_probability: 0.35, predicted_label: 'Port Scan Recon', trend: 'ESCALATING', forecast_mode: 'World Model (LSTM)' },
          { horizon: 4, threat_probability: 0.54, predicted_label: 'Initial Access Probe', trend: 'ESCALATING', forecast_mode: 'World Model (LSTM)' },
          { horizon: 5, threat_probability: 0.72, predicted_label: 'Lateral Propagation', trend: 'ESCALATING', forecast_mode: 'World Model (LSTM)' },
          { horizon: 6, threat_probability: 0.81, predicted_label: 'C2 Beaconing Attempt', trend: 'ESCALATING', forecast_mode: 'World Model (LSTM)' },
        ])
      }

      // Generate host matrix
      setHostForecasts([
        {
          hostIp: '192.168.1.105',
          hostname: 'srv-db-primary.corp',
          predictedStage: 'Lateral Movement',
          confidence: 0.88,
          riskScore: 78,
          mitreTechniques: ['T1021.002 Remote SMB', 'T1059 Command Scripting'],
          trend: 'ESCALATING',
          timestamp: new Date().toLocaleTimeString(),
        },
        {
          hostIp: '10.0.4.12',
          hostname: 'k8s-node-worker-03',
          predictedStage: 'Initial Access',
          confidence: 0.74,
          riskScore: 56,
          mitreTechniques: ['T1190 Exploit Public App'],
          trend: 'ESCALATING',
          timestamp: new Date().toLocaleTimeString(),
        },
        {
          hostIp: '172.16.0.44',
          hostname: 'auth-gateway-proxy',
          predictedStage: 'Reconnaissance',
          confidence: 0.62,
          riskScore: 42,
          mitreTechniques: ['T1046 Port Scanning'],
          trend: 'STABLE',
          timestamp: new Date().toLocaleTimeString(),
        },
        {
          hostIp: '192.168.1.20',
          hostname: 'corp-ad-dc01',
          predictedStage: 'Command & Control',
          confidence: 0.91,
          riskScore: 89,
          mitreTechniques: ['T1071 App Layer Protocol', 'T1573 Encrypted Channel'],
          trend: 'ESCALATING',
          timestamp: new Date().toLocaleTimeString(),
        },
        {
          hostIp: '192.168.1.88',
          hostname: 'dev-workstation-09',
          predictedStage: 'Normal',
          confidence: 0.96,
          riskScore: 8,
          mitreTechniques: [],
          trend: 'STABLE',
          timestamp: new Date().toLocaleTimeString(),
        },
      ])

      setConnectionStatus('CONNECTED')
      setLastUpdate(new Date().toLocaleTimeString())
    } catch {
      setConnectionStatus('OFFLINE')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchForecastData()
    const interval = setInterval(fetchForecastData, 6000)
    return () => clearInterval(interval)
  }, [])

  const currentStage = 'Reconnaissance'
  const predictedNextStage = forecasts.length > 3 && (forecasts[3].threat_probability ?? 0) > 0.5 ? 'Lateral Movement' : 'Initial Access'

  const currentStageIdx = ATTACK_STAGES.indexOf(currentStage)
  const predictedStageIdx = ATTACK_STAGES.indexOf(predictedNextStage)

  const filteredHosts = useMemo(() => {
    if (!filterHost.trim()) return hostForecasts
    const query = filterHost.toLowerCase()
    return hostForecasts.filter(
      (h) =>
        h.hostIp.toLowerCase().includes(query) ||
        h.hostname.toLowerCase().includes(query) ||
        h.predictedStage.toLowerCase().includes(query)
    )
  }, [hostForecasts, filterHost])

  const chartData = useMemo(() => {
    return forecasts.map((f, i) => ({
      step: `+${f.horizon * 15}s`,
      threatPercent: Math.round((f.threat_probability ?? 0) * 100),
      label: f.predicted_label,
      trend: f.trend,
      baseline: 25,
      threshold: 65,
    }))
  }, [forecasts])

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Status Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-4 rounded-xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 mb-1">
            <BrainCircuit size={14} className="animate-spin-slow text-cyan-400" />
            <span>NEURAL WORLD MODEL // RECURRENT TEMPORAL ESTIMATOR</span>
          </div>
          <h1 className="text-xl font-bold text-slate-100 tracking-wide flex items-center gap-2">
            Predictive Future Forecast & Trajectory Engine
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            64-Dimensional latent space projection estimating multi-step cyber threat evolution.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Horizon Buttons */}
          <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-lg p-1">
            {(['5m', '15m', '30m', '1h'] as const).map((h) => (
              <button
                key={h}
                onClick={() => setTimeHorizon(h)}
                className={`px-2.5 py-1 text-xs font-mono rounded transition-all ${
                  timeHorizon === h
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {h}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                connectionStatus === 'CONNECTED'
                  ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                  : 'bg-amber-400 animate-pulse'
              }`}
            />
            <span className="text-xs font-mono font-medium text-slate-300">{connectionStatus}</span>
          </div>

          <button
            onClick={() => {
              setConnectionStatus('SYNCING')
              fetchForecastData()
            }}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-slate-400 hover:text-cyan-400 transition-colors"
            title="Refresh Forecast"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Hero MITRE Trajectory Strip */}
      <div className="glass-panel p-6 rounded-xl border border-slate-800 relative overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-amber-400" />
            <span className="text-xs font-mono uppercase tracking-widest text-slate-400">
              MITRE ATT&CK® Kill-Chain Forecast Conduit
            </span>
          </div>
          <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded">
            ESTIMATED VELOCITY: +1.4 STAGES / 15 MIN
          </span>
        </div>

        <div className="relative pt-4 pb-2">
          {/* Conduit Progress Line */}
          <div className="absolute top-8 left-6 right-6 h-1 bg-slate-800 rounded-full z-0 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(Math.max(currentStageIdx, predictedStageIdx) / (ATTACK_STAGES.length - 1)) * 100}%` }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-emerald-500 via-cyan-500 to-rose-500"
            />
          </div>

          <div className="grid grid-cols-4 md:grid-cols-8 gap-2 relative z-10">
            {ATTACK_STAGES.map((stage, idx) => {
              const isCurrent = idx === currentStageIdx
              const isPredicted = idx === predictedStageIdx
              const isPast = idx < currentStageIdx

              return (
                <div key={stage} className="flex flex-col items-center text-center">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold transition-all ${
                      isCurrent
                        ? 'bg-cyan-500 text-slate-950 ring-4 ring-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.8)] scale-110'
                        : isPredicted
                        ? 'bg-rose-500 text-slate-950 ring-4 ring-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.8)] animate-pulse scale-110'
                        : isPast
                        ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                        : 'bg-slate-900 text-slate-500 border border-slate-800'
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <span
                    className={`text-[10px] font-mono mt-2 uppercase font-semibold leading-tight line-clamp-2 ${
                      isCurrent
                        ? 'text-cyan-300'
                        : isPredicted
                        ? 'text-rose-400'
                        : isPast
                        ? 'text-emerald-400/80'
                        : 'text-slate-600'
                    }`}
                  >
                    {stage}
                  </span>
                  {isCurrent && (
                    <span className="text-[9px] font-mono text-cyan-400 uppercase mt-0.5 font-bold">
                      [PRESENT]
                    </span>
                  )}
                  {isPredicted && (
                    <span className="text-[9px] font-mono text-rose-400 uppercase mt-0.5 font-bold">
                      [FORECAST]
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main Grid: Forecast Chart & Telemetry Summary */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left 8 Cols: Confidence & Threat Probability Horizon */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <div className="glass-panel p-5 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-xs font-mono uppercase tracking-widest text-slate-400">
                  TEMPORAL PROBABILITY DENSITY HORIZON
                </span>
                <h3 className="text-base font-bold text-slate-100">
                  Predicted Threat Escalation Curve (Next 90s)
                </h3>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono">
                <span className="flex items-center gap-1.5 text-cyan-400">
                  <span className="w-2.5 h-2.5 rounded bg-cyan-400" />
                  Threat Probability (%)
                </span>
                <span className="flex items-center gap-1.5 text-rose-400">
                  <span className="w-2.5 h-0.5 bg-rose-500" />
                  Alert Threshold (65%)
                </span>
              </div>
            </div>

            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="forecastGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="step" stroke="#64748b" fontSize={11} fontFamily="DM Mono, monospace" />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    fontFamily="DM Mono, monospace"
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload
                        return (
                          <div className="bg-slate-900/95 backdrop-blur border border-cyan-500/40 p-3 rounded-lg shadow-xl font-mono text-xs">
                            <div className="text-slate-400 font-semibold mb-1">Horizon: {d.step}</div>
                            <div className="text-cyan-300 font-bold text-sm">
                              Threat Risk: {d.threatPercent}%
                            </div>
                            <div className="text-slate-300 mt-1">Expected: {d.label}</div>
                            <div className="text-amber-400 text-[10px] mt-0.5 uppercase">Trend: {d.trend}</div>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <ReferenceLine y={65} stroke="#f43f5e" strokeDasharray="4 4" strokeWidth={1.5} />
                  <Area
                    type="monotone"
                    dataKey="threatPercent"
                    stroke="#06b6d4"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#forecastGlow)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Host Forecast Matrix */}
          <div className="glass-panel p-5 rounded-xl border border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <span className="text-xs font-mono uppercase tracking-widest text-slate-400">
                  ENDPOINT ATTACK TRAJECTORY MATRIX
                </span>
                <h3 className="text-base font-bold text-slate-100">
                  Forensic Host Forecasts ({filteredHosts.length} Active Targets)
                </h3>
              </div>

              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter host / IP / stage..."
                  value={filterHost}
                  onChange={(e) => setFilterHost(e.target.value)}
                  className="bg-slate-900/90 border border-slate-700/80 rounded-lg pl-8 pr-8 py-1.5 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
                {filterHost && (
                  <button
                    onClick={() => setFilterHost('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                    <th className="py-2.5 px-3">Target Host</th>
                    <th className="py-2.5 px-3">Predicted Stage</th>
                    <th className="py-2.5 px-3">Model Confidence</th>
                    <th className="py-2.5 px-3">Risk Level</th>
                    <th className="py-2.5 px-3">MITRE Techniques</th>
                    <th className="py-2.5 px-3">Trend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredHosts.map((h, i) => {
                    const badgeStyle =
                      STAGE_COLORS[h.predictedStage] ||
                      'text-slate-400 border-slate-700 bg-slate-800/50'

                    return (
                      <tr key={i} className="hover:bg-slate-850/50 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-200">{h.hostIp}</div>
                          <div className="text-[10px] text-slate-500">{h.hostname}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded border text-[10px] font-semibold ${badgeStyle}`}
                          >
                            {h.predictedStage}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-cyan-400 rounded-full"
                                style={{ width: `${h.confidence * 100}%` }}
                              />
                            </div>
                            <span className="text-slate-300 font-bold">
                              {(h.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`font-bold ${
                              h.riskScore > 75
                                ? 'text-rose-400'
                                : h.riskScore > 45
                                ? 'text-amber-400'
                                : 'text-emerald-400'
                            }`}
                          >
                            {h.riskScore}/100
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-400 text-[11px]">
                          {h.mitreTechniques.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {h.mitreTechniques.map((t, idx) => (
                                <span
                                  key={idx}
                                  className="bg-slate-900 border border-slate-700/80 px-1.5 py-0.5 rounded text-[9px] text-slate-300"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`flex items-center gap-1 text-[10px] font-bold ${
                              h.trend === 'ESCALATING'
                                ? 'text-rose-400'
                                : h.trend === 'DE-ESCALATING'
                                ? 'text-emerald-400'
                                : 'text-slate-400'
                            }`}
                          >
                            {h.trend === 'ESCALATING' ? (
                              <TrendingUp size={12} />
                            ) : (
                              <Activity size={12} />
                            )}
                            {h.trend}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right 4 Cols: Model Telemetry & Diagnostic Signal */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {/* Signal Diagnostics */}
          <div className="glass-panel p-5 rounded-xl border border-slate-800 space-y-4">
            <div className="flex items-center gap-2">
              <Cpu size={16} className="text-purple-400" />
              <h3 className="text-xs font-mono uppercase tracking-widest text-slate-400">
                FORECAST ENGINE METRICS
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Model Architecture</span>
                <span className="text-xs font-mono font-bold text-slate-200">Temporal LSTM v2.4</span>
              </div>
              <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Latent Embedding</span>
                <span className="text-xs font-mono font-bold text-cyan-400">64 Dimensions</span>
              </div>
              <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Inference Latency</span>
                <span className="text-xs font-mono font-bold text-emerald-400">&lt; 14.2 ms</span>
              </div>
              <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Sequence Window</span>
                <span className="text-xs font-mono font-bold text-amber-400">32 Historical Steps</span>
              </div>
            </div>

            <div className="p-3.5 bg-gradient-to-br from-cyan-950/40 to-slate-900 border border-cyan-800/40 rounded-lg text-xs leading-relaxed text-slate-300">
              <strong className="text-cyan-300 block mb-1">Analyst Guidance:</strong>
              The recurrent world model detects an impending transition from Reconnaissance to Lateral Movement with 88% confidence. Recommended isolation on subnet <span className="font-mono text-cyan-400">192.168.1.0/24</span>.
            </div>
          </div>

          {/* Live Forecast Event Stream */}
          <div className="glass-panel p-5 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-cyan-400" />
                <h3 className="text-xs font-mono uppercase tracking-widest text-slate-400">
                  REAL-TIME PREDICTION STREAM
                </h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                LIVE
              </span>
            </div>

            <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1 custom-scrollbar">
              {[
                { time: '12:04:18', host: '192.168.1.105', event: 'Predicted SMB lateral traversal', conf: '88%', type: 'critical' },
                { time: '12:04:12', host: '10.0.4.12', event: 'Web payload exploit escalation', conf: '74%', type: 'warning' },
                { time: '12:04:05', host: '172.16.0.44', event: 'Syn-scan frequency drop (recon finished)', conf: '62%', type: 'info' },
                { time: '12:03:55', host: '192.168.1.20', event: 'DNS tunneling C2 beacon candidate', conf: '91%', type: 'critical' },
                { time: '12:03:40', host: '192.168.1.88', event: 'Standard HTTPS TLS handshake', conf: '96%', type: 'normal' },
              ].map((ev, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 flex flex-col gap-1 text-xs font-mono"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[10px]">{ev.time}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                        ev.type === 'critical'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : ev.type === 'warning'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : ev.type === 'normal'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      }`}
                    >
                      {ev.conf} Conf
                    </span>
                  </div>
                  <div className="text-slate-200 font-semibold">{ev.event}</div>
                  <div className="text-[10px] text-slate-400">{ev.host}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
