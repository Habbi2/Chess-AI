import * as tf from '@tensorflow/tfjs';
import { Chess, Square } from 'chess.js';
import { AIModel, MoveEvaluation, PositionHeatmap, ModelMetadata } from '../types/chess';
import { lookupPosition } from '../utils/opening-book';

// Piece values (standard chess values)
const PIECE_VALUES: Record<string, number> = {
  p: -1, n: -3, b: -3.5, r: -5, q: -9, k: -100,
  P: 1, N: 3, B: 3.5, R: 5, Q: 9, K: 100
};

// Board representation constants
const BOARD_SIZE = 8;
const NUM_PIECES = 12; // 6 piece types x 2 colors
const NUM_ADDITIONAL_FEATURES = 5; // Turn, castling rights, en passant, attacked squares, defended squares
const INPUT_SHAPE = [BOARD_SIZE, BOARD_SIZE, NUM_PIECES + NUM_ADDITIONAL_FEATURES]; // Enhanced features

/**
 * Converts a chess position (FEN) into a tensor representation
 * that can be used as input to the neural network with enhanced features
 */
export function fenToTensor(fen: string): tf.Tensor {
  const game = new Chess(fen);
  const board = game.board();
  
  // Create a zero-filled 3D tensor with enhanced features
  const tensor = tf.buffer(INPUT_SHAPE);
  
  // Map from piece to channel index
  const pieceToChannel: Record<string, number> = {
    'p': 0, 'n': 1, 'b': 2, 'r': 3, 'q': 4, 'k': 5,
    'P': 6, 'N': 7, 'B': 8, 'R': 9, 'Q': 10, 'K': 11
  };

  // Fill tensor with piece positions
  for (let rank = 0; rank < BOARD_SIZE; rank++) {
    for (let file = 0; file < BOARD_SIZE; file++) {
      const square = board[rank][file];
      if (square && square.type && square.color) {
        const piece = square.color === 'w' ? square.type.toUpperCase() : square.type.toLowerCase();
        const channel = pieceToChannel[piece];
        if (channel !== undefined) {
          tensor.set(1, rank, file, channel);
        }
      }
    }
  }
  
  // Channel 12: Set turn channel (simple value for whose turn it is)
  const turnValue = game.turn() === 'w' ? 1 : 0;
  for (let rank = 0; rank < BOARD_SIZE; rank++) {
    for (let file = 0; file < BOARD_SIZE; file++) {
      tensor.set(turnValue, rank, file, 12);
    }
  }
  
  // Channel 13: Castling rights (simplified)
  const fenParts = fen.split(' ');
  const castlingRights = fenParts[2];
  const castlingValue = castlingRights === '-' ? 0 : 0.5;
  for (let rank = 0; rank < BOARD_SIZE; rank++) {
    for (let file = 0; file < BOARD_SIZE; file++) {
      tensor.set(castlingValue, rank, file, 13);
    }
  }
  
  // Skip detailed attack calculations for performance
  // Use simpler approach for attacked squares
  
  return tensor.toTensor();
}

/**
 * Simple heuristic evaluation for fallback and comparison
 */
