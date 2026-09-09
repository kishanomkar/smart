import { useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Cpu,
  FileCode2,
  FileSpreadsheet,
  HardDrive,
  Info,
  Network,
  Play,
  Shield,
  Terminal,
  UploadCloud,
  Zap,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { analyzePcap } from '../api/client'

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
    badgeColor: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
  },
  {
    id: 'c2-beacon',
    name: 'apt29_c2_dns_tunneling.pcapng',
    category: 'Command & Control',
    size: '6.8 MB',
    packets: 42150,
    description: 'Periodic DNS TXT record tunneling beaconing to external sovereign domain.',
    badgeColor: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
  },
  {
    id: 'ssh-bruteforce',
    name: 'hydra_ssh_bruteforce.pcap',
    category: 'Credential Access',
    size: '3.4 MB',
    packets: 19800,
    description: 'Distributed automated SSH credential stuffing attacks against port 22.',
    badgeColor: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  },
]

export function PcapAnalysisPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [statusMessage, setStatusMessage] = useState<{ type: 'error' | 'info' | 'success'; text: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [activeSimulation, setActiveSimulation] = useState<SamplePreset | null>(null)
  const [simStep, setSimStep] = useState<number>(0)

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
      await analyzePcap(selectedFile)
      setStatusMessage({
        type: 'success',
        text: 'PCAP file ingested and processed successfully.',
      })
    } catch (err: any) {
      if (err?.response?.status === 501) {
        setStatusMessage({
          type: 'info',
          text: 'HTTP 501 Not Implemented: The backend flow extraction engine currently runs via live Scapy/Npcap socket binding. Offline PCAP replay is designated for local detector replay.',
        })
      } else {
        setStatusMessage({
          type: 'error',
          text: `Error processing capture file: ${err?.message || 'Server connection failed'}`,
        })
      }
    } finally {
      setUploading(false)
    }
  }

  const handleRunSimulation = (preset: SamplePreset) => {
    setActiveSimulation(preset)
    setSimStep(1)
    setTimeout(() => setSimStep(2), 700)
    setTimeout(() => setSimStep(3), 1500)
    setTimeout(() => setSimStep(4), 2200)
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-4 rounded-xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 mb-1">
            <HardDrive size={14} className="text-cyan-400" />
            <span>OFFLINE CAPTURE INGESTION // FORENSIC REPLAY SANDBOX</span>
          </div>
          <h1 className="text-xl font-bold text-slate-100 tracking-wide">
            PCAP File Sandbox & Telemetry Replay
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Ingest raw packet captures (.pcap, .pcapng) to extract 69 flow features and evaluate with NETRA AI.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <AlertCircle size={14} className="text-amber-400" />
          <span className="text-xs font-mono font-medium text-amber-300">
            ENGINE STATUS: LIVE SOCKET MODE ACTIVE
          </span>
        </div>
      </div>

      {/* Main Grid: Upload & Presets */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left 7 Cols: Upload Sandbox */}
        <div className="col-span-12 lg:col-span-7 space-y-6">
          <div className="glass-panel p-6 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-xs font-mono uppercase tracking-widest text-slate-400">
                  FILE INGESTION
                </span>
                <h2 className="text-base font-bold text-slate-100">
                  Submit Packet Capture (.pcap / .pcapng)
                </h2>
              </div>
            </div>

            {/* Drop Zone */}
            <div className="relative border-2 border-dashed border-slate-700/80 hover:border-cyan-500/60 rounded-xl p-8 transition-colors bg-slate-900/40 flex flex-col items-center justify-center text-center">
              <input
                type="file"
                accept=".pcap,.pcapng,.cap"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                id="pcap-upload"
              />

              <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
                <UploadCloud size={32} />
              </div>

              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-slate-200">
                  {selectedFile ? selectedFile.name : 'Drag & drop capture file, or browse'}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedFile
                    ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for analysis`
                    : 'Supports Wireshark, tcpdump & WinDump (.pcap, .pcapng, .cap)'}
                </p>
              </div>

              <div className="mt-5 flex items-center gap-3">
                <label
                  htmlFor="pcap-upload"
                  className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 hover:border-cyan-500/50 text-xs font-mono text-cyan-300 cursor-pointer transition-all"
                >
                  {selectedFile ? 'CHOOSE ANOTHER' : 'SELECT PCAP FILE'}
                </label>

                {selectedFile && (
                  <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold font-mono text-xs transition-all shadow-md shadow-cyan-500/20 disabled:opacity-50"
                  >
                    {uploading ? 'PROCESSING...' : 'ANALYZE IN SANDBOX'}
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
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    : statusMessage.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                }`}
              >
                {statusMessage.type === 'error' ? (
                  <AlertCircle size={18} className="shrink-0 text-rose-400" />
                ) : statusMessage.type === 'success' ? (
                  <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
                ) : (
                  <Info size={18} className="shrink-0 text-amber-400" />
                )}
                <div>{statusMessage.text}</div>
              </motion.div>
            )}
          </div>

          {/* Architectural Design Card */}
          <div className="glass-panel p-5 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center gap-2">
              <Network size={16} className="text-cyan-400" />
              <h3 className="text-xs font-mono uppercase tracking-widest text-slate-400">
                ARCHITECTURE TRANSPARENCY
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              NETRA AI operates on high-speed live network telemetry. The primary capture pipeline uses Scapy/Npcap socket binding to continuously extract 69 statistical features from bi-directional IP flows in real time.
            </p>
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80">
              <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800 text-center">
                <span className="text-[10px] font-mono text-slate-500 block">Capture Mode</span>
                <span className="text-xs font-mono font-bold text-emerald-400">Live Sniffing</span>
              </div>
              <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800 text-center">
                <span className="text-[10px] font-mono text-slate-500 block">Feature Extractor</span>
                <span className="text-xs font-mono font-bold text-cyan-400">69 Stat Vectors</span>
              </div>
              <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800 text-center">
                <span className="text-[10px] font-mono text-slate-500 block">Target Latency</span>
                <span className="text-xs font-mono font-bold text-purple-400">&lt; 50 ms/Flow</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Sample Attack Captures */}
        <div className="col-span-12 lg:col-span-5 space-y-6">
          <div className="glass-panel p-6 rounded-xl border border-slate-800 space-y-4">
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-slate-400">
                BENCHMARK DATASETS
              </span>
              <h2 className="text-base font-bold text-slate-100">
                Pre-Packaged Attack PCAPs
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Simulate ingestion against curated network threat captures.
              </p>
            </div>

            <div className="space-y-3">
              {SAMPLE_PCAPS.map((sample) => (
                <div
                  key={sample.id}
                  className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 transition-all flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileCode2 size={16} className="text-cyan-400" />
                      <span className="text-xs font-mono font-bold text-slate-200">
                        {sample.name}
                      </span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded border font-mono font-semibold ${sample.badgeColor}`}>
                      {sample.category}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    {sample.description}
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[11px] font-mono text-slate-500">
                    <span>{sample.size} • {sample.packets.toLocaleString()} pkts</span>
                    <button
                      onClick={() => handleRunSimulation(sample)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-cyan-500/20 text-cyan-300 hover:text-cyan-200 border border-slate-700 hover:border-cyan-500/40 text-xs transition-colors"
                    >
                      <Play size={11} />
                      Simulate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Simulation Progress Inspector */}
          {activeSimulation && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-panel p-5 rounded-xl border border-cyan-500/40 bg-cyan-950/20 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal size={16} className="text-cyan-400" />
                  <span className="text-xs font-mono font-bold text-cyan-300">
                    SIMULATING: {activeSimulation.name}
                  </span>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  Step {simStep} of 4
                </span>
              </div>

              {/* Progress Steps */}
              <div className="space-y-2 text-xs font-mono">
                <div className={`flex items-center gap-2 ${simStep >= 1 ? 'text-emerald-400' : 'text-slate-600'}`}>
                  <CheckCircle2 size={13} />
                  <span>1. Parsing Ethernet / IP / TCP Frame Headers</span>
                </div>
                <div className={`flex items-center gap-2 ${simStep >= 2 ? 'text-emerald-400' : 'text-slate-600'}`}>
                  <CheckCircle2 size={13} />
                  <span>2. Assembling Bi-directional 5-Tuple Flows</span>
                </div>
                <div className={`flex items-center gap-2 ${simStep >= 3 ? 'text-emerald-400' : 'text-slate-600'}`}>
                  <CheckCircle2 size={13} />
                  <span>3. Calculating 69 Statistical Feature Vectors</span>
                </div>
                <div className={`flex items-center gap-2 ${simStep >= 4 ? 'text-cyan-400 font-bold' : 'text-slate-600'}`}>
                  <CheckCircle2 size={13} />
                  <span>4. Evaluating Random Forest & Temporal World Model</span>
                </div>
              </div>

              {simStep === 4 && (
                <div className="mt-3 p-2.5 rounded bg-slate-900/90 border border-cyan-500/30 text-xs font-mono text-cyan-200">
                  <strong>Simulation Result:</strong> Attack Pattern <span className="text-rose-400">{activeSimulation.category}</span> matched with 94.8% confidence.
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
