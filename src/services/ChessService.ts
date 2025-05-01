/**
 * Service for chess AI calculations (simplified version without web workers)
 */

import { ModelMetadata, MoveEvaluation, PositionHeatmap } from '../types/chess';
import { ChessEvaluationModel, evaluatePositionHeuristic } from '../models/ChessEvaluationModel';
import { Chess } from 'chess.js';

// Global model instance
let model: ChessEvaluationModel | null = null;

// Track if model is initialized
let isModelInitialized = false;

/**
 * Initialize the model
 */
export async function initModel(modelMetadata: ModelMetadata): Promise<void> {
  if (isModelInitialized && model) {
    return Promise.resolve();
  }
  
  try {
    // Create new model instance
    model = new ChessEvaluationModel(modelMetadata);
    
    // Initialize a simple model to avoid performance issues
    model.createModel();
    
    isModelInitialized = true;
    console.log('Chess model initialized successfully');
    return Promise.resolve();
  } catch (error) {
    console.error('Error initializing chess model:', error);
    return Promise.reject(error);
  }
}

/**
 * Evaluate a position using simplified heuristics instead of neural network
 */
export async function evaluatePosition(fen: string): Promise<number> {
  // Use simpler heuristic evaluation for better performance
  return Promise.resolve(evaluatePositionHeuristic(fen));
}

/**
 * Suggest moves with reduced complexity
 */
export async function suggestMoves(fen: string, depth: number = 1): Promise<MoveEvaluation[]> {
  if (!model) {
    // Create a default model if needed
    await initModel({
      id: 'basic',
      name: 'Basic Evaluation',
      version: '1.0',
      description: 'Simple heuristic evaluation',
      trainingMethod: 'supervised',
      created: new Date().toISOString()
    });
  }
  
  try {
    const game = new Chess(fen);
    
    // Use a reduced depth to improve performance
    const limitedDepth = Math.min(depth, 1);
    
    // Get move suggestions with reduced computation
    if (model) {
      return model.suggestMove(game, limitedDepth);
    } else {
      // Fallback to simple evaluation if model fails
      const legalMoves = game.moves({ verbose: true });
      const evaluations: MoveEvaluation[] = [];
      
      for (const move of legalMoves) {
        // Make the move on a copy of the game
        const gameCopy = new Chess(game.fen());
        gameCopy.move(move.san);
        
        // Get a basic evaluation
        const score = evaluatePositionHeuristic(gameCopy.fen());
        
        // Add to evaluations
        evaluations.push({
          move: move.san,
          score,
          depth: 0
        });
      }
      
      // Sort moves by evaluation (best first)
      evaluations.sort((a, b) => {
        return game.turn() === 'w' ? b.score - a.score : a.score - b.score;
      });
      
      return evaluations.slice(0, 5); // Return only top 5 moves for simplicity
    }
  } catch (error) {
    console.error('Error suggesting moves:', error);
    return [];
  }
}

/**
 * Get a position heatmap with simplified calculation
 */
export async function getHeatmap(fen: string, heatmapType: PositionHeatmap['type']): Promise<PositionHeatmap> {
  if (!model) {
    // Create a default model if needed
    await initModel({
      id: 'basic',
      name: 'Basic Evaluation',
      version: '1.0',
      description: 'Simple heuristic evaluation',
      trainingMethod: 'supervised',
      created: new Date().toISOString()
    });
  }
  
  try {
    const game = new Chess(fen);
    
    if (model) {
      // Use the model's heatmap function with simplified calculation
      return model.getHeatmap(game, heatmapType);
    } else {
      // Return an empty heatmap as fallback
      const squares: Record<string, number> = {};
      for (let rank = 0; rank < 8; rank++) {
        for (let file = 0; file < 8; file++) {
          const square = `${'abcdefgh'[file]}${8 - rank}`;
          squares[square] = 0;
        }
      }
      
      return {
        squares,
        minValue: 0,
        maxValue: 0,
        type: heatmapType
      };
    }
  } catch (error) {
    console.error('Error generating heatmap:', error);
    
    // Return a default empty heatmap
    const squares: Record<string, number> = {};
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const square = `${'abcdefgh'[file]}${8 - rank}`;
        squares[square] = 0;
      }
    }
    
    return {
      squares,
      minValue: 0,
      maxValue: 0,
      type: heatmapType
    };
  }
}

// No need for a terminate function since we're not using workers