export function evaluatePositionHeuristic(fen: string): number {
  const game = new Chess(fen);
  const board = game.board();
  
  // Material value calculation
  let materialScore = 0;
  let positionalScore = 0;
  
  // Central squares control bonus
  const centralSquares = ['d4', 'd5', 'e4', 'e5'];
  const centralControl = {white: 0, black: 0};
  
  // Piece position tables for positional evaluation
  const pawnPositionBonus = [
    [0,  0,  0,  0,  0,  0,  0,  0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [5,  5, 10, 25, 25, 10,  5,  5],
    [0,  0,  0, 20, 20,  0,  0,  0],
    [5, -5,-10,  0,  0,-10, -5,  5],
    [5, 10, 10,-20,-20, 10, 10,  5],
    [0,  0,  0,  0,  0,  0,  0,  0]
  ];
  
  const knightPositionBonus = [
    [-50,-40,-30,-30,-30,-30,-40,-50],
    [-40,-20,  0,  0,  0,  0,-20,-40],
    [-30,  0, 10, 15, 15, 10,  0,-30],
    [-30,  5, 15, 20, 20, 15,  5,-30],
    [-30,  0, 15, 20, 20, 15,  0,-30],
    [-30,  5, 10, 15, 15, 10,  5,-30],
    [-40,-20,  0,  5,  5,  0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50]
  ];
  
  const bishopPositionBonus = [
    [-20,-10,-10,-10,-10,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0, 10, 10, 10, 10,  0,-10],
    [-10,  5,  5, 10, 10,  5,  5,-10],
    [-10,  0,  5, 10, 10,  5,  0,-10],
    [-10,  5,  5,  5,  5,  5,  5,-10],
    [-10,  0,  5,  0,  0,  5,  0,-10],
    [-20,-10,-10,-10,-10,-10,-10,-20]
  ];
  
  const rookPositionBonus = [
    [0,  0,  0,  0,  0,  0,  0,  0],
    [5, 10, 10, 10, 10, 10, 10,  5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [0,  0,  0,  5,  5,  0,  0,  0]
  ];
  
  const queenPositionBonus = [
    [-20,-10,-10, -5, -5,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5,  5,  5,  5,  0,-10],
    [-5,  0,  5,  5,  5,  5,  0, -5],
    [0,  0,  5,  5,  5,  5,  0, -5],
    [-10,  5,  5,  5,  5,  5,  0,-10],
    [-10,  0,  5,  0,  0,  0,  0,-10],
    [-20,-10,-10, -5, -5,-10,-10,-20]
  ];
  
  const kingPositionBonusMidgame = [
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-20,-30,-30,-40,-40,-30,-30,-20],
    [-10,-20,-20,-20,-20,-20,-20,-10],
    [20, 20,  0,  0,  0,  0, 20, 20],
    [20, 30, 10,  0,  0, 10, 30, 20]
  ];
  
  // Count pieces to determine game phase
  let pieceCount = 0;
  
  for (let rank = 0; rank < BOARD_SIZE; rank++) {
    for (let file = 0; file < BOARD_SIZE; file++) {
      const square = board[rank][file];
      if (square && square.type) {
        // Material value
        const piece = square.color === 'w' ? square.type.toUpperCase() : square.type.toLowerCase();
        materialScore += PIECE_VALUES[piece] || 0;
        
        if (square.type !== 'k' && square.type !== 'p') {
          pieceCount++;
        }
        
        // Positional bonuses
        const squareName = `${'abcdefgh'[file]}${8 - rank}` as Square;
        
        // Check central square control
        if (centralSquares.includes(squareName)) {
          if (square.color === 'w') {
            centralControl.white++;
          } else {
            centralControl.black++;
          }
        }
        
        // Apply position bonuses based on piece type and position
        if (square.color === 'w') {
          switch (square.type) {
            case 'p':
              positionalScore += pawnPositionBonus[rank][file] / 100;
              break;
            case 'n':
              positionalScore += knightPositionBonus[rank][file] / 100;
              break;
            case 'b':
              positionalScore += bishopPositionBonus[rank][file] / 100;
              break;
            case 'r':
              positionalScore += rookPositionBonus[rank][file] / 100;
              break;
            case 'q':
              positionalScore += queenPositionBonus[rank][file] / 100;
              break;
            case 'k':
              positionalScore += kingPositionBonusMidgame[rank][file] / 100;
              break;
          }
        } else {
          // Flip the tables for black pieces
          switch (square.type) {
            case 'p':
              positionalScore -= pawnPositionBonus[7-rank][file] / 100;
              break;
            case 'n':
              positionalScore -= knightPositionBonus[7-rank][file] / 100;
              break;
            case 'b':
              positionalScore -= bishopPositionBonus[7-rank][file] / 100;
              break;
            case 'r':
              positionalScore -= rookPositionBonus[7-rank][file] / 100;
              break;
            case 'q':
              positionalScore -= queenPositionBonus[7-rank][file] / 100;
              break;
            case 'k':
              positionalScore -= kingPositionBonusMidgame[7-rank][file] / 100;
              break;
          }
        }
      }
    }
  }
  
  // Bonus for central control
  const centralControlBonus = (centralControl.white - centralControl.black) * 0.1;
  
  // Mobility bonus (number of legal moves)
  const mobilityBonus = game.moves().length * 0.01 * (game.turn() === 'w' ? 1 : -1);
  
  // Add a small bonus for the side to move
  const turnBonus = game.turn() === 'w' ? 0.1 : -0.1;
  
  // Penalize for check
  const checkPenalty = game.inCheck() ? (game.turn() === 'w' ? -0.5 : 0.5) : 0;
  
  // Larger penalty for checkmate
  const checkmatePenalty = game.isCheckmate() ? (game.turn() === 'w' ? -100 : 100) : 0;
  
  // Return the evaluation
  return materialScore + positionalScore + centralControlBonus + mobilityBonus + turnBonus + checkPenalty + checkmatePenalty;
}

// MCTS Node structure for tree search
interface MCTSNode {
  state: Chess;
  parent: MCTSNode | null;
  children: MCTSNode[];
  visits: number;
  value: number;
  untriedMoves: string[];
  move: string | null; // Move that led to this node
}

/**
 * Basic Chess Evaluation Model using TensorFlow.js
 */
export class ChessEvaluationModel implements AIModel {
  private model: tf.LayersModel | null = null;
  public id: string;
  public name: string;
  public version: string;
  
  constructor(modelMetadata: ModelMetadata) {
    this.id = modelMetadata.id;
    this.name = modelMetadata.name;
    this.version = modelMetadata.version;
  }
  
  /**
   * Create a new neural network model for chess evaluation
   */
  createModel(): tf.LayersModel {
    // Use a sequential model for simpler implementation
    const model = tf.sequential();
    
    // Input layer with batch normalization
    model.add(tf.layers.conv2d({
      inputShape: INPUT_SHAPE,
      filters: 64, // Increased from 32
      kernelSize: 3,
      padding: 'same',
      activation: 'relu'
    }));
    model.add(tf.layers.batchNormalization());
    
    // Add multiple convolutional blocks for better feature extraction
    model.add(tf.layers.conv2d({
      filters: 128,
      kernelSize: 3,
      padding: 'same',
      activation: 'relu'
    }));
    model.add(tf.layers.batchNormalization());
    
    // Additional convolutional layer
    model.add(tf.layers.conv2d({
      filters: 128,
      kernelSize: 3,
      padding: 'same',
      activation: 'relu'
    }));
    model.add(tf.layers.batchNormalization());
    
    // Add spatial feature extraction
    model.add(tf.layers.conv2d({
      filters: 64,
      kernelSize: 3,
      strides: 1,
      padding: 'same',
      activation: 'relu'
    }));
    
    // Flatten for dense layers
    model.add(tf.layers.flatten());
    
    // Wider dense layers with dropout for regularization
    model.add(tf.layers.dense({
      units: 256, // Increased from 128
      activation: 'relu'
    }));
    model.add(tf.layers.dropout({ rate: 0.3 }));
    
    model.add(tf.layers.dense({
      units: 128, // Increased from 64
      activation: 'relu'
    }));
    model.add(tf.layers.dropout({ rate: 0.3 }));
    
    // Output layer with tanh activation for evaluation score
    model.add(tf.layers.dense({
      units: 1,
      activation: 'tanh' // Range between -1 and 1 (scaled later)
    }));
    
    // Compile the model with a better optimizer
    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
      metrics: ['mae']
    });
    
    return model;
  }
  
  /**
   * Load an existing model from IndexedDB, localStorage or from a URL
   */
  async loadModel(path: string): Promise<void> {
    try {
      this.model = await tf.loadLayersModel(path);
      
      // Ensure the model is properly compiled after loading
      this.model.compile({
        optimizer: 'adam',
        loss: 'meanSquaredError',
        metrics: ['mae']
      });
      
      console.log(`Model loaded successfully from ${path}`);
    } catch (error) {
      console.error('Error loading model:', error);
      console.log('Creating a new model instead...');
      this.model = this.createModel();
    }
  }
  
  /**
   * Train the model on a dataset of positions and evaluations
   */
  async trainModel(
    positions: string[],
    evaluations: number[],
    epochs: number = 10,
    batchSize: number = 32,
    validationSplit: number = 0.1
  ): Promise<tf.History> {
    // Create a new model if one doesn't exist
    if (!this.model) {
      this.model = this.createModel();
    } else {
      // Ensure the model is compiled before training
      this.model.compile({
        optimizer: 'adam',
        loss: 'meanSquaredError',
        metrics: ['mae']
      });
    }
    
    // Convert positions to tensors
    const inputTensors = positions.map(pos => fenToTensor(pos));
    const inputs = tf.stack(inputTensors);
    
    // Convert evaluations to tensors (normalize to range -1 to 1)
    const outputs = tf.tensor2d(
      evaluations.map(evalScore => [evalScore / 10.0]),
      [evaluations.length, 1]
    );
    
    // Train the model
    console.log('Training model...');
    const history = await this.model.fit(inputs, outputs, {
      epochs,
      batchSize,
      validationSplit,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          console.log(`Epoch ${epoch + 1}/${epochs} - loss: ${logs?.loss.toFixed(4)} - mae: ${logs?.mae.toFixed(4)}`);
        }
      }
    });
    
    console.log('Training complete!');
    return history;
  }
  
  /**
   * Save the model to IndexedDB or localStorage
   */
  async saveModel(path: string = 'indexeddb://chess-evaluation-model'): Promise<tf.io.SaveResult> {
    if (!this.model) {
      throw new Error('No model to save. Create or load a model first.');
    }
    
    const saveResult = await this.model.save(path);
    console.log(`Model saved to ${path}`);
    return saveResult;
  }
  
  // Evaluation cache to avoid redundant calculations
  private evaluationCache = new Map<string, number>();
  private cacheHits = 0;
  private cacheMisses = 0;
  
  /**
   * Evaluate a chess position using the neural network model
   */
  async evaluatePosition(fen: string): Promise<number> {
    try {
      // Check cache first for this position
      if (this.evaluationCache.has(fen)) {
        this.cacheHits++;
        if (this.cacheHits % 100 === 0) {
          console.debug(`Evaluation cache hits: ${this.cacheHits}, misses: ${this.cacheMisses}`);
        }
        return this.evaluationCache.get(fen)!;
      }
      this.cacheMisses++;
      
      // Use heuristic evaluation if model isn't loaded
      if (!this.model) {
        console.warn('Model not loaded, creating a new model');
        this.model = this.createModel();
        // Initialize with some weights to avoid pure heuristic evaluation
        await this.model.compile({
          optimizer: tf.train.adam(0.001),
          loss: 'meanSquaredError',
          metrics: ['mae']
        });
        console.log('New model created successfully');
      }
      
      // Get the base heuristic evaluation as a fallback
      const heuristicEval = evaluatePositionHeuristic(fen);
      
      // Use a performance optimization flag - skip NN for early game standard positions
      const isEarlyGamePosition = this.isEarlyGamePosition(fen);
      if (isEarlyGamePosition) {
        // For early game, just use heuristic with a small random factor for variety
        const result = heuristicEval + (Math.random() * 0.1 - 0.05);
        this.evaluationCache.set(fen, result);
        return result;
      }
      
      // Execute tensor operations in tf.tidy to automatically clean up tensors
      const result = await tf.tidy(() => {
        // Convert position to tensor format
        const input = fenToTensor(fen);
        
        // Get prediction from model (use tensor.array() instead of data() for better performance)
        const predictionTensor = this.model!.predict(input.expandDims(0)) as tf.Tensor;
        return predictionTensor.dataSync()[0]; // dataSync is faster than async data()
      });
      
      // If the model returns NaN or an unreasonable value, use heuristic
      if (isNaN(result) || Math.abs(result) > 10) {
        console.warn('Model returned invalid evaluation, using heuristic');
        const fallbackResult = heuristicEval;
        this.evaluationCache.set(fen, fallbackResult);
        return fallbackResult;
      }
      
      // Scale evaluation back to centipawns and blend with heuristic
      const scaledEvaluation = result * 20.0;
      const blendedEvaluation = 0.7 * scaledEvaluation + 0.3 * heuristicEval;
      
      // Cache the result to avoid recalculation
      this.evaluationCache.set(fen, blendedEvaluation);
      
      // Limit cache size to prevent memory issues
      if (this.evaluationCache.size > 10000) {
        this.pruneCache();
      }
      
      return blendedEvaluation;
    } catch (error) {
      console.error('Error in neural network evaluation:', error);
      return evaluatePositionHeuristic(fen);
    }
  }
  
  /**
   * Check if this is an early game standard position where we can use heuristic
   * evaluation instead of the neural network for performance
   */
  private isEarlyGamePosition(fen: string): boolean {
    // Get the move counter from FEN (6th field)
    const fenParts = fen.split(' ');
    if (fenParts.length >= 6) {
      const fullMoveNumber = parseInt(fenParts[5], 10);
      // Only use heuristic for first 5 moves (10 half-moves)
      return !isNaN(fullMoveNumber) && fullMoveNumber <= 5;
    }
    return false;
  }
  
  /**
   * Prune the evaluation cache when it gets too large
   */
  private pruneCache(): void {
    // Simple pruning strategy: delete half the entries
    const entriesToDelete = Math.floor(this.evaluationCache.size / 2);
    let count = 0;
    
    for (const key of this.evaluationCache.keys()) {
      this.evaluationCache.delete(key);
      count++;
      if (count >= entriesToDelete) break;
    }
    
    console.debug(`Pruned evaluation cache: removed ${entriesToDelete} entries`);
  }
  
  /**
   * Suggest moves for a given position with optimized search and safety checks
   */
  async suggestMove(game: Chess, depth: number = 2): Promise<MoveEvaluation[]> {
    const legalMoves = game.moves({ verbose: true });
    const evaluations: MoveEvaluation[] = [];
    
    // Make a deep copy of the game to avoid modifying the original
    const gameCopy = new Chess(game.fen());
    const isMaximizing = gameCopy.turn() === 'w';
    
    // Check for immediate threats that need to be addressed
    const currentThreats = detectThreats(game);
    const sideToMove = game.turn();
    const urgentThreatsExist = currentThreats.hangingPieces.some(p => p.color === sideToMove);
    
    // Check if we can use opening book first (fastest option)
    const bookPosition = lookupPosition(game.fen());
    if (bookPosition && bookPosition.bestMove) {
      console.log("Found opening book move:", bookPosition.bestMove);
      
      // Create evaluations with a preference for the book move
      for (const move of legalMoves) {
        try {
          // Make the move
          gameCopy.move(move.san);
          
          // Get a basic evaluation
          let score = 0;
          
          // If this is the opening book move, give it a higher score
          if (move.san === bookPosition.bestMove) {
            score = isMaximizing ? 1 : -1; // Strong preference for book moves
          } else {
            // Quick heuristic evaluation for non-book moves
            score = evaluatePositionHeuristic(gameCopy.fen());
          }
          
          // Add to evaluations
          evaluations.push({
            move: move.san,
            score: score,
            depth: 0 // From opening book
          });
          
          // Undo the move
          gameCopy.undo();
        } catch (error) {
          console.error(`Error evaluating move ${move.san}:`, error);
        }
      }
    } 
    // For middlegame positions with many pieces, use lightweight evaluation with threat detection
    else if (legalMoves.length >= 25) {
      console.log("Using lightweight evaluation for complex position with threat detection");
      
      // Process moves in smaller batches to reduce strain
      const batchSize = 10;
      for (let i = 0; i < legalMoves.length; i += batchSize) {
        const batch = legalMoves.slice(i, i + batchSize);
        
        for (const move of batch) {
          try {
            // Make the move
            gameCopy.move(move.san);
            
            // Use heuristic evaluation with safety check
            let score = evaluatePositionHeuristic(gameCopy.fen());
            
            // Safety check for the resulting position
            const newThreats = detectThreats(gameCopy);
            const ourColor = isMaximizing ? 'w' : 'b';
            
            // Heavily penalize moves that leave our pieces hanging
            const hangingAfterMove = newThreats.hangingPieces.filter(p => p.color === ourColor);
            
            if (hangingAfterMove.length > 0) {
              // Sum up the value of hanging pieces with an additional penalty
              let hangingPenalty = 0;
              for (const piece of hangingAfterMove) {
                hangingPenalty += piece.pieceValue * 1.5; // Increased penalty for hanging pieces
              }
              
              // Apply penalty (negative for white advantage, positive for black advantage)
              score -= isMaximizing ? hangingPenalty : -hangingPenalty;
            }
            
            // Add to evaluations
            evaluations.push({
              move: move.san,
              score: score,
              depth: 1
            });
            
            // Undo the move
            gameCopy.undo();
            
          } catch (error) {
            console.error(`Error evaluating move ${move.san}:`, error);
          }
        }
        
        // Small pause between batches to prevent UI freezing
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    // For simpler positions, use minimax with threat detection
    else {
      console.log("Using minimax with threat detection");
      const effectiveDepth = Math.min(depth, 2); // Cap depth at 2 for performance
      
      // If we have urgent threats, prioritize moves that resolve them
      if (urgentThreatsExist) {
        console.log("Urgent threats detected - prioritizing defensive moves");
      }
      
      for (const move of legalMoves) {
        try {
          // Make the move
          gameCopy.move(move.san);
          
          let score;
          if (effectiveDepth <= 1) {
            // Simple position evaluation
            score = await this.evaluatePosition(gameCopy.fen());
            
            // Add safety check even for simple evaluation
            const newThreats = detectThreats(gameCopy);
            const ourColor = isMaximizing ? 'w' : 'b';
            
            // Check if this move resolves hanging pieces
            if (urgentThreatsExist) {
              const stillHanging = newThreats.hangingPieces.filter(p => p.color === ourColor);
              if (stillHanging.length === 0) {
                // Bonus for resolving threats
                score += isMaximizing ? 0.5 : -0.5;
              }
            }
            
            // Penalize moves that create new hanging pieces
            const hangingAfterMove = newThreats.hangingPieces.filter(p => p.color === ourColor);
            if (hangingAfterMove.length > 0) {
              // Calculate penalty based on the highest value piece hanging
              const maxHangingValue = Math.max(...hangingAfterMove.map(p => p.pieceValue));
              score -= isMaximizing ? maxHangingValue : -maxHangingValue;
            }
            
          } else {
            // Minimax with limited depth
            score = await this.minimax(
              gameCopy, 
              effectiveDepth - 1, 
              -Infinity, 
              Infinity, 
              !isMaximizing
            );
          }
          
          // Add to evaluations
          evaluations.push({
            move: move.san,
            score: score,
            depth: effectiveDepth
          });
          
          // Undo the move
          gameCopy.undo();
        } catch (error) {
          console.error(`Error evaluating move ${move.san}:`, error);
        }
      }
    }
    
    // Sort moves by evaluation (best first)
    evaluations.sort((a, b) => {
      return isMaximizing ? b.score - a.score : a.score - b.score;
    });
    
    // Limit returned evaluations for performance
    return evaluations.slice(0, 10);
  }
  
  /**
   * Minimax algorithm with alpha-beta pruning for deeper search with threat detection
   */
  private async minimax(
    game: Chess, 
    depth: number, 
    alpha: number, 
    beta: number, 
    isMaximizing: boolean
  ): Promise<number> {
    // Base case: evaluate the position at the leaf nodes
    if (depth === 0 || game.isGameOver()) {
      // Get standard evaluation
      let evalScore = await this.evaluatePosition(game.fen());
      
      // Add extra threat evaluation at leaf nodes
      const threats = detectThreats(game);
      
      // Penalize for hanging pieces
      for (const piece of threats.hangingPieces) {
        if (piece.color === 'w') {
          // White pieces hanging (negative for white)
          evalScore -= piece.pieceValue * 0.5;
        } else {
          // Black pieces hanging (positive for white)
          evalScore += piece.pieceValue * 0.5; 
        }
      }
      
      // Also penalize for checks against the king at leaf nodes
      if (game.inCheck()) {
        evalScore += game.turn() === 'w' ? -0.3 : 0.3; // Small penalty for being in check
      }
      
      return evalScore;
    }
    
    // Get all legal moves
    let moves = game.moves();
    
    // If no legal moves, this is checkmate or stalemate
    if (moves.length === 0) {
      if (game.inCheck()) {
        return game.turn() === 'w' ? -100 : 100; // Checkmate
      }
      return 0; // Stalemate
    }
    
    // Sort moves to improve alpha-beta pruning effectiveness
    // Enhanced move ordering - captures first, then checks, then threats
    moves.sort((a, b) => {
      const aCapture = a.includes('x');
      const bCapture = b.includes('x');
      const aCheck = a.includes('+');
      const bCheck = b.includes('+');
      
      // Captures have highest priority
      if (aCapture && !bCapture) return -1;
      if (!aCapture && bCapture) return 1;
      
      // Checks next
      if (aCheck && !bCheck) return -1;
      if (!aCheck && bCheck) return 1;
      
      return 0;
    });
    
    // Temporary game copy for making/undoing moves in case we need to evaluate threats
    let tempGame: Chess | null = null;
    
    if (isMaximizing) {
      let maxEval = -Infinity;
      
      for (const move of moves) {
        // Make the move
        game.move(move);
        
        // Check for immediate danger at higher depths (more thorough search)
        let moveEval;
        if (depth >= 2) {
          // Create temp game if needed
          if (!tempGame) tempGame = new Chess(game.fen());
          
          // Detect if this move creates immediate threats to our pieces
          const threats = detectThreats(game);
          const hangingValue = threats.hangingPieces
            .filter(p => p.color === 'w')
            .reduce((sum, p) => sum + p.pieceValue, 0);
          
          // Apply safety penalty for hanging pieces
          moveEval = await this.minimax(game, depth - 1, alpha, beta, false);
          if (hangingValue > 0) {
            moveEval -= hangingValue * 0.7; // Significant but not overwhelming penalty
          }
        } else {
          // Normal minimax for low depths
          moveEval = await this.minimax(game, depth - 1, alpha, beta, false);
        }
        
        // Undo the move
        game.undo();
        
        // Update max evaluation and alpha
        maxEval = Math.max(maxEval, moveEval);
        alpha = Math.max(alpha, moveEval);
        
        // Alpha-beta pruning
        if (beta <= alpha) {
          break;
        }
      }
      
      return maxEval;
    } else {
      let minEval = Infinity;
      
      for (const move of moves) {
        // Make the move
        game.move(move);
        
        // Check for immediate danger at higher depths
        let moveEval;
        if (depth >= 2) {
          // Create temp game if needed
          if (!tempGame) tempGame = new Chess(game.fen());
          
          // Detect if this move creates immediate threats to our pieces
          const threats = detectThreats(game);
          const hangingValue = threats.hangingPieces
            .filter(p => p.color === 'b')
            .reduce((sum, p) => sum + p.pieceValue, 0);
          
          // Apply safety penalty for hanging pieces
          moveEval = await this.minimax(game, depth - 1, alpha, beta, true);
          if (hangingValue > 0) {
            moveEval += hangingValue * 0.7; // Safety penalty (positive for black advantage)
          }
        } else {
          // Normal minimax for low depths
          moveEval = await this.minimax(game, depth - 1, alpha, beta, true);
        }
        
        // Undo the move
        game.undo();
        
        // Update min evaluation and beta
        minEval = Math.min(minEval, moveEval);
        beta = Math.min(beta, moveEval);
        
        // Alpha-beta pruning
        if (beta <= alpha) {
          break;
        }
      }
      
      return minEval;
    }
  }
  
  /**
   * Generate heatmap for visualization
   */
  async getHeatmap(game: Chess, type: PositionHeatmap['type']): Promise<PositionHeatmap> {
    // Default squares object
    const squares: Record<Square, number> = {} as Record<Square, number>;
    
    // Initialize all squares with 0 value
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const square = `${'abcdefgh'[file]}${8 - rank}` as Square;
        squares[square] = 0;
      }
    }
    
    switch (type) {
      case 'mobility': {
        // Calculate mobility (number of moves available from each square)
        const board = game.board();
        for (let rank = 0; rank < 8; rank++) {
          for (let file = 0; file < 8; file++) {
            const square = board[rank][file];
            if (square && square.type && square.color) {
              const squareName = `${'abcdefgh'[file]}${8 - rank}` as Square;
              const movesFrom = game.moves({ square: squareName, verbose: true });
              squares[squareName] = movesFrom.length;
            }
          }
        }
        break;
      }
      
      case 'control': {
        // Square control (how many pieces attack each square)
        for (let rank = 0; rank < 8; rank++) {
          for (let file = 0; file < 8; file++) {
            const square = `${'abcdefgh'[file]}${8 - rank}` as Square;
            const attacks = calculateAttacksOnSquare(game, square);
            squares[square] = attacks.white - attacks.black;
          }
        }
        break;
      }
      
      case 'safety': {
        // Safety of each piece (inverse of attacks on the square)
        const board = game.board();
        for (let rank = 0; rank < 8; rank++) {
          for (let file = 0; file < 8; file++) {
            const square = board[rank][file];
            if (square && square.type && square.color) {
              const squareName = `${'abcdefgh'[file]}${8 - rank}` as Square;
              const attacks = calculateAttacksOnSquare(game, squareName);
              
              // Safety value: higher means safer
              const attacksOnPiece = square.color === 'w' ? attacks.black : attacks.white;
              squares[squareName] = 10 - Math.min(10, attacksOnPiece * 2);
            }
          }
        }
        break;
      }
      
      case 'attack': {
        // Attack potential (pieces attacking opponent's pieces)
        const board = game.board();
        
        // Find all pieces
        for (let rank = 0; rank < 8; rank++) {
          for (let file = 0; file < 8; file++) {
            const piece = board[rank][file];
            if (!piece) continue;
            
            const squareName = `${'abcdefgh'[file]}${8 - rank}` as Square;
            const attackingSquares = getAttackingSquares(game, squareName);
            
            let attackValue = 0;
            attackingSquares.forEach(targetSquare => {
              const targetPiece = game.get(targetSquare);
              if (targetPiece && targetPiece.color !== piece.color) {
                // Add value based on targeted piece value
                const pieceValue = Math.abs(PIECE_VALUES[targetPiece.type.toUpperCase()]);
                attackValue += pieceValue / 10;
              }
            });
            
            squares[squareName] = attackValue;
          }
        }
        break;
      }
    }
    
    // Find min and max values
    const values = Object.values(squares);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    
    return {
      squares,
      minValue,
      maxValue,
      type
    };
  }
  
  /**
   * Monte Carlo Tree Search implementation for chess (optimized)
   */
  public async monteCarloTreeSearch(
    game: Chess, 
    iterations: number = 400, // Reduced iterations
    timeLimit: number = 1000 // Reduced time limit
  ): Promise<string> {
    // Create root node
    const rootState = new Chess(game.fen());
    const rootNode: MCTSNode = {
      state: rootState,
      parent: null,
      children: [],
      visits: 0,
      value: 0,
      untriedMoves: rootState.moves(),
      move: null
    };
    
    const startTime = Date.now();
    let iterationCount = 0;
    
    // Run MCTS iterations with early stopping for performance
    while (iterationCount < iterations) {
      // Check time limit more aggressively
      if (iterationCount % 10 === 0 && Date.now() - startTime > timeLimit) {
        console.log(`MCTS stopped early after ${iterationCount} iterations due to time limit`);
        break;
      }
      
      // Selection + Expansion
      let node = this.selectNode(rootNode);
      
      // Simulation - use a faster simulation with limited depth
      const result = await this.simulateFastPlayout(node.state);
      
      // Backpropagation
      this.backpropagate(node, result);
      
      iterationCount++;
    }
    
    // Choose best child of root node
    if (rootNode.children.length === 0) {
      // If no children were created, just return a random move
      return rootNode.untriedMoves.length > 0 ? 
        rootNode.untriedMoves[Math.floor(Math.random() * rootNode.untriedMoves.length)] : 
        game.moves()[0];
    }
    
    // Find child with most visits (more reliable than value)
    let bestChild = rootNode.children[0];
    let mostVisits = bestChild.visits;
    
    for (let i = 1; i < rootNode.children.length; i++) {
      const child = rootNode.children[i];
      if (child.visits > mostVisits) {
        mostVisits = child.visits;
        bestChild = child;
      }
    }
    
    return bestChild.move || '';
  }
  
  /**
   * Fast simulation for MCTS - uses simplified evaluation
   */
  private async simulateFastPlayout(state: Chess): Promise<number> {
    const playout = new Chess(state.fen());
    const maxDepth = 10; // Reduced from 30
    
    // Play random moves until game over or depth limit
    let depth = 0;
    while (!playout.isGameOver() && depth < maxDepth) {
      const moves = playout.moves();
      if (moves.length === 0) break;
      
      // Choose a random move with preference for captures and checks
      let selectedMove = '';
      
      // First look for captures or checks (tactical moves)
      const tacticalMoves = moves.filter(move => move.includes('x') || move.includes('+'));
      
      if (tacticalMoves.length > 0) {
        // Prefer tactical moves when available (80% chance)
        if (Math.random() < 0.8) {
          selectedMove = tacticalMoves[Math.floor(Math.random() * tacticalMoves.length)];
        } else {
          selectedMove = moves[Math.floor(Math.random() * moves.length)];
        }
      } else {
        selectedMove = moves[Math.floor(Math.random() * moves.length)];
      }
      
      playout.move(selectedMove);
      depth++;
    }
    
    // Quick evaluation without neural network
    if (playout.isCheckmate()) {
      return playout.turn() === 'w' ? -10 : 10;
    } else if (playout.isDraw()) {
      return 0;
    } else {
      // Use heuristic evaluation for faster response
      const evaluation = evaluatePositionHeuristic(playout.fen());
      return playout.turn() === 'w' ? -evaluation : evaluation;
    }
  }
  
  /**
   * Selection phase of MCTS - find a node to expand
   */
  private selectNode(node: MCTSNode): MCTSNode {
    // If node has untried moves, pick one randomly
    if (node.untriedMoves.length > 0) {
      const moveIndex = Math.floor(Math.random() * node.untriedMoves.length);
      const move = node.untriedMoves[moveIndex];
      
      // Create new state by applying move
      const newState = new Chess(node.state.fen());
      newState.move(move);
      
      // Create new child node
      const childNode: MCTSNode = {
        state: newState,
        parent: node,
        children: [],
        visits: 0,
        value: 0,
        untriedMoves: newState.moves(),
        move: move
      };
      
      // Remove the move from untried moves
      node.untriedMoves.splice(moveIndex, 1);
      node.children.push(childNode);
      
      return childNode;
    } 
    
    // If all moves are tried, select best child using UCB1
    if (node.children.length > 0) {
      const bestChild = this.getBestChild(node, 1.41); // Exploration parameter
      if (bestChild !== null) {
        return this.selectNode(bestChild);
      }
    }
    
    return node;
  }
  
  /**
   * Backpropagate result through the tree
   */
  private backpropagate(node: MCTSNode, result: number): void {
    let currentNode: MCTSNode | null = node;
    let currentResult = result;
    
    while (currentNode !== null) {
      currentNode.visits++;
      currentNode.value += currentResult;
      currentNode = currentNode.parent;
      
      // Flip result for the parent (opponent's perspective)
      currentResult = -currentResult;
    }
  }

  /**
   * Get best child using UCB1 formula
   */
  private getBestChild(node: MCTSNode, explorationParameter: number): MCTSNode | null {
    if (node.children.length === 0) {
      return null;
    }
    
    let bestChild: MCTSNode | null = null;
    let bestUCB = -Infinity;
    
    // Avoid using reduce for better performance
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      
      // Avoid division by zero
      if (child.visits === 0) {
        return child; // Prioritize unvisited nodes
      }
      
      // UCB1 formula: exploitation + exploration
      const exploitation = child.value / child.visits;
      const exploration = explorationParameter * Math.sqrt(Math.log(node.visits) / child.visits);
      const ucb = exploitation + exploration;
      
      if (ucb > bestUCB) {
        bestChild = child;
        bestUCB = ucb;
      }
    }
    
    return bestChild;
  }
}

