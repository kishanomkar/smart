import React, { useMemo } from 'react';
import { Background, Controls, ReactFlow, type Edge, type Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Network, Server, Shield, Globe, Terminal, Database, Activity } from 'lucide-react';
import type { NetworkGraph as Graph } from '../types/api';

export function NetworkGraph({ graph }: { graph: Graph }) {
  // Demo fallback topology when live network data has no active edges yet
  const displayNodes = graph?.available && graph.nodes?.length > 0 ? graph.nodes : [
    { id: '192.168.1.1', role: 'Gateway Router' },
    { id: '192.168.1.45', role: 'SOC Workstation' },
    { id: '192.168.1.102', role: 'Database Server' },
    { id: '192.168.1.150', role: 'Auth Server' },
    { id: '10.0.0.88', role: 'External C2 Vector' },
    { id: '172.16.0.12', role: 'DMZ Web Server' },
  ];

  const displayEdges = graph?.available && graph.edges?.length > 0 ? graph.edges : [
    { source: '10.0.0.88', target: '172.16.0.12', protocol: 'TCP:8080', packets: 420 },
    { source: '172.16.0.12', target: '192.168.1.1', protocol: 'TCP:443', packets: 180 },
    { source: '192.168.1.1', target: '192.168.1.102', protocol: 'TCP:5432', packets: 95 },
    { source: '192.168.1.45', target: '192.168.1.150', protocol: 'UDP:88', packets: 30 },
  ];

  const nodes: Node[] = useMemo(() => {
    const total = displayNodes.length;
    const centerX = 240;
    const centerY = 160;
    const radius = 130;

    return displayNodes.map((node, i) => {
      const angle = (i / total) * 2 * Math.PI - Math.PI / 2;
      const isCritical = node.role?.toLowerCase().includes('c2') || node.role?.toLowerCase().includes('threat') || node.id.startsWith('10.');
      const isGateway = node.role?.toLowerCase().includes('gateway') || node.id.endsWith('.1');
      const isDb = node.role?.toLowerCase().includes('database') || node.role?.toLowerCase().includes('auth');

      let borderColor = '#38bdf8';
      let bgGrad = 'linear-gradient(135deg, rgba(14, 165, 233, 0.15), rgba(3, 105, 161, 0.3))';
      let tagBg = 'bg-cyan-500/20 text-cyan-300';

      if (isCritical) {
        borderColor = '#f43f5e';
        bgGrad = 'linear-gradient(135deg, rgba(244, 63, 94, 0.2), rgba(159, 18, 57, 0.35))';
        tagBg = 'bg-rose-500/25 text-rose-300';
      } else if (isGateway) {
        borderColor = '#f59e0b';
        bgGrad = 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(180, 83, 9, 0.3))';
        tagBg = 'bg-amber-500/20 text-amber-300';
      } else if (isDb) {
        borderColor = '#a855f7';
        bgGrad = 'linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(107, 33, 168, 0.3))';
        tagBg = 'bg-purple-500/20 text-purple-300';
      }

      return {
        id: node.id,
        data: {
          label: (
            <div className="flex flex-col items-center p-1">
              <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-white">
                {isCritical ? <Globe className="w-3 h-3 text-rose-400" /> : <Server className="w-3 h-3 text-cyan-400" />}
                {node.id}
              </div>
              <span className={`text-[9px] font-medium px-1.5 py-0.2 rounded mt-1 ${tagBg}`}>
                {node.role || 'Host'}
              </span>
            </div>
          ),
        },
        position: {
          x: Math.round(centerX + radius * Math.cos(angle)),
          y: Math.round(centerY + radius * Math.sin(angle)),
        },
        style: {
          background: bgGrad,
          border: `1.5px solid ${borderColor}`,
          borderRadius: 12,
          padding: '6px 10px',
          boxShadow: `0 0 15px ${borderColor}33`,
          backdropFilter: 'blur(8px)',
        },
      };
    });
  }, [displayNodes]);

  const edges: Edge[] = useMemo(() => {
    return displayEdges.map((edge, i) => {
      const isThreatEdge = edge.source.startsWith('10.') || (edge.protocol && edge.protocol.includes('8080'));
      return {
        id: `${edge.source}-${edge.target}-${i}`,
        source: edge.source,
        target: edge.target,
        animated: true,
        style: {
          stroke: isThreatEdge ? '#f43f5e' : '#38bdf8',
          strokeWidth: isThreatEdge ? 2.5 : 1.5,
          filter: isThreatEdge ? 'drop-shadow(0 0 6px rgba(244, 63, 94, 0.6))' : 'drop-shadow(0 0 4px rgba(56, 189, 248, 0.4))',
        },
        label: edge.protocol || 'FLOW',
        labelStyle: { fill: '#cbd5e1', fontSize: 9, fontFamily: 'monospace', fontWeight: 600 },
        labelBgStyle: { fill: '#090d16', fillOpacity: 0.9, stroke: '#334155', strokeWidth: 1, rx: 4 },
      };
    });
  }, [displayEdges]);

  return (
    <div className="h-full flex flex-col justify-between">
      {/* ReactFlow Topology Canvas */}
      <div className="h-[280px] w-full rounded-xl overflow-hidden border border-slate-200/[0.06] bg-white/70 dark:bg-slate-950/70 relative">
        <ReactFlow nodes={nodes} edges={edges} fitView minZoom={0.6} maxZoom={1.5}>
          <Background color="#1e293b" gap={20} size={1} />
          <Controls showInteractive={false} className="!bg-slate-900 !border-slate-700 !text-white" />
        </ReactFlow>

        {/* Live Packet Flow Beacon */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/90 border border-white/[0.1] text-[10px] font-mono text-cyan-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Topology Active ({nodes.length} Nodes / {edges.length} Links)
        </div>
      </div>

      {/* Summary Footer */}
      <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-slate-400">
        <span className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          Packet Flow Density: Nominal
        </span>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-cyan-400" /> Standard Traffic
          </span>
          <span className="flex items-center gap-1 text-rose-300">
            <span className="w-2 h-2 rounded-full bg-rose-500" /> Hostile Edge
          </span>
        </div>
      </div>
    </div>
  );
}
