import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Award,
  Clock,
  FileCode2,
  LayoutDashboard,
  Network,
  Radio,
  Shield,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'
import { BenchmarkModal } from './BenchmarkModal'

export type NavTab = 'dashboard' | 'live' | 'flows' | 'forecast' | 'pcap'

interface HeaderProps {
  updated?: string | null
  activeTab: NavTab
  setActiveTab: (tab: NavTab) => void
}

export function Header({ updated, activeTab, setActiveTab }: HeaderProps) {
  const [showBenchmarks, setShowBenchmarks] = useState(false)

  const tabs: { id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'live', label: 'Live Radar', icon: Radio },
    { id: 'flows', label: 'Flow Explorer', icon: Network },
    { id: 'forecast', label: 'Future Forecast', icon: TrendingUp },
    { id: 'pcap', label: 'PCAP Sandbox', icon: FileCode2 },
  ]

  return (
    <>
      <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-200/80 dark:border-white/[0.08] backdrop-blur-2xl px-4 sm:px-6 py-3.5 mb-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-violet-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)]">
                <Shield className="w-5 h-5" />
              </div>
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-900 animate-pulse" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                  NETRA <span className="text-cyan-600 dark:text-cyan-400">AI</span>
                </span>
                <span className="text-[9px] font-mono font-extrabold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                  PRO ACTIVE SOC
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wide">
                Predictive Autonomous Cyber Defense Platform
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-white/[0.08] shadow-inner">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center gap-2 ${
                    isActive
                      ? 'text-slate-900 dark:text-white font-bold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-white/[0.04]'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTabGlow"
                      className="absolute inset-0 rounded-xl bg-white dark:bg-gradient-to-r dark:from-cyan-500/20 dark:via-indigo-500/20 dark:to-violet-500/20 border border-slate-200 dark:border-cyan-400/50 shadow-sm dark:shadow-[0_0_15px_rgba(6,182,212,0.25)]"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon
                    className={`w-3.5 h-3.5 relative z-10 ${
                      isActive ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-400'
                    }`}
                  />
                  <span className="relative z-10">{tab.label}</span>
                </button>
              )
            })}
          </nav>

          {/* Right Controls: Benchmark Audit + Theme Switcher + Sync Pill */}
          <div className="flex items-center gap-3 text-xs font-mono">
            {/* Benchmark Audit Modal Trigger */}
            <button
              onClick={() => setShowBenchmarks(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 transition-all font-semibold shadow-xs"
              title="Inspect Empirical Benchmark Results vs Baseline"
            >
              <Award className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span className="hidden md:inline">BENCHMARKS</span>
            </button>

            {/* Light / Dark Mode Toggle */}
            <ThemeToggle />

            {/* Telemetry Sync Beacon */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-white/[0.06] text-slate-700 dark:text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">LIVE FEED</span>
            </div>
          </div>
        </div>
      </header>

      {/* Benchmark Audit Modal */}
      <BenchmarkModal
        isOpen={showBenchmarks}
        onClose={() => setShowBenchmarks(false)}
      />
    </>
  )
}
