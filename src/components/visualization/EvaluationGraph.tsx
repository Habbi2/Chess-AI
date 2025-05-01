import React, { useRef, useEffect } from 'react';
import { ChessPosition } from '../../types/chess';

interface EvaluationGraphProps {
  history: {
    position: ChessPosition;
    evaluation: number;
  }[];
}

const EvaluationGraph: React.FC<EvaluationGraphProps> = ({ history }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Use canvas for efficient rendering
  useEffect(() => {
    if (!canvasRef.current || history.length === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Get the container width to make it responsive
    const containerWidth = canvas.parentElement?.clientWidth || 300;
    const containerHeight = Math.min(containerWidth * 0.6, 200); // Aspect ratio control
    
    // Update canvas dimensions to match container
    canvas.width = containerWidth;
    canvas.height = containerHeight;
    
    // Set styles
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#DAA520';
    ctx.fillStyle = 'rgba(218, 165, 32, 0.2)';
    
    // Find the min and max evaluations
    let maxEval = 3;
    let minEval = -3;
    
    history.forEach(item => {
      if (item.evaluation > maxEval) maxEval = item.evaluation;
      if (item.evaluation < minEval) minEval = item.evaluation;
    });
    
    // Add some padding to the range
    maxEval += 1;
    minEval -= 1;
    
    // Calculate scale factors
    const xScale = canvas.width / (Math.max(1, history.length - 1));
    const yScale = canvas.height / (maxEval - minEval);
    
    // Draw centerline (0 evaluation)
    const y0 = canvas.height - ((0 - minEval) * yScale);
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.setLineDash([5, 5]);
    ctx.moveTo(0, y0);
    ctx.lineTo(canvas.width, y0);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw the evaluation line
    ctx.beginPath();
    ctx.strokeStyle = '#DAA520';
    
    history.forEach((item, index) => {
      const x = index * xScale;
      const y = canvas.height - ((item.evaluation - minEval) * yScale);
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.stroke();
    
    // Draw the fill under the line
    ctx.beginPath();
    ctx.fillStyle = 'rgba(218, 165, 32, 0.2)';
    
    // Start at the bottom left
    const startX = 0;
    const startY = canvas.height - ((history[0].evaluation - minEval) * yScale);
    ctx.moveTo(startX, canvas.height); // bottom left corner
    ctx.lineTo(startX, startY);
    
    // Draw the line path again
    history.forEach((item, index) => {
      const x = index * xScale;
      const y = canvas.height - ((item.evaluation - minEval) * yScale);
      ctx.lineTo(x, y);
    });
    
    // Close the path to the bottom right
    const endX = (history.length - 1) * xScale;
    ctx.lineTo(endX, canvas.height); // bottom right corner
    ctx.closePath();
    ctx.fill();
    
    // Add axis labels
    ctx.fillStyle = '#e0e0e0';
    ctx.font = '10px Arial';
    
    // Y-axis labels (evaluation values)
    ctx.textAlign = 'left';
    ctx.fillText(maxEval.toFixed(1), 5, 15);
    ctx.fillText('0.0', 5, y0 + 4);
    ctx.fillText(minEval.toFixed(1), 5, canvas.height - 5);
    
    // X-axis labels (move numbers)
    if (history.length > 0) {
      ctx.textAlign = 'right';
      ctx.fillText(`Move ${history[history.length - 1].position.moveNumber}`, canvas.width - 5, canvas.height - 5);
      
      if (history.length > 10) {
        // Show some intermediate labels
        const interval = Math.floor(history.length / 5);
        for (let i = interval; i < history.length; i += interval) {
          const x = i * xScale;
          ctx.fillText(`${history[i].position.moveNumber}`, x, canvas.height - 5);
        }
      }
    }
  }, [history]);
  
  // Handle window resize with redraw
  useEffect(() => {
    const handleResize = () => {
      // Force re-render by changing the dependency
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const container = canvas.parentElement;
        if (container) {
          const newWidth = container.clientWidth;
          if (canvas.width !== newWidth) {
            // This will trigger the rendering effect above
            canvas.width = newWidth;
          }
        }
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="evaluation-graph">
      <h3>Game Evaluation</h3>
      <div style={{ 
        width: '100%', 
        height: 'auto',
        position: 'relative',
        maxWidth: '100%'
      }}>
        <canvas 
          ref={canvasRef}
          style={{ 
            width: '100%', 
            height: 'auto',
            border: '1px solid rgba(218, 165, 32, 0.3)',
            borderRadius: '4px',
            backgroundColor: 'rgba(46, 46, 46, 0.4)'
          }}
        />
      </div>
      <div className="legend">
        <div className="legend-item">
          <div 
            className="legend-color"
            style={{
              backgroundColor: '#DAA520'
            }}
          />
          <span>Evaluation (positive = White advantage)</span>
        </div>
      </div>
    </div>
  );
};

export default EvaluationGraph;