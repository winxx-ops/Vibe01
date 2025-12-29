
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { VisualizerTheme } from '../types';

interface VisualizerProps {
  isPlaying: boolean;
  theme: VisualizerTheme;
}

const Visualizer: React.FC<VisualizerProps> = ({ isPlaying, theme }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const dataRef = useRef<number[]>(Array.from({ length: 40 }, () => Math.random() * 20 + 10));
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = 240;
    const height = 40;
    
    // Clear previous if any
    svg.selectAll('*').remove();

    const update = () => {
      if (isPlaying) {
        dataRef.current = dataRef.current.map(v => {
          const change = Math.random() * 8 - 4;
          return Math.max(5, Math.min(height, v + change));
        });
      } else {
        // Slowly settle to baseline
        dataRef.current = dataRef.current.map(v => v * 0.95 + 2);
      }

      if (theme.style === 'bars') {
        const barWidth = 4;
        const gap = 2;
        svg.selectAll('rect')
          .data(dataRef.current)
          .join('rect')
          .attr('x', (_, i) => i * (barWidth + gap))
          .attr('y', d => height - d)
          .attr('width', barWidth)
          .attr('height', d => d)
          .attr('fill', theme.primaryColor)
          .attr('opacity', isPlaying ? 0.8 : 0.3)
          .attr('rx', 2);
      } else if (theme.style === 'wave') {
        const line = d3.line<number>()
          .x((_, i) => i * (width / (dataRef.current.length - 1)))
          .y(d => height / 2 + (d - height / 2))
          .curve(d3.curveBasis);

        svg.selectAll('path')
          .data([dataRef.current])
          .join('path')
          .attr('d', line)
          .attr('fill', 'none')
          .attr('stroke', theme.primaryColor)
          .attr('stroke-width', 2)
          .attr('opacity', isPlaying ? 0.9 : 0.2);
      } else if (theme.style === 'dots') {
        const dotRadius = 2;
        const gap = 4;
        svg.selectAll('circle')
          .data(dataRef.current)
          .join('circle')
          .attr('cx', (_, i) => i * (dotRadius * 2 + gap) + dotRadius)
          .attr('cy', d => height / 2)
          .attr('r', d => Math.max(1, d / 4))
          .attr('fill', theme.primaryColor)
          .attr('opacity', isPlaying ? 0.7 : 0.2);
      }

      animationRef.current = requestAnimationFrame(update);
    };

    update();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, theme]);

  return (
    <svg 
      ref={svgRef} 
      width="240" 
      height="40" 
      className="mx-auto mt-4 overflow-visible"
    />
  );
};

export default Visualizer;
