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

// Define the PromotionPieceProps interface
interface PromotionPieceProps {
  promotion: 'q' | 'r' | 'b' | 'n';
  onSelect: (pieceType: 'q' | 'r' | 'b' | 'n') => void;
  turn: 'w' | 'b';
}

// Create a separate PromotionPiece component
const PromotionPiece: React.FC<PromotionPieceProps> = ({ promotion, onSelect, turn }) => {
  // Map promotion piece to unicode symbol with proper color
  const pieceToUnicode: Record<string, string> = {
    'q': turn === 'w' ? '♕' : '♛',
    'r': turn === 'w' ? '♖' : '♜',
    'b': turn === 'w' ? '♗' : '♝',
    'n': turn === 'w' ? '♘' : '♞',
  };

  return (
    <div 
      className="promotion-piece" 
      onClick={() => onSelect(promotion)}
    >
      {pieceToUnicode[promotion]}
    </div>
  );
};

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
  const [pendingPromotion, setPendingPromotion] = useState<{from: Square, to: Square} | null>(null);
  const [isMobileDevice, setIsMobileDevice] = useState<boolean>(false);
  const [windowWidth, setWindowWidth] = useState<number>(window.innerWidth);
  const [windowHeight, setWindowHeight] = useState<number>(window.innerHeight);
  const containerRef = useRef<HTMLDivElement>(null);
  const boardAreaRef = useRef<HTMLDivElement>(null);

  // Detect if user is on a mobile device
  useEffect(() => {
    const checkIfMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor;
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      setIsMobileDevice(
        isTouchDevice || 
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
      );
    };
    checkIfMobile();
  }, []);

  // Track window dimensions changes
  useEffect(() => {
    const handleWindowResize = () => {
      setWindowWidth(window.innerWidth);
      setWindowHeight(window.innerHeight);
    };
    
    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, []);

  // Improved responsive board sizing with strict square aspect ratio enforcement
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;

      // Get container dimensions accounting for padding and border
      const container = containerRef.current;
      const containerStyles = window.getComputedStyle(container);
      const paddingX = parseFloat(containerStyles.paddingLeft) + parseFloat(containerStyles.paddingRight);
      
      // Calculate available space
      let availableWidth = container.clientWidth - paddingX;
      
      // Set a maximum size to prevent the board from becoming too large
      const maxSize = 550;
      
      let newSize: number;
      
      // Different size calculation based on device size
      if (isMobileDevice) {
        if (window.innerWidth <= 480) {
          // Small mobile devices: use almost full viewport width
          newSize = Math.min(availableWidth, window.innerWidth * 0.95);
        } else if (window.innerWidth <= 768) {
          // Tablet/larger mobile: use slightly less viewport width
          newSize = Math.min(availableWidth, window.innerWidth * 0.85);
        } else {
          // Larger devices in mobile mode
          newSize = Math.min(availableWidth, maxSize);
        }
      } else {
        // Desktop: determine appropriate size based on available space
        if (window.innerWidth <= 768) {
          // Smaller desktop or tablet view
          newSize = Math.min(availableWidth, window.innerWidth * 0.85, maxSize);
        } else {
          // Full desktop view
          newSize = Math.min(availableWidth, maxSize);
        }
      }
      
      // Round to the nearest even pixel to avoid sub-pixel rendering issues
      newSize = Math.floor(newSize);
      if (newSize % 2 !== 0) newSize -= 1;
      
      // Set the board size
      setBoardWidth(newSize);
      
      // Apply explicit dimensions to container to force square aspect ratio
      if (container) {
        container.style.width = `${newSize}px`;
        container.style.height = `${newSize}px`;
        
        // Also ensure inner container maintains square aspect ratio
        const boardArea = boardAreaRef.current;
        if (boardArea) {
          boardArea.style.width = `${newSize}px`;
          boardArea.style.height = `${newSize}px`;
        }
      }
    };

    // Initial size calculation
    handleResize();
    
    // Re-calculate when window resizes
    window.addEventListener('resize', handleResize);
    
    // Force recalculation after a short delay to handle any layout adjustments
    const resizeTimer = setTimeout(handleResize, 100);
    const secondResizeTimer = setTimeout(handleResize, 500); // Additional check after animation completes
    
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimer);
      clearTimeout(secondResizeTimer);
    };
  }, [isMobileDevice, windowWidth, windowHeight]);

  useEffect(() => {
    // Update the game object when position changes
    setGame(new Chess(position));
  }, [position]);

  // Handle promotion selection
  const handlePromotionSelect = useCallback((pieceType: 'q' | 'r' | 'b' | 'n') => {
    if (!pendingPromotion) return;

    try {
      const move = game.move({
        from: pendingPromotion.from,
        to: pendingPromotion.to,
        promotion: pieceType
      });
      
      if (move) {
        onMove && onMove(move);
      }
    } catch (e) {
      console.error('Invalid promotion move:', e);
    }
    
    // Reset promotion state
    setPendingPromotion(null);
  }, [game, pendingPromotion, onMove]);

  // Check if move requires promotion
  const requiresPromotion = useCallback((from: Square, to: Square): boolean => {
    const piece = game.get(from);
    
    // Check if it's a pawn and moving to the last rank
    if (piece && piece.type === 'p') {
      const destRank = to.charAt(1);
      if ((piece.color === 'w' && destRank === '8') || 
          (piece.color === 'b' && destRank === '1')) {
        return true;
      }
    }
    
    return false;
  }, [game]);

  // Enhanced square click handler with promotion UI support
  const handleSquareClick = useCallback(
    (square: Square) => {
      // If promotion UI is open, ignore board clicks
      if (pendingPromotion) return;

      // If a piece is already selected
      if (selectedSquare) {
        // Try to make a move
        if (requiresPromotion(selectedSquare, square)) {
          // Show promotion UI
          setPendingPromotion({from: selectedSquare, to: square});
        } else {
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
    [game, selectedSquare, onMove, pendingPromotion, requiresPromotion]
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
      <div className="board-inner-container" ref={boardAreaRef}>
        <ReactChessboard
          id="main-board"
          position={game.fen()}
          onSquareClick={handleSquareClick}
          customSquareStyles={getSquareStyles()}
          customArrows={customArrows()}
          boardWidth={boardWidth}
          areArrowsAllowed={true}
          animationDuration={200}
          boardOrientation="white"
          customDarkSquareStyle={{ 
            backgroundColor: isMobileDevice && windowWidth <= 480 ? '#6b3500' : '#8B4513'
          }}
          customLightSquareStyle={{ 
            backgroundColor: isMobileDevice && windowWidth <= 480 ? '#f7e8c8' : '#ebd8b7'
          }}
        />
      </div>
      
      {thinking && (
        <div className="thinking-indicator">
          <div className="thinking-spinner"></div>
          AI is thinking...
        </div>
      )}
      
      {/* Mobile-friendly promotion UI */}
      {pendingPromotion && (
        <div className="promotion-ui">
          <div className="promotion-pieces">
            {(['q', 'r', 'b', 'n'] as const).map(piece => (
              <PromotionPiece 
                key={piece} 
                promotion={piece} 
                onSelect={handlePromotionSelect}
                turn={game.turn()}
              />
            ))}
          </div>
          <div className="promotion-cancel" onClick={() => setPendingPromotion(null)}>
            Cancel
          </div>
        </div>
      )}
    </div>
  );
};

export default Chessboard;