// Helper function to calculate attacks on a square - improved version with better threat detection
function calculateAttacksOnSquare(game: Chess, square: Square): { white: number, black: number } {
  const attackers = { white: 0, black: 0 };
  
  // Get all pieces that could potentially attack this square
  const moves = game.moves({ verbose: true });
  
  // Count attacks with proper piece value weighting
  for (const move of moves) {
    if (move.to === square) {
      // Count this as an attack with piece value weighting
      const attackingPieceValue = getPieceValue(move.piece);
      
      if (move.color === 'w') {
        attackers.white += 1;
        // Add a weight based on piece value (lower value pieces get priority in exchanges)
        if (attackingPieceValue <= 3) { // Pawn and minor pieces get a bonus
          attackers.white += 0.5;
        }
      } else {
        attackers.black += 1;
        if (attackingPieceValue <= 3) {
          attackers.black += 0.5;
        }
      }
    }
  }
  
  return attackers;
}

// Helper function to get piece value
function getPieceValue(piece: string): number {
  switch (piece.toLowerCase()) {
    case 'p': return 1;
    case 'n': 
    case 'b': return 3;
    case 'r': return 5;
    case 'q': return 9;
    case 'k': return 100;
    default: return 0;
  }
}

// Helper function to get squares a piece is attacking
function getAttackingSquares(game: Chess, square: Square): Square[] {
  const moves = game.moves({ square, verbose: true });
  return moves.map(m => m.to as Square);
}

