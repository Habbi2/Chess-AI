/**
 * Web Worker for chess AI calculations to prevent UI freezing
 */

import '@tensorflow/tfjs';
import { Chess } from 'chess.js';
import { ChessEvaluationModel } from '../models/ChessEvaluationModel';

// Model instance that will be loaded in the worker
let model: ChessEvaluationModel | null = null;

// Worker message handler
self.onmessage = async (event) => {
  const { type, payload } = event.data;
  
  try {
    switch (type) {
      case 'INIT_MODEL':
        // Initialize model with provided metadata
        model = new ChessEvaluationModel(payload.modelMetadata);
        
        // Try to load model if path is provided
        if (payload.modelPath) {
          await model.loadModel(payload.modelPath);
        } else {
          // Create a new model if no path provided
          model.createModel();
        }
        
        self.postMessage({ type: 'MODEL_READY', success: true });
        break;
        
      case 'EVALUATE_POSITION':
        if (!model) {
          throw new Error('Model not initialized');
        }
        
        const { fen } = payload;
        const evaluation = await model.evaluatePosition(fen);
        
        self.postMessage({ 
          type: 'EVALUATION_RESULT', 
          result: evaluation,
          fen
        });
        break;
        
      case 'SUGGEST_MOVE':
        if (!model) {
          throw new Error('Model not initialized');
        }
        
        const game = new Chess(payload.fen);
        const depth = payload.depth || 2;
        const suggestions = await model.suggestMove(game, depth);
        
        self.postMessage({ 
          type: 'MOVE_SUGGESTIONS', 
          result: suggestions,
          fen: payload.fen
        });
        break;
        
      case 'GET_HEATMAP':
        if (!model) {
          throw new Error('Model not initialized');
        }
        
        const heatmapGame = new Chess(payload.fen);
        const heatmap = await model.getHeatmap(heatmapGame, payload.heatmapType);
        
        self.postMessage({ 
          type: 'HEATMAP_RESULT', 
          result: heatmap,
          fen: payload.fen
        });
        break;
        
      default:
        console.error('Unknown message type:', type);
    }
  } catch (error: unknown) {
    console.error('Worker error:', error);
    self.postMessage({ 
      type: 'ERROR', 
      error: error instanceof Error ? error.message : 'Unknown error',
      originalRequest: { type, payload }
    });
  }
};

// Notify that the worker is ready
self.postMessage({ type: 'WORKER_READY' });