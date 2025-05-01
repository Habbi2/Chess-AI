import { useState, useEffect, useReducer } from 'react';
import { Chess, Move } from 'chess.js';
import Chessboard from './components/chessboard/Chessboard';
import EvaluationGraph from './components/visualization/EvaluationGraph';
import PositionHeatmap from './components/visualization/PositionHeatmap';
import { 
  GameState, 
  GameAction, 
  ChessPosition, 
  ModelMetadata,
  PositionHeatmap as HeatmapType
} from './types/chess';
import './App.css';

// Import chess service
import * as ChessService from './services/ChessService';

// Initialize the models
const availableModels: ModelMetadata[] = [
  {
    id: 'basic',
    name: 'Basic Evaluation',
    version: '1.0',
    description: 'Simple heuristic evaluation based on material and basic positional factors',
    trainingMethod: 'supervised',
    created: new Date().toISOString(),
  },
  {
    id: 'supervised',
    name: 'Supervised Learning Model',
    version: '1.0',
    description: 'Neural network trained on master games',
    trainingMethod: 'supervised',
    elo: 1500,
    created: new Date().toISOString(),
  },
  {
    id: 'reinforcement',
    name: 'Self-play Model',
    version: '1.0',
    description: 'Neural network trained through self-play',
    trainingMethod: 'reinforcement',
    elo: 1800,
    created: new Date().toISOString(),
  }
];

// Initialize state
const initialGameState: GameState = {
  game: new Chess(),
  history: [{
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    turn: 'w',
    moveNumber: 1
  }],
  currentPosition: {
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    turn: 'w',
    moveNumber: 1
  },
  evaluations: {},
  heatmaps: {},
  selectedModelMetadata: availableModels[0],
  thinking: false,
  searchDepth: 1, // Reduced from 2 for better performance
  undoPerformed: false
};

// Game reducer to handle state updates
function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'MAKE_MOVE': {
      const newGame = new Chess(state.game.fen());
      newGame.move(action.move);
      
      const newPosition: ChessPosition = {
        fen: newGame.fen(),
        turn: newGame.turn() as 'w' | 'b',
        moveNumber: Math.floor(newGame.moveNumber() || 1),
        lastMove: action.move
      };
      
      return {
        ...state,
        game: newGame,
        history: [...state.history, newPosition],
        currentPosition: newPosition,
        undoPerformed: false // Reset the undoPerformed flag when a move is made
      };
    }
    
    case 'UNDO_MOVE': {
      if (state.history.length <= 1) {
        return state; // Can't undo from starting position
      }
      
      // Create a new game instance from the previous position instead of using undo
      const newHistory = state.history.slice(0, -1);
      const newPosition = newHistory[newHistory.length - 1];
      const newGame = new Chess(newPosition.fen);
      
      return {
        ...state,
        game: newGame,
        history: newHistory,
        currentPosition: newPosition,
        undoPerformed: true // Set the flag to indicate undo was performed
      };
    }
    
    case 'SET_POSITION': {
      try {
        // Special case for the 'start' keyword
        if (action.fen === 'start') {
          const newGame = new Chess();
          
          const newPosition: ChessPosition = {
            fen: newGame.fen(),
            turn: newGame.turn() as 'w' | 'b',
            moveNumber: Math.floor(newGame.moveNumber() || 1)
          };
          
          return {
            ...state,
            game: newGame,
            history: [newPosition],
            currentPosition: newPosition,
            evaluations: {}
          };
        }
        
        // Validate FEN string format (must have 6 space-delimited fields)
        const fenParts = action.fen.split(' ');
        if (fenParts.length !== 6) {
          console.error('Invalid FEN string: must contain six space-delimited fields', action.fen);
          return state; // Return current state if FEN is invalid
        }
        
        // Create new game with the validated FEN
        const newGame = new Chess(action.fen);
        
        const newPosition: ChessPosition = {
          fen: newGame.fen(),
          turn: newGame.turn() as 'w' | 'b',
          moveNumber: Math.floor(newGame.moveNumber() || 1)
        };
        
        return {
          ...state,
          game: newGame,
          history: [newPosition],
          currentPosition: newPosition,
          evaluations: {}
        };
      } catch (error) {
        console.error('Error setting position:', error);
        return state; // Return current state if there's an error
      }
    }
    
    case 'CHANGE_MODEL': {
      return {
        ...state,
        selectedModelMetadata: action.modelMetadata,
        evaluations: {}
      };
    }
    
    case 'SET_DEPTH': {
      return {
        ...state,
        searchDepth: action.depth
      };
    }
    
    case 'REQUEST_EVALUATION': {
      return {
        ...state,
        thinking: true
      };
    }
    
    case 'RECEIVE_EVALUATION': {
      const newEvaluations = { ...state.evaluations };
      newEvaluations[action.fen] = action.evaluations;
      
      return {
        ...state,
        thinking: false,
        evaluations: newEvaluations
      };
    }
    
    case 'RECEIVE_HEATMAP': {
      const newHeatmaps = { ...state.heatmaps };
      
      if (!newHeatmaps[action.fen]) {
        newHeatmaps[action.fen] = {} as Record<HeatmapType['type'], HeatmapType>;
      }
      
      newHeatmaps[action.fen][action.heatmapType] = action.heatmap;
      
      return {
        ...state,
        heatmaps: newHeatmaps
      };
    }
    
    default:
      return state;
  }
}

