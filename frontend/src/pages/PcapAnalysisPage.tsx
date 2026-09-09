import { useState } from 'react'
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Award,
  CheckCircle2,
  Cpu,
  Database,
  Download,
  FileCode2,
  FileSpreadsheet,
  HardDrive,
  Info,
  Network,
  Play,
  Shield,
  Terminal,
  TrendingUp,
  UploadCloud,
  X,
  Zap,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { analyzePcap, analyzeFile } from '../api/client'
import type { OfflineAnalysisResult } from '../types/api'

interface SamplePreset {
  id: string
  name: string
  category: string
  size: string
  packets: number
  description: string
  badgeColor: string
}

const SAMPLE_PCAPS: SamplePreset[] = [
  {
    id: 'syn-flood',
    name: 'ddos_syn_flood_capture.pcap',
    category: 'Denial of Service',
    size: '14.2 MB',
    packets: 184200,
    description: 'High-rate SYN flood targeting TCP/80 with spoofed RFC1918 addresses.',
    badgeColor: 'text-rose-500 dark:text-rose-400 border-rose-500/30 bg-rose-500/10',
  },
  {
    id: 'c2-beacon',
    name: 'apt29_c2_dns_tunneling.pcapng',
    category: 'Command & Control',
    size: '6.8 MB',
    packets: 42150,
    description: 'Periodic DNS TXT record tunneling beaconing to external sovereign domain.',
    badgeColor: 'text-purple-600 dark:text-purple-400 border-purple-500/30 bg-purple-500/10',
  },
  {
    id: 'ssh-bruteforce',
    name: 'hydra_ssh_bruteforce.pcap',
    category: 'Credential Access',
    size: '3.4 MB',
    packets: 19800,
    description: 'Distributed automated SSH credential stuffing attacks against port 22.',
    badgeColor: 'text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10',
  },
]

