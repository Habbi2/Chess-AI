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
        
        // Initialize model based on its type
        switch (payload.modelMetadata.trainingMethod) {
          case 'supervised':
            if (payload.modelMetadata.id === 'basic') {
              // Basic heuristic model
              model.createModel();
              console.log('[Worker] Basic heuristic model initialized');
            } else {
              // Supervised learning model
              model.createModel();
              try {
                if (payload.modelPath) {
                  await model.loadModel(payload.modelPath);
                } else {
                  // Try loading from IndexedDB
                  await model.loadModel('indexeddb://chess-supervised-model');
                }
                console.log('[Worker] Supervised model loaded successfully');
              } catch (e) {
                console.log('[Worker] No pre-trained model found, using new model');
              }
            }
            break;
        
          case 'reinforcement':
            // Self-play model with enhanced search
            model.createModel();
            try {
              if (payload.modelPath) {
                await model.loadModel(payload.modelPath);
              } else {
                // Try loading from IndexedDB
                await model.loadModel('indexeddb://chess-selfplay-model');
              }
              console.log('[Worker] Self-play model loaded successfully');
            } catch (e) {
              console.log('[Worker] No pre-trained self-play model found, using new model with advanced search');
              // Enable advanced search parameters for reinforcement learning model
              model.enableAdvancedSearch();
            }
            break;
          
          default:
            model.createModel();
            console.log('[Worker] Created default model');
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
        
        // Adjust depth based on model type for better performance
        let effectiveDepth = payload.depth || 1;
        
        if (model.trainingMethod === 'reinforcement') {
          // Self-play models can handle deeper search
          effectiveDepth = Math.min(effectiveDepth, 3);
        } else if (model.id !== 'basic') {
          // Supervised models use moderate depth
          effectiveDepth = Math.min(effectiveDepth, 2);
        } else {
          // Basic model uses shallow depth
          effectiveDepth = Math.min(effectiveDepth, 1);
        }
        
        const suggestions = await model.suggestMove(game, effectiveDepth);
        
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
        
      case 'TRAIN_MODEL':
        if (!model) {
          throw new Error('Model not initialized');
        }
        
        // Train the model with provided data
        const { positions, evaluations, epochs, batchSize } = payload;
        const trainingResult = await model.trainModel(
          positions, 
          evaluations, 
          epochs || 10, 
          batchSize || 32
        );
        
        // Save the model based on its type
        let savePath = 'indexeddb://chess-model';
        if (model.trainingMethod === 'supervised') {
          savePath = 'indexeddb://chess-supervised-model';
        } else if (model.trainingMethod === 'reinforcement') {
          savePath = 'indexeddb://chess-selfplay-model';
        }
        
        await model.saveModel(savePath);
        
        self.postMessage({ 
          type: 'TRAINING_COMPLETE', 
          result: {
            loss: trainingResult.history.loss[trainingResult.history.loss.length - 1],
            savePath
          }
        });
        break;
        
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    console.error('[Worker] Error handling message:', error);
    self.postMessage({ 
      type: 'ERROR', 
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

// Notify that the worker is ready
self.postMessage({ type: 'WORKER_READY' });