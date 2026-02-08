import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { PipelineStep } from '../types';
import { Workflow, Share2 } from 'lucide-react';

interface PipelineGraphProps {
  steps: PipelineStep[];
  activeStepId?: string | null;
  theme?: 'dark' | 'light';
}

const PipelineGraph: React.FC<PipelineGraphProps> = ({ steps, activeStepId, theme = 'dark' }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || steps.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const container = svgRef.current.parentElement;
    const width = container?.clientWidth || 800;
    const height = 350;
    const nodeRadius = 28;

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

    nodes.forEach(n => {
      const layerNodes = layers[n.layer];
      const nodeIdx = layerNodes.indexOf(n);
      const layerX = 120 + n.layer * ((width - 240) / 2);
      const layerY = (height / (layerNodes.length + 1)) * (nodeIdx + 1);
      n.x = layerX;
      n.y = layerY;
    });

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
    g.selectAll('.link')
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
      .attr('stroke-width', 2.5)
      .attr('marker-end', 'url(#arrowhead-graph)')
      .style('opacity', 0.9);

    // Draw Nodes
    const nodeGroups = g.selectAll('.node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('transform', d => `translate(${d.x}, ${d.y})`);

    // Glow for active node
    nodeGroups.filter(d => d.id === activeStepId)
      .append('circle')
      .attr('r', nodeRadius + 8)
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
      .attr('stroke-width', 3);

    nodeGroups.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '.3em')
      .attr('fill', d => d.id === activeStepId ? colors.linkActive : colors.textMain)
      .style('font-family', 'JetBrains Mono')
      .style('font-size', '12px')
      .style('font-weight', 'black')
      .text((d, i) => i + 1);

    nodeGroups.append('text')
      .attr('dy', 52)
      .attr('text-anchor', 'middle')
      .attr('fill', d => d.id === activeStepId ? colors.linkActive : colors.textSub)
      .style('font-size', '9px')
      .style('font-weight', 'bold')
      .style('text-transform', 'uppercase')
      .style('letter-spacing', '0.1em')
      .text(d => d.name.length > 18 ? d.name.substring(0, 15) + '...' : d.name);

  }, [steps, activeStepId, theme]);

  return (
    <div className={`w-full rounded-3xl border p-12 relative overflow-hidden transition-all duration-500 group shadow-2xl ${theme === 'dark' ? 'bg-[#050505] border-gray-800' : 'bg-white border-gray-200'}`}>
      <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
        <Workflow size={160} className="text-blue-500" />
      </div>
      <div className="flex items-center justify-between mb-12 relative z-10">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-600/10 rounded-xl border border-blue-600/20">
            <Share2 size={20} className="text-blue-500" />
          </div>
          <div>
            <h3 className={`text-md font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>DAG Execution Schema</h3>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black mt-1">Topology Visualizer</p>
          </div>
        </div>
        <div className="flex gap-8">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_10px_#3b82f6]"></div>
            <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Active Thread</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-gray-800"></div>
            <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Logic Flow</span>
          </div>
        </div>
      </div>
      <div className="relative overflow-visible">
        <svg ref={svgRef} width="100%" height="350" className="mx-auto"></svg>
      </div>
    </div>
  );
};

export default PipelineGraph;