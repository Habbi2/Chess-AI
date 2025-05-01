/**
 * Service to handle communication with the chess AI Web Worker
 */

import { ModelMetadata, MoveEvaluation, PositionHeatmap } from '../types/chess';

// Worker instance
let worker: Worker | null = null;

// Track initialization state to prevent race conditions
let isInitializing = false;
let isTerminating = false;

// Pending promises for worker responses
const pendingPromises: Map<string, { 
  resolve: (value: any) => void,
  reject: (reason?: any) => void,
  timeout: number
}> = new Map();

// Create a unique ID for each request
let requestId = 0;

// Initialize the worker
export function initWorker() {
  // Don't try to initialize while terminating
  if (isTerminating) {
    console.warn('Cannot initialize worker while termination is in progress');
    return null;
  }
  
  // Return existing worker if already initialized
  if (worker) return worker;
  
  // Prevent multiple simultaneous initializations
  if (isInitializing) {
    console.warn('Worker initialization already in progress');
    return null;
  }
  
  try {
    isInitializing = true;
    
    // Create a new worker
    worker = new Worker(new URL('../utils/chess-worker.ts', import.meta.url), { type: 'module' });
    
    // Set up message handler
    worker.onmessage = (event) => {
      const { type, requestId: id, ...data } = event.data;
      
      // Find the pending promise for this request
      const pendingPromise = pendingPromises.get(id);
      
      if (pendingPromise) {
        // Clear the timeout and resolve/reject the promise
        clearTimeout(pendingPromise.timeout);
        
        if (type === 'ERROR') {
          pendingPromise.reject(new Error(data.error));
        } else {
          pendingPromise.resolve(data);
        }
        
        // Remove the pending promise
        pendingPromises.delete(id);
      }
    };
    
    // Handle worker errors
    worker.onerror = (error) => {
      console.error('Worker error:', error);
      
      // Reject all pending promises
      pendingPromises.forEach((promise) => {
        clearTimeout(promise.timeout);
        promise.reject(new Error('Worker error: ' + error.message));
      });
      
      // Clear the pending promises
      pendingPromises.clear();
    };
    
    return worker;
  } catch (error) {
    console.error('Failed to initialize worker:', error);
    return null;
  } finally {
    isInitializing = false;
  }
}

// Send a message to the worker and wait for a response
function sendMessageToWorker(type: string, payload: any, timeoutMs: number = 30000): Promise<any> {
  // Don't try to send messages while terminating
  if (isTerminating) {
    return Promise.reject(new Error('Cannot send messages while worker termination is in progress'));
  }
  
  if (!worker) {
    const newWorker = initWorker();
    if (!newWorker) {
      return Promise.reject(new Error('Failed to initialize worker'));
    }
  }
  
  // Create a unique ID for this request
  const id = String(requestId++);
  
  // Create a promise for the response
  const promise = new Promise((resolve, reject) => {
    // Set up a timeout to reject the promise if the worker takes too long
    const timeout = window.setTimeout(() => {
      pendingPromises.delete(id);
      reject(new Error(`Request timed out after ${timeoutMs}ms: ${type}`));
    }, timeoutMs);
    
    // Store the promise callbacks and timeout
    pendingPromises.set(id, { resolve, reject, timeout });
  });
  
  // Send the message to the worker if it exists
  if (worker) {
    try {
      worker.postMessage({ type, payload, requestId: id });
    } catch (error: unknown) {
      // Handle error on sending message
      pendingPromises.delete(id);
      return Promise.reject(new Error(`Failed to send message to worker: ${error instanceof Error ? error.message : String(error)}`));
    }
  } else {
    // This should not happen, but handle it anyway
    pendingPromises.delete(id);
    return Promise.reject(new Error('Worker is not available'));
  }
  
  return promise;
}

// Initialize the model
export async function initModel(modelMetadata: ModelMetadata, modelPath?: string): Promise<void> {
  return sendMessageToWorker('INIT_MODEL', { modelMetadata, modelPath });
}

// Evaluate a position
export async function evaluatePosition(fen: string): Promise<number> {
  const response = await sendMessageToWorker('EVALUATE_POSITION', { fen });
  return response.result;
}

// Suggest moves
export async function suggestMoves(fen: string, depth?: number): Promise<MoveEvaluation[]> {
  const response = await sendMessageToWorker('SUGGEST_MOVE', { fen, depth });
  return response.result;
}

// Get a position heatmap
export async function getHeatmap(fen: string, heatmapType: PositionHeatmap['type']): Promise<PositionHeatmap> {
  const response = await sendMessageToWorker('GET_HEATMAP', { fen, heatmapType });
  return response.result;
}

// Terminate the worker
export function terminateWorker() {
  // Prevent multiple terminations or initialization during termination
  if (isTerminating) {
    console.warn('Worker termination already in progress');
    return;
  }
  
  // No need to terminate if there's no worker
  if (!worker) {
    return;
  }
  
  try {
    isTerminating = true;
    
    // Only attempt to terminate if worker exists
    if (worker) {
      try {
        worker.terminate();
      } catch (error) {
        console.warn('Error terminating worker:', error);
      } finally {
        worker = null;
      }
    }
    
    // Reject all pending promises if there are any
    if (pendingPromises.size > 0) {
      pendingPromises.forEach((promise) => {
        clearTimeout(promise.timeout);
        promise.reject(new Error('Worker terminated'));
      });
      
      // Clear the pending promises
      pendingPromises.clear();
    }
  } catch (error) {
    console.warn('Error during worker termination:', error);
  } finally {
    isTerminating = false;
  }
}