export function PcapAnalysisPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [statusMessage, setStatusMessage] = useState<{ type: 'error' | 'info' | 'success'; text: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<OfflineAnalysisResult | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
      setStatusMessage(null)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    setUploading(true)
    setStatusMessage(null)
    try {
      const result = await analyzeFile(selectedFile)
      setAnalysisResult(result)
      setStatusMessage({
        type: 'success',
        text: `Analysis complete for ${selectedFile.name} — ${result.total_flows} flows processed.`,
      })
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Error processing capture file: ${err?.message || 'Server connection failed'}`,
      })
    } finally {
      setUploading(false)
    }
  }

  const handleRunPreset = async (preset: SamplePreset) => {
    setUploading(true)
    setStatusMessage(null)
    // Create a virtual file to submit
    const blob = new Blob([preset.id], { type: 'application/octet-stream' })
    const file = new File([blob], preset.name)
    try {
      const result = await analyzeFile(file)
      setAnalysisResult(result)
      setSelectedFile(file)
      setStatusMessage({
        type: 'success',
        text: `Preset scenario "${preset.name}" analyzed successfully.`,
      })
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Failed to analyze preset: ${err?.message || 'Error'}`,
      })
    } finally {
      setUploading(false)
    }
  }

  const forecastChartData = analysisResult?.forecast.map((f) => ({
    horizon: `+${f.horizon * 15}s`,
    threatProbability: Math.round((f.threat_probability || 0) * 100),
    label: f.predicted_label,
    trend: f.trend,
  })) || []

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-4 rounded-xl border border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-600 dark:text-cyan-400 mb-1">
            <HardDrive size={14} className="text-cyan-600 dark:text-cyan-400" />
            <span>OFFLINE CAPTURE INGESTION // FORENSIC REPLAY SANDBOX</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-wide">
            PCAP & CSV Flow File Sandbox
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Ingest raw packet captures (.pcap, .pcapng) or CSV flow records (CIC-IDS-2018 / CTU-13) for full World Model inference, $K$-step rollouts & TreeSHAP explainability.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
          <CheckCircle2 size={14} className="text-emerald-500" />
          <span className="text-xs font-mono font-medium text-emerald-600 dark:text-emerald-400">
            OFFLINE ENGINE READY
          </span>
        </div>
      </div>

      {/* Main Grid: Upload & Benchmark Presets */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left 7 Cols: Upload Box */}
        <div className="col-span-12 lg:col-span-7 space-y-6">
          <div className="glass-panel p-6 rounded-xl border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-xs font-mono uppercase tracking-widest text-slate-500">
                  FILE INGESTION
                </span>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Upload Network Capture or Flow CSV
                </h2>
              </div>
            </div>

            {/* Drop Zone */}
            <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700/80 hover:border-cyan-500/60 rounded-xl p-8 transition-colors bg-slate-50 dark:bg-slate-900/40 flex flex-col items-center justify-center text-center">
              <input
                type="file"
                accept=".pcap,.pcapng,.cap,.csv"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                id="pcap-upload"
              />

              <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 mb-4 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
                <UploadCloud size={32} />
              </div>

              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {selectedFile ? selectedFile.name : 'Drag & drop capture or CSV file, or browse'}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedFile
                    ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for ingestion`
                    : 'Supports .pcap, .pcapng, .cap, and .csv (CIC-IDS-2018 / CTU-13 / NetFlow)'}
                </p>
              </div>

              <div className="mt-5 flex items-center gap-3">
                <label
                  htmlFor="pcap-upload"
                  className="px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-cyan-500/50 text-xs font-mono text-cyan-600 dark:text-cyan-300 cursor-pointer transition-all shadow-xs"
                >
                  {selectedFile ? 'CHOOSE ANOTHER' : 'SELECT FILE'}
                </label>

                {selectedFile && (
                  <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold font-mono text-xs transition-all shadow-md shadow-cyan-500/20 disabled:opacity-50"
                  >
                    {uploading ? 'PROCESSING...' : 'RUN OFFLINE INFERENCE'}
                  </button>
                )}
              </div>
            </div>

            {/* Status Feedback Toast */}
            {statusMessage && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mt-4 p-4 rounded-lg border text-xs font-mono leading-relaxed flex items-start gap-3 ${
                  statusMessage.type === 'error'
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
                    : statusMessage.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
                }`}
              >
                {statusMessage.type === 'error' ? (
                  <AlertCircle size={18} className="shrink-0 text-rose-500" />
                ) : statusMessage.type === 'success' ? (
                  <CheckCircle2 size={18} className="shrink-0 text-emerald-500" />
                ) : (
                  <Info size={18} className="shrink-0 text-amber-500" />
                )}
                <div>{statusMessage.text}</div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Right 5 Cols: Sample Attack Captures */}
        <div className="col-span-12 lg:col-span-5 space-y-6">
          <div className="glass-panel p-6 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-4">
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-slate-500">
                BENCHMARK DATASETS
              </span>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Pre-Packaged Attack Captures
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Execute 1-click offline replay against standard kill-chain captures.
              </p>
            </div>

            <div className="space-y-3">
              {SAMPLE_PCAPS.map((sample) => (
                <div
                  key={sample.id}
                  className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/40 transition-all flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileCode2 size={16} className="text-cyan-600 dark:text-cyan-400" />
                      <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                        {sample.name}
                      </span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded border font-mono font-semibold ${sample.badgeColor}`}>
                      {sample.category}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {sample.description}
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-800/60 text-[11px] font-mono text-slate-500">
                    <span>{sample.size} • {sample.packets.toLocaleString()} pkts</span>
                    <button
                      onClick={() => handleRunPreset(sample)}
                      disabled={uploading}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      <Play size={11} />
                      Replay & Analyze
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Analysis Results Display */}
      {analysisResult && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Results Summary Header */}
          <div className="glass-panel p-6 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <span className="text-xs font-mono uppercase tracking-widest text-cyan-600 dark:text-cyan-400 font-bold">
                  OFFLINE REPLAY INFERENCE REPORT
                </span>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {analysisResult.summary}
                </h2>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-mono px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                  {analysisResult.file_type}
                </span>
                <span
                  className={`text-xs font-mono font-bold px-3 py-1 rounded-full border ${
                    analysisResult.threat_probability > 0.6
                      ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30'
                      : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                  }`}
                >
                  {analysisResult.threat_probability > 0.6 ? 'HIGH INFILTRATION THREAT' : 'BENIGN BASELINE'}
                </span>
              </div>
            </div>

            {/* Metric KPI Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Infiltration Risk</span>
                <span className="text-xl font-mono font-bold text-rose-600 dark:text-rose-400">
                  {(analysisResult.threat_probability * 100).toFixed(1)}%
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Current Kill-Chain Stage</span>
                <span className="text-base font-mono font-bold text-cyan-600 dark:text-cyan-400">
                  {analysisResult.current_stage}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Total Flows Parsed</span>
                <span className="text-xl font-mono font-bold text-slate-900 dark:text-slate-100">
                  {analysisResult.total_flows.toLocaleString()}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Anomalous Flows</span>
                <span className="text-xl font-mono font-bold text-amber-600 dark:text-amber-400">
                  {analysisResult.anomalous_flows.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Forecast Timeline & Explainability Section */}
          <div className="grid grid-cols-12 gap-6">
            {/* Left 7 Cols: Forecast Timeline */}
            <div className="col-span-12 lg:col-span-7 glass-panel p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono uppercase tracking-widest text-slate-500">
                    FORWARD SIMULATION
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    $K$-Step Threat Escalation Horizon (Next 75s)
                  </h3>
                </div>
                <span className="text-xs font-mono text-cyan-600 dark:text-cyan-400">
                  Trajectory: {analysisResult.trajectory}
                </span>
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={forecastChartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="offlineForecastGlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.2} vertical={false} />
                    <XAxis dataKey="horizon" stroke="#64748b" fontSize={11} fontFamily="DM Mono, monospace" />
                    <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} tickFormatter={(v) => `${v}%`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#38bdf8',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '11px',
                      }}
                    />
                    <ReferenceLine y={65} stroke="#f43f5e" strokeDasharray="4 4" strokeWidth={1.5} />
                    <Area
                      type="monotone"
                      dataKey="threatProbability"
                      stroke="#06b6d4"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#offlineForecastGlow)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Right 5 Cols: TreeSHAP Feature Waterfall */}
            <div className="col-span-12 lg:col-span-5 glass-panel p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-3">
              <div>
                <span className="text-xs font-mono uppercase tracking-widest text-slate-500">
                  TREESHAP EXPLAINABILITY
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Top Contributing Statistical Features
                </h3>
              </div>

              <div className="space-y-2.5">
                {analysisResult.explanation.features.map((feat, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex flex-col gap-1 text-xs font-mono"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {feat.display_name}
                      </span>
                      <span className="text-rose-600 dark:text-rose-400 font-bold">
                        +{Math.abs(feat.shap_value).toFixed(2)} SHAP
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-rose-500 rounded-full"
                        style={{ width: `${Math.min(100, Math.abs(feat.shap_value) * 200)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Forensic Flows Table */}
          {analysisResult.flows && analysisResult.flows.length > 0 && (
            <div className="glass-panel p-5 rounded-xl border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-xs font-mono uppercase tracking-widest text-slate-500">
                    FLOW-LEVEL ANOMALIES
                  </span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Extracted IP Flows ({analysisResult.flows.length} Sample Records)
                  </h3>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px]">
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">Source → Destination</th>
                      <th className="py-2.5 px-3">Protocol</th>
                      <th className="py-2.5 px-3">Prediction</th>
                      <th className="py-2.5 px-3">Threat Prob</th>
                      <th className="py-2.5 px-3">Traffic Vol</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {analysisResult.flows.map((fl, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-colors">
                        <td className="py-2.5 px-3 text-slate-500">{fl.timestamp}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                          {fl.src_ip}:{fl.src_port} → {fl.dst_ip}:{fl.dst_port}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">{fl.protocol}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded border text-[10px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30">
                            {fl.prediction}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-rose-600 dark:text-rose-400">
                          {((fl.threat_probability || 0) * 100).toFixed(0)}%
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {fl.packets} pkts • {fl.bytes} B
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}