function App() {
  const [state, dispatch] = useReducer(gameReducer, initialGameState);
  const [selectedHeatmapType, setSelectedHeatmapType] = useState<HeatmapType['type']>('control');
  const [showHints, setShowHints] = useState(false);
  // Keeping this for future training status implementation
  // @ts-ignore - Will be used in future feature
  const [trainingStatus, setTrainingStatus] = useState<string | null>(null);
  const [evaluationHistory, setEvaluationHistory] = useState<{position: ChessPosition, evaluation: number}[]>([]);
  const [aiPlaysBlack, setAiPlaysBlack] = useState(true);
  const [modelInitialized, setModelInitialized] = useState(false);
  
  // Add effect to ensure proper viewport settings
  useEffect(() => {
    // Check if viewport meta tag exists
    let viewportMeta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement | null;
    
    // If it doesn't exist, create it
    if (!viewportMeta) {
      viewportMeta = document.createElement('meta') as HTMLMetaElement;
      viewportMeta.setAttribute('name', 'viewport');
      document.head.appendChild(viewportMeta);
    }
    
    // Set proper viewport properties with stricter settings to fix specific viewport issues
    viewportMeta.setAttribute('content', 
      'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
      
    // Set a minimum height for the body to ensure footer is visible
    document.body.style.minHeight = '100vh';
    document.documentElement.style.height = 'auto';
    document.documentElement.style.minHeight = '100vh';
    
    // Add specific overflow prevention for the specific viewport size issue
    const meta = document.createElement('style');
    meta.textContent = `
      @media screen and (min-width: 760px) and (max-width: 830px) {
        body, html, #root, .app, .main, .game-container {
          width: 100% !important;
          max-width: 100% !important;
          overflow-x: hidden !important;
          padding: 0 !important;
          margin: 0 auto !important;
          box-sizing: border-box !important;
        }
        
        .board-container {
          padding: 10px !important;
        }
        
        .chessboard-container {
          width: 100% !important;
          max-width: 95% !important;
          margin: 0 auto !important;
        }
      }
    `;
    document.head.appendChild(meta);
  }, []);
  
  // Initialize the chess model
  useEffect(() => {
    let isComponentMounted = true;
    
    const initChessModel = async () => {
      try {
        // Initialize the model
        await ChessService.initModel(state.selectedModelMetadata);
        
        // Only update state if component is still mounted
        if (isComponentMounted) {
          setModelInitialized(true);
        }
      } catch (error) {
        console.error('Error initializing chess model:', error);
      }
    };
    
    initChessModel();
    
    // Cleanup function
    return () => {
      isComponentMounted = false;
    };
  }, []);
  
  // When selected model changes, initialize the new model
  useEffect(() => {
    if (!modelInitialized) return;
    
    const updateModel = async () => {
      try {
        await ChessService.initModel(state.selectedModelMetadata);
      } catch (error) {
        console.error('Error updating model:', error);
      }
    };
    
    updateModel();
  }, [state.selectedModelMetadata, modelInitialized]);
  
  // Get evaluation when position changes
  useEffect(() => {
    if (!modelInitialized) return;
    
    const getEvaluation = async () => {
      const currentFen = state.currentPosition.fen;
      
      // Skip if we already have evaluation for this position
      if (state.evaluations[currentFen]) return;
      
      // Request evaluation
      dispatch({ type: 'REQUEST_EVALUATION' });
      
      try {
        // Use a short timeout to allow UI to update
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Get move suggestions
        const evaluations = await ChessService.suggestMoves(
          currentFen,
          state.searchDepth
        );
        
        // Receive evaluation
        dispatch({
          type: 'RECEIVE_EVALUATION',
          fen: currentFen,
          evaluations
        });
        
        // Update evaluation history
        const positionEval = await ChessService.evaluatePosition(currentFen);
        setEvaluationHistory(prev => [
          ...prev,
          { position: state.currentPosition, evaluation: positionEval }
        ]);
      } catch (error) {
        console.error('Error getting evaluation:', error);
        dispatch({
          type: 'RECEIVE_EVALUATION',
          fen: currentFen,
          evaluations: []
        });
      }
    };
    
    getEvaluation();
  }, [state.currentPosition, state.searchDepth, modelInitialized]);

  // Make AI move when it's black's turn
  useEffect(() => {
    // Only proceed if AI plays black is enabled
    if (!aiPlaysBlack || !modelInitialized) return;
    
    // Check if it's black's turn and no undo was just performed
    if (state.currentPosition.turn === 'b' && !state.thinking && !state.undoPerformed) {
      const makeAiMove = async () => {
        const currentFen = state.currentPosition.fen;
        
        // Skip if we don't have evaluation for this position yet
        if (!state.evaluations[currentFen] || state.evaluations[currentFen].length === 0) {
          return;
        }
        
        // Get the best move string from evaluations
        const bestMoveString = state.evaluations[currentFen][0].move;
        
        if (bestMoveString) {
          // Make a small delay to make the move feel more natural
          setTimeout(() => {
            try {
              // Create a temporary game instance to generate proper Move object
              const tempGame = new Chess(state.game.fen());
              const moveObj = tempGame.move(bestMoveString);
              
              if (moveObj) {
                // Make the move with proper Move object
                dispatch({ 
                  type: 'MAKE_MOVE', 
                  move: moveObj 
                });
              }
            } catch (error) {
              console.error('Error making AI move:', error);
            }
          }, 300); // Reduced from 500
        }
      };
      
      makeAiMove();
    }
  }, [state.currentPosition, state.evaluations, state.thinking, aiPlaysBlack, state.game, modelInitialized, state.undoPerformed]);

  // Get heatmap when position or selected heatmap type changes
  useEffect(() => {
    if (!modelInitialized) return;
    
    const getHeatmap = async () => {
      const currentFen = state.currentPosition.fen;
      
      // Skip if we already have this heatmap for this position
      if (
        state.heatmaps[currentFen] && 
        state.heatmaps[currentFen][selectedHeatmapType]
      ) {
        return;
      }
      
      try {
        // Get heatmap
        const heatmap = await ChessService.getHeatmap(
          currentFen,
          selectedHeatmapType
        );
        
        dispatch({
          type: 'RECEIVE_HEATMAP',
          fen: currentFen,
          heatmapType: selectedHeatmapType,
          heatmap
        });
      } catch (error) {
        console.error('Error getting heatmap:', error);
      }
    };
    
    getHeatmap();
  }, [state.currentPosition, selectedHeatmapType, modelInitialized]);
  
  // Handle move from chessboard
  const handleMove = (move: Move) => {
    dispatch({ type: 'MAKE_MOVE', move });
  };
  
  return (
    <div className="app">
      <header className="header">
        <h1>Chess AI</h1>
        <p>Simplified Chess AI with basic position evaluation</p>
      </header>
      
      <main className="main">
        <div className="game-container">
          <div className="board-container">
            <Chessboard
              position={state.currentPosition.fen}
              onMove={handleMove}
              showHints={showHints}
              currentEvaluation={state.evaluations[state.currentPosition.fen] || []}
              thinking={state.thinking}
            />
            <div className="board-controls">
              <button onClick={() => dispatch({ type: 'UNDO_MOVE' })}>
                Undo Move
              </button>
              <button onClick={() => dispatch({ type: 'SET_POSITION', fen: 'start' })}>
                Reset Board
              </button>
              <label>
                <input
                  type="checkbox"
                  checked={showHints}
                  onChange={(e) => setShowHints(e.target.checked)}
                />
                Show AI Hints
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={aiPlaysBlack}
                  onChange={(e) => setAiPlaysBlack(e.target.checked)}
                />
                AI Plays Black
              </label>
            </div>
          </div>
          
          <div className="visualization-container">
            <div className="model-controls">
              <h3>AI Models</h3>
              <div className="model-selector">
                {availableModels.map((modelMetadata) => (
                  <div key={modelMetadata.id} className="model-card">
                    <h4>{modelMetadata.name}</h4>
                    <p>Evaluation: {
                      modelMetadata.id === 'basic' ? 'Basic Heuristic' :
                      modelMetadata.id === 'supervised' ? 'Neural Network' :
                      modelMetadata.id === 'reinforcement' ? 'Self-play + Tree Search' :
                      'Unknown Method'
                    }</p>
                    <div className="model-actions">
                      <button onClick={() => dispatch({ type: 'CHANGE_MODEL', modelMetadata })}>
                        Select
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {trainingStatus && (
                <div className="training-status">
                  {trainingStatus}
                </div>
              )}
            </div>
            
            <div className="search-controls">
              <label>
                Search Depth:
                <select
                  value={state.searchDepth}
                  onChange={(e) => dispatch({ type: 'SET_DEPTH', depth: Number(e.target.value) })}
                >
                  <option value={1}>1 (Fast)</option>
                </select>
              </label>
              <div className="model-status">
                {modelInitialized ? 
                  <span className="status-ready">Model Ready ✓</span> : 
                  <span className="status-loading">Initializing Model...</span>
                }
              </div>
            </div>
            
            <div className="evaluation-container">
              <h3>Position Evaluation</h3>
              <div className="current-evaluation">
                {state.evaluations[state.currentPosition.fen]?.length > 0 ? (
                  <div>
                    <p className="eval-score">
                      Score: {state.evaluations[state.currentPosition.fen][0].score.toFixed(2)}
                    </p>
                    <p>Best move: {state.evaluations[state.currentPosition.fen][0].move}</p>
                  </div>
                ) : (
                  <p>Evaluating position...</p>
                )}
              </div>
              <EvaluationGraph history={evaluationHistory} />
            </div>
            
            <div className="heatmap-container">
              <h3>Position Visualization</h3>
              <div className="heatmap-selector">
                <select
                  value={selectedHeatmapType}
                  onChange={(e) => setSelectedHeatmapType(e.target.value as HeatmapType['type'])}
                >
                  <option value="mobility">Mobility</option>
                  <option value="control">Square Control</option>
                </select>
              </div>
              {state.heatmaps[state.currentPosition.fen]?.[selectedHeatmapType] && (
                <PositionHeatmap
                  heatmap={state.heatmaps[state.currentPosition.fen][selectedHeatmapType]}
                  flipped={state.currentPosition.turn === 'b'}
                />
              )}
            </div>
          </div>
        </div>
      </main>
      
      <footer className="footer">
        <p>
          Chess AI - Simplified version for better performance
        </p>
        <p>
          Website by <a href="https://www.habbiwebdesign.site/" target="_blank" rel="noopener noreferrer">Habbi Web Design</a>
        </p>
      </footer>
    </div>
  );
}

export default App;