// Check if a piece is hanging (undefended and attacked)
function isHangingPiece(game: Chess, square: Square): boolean {
  const piece = game.get(square);
  if (!piece) return false;
  
  const attacks = calculateAttacksOnSquare(game, square);
  
  // A piece is hanging if it's attacked more times than it's defended
  if (piece.color === 'w') {
    return attacks.black > attacks.white;
  } else {
    return attacks.white > attacks.black;
  }
}

// Detect tactical threats in a position (hanging pieces, potential forks, etc)
function detectThreats(game: Chess): {
  hangingPieces: { square: Square, pieceValue: number, color: string }[],
  attackedUndefended: Square[]
} {
  const board = game.board();
  const hangingPieces = [];
  const attackedUndefended = [] as Square[];
  
  // Check each square on the board
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const square = board[rank][file];
      if (square && square.type) {
        const squareName = `${'abcdefgh'[file]}${8 - rank}` as Square;
        
        // Check if piece is hanging
        if (isHangingPiece(game, squareName)) {
          const pieceValue = getPieceValue(square.type);
          hangingPieces.push({ 
            square: squareName, 
            pieceValue,
            color: square.color
          });
        }
        
        // Check for undefended pieces under attack
        const attacks = calculateAttacksOnSquare(game, squareName);
        if ((square.color === 'w' && attacks.black > 0 && attacks.white === 0) || 
            (square.color === 'b' && attacks.white > 0 && attacks.black === 0)) {
          attackedUndefended.push(squareName);
        }
      }
    }
  }
  
  return { hangingPieces, attackedUndefended };
}