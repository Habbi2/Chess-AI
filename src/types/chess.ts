import { Chess, Move, Square } from 'chess.js';

export interface ChessPosition {
  fen: string;
  turn: 'w' | 'b';
  moveNumber: number;
  lastMove?: Move;
}

export interface MoveEvaluation {
  move: string;
  score: number; // Evaluation score
  depth: number; // Search depth
  line?: string[]; // Principal variation (sequence of best moves)
}

export interface PositionHeatmap {
  squares: Record<Square, number>; // Square values for visualization
  minValue: number;
  maxValue: number;
  type: 'mobility' | 'control' | 'safety' | 'attack';
}

export interface AIModel {
  id: string;
  name: string;
  version: string;
  evaluatePosition: (fen: string) => Promise<number>;
  suggestMove: (game: Chess, depth: number) => Promise<MoveEvaluation[]>;
  getHeatmap: (game: Chess, type: PositionHeatmap['type']) => Promise<PositionHeatmap>;
}

export interface ModelMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  trainingMethod: 'supervised' | 'reinforcement' | 'hybrid';
  trainingData?: string;
  elo?: number;
  created: string;
}

export interface GameState {
  game: Chess;
  history: ChessPosition[];
  currentPosition: ChessPosition;
  evaluations: Record<string, MoveEvaluation[]>; // FEN -> evaluations
  heatmaps: Record<string, Record<PositionHeatmap['type'], PositionHeatmap>>; // FEN -> type -> heatmap
  selectedModelMetadata: ModelMetadata; // Changed from selectedModel: AIModel
  thinking: boolean;
  searchDepth: number;
  undoPerformed: boolean; // Track when an undo operation was performed
}

export type GameAction =
  | { type: 'MAKE_MOVE'; move: Move }
  | { type: 'UNDO_MOVE' }
  | { type: 'SET_POSITION'; fen: string }
  | { type: 'CHANGE_MODEL'; modelMetadata: ModelMetadata } // Changed from model: AIModel
  | { type: 'SET_DEPTH'; depth: number }
  | { type: 'REQUEST_EVALUATION' }
  | { type: 'RECEIVE_EVALUATION'; fen: string; evaluations: MoveEvaluation[] }
  | { type: 'RECEIVE_HEATMAP'; fen: string; heatmapType: PositionHeatmap['type']; heatmap: PositionHeatmap };