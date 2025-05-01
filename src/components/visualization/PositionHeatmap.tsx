import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { PositionHeatmap as HeatmapType } from '../../types/chess';

// Chess board dimensions
const BOARD_SIZE = 8;
const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = [8, 7, 6, 5, 4, 3, 2, 1];

interface PositionHeatmapProps {
  heatmap: HeatmapType;
  width?: number;
  height?: number;
  flipped?: boolean;
}

const PositionHeatmap: React.FC<PositionHeatmapProps> = ({
  heatmap,
  width = 300,
  height = 300,
  flipped = false
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  // Function to get color based on value
  const getColor = (value: number, minValue: number, maxValue: number): string => {
    // Normalize value between 0 and 1
    const normalized = (value - minValue) / (maxValue - minValue || 1);
    
    // Color scale based on heatmap type
    switch (heatmap.type) {
      case 'mobility':
        return d3.interpolateBlues(normalized);
      case 'control':
        return d3.interpolateGreens(normalized);
      case 'safety':
        return d3.interpolateReds(1 - normalized); // Inverse for safety (higher is safer)
      case 'attack':
        return d3.interpolateOranges(normalized);
      default:
        return d3.interpolateViridis(normalized);
    }
  };

  useEffect(() => {
    if (!svgRef.current || !heatmap) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous heatmap
    
    const cellSize = Math.min(width, height) / BOARD_SIZE;
    
    // Create a group for the board
    const boardGroup = svg
      .append('g')
      .attr('transform', `translate(0, 0)`);
    
    // Loop through all squares on the board
    for (let rankIndex = 0; rankIndex < BOARD_SIZE; rankIndex++) {
      for (let fileIndex = 0; fileIndex < BOARD_SIZE; fileIndex++) {
        // Calculate position based on whether board is flipped
        const rank = flipped ? rankIndex : BOARD_SIZE - 1 - rankIndex;
        const file = flipped ? BOARD_SIZE - 1 - fileIndex : fileIndex;
        
        const squareName = `${FILES[file]}${RANKS[rank]}` as keyof typeof heatmap.squares;
        const value = heatmap.squares[squareName] || 0;
        
        // Draw the square
        boardGroup
          .append('rect')
          .attr('x', file * cellSize)
          .attr('y', rankIndex * cellSize)
          .attr('width', cellSize)
          .attr('height', cellSize)
          .attr('fill', getColor(value, heatmap.minValue, heatmap.maxValue))
          .attr('stroke', '#888')
          .attr('stroke-width', 0.5)
          .append('title') // Add tooltip
          .text(`${squareName}: ${value.toFixed(2)}`);
        
        // Add coordinate labels (only on edges)
        if (rankIndex === BOARD_SIZE - 1) {
          boardGroup
            .append('text')
            .attr('x', file * cellSize + cellSize / 2)
            .attr('y', BOARD_SIZE * cellSize + 15)
            .attr('text-anchor', 'middle')
            .attr('font-size', '12px')
            .text(FILES[file]);
        }
        
        if (file === 0) {
          boardGroup
            .append('text')
            .attr('x', -10)
            .attr('y', rankIndex * cellSize + cellSize / 2 + 4)
            .attr('text-anchor', 'middle')
            .attr('font-size', '12px')
            .text(RANKS[rank]);
        }
      }
    }
    
    // Add a color legend
    const legendWidth = 200;
    const legendHeight = 20;
    
    const legendX = (width - legendWidth) / 2;
    const legendY = height + 30;
    
    const legendScale = d3.scaleLinear()
      .domain([heatmap.minValue, heatmap.maxValue])
      .range([0, legendWidth]);
    
    const legendAxis = d3.axisBottom(legendScale)
      .ticks(5)
      .tickFormat(d => d.toString());
    
    // Continuous gradient legend
    const defs = svg.append('defs');
    
    const gradient = defs.append('linearGradient')
      .attr('id', `heatmap-gradient-${heatmap.type}`)
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '0%');
    
    // Add color stops to gradient
    const numStops = 10;
    for (let i = 0; i <= numStops; i++) {
      const offset = i / numStops;
      const value = heatmap.minValue + offset * (heatmap.maxValue - heatmap.minValue);
      gradient.append('stop')
        .attr('offset', `${offset * 100}%`)
        .attr('stop-color', getColor(value, heatmap.minValue, heatmap.maxValue));
    }
    
    // Draw legend rectangle
    svg.append('rect')
      .attr('x', legendX)
      .attr('y', legendY)
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .style('fill', `url(#heatmap-gradient-${heatmap.type})`);
    
    // Add legend axis
    svg.append('g')
      .attr('transform', `translate(${legendX}, ${legendY + legendHeight})`)
      .call(legendAxis);
    
    // Add legend title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', legendY - 5)
      .attr('text-anchor', 'middle')
      .attr('font-size', '14px')
      .text(heatmap.type.charAt(0).toUpperCase() + heatmap.type.slice(1));
    
  }, [heatmap, width, height, flipped]);

  return (
    <div className="position-heatmap">
      <svg 
        ref={svgRef} 
        width={width} 
        height={height + 70} // Extra space for legend
      />
    </div>
  );
};

export default PositionHeatmap;