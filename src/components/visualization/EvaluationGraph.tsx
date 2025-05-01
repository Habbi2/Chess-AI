import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { ChessPosition } from '../../types/chess';

interface EvaluationGraphProps {
  history: {
    position: ChessPosition;
    evaluation: number;
  }[];
  width?: number;
  height?: number;
}

const EvaluationGraph: React.FC<EvaluationGraphProps> = ({
  history,
  width = 500,
  height = 200
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || history.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous graph
    
    const margin = { top: 20, right: 30, bottom: 30, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);
      
    // X scale for move numbers
    const xScale = d3.scaleLinear()
      .domain([0, Math.max(9, history.length - 1)]) // At least 10 moves wide
      .range([0, innerWidth]);
    
    // Y scale for evaluation score
    const yScale = d3.scaleLinear()
      .domain([-10, 10]) // Standard evaluation range
      .range([innerHeight, 0]);
    
    // Create X and Y axes
    const xAxis = d3.axisBottom(xScale).ticks(5);
    const yAxis = d3.axisLeft(yScale).ticks(5);
    
    // Add the X axis
    g.append('g')
      .attr('transform', `translate(0, ${innerHeight/2})`)
      .call(xAxis)
      .append('text')
      .attr('x', innerWidth / 2)
      .attr('y', 30)
      .attr('fill', 'black')
      .text('Move Number');
    
    // Add the Y axis
    g.append('g')
      .call(yAxis)
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -30)
      .attr('x', -innerHeight / 2)
      .attr('fill', 'black')
      .attr('text-anchor', 'middle')
      .text('Evaluation');
    
    // Center line (evaluation = 0)
    g.append('line')
      .attr('x1', 0)
      .attr('y1', innerHeight / 2)
      .attr('x2', innerWidth)
      .attr('y2', innerHeight / 2)
      .attr('stroke', 'gray')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4');
    
    // Create the line generator
    const line = d3.line<{position: ChessPosition, evaluation: number}>()
      .x((_, i) => xScale(i))
      .y(d => yScale(d.evaluation))
      .curve(d3.curveMonotoneX);
    
    // Add the evaluation line
    g.append('path')
      .datum(history)
      .attr('fill', 'none')
      .attr('stroke', 'steelblue')
      .attr('stroke-width', 2)
      .attr('d', line);
    
    // Add dots for each position
    g.selectAll('.dot')
      .data(history)
      .enter()
      .append('circle')
      .attr('class', 'dot')
      .attr('cx', (_, i) => xScale(i))
      .attr('cy', d => yScale(d.evaluation))
      .attr('r', 4)
      .attr('fill', (_, i) => i === history.length - 1 ? 'red' : 'steelblue')
      .append('title') // Add tooltip
      .text(d => `Move ${d.position.moveNumber}: ${d.evaluation > 0 ? '+' : ''}${d.evaluation.toFixed(2)}`);
      
  }, [history, width, height]);

  return (
    <div className="evaluation-graph">
      <h3>Position Evaluation Over Time</h3>
      <svg 
        ref={svgRef} 
        width={width} 
        height={height}
      />
      <div className="legend">
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: 'steelblue' }}></span>
          <span>Position evaluation (positive = white advantage)</span>
        </div>
      </div>
    </div>
  );
};

export default EvaluationGraph;