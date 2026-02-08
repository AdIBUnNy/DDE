import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { PipelineStep } from '../types';
import { Workflow, Share2, Save } from 'lucide-react';

interface PipelineGraphProps {
  steps: PipelineStep[];
  activeStepId?: string | null;
  theme?: 'dark' | 'light';
  savedPositions?: Record<string, { x: number; y: number }>;
  onSavePositions?: (positions: Record<string, { x: number; y: number }>) => void;
}

const PipelineGraph: React.FC<PipelineGraphProps> = ({
  steps,
  activeStepId,
  theme = 'dark',
  savedPositions,
  onSavePositions
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [svgHeight, setSvgHeight] = useState(350);
  const positionsRef = useRef<Record<string, { x: number; y: number }>>({});

  useEffect(() => {
    if (!svgRef.current || steps.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const container = svgRef.current.parentElement;
    const width = container?.clientWidth || 800;
    const baseHeight = 320;
    const perNodeHeight = 70;
    const nodeRadius = 22;

    const colors = {
      nodeBg: theme === 'dark' ? '#0a0a0a' : '#fff',
      nodeBorder: theme === 'dark' ? '#222' : '#e5e7eb',
      linkDefault: theme === 'dark' ? '#181818' : '#f0f0f0',
      linkActive: '#3b82f6',
      textMain: theme === 'dark' ? '#fff' : '#111',
      textSub: theme === 'dark' ? '#555' : '#888',
      activeGlow: 'rgba(59, 130, 246, 0.4)'
    };

    const nodes: any[] = steps.map((s, i) => {
      let layer = 1;
      const name = s.name.toLowerCase();
      if (name.includes('fetch') || name.includes('read') || name.includes('source')) layer = 0;
      else if (name.includes('store') || name.includes('load') || name.includes('sink') || name.includes('postgre')) layer = 2;
      return { ...s, layer };
    });

    const layers = [
      nodes.filter(n => n.layer === 0),
      nodes.filter(n => n.layer === 1),
      nodes.filter(n => n.layer === 2)
    ];

    const maxLayerSize = Math.max(...layers.map(layer => layer.length), 1);
    const height = Math.max(baseHeight, maxLayerSize * perNodeHeight);
    setSvgHeight(height);

    const paddingX = 100;
    const paddingY = 50;

    nodes.forEach(n => {
      const layerNodes = layers[n.layer];
      const nodeIdx = layerNodes.indexOf(n);
      const layerX = paddingX + n.layer * ((width - paddingX * 2) / 2);
      const layerY = paddingY + ((height - paddingY * 2) / (layerNodes.length + 1)) * (nodeIdx + 1);
      n.x = layerX;
      n.y = layerY;
    });

    if (savedPositions) {
      nodes.forEach((n) => {
        const saved = savedPositions[n.id];
        if (saved) {
          n.x = saved.x;
          n.y = saved.y;
        }
      });
    }

    positionsRef.current = nodes.reduce((acc: Record<string, { x: number; y: number }>, n: any) => {
      acc[n.id] = { x: n.x, y: n.y };
      return acc;
    }, {});

    const links: any[] = [];
    steps.forEach(step => {
      step.dependencies.forEach(depId => {
        const source = nodes.find(n => n.id === depId);
        const target = nodes.find(n => n.id === step.id);
        if (source && target) links.push({ source, target });
      });
    });

    const g = svg.append('g');
    const defs = svg.append('defs');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.7, 1.6])
      .on('zoom', (event) => {
        g.attr('transform', event.transform.toString());
      });

    svg.call(zoom as any)
      .on('dblclick.zoom', null)
      .style('cursor', 'grab')
      .on('mousedown', () => svg.style('cursor', 'grabbing'))
      .on('mouseup', () => svg.style('cursor', 'grab'));

    // Arrow Marker
    defs.append('marker')
      .attr('id', 'arrowhead-graph')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 36)
      .attr('refY', 0)
      .attr('markerWidth', 5)
      .attr('markerHeight', 5)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', theme === 'dark' ? '#222' : '#ddd');

    // Glow Filter
    const filter = defs.append('filter').attr('id', 'glow-node').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
    filter.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'blur');
    filter.append('feComposite').attr('in', 'SourceGraphic').attr('in2', 'blur').attr('operator', 'over');

    // Draw Links
    const linkSelection = g.selectAll<SVGPathElement, any>('.link')
      .data(links)
      .enter()
      .append('path')
      .attr('d', (d: any) => {
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const dr = Math.sqrt(dx * dx + dy * dy);
        return `M${d.source.x},${d.source.y}C${d.source.x + dr/2},${d.source.y} ${d.target.x - dr/2},${d.target.y} ${d.target.x},${d.target.y}`;
      })
      .attr('fill', 'none')
      .attr('stroke', (d: any) => d.target.id === activeStepId ? colors.linkActive : colors.linkDefault)
      .attr('stroke-width', 2)
      .attr('marker-end', 'url(#arrowhead-graph)')
      .style('opacity', 0.9);

    const updateLinks = () => {
      linkSelection.attr('d', (d: any) => {
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const dr = Math.sqrt(dx * dx + dy * dy);
        return `M${d.source.x},${d.source.y}C${d.source.x + dr/2},${d.source.y} ${d.target.x - dr/2},${d.target.y} ${d.target.x},${d.target.y}`;
      });
    };

    // Draw Nodes
    const nodeGroups = g.selectAll<SVGGElement, any>('.node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('transform', d => `translate(${d.x}, ${d.y})`)
      .style('cursor', 'grab');

    const dragBehavior = d3.drag<SVGGElement, any>()
      .on('start', function (event) {
        event.sourceEvent?.stopPropagation();
        d3.select(this).style('cursor', 'grabbing');
      })
      .on('drag', function (event, d) {
        d.x = event.x;
        d.y = event.y;
        positionsRef.current[d.id] = { x: d.x, y: d.y };
        d3.select(this).attr('transform', `translate(${d.x}, ${d.y})`);
        updateLinks();
      })
      .on('end', function () {
        d3.select(this).style('cursor', 'grab');
      });

    nodeGroups.call(dragBehavior as any);

    // Glow for active node
    nodeGroups.filter(d => d.id === activeStepId)
      .append('circle')
      .attr('r', nodeRadius + 6)
      .attr('fill', colors.activeGlow)
      .style('filter', 'url(#glow-node)')
      .append('animate')
      .attr('attributeName', 'opacity')
      .attr('values', '0.2;0.6;0.2')
      .attr('dur', '1.2s')
      .attr('repeatCount', 'indefinite');

    nodeGroups.append('circle')
      .attr('r', nodeRadius)
      .attr('fill', colors.nodeBg)
      .attr('stroke', d => d.id === activeStepId ? colors.linkActive : colors.nodeBorder)
      .attr('stroke-width', 2.5);

    nodeGroups.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '.3em')
      .attr('fill', d => d.id === activeStepId ? colors.linkActive : colors.textMain)
      .style('font-family', 'JetBrains Mono')
      .style('font-size', '11px')
      .style('font-weight', 'black')
      .text((d, i) => i + 1);

    nodeGroups.append('text')
      .attr('dy', 42)
      .attr('text-anchor', 'middle')
      .attr('fill', d => d.id === activeStepId ? colors.linkActive : colors.textSub)
      .style('font-size', '8px')
      .style('font-weight', 'bold')
      .style('text-transform', 'uppercase')
      .style('letter-spacing', '0.1em')
      .text(d => d.name.length > 16 ? d.name.substring(0, 13) + '...' : d.name);

  }, [steps, activeStepId, theme, savedPositions]);

  return (
    <div className={`w-full rounded-[2.25rem] border p-8 relative overflow-hidden transition-all duration-500 group shadow-[0_25px_60px_-45px_rgba(59,130,246,0.6)] ${theme === 'dark' ? 'bg-[#07090c] border-gray-800' : 'bg-white border-gray-200'}`}>
      <div className="absolute -top-16 -right-12 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none"></div>
      <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none group-hover:opacity-20 transition-opacity">
        <Workflow size={140} className="text-blue-500" />
      </div>
      <div className="flex items-center justify-between mb-8 relative z-10">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-600/10 rounded-xl border border-blue-600/20 shadow-lg shadow-blue-600/10">
            <Share2 size={18} className="text-blue-500" />
          </div>
          <div>
            <h3 className={`text-sm font-black tracking-[0.18em] uppercase ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>DAG Execution Schema</h3>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black mt-1">Topology Visualizer</p>
          </div>
        </div>
        <div className="hidden sm:flex gap-6">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_10px_#3b82f6]"></div>
            <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Active Thread</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-gray-800"></div>
            <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Logic Flow</span>
          </div>
        </div>
        <button
          onClick={() => onSavePositions?.(positionsRef.current)}
          className={`ml-4 flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${theme === 'dark' ? 'bg-[#0c0f14] border-gray-800 text-gray-400 hover:text-white hover:border-blue-500/40' : 'bg-white border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-500/30'}`}
        >
          <Save size={14} /> Save Layout
        </button>
      </div>
      <div className="relative overflow-visible">
        <svg ref={svgRef} width="100%" height={svgHeight} className="mx-auto"></svg>
      </div>
    </div>
  );
};

export default PipelineGraph;