import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Chessboard as ReactChessboard } from 'react-chessboard';
import { Chess, Move, Square } from 'chess.js';
import { MoveEvaluation } from '../../types/chess';
import './Chessboard.css';

// Define our own Arrow type to match what react-chessboard expects
type Arrow = [from: Square, to: Square, color?: string];

interface ChessboardProps {
  position?: string;
  onMove?: (move: Move) => void;
  showHints?: boolean;
  currentEvaluation?: MoveEvaluation[];
  highlightedSquares?: Square[];
  thinking?: boolean;
}

const Chessboard: React.FC<ChessboardProps> = ({
  position = 'start',
  onMove,
  showHints = false,
  currentEvaluation = [],
  highlightedSquares = [],
  thinking = false,
}) => {
  const [game, setGame] = useState<Chess>(new Chess(position));
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<Square[]>([]);
  const [boardWidth, setBoardWidth] = useState<number>(450);
  const containerRef = useRef<HTMLDivElement>(null);

  // Add responsive board sizing
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        setBoardWidth(containerWidth);
      }
    };

    // Initial size
    handleResize();

    // Update on window resize
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Update the game object when position changes
    setGame(new Chess(position));
  }, [position]);

  const handleSquareClick = useCallback(
    (square: Square) => {
      // If a piece is already selected
      if (selectedSquare) {
        // Try to make a move
        const moveAttempt = {
          from: selectedSquare,
          to: square,
          promotion: 'q', // Default to queen promotion
        };

        try {
          // Attempt to make the move
          const move = game.move(moveAttempt);
          
          // If move is legal, update the board and notify parent
          if (move) {
            onMove && onMove(move);
          }
        } catch (e) {
          // Invalid move, do nothing
        }

        // Reset selection
        setSelectedSquare(null);
        setPossibleMoves([]);
        return;
      }

      // Check if the square contains a piece that can move
      const piece = game.get(square);
      if (piece && piece.color === game.turn()) {
        setSelectedSquare(square);
        
        // Get all possible moves for this piece
        const moves = game.moves({ square, verbose: true });
        setPossibleMoves(moves.map(m => m.to));
      }
    },
    [game, selectedSquare, onMove]
  );

  const getSquareStyles = useCallback(() => {
    const styles: Record<string, React.CSSProperties> = {};
    
    // Style for selected square
    if (selectedSquare) {
      styles[selectedSquare] = { backgroundColor: 'rgba(255, 255, 0, 0.4)' };
    }
    
    // Style for possible move squares
    possibleMoves.forEach(square => {
      styles[square] = { backgroundColor: 'rgba(0, 255, 0, 0.2)' };
    });
    
    // Style for AI highlighted squares
    if (showHints && highlightedSquares) {
      highlightedSquares.forEach(square => {
        styles[square] = { 
          ...styles[square],
          boxShadow: 'inset 0 0 3px 3px rgba(255, 0, 0, 0.5)' 
        };
      });
    }
    
    return styles;
  }, [selectedSquare, possibleMoves, showHints, highlightedSquares]);

  const customArrows = useCallback((): Arrow[] => {
    if (!showHints || !currentEvaluation || currentEvaluation.length === 0) {
      return [];
    }
    
    // Show arrows for top 3 moves from the AI
    return currentEvaluation.slice(0, 3).map(evaluation => {
      const move = evaluation.move;
      // For most moves, we need to extract from and to squares
      let from: Square;
      let to: Square;
      
      // Handle special notations (castle, etc.)
      if (move === 'O-O' || move === 'O-O-O') {
        const isWhite = game.turn() === 'w';
        from = (isWhite ? 'e1' : 'e8') as Square;
        to = (move === 'O-O' ? (isWhite ? 'g1' : 'g8') : (isWhite ? 'c1' : 'c8')) as Square;
      } else {
        // For regular moves, try to extract from game's moves list
        const moves = game.moves({ verbose: true });
        const foundMove = moves.find(m => m.san === move);
        
        if (foundMove) {
          from = foundMove.from as Square;
          to = foundMove.to as Square;
        } else {
          // Skip this move if we can't parse it
          return null as unknown as Arrow;
        }
      }
      
      // Use different colors for different evaluation scores
      let arrowColor = '#00ff00';  // Default: green
      
      // Color based on evaluation score
      if (evaluation.score > 1.5) {
        arrowColor = '#00ff00'; // Strong: bright green
      } else if (evaluation.score > 0.5) {
        arrowColor = '#88ff00'; // Good: yellow-green
      } else if (evaluation.score > -0.5) {
        arrowColor = '#ffff00'; // Equal: yellow
      } else if (evaluation.score > -1.5) {
        arrowColor = '#ff8800'; // Bad: orange
      } else {
        arrowColor = '#ff0000'; // Blunder: red
      }
      
      // Return arrow as tuple [from, to, color]
      return [from, to, arrowColor] as Arrow;
    }).filter(Boolean) as Arrow[]; // Filter out any null values
  }, [showHints, currentEvaluation, game]);

  return (
    <div className="chessboard-container" ref={containerRef}>
      <ReactChessboard
        id="main-board"
        position={game.fen()}
        onSquareClick={handleSquareClick}
        customSquareStyles={getSquareStyles()}
        customArrows={customArrows()}
        boardWidth={boardWidth}
        areArrowsAllowed={true}
        animationDuration={200}
      />
      {thinking && (
        <div className="thinking-indicator">
          <div className="thinking-spinner"></div>
          AI is thinking...
        </div>
      )}
    </div>
  );
};

export default Chessboard;