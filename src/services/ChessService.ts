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
  if (isModelInitialized && model && model.id === modelMetadata.id) {
    return Promise.resolve();
  }
  
  try {
    // Create new model instance
    model = new ChessEvaluationModel(modelMetadata);
    
    // Initialize based on model type
    switch (modelMetadata.trainingMethod) {
      case 'supervised':
        if (modelMetadata.id === 'basic') {
          // Basic heuristic model - just create the model
          model.createModel();
          console.log('Basic heuristic model initialized');
        } else {
          // Supervised learning model - load pre-trained weights
          await model.createModel();
          try {
            // Try loading pre-trained model for supervised learning
            await model.loadModel('indexeddb://chess-supervised-model');
            console.log('Supervised learning model loaded from storage');
          } catch (e) {
            console.log('No pre-trained supervised model found, using default weights');
          }
        }
        break;
      
      case 'reinforcement':
        // Self-play (reinforcement learning) model
        await model.createModel();
        try {
          // Try loading self-play model if available
          await model.loadModel('indexeddb://chess-selfplay-model');
          console.log('Self-play model loaded from storage');
        } catch (e) {
          console.log('No pre-trained self-play model found, using default weights');
          // Create a stronger baseline for self-play model
          if (model.trainingMethod === 'reinforcement') {
            // Initialize with more advanced MCTS settings
            model.enableAdvancedSearch();
            console.log('Advanced tree search enabled for self-play model');
          }
        }
        break;
      
      default:
        // Default to basic model
        model.createModel();
        console.log('Falling back to basic model');
    }
    
    isModelInitialized = true;
    console.log(`Chess model ${modelMetadata.name} initialized successfully`);
    return Promise.resolve();
  } catch (error) {
    console.error('Error initializing chess model:', error);
    return Promise.reject(error);
  }
}

/**
 * Evaluate a position using the appropriate method based on the selected model
 */
export async function evaluatePosition(fen: string): Promise<number> {
  if (!model) {
    // Fallback to heuristic if no model is available
    return Promise.resolve(evaluatePositionHeuristic(fen));
  }
  
  try {
    // Use the model's evaluation method which will use either:
    // - Pure heuristic (basic model)
    // - Neural network with supervised learning
    // - Advanced search with self-play model
    return await model.evaluatePosition(fen);
  } catch (error: unknown) {
    console.error('Error in model evaluation, falling back to heuristic:', error);
    return Promise.resolve(evaluatePositionHeuristic(fen));
  }
}

/**
 * Suggest moves with appropriate complexity based on the active model
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
    
    // Different models can handle different search depths effectively
    let effectiveDepth = depth;
    
    if (model) {
      // Adjust search depth based on the model type
      switch (model.trainingMethod) {
        case 'reinforcement':
          // Self-play model can handle deeper search
          effectiveDepth = Math.min(depth, 3); 
          console.log(`Using self-play model with depth ${effectiveDepth}`);
          break;
        
        case 'supervised':
          if (model.id === 'supervised') {
            // Supervised model uses enhanced evaluation but limited depth
            effectiveDepth = Math.min(depth, 2);
            console.log(`Using supervised model with depth ${effectiveDepth}`);
          } else {
            // Basic model uses simple heuristic with limited depth
            effectiveDepth = Math.min(depth, 1);
            console.log(`Using basic heuristic model with depth ${effectiveDepth}`);
          }
          break;
          
        default:
          effectiveDepth = Math.min(depth, 1);
      }
      
      // Get move suggestions from the specific model
      return model.suggestMove(game, effectiveDepth);
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
  } catch (error: unknown) {
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
  } catch (error: unknown) {
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