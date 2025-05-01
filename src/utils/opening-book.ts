/**
 * Simple chess opening book implementation
 * Contains common chess openings with evaluations and recommended moves
 */

interface OpeningPosition {
  name: string;
  fen: string;
  evaluation: number;
  bestMove: string;
}

// A collection of common opening positions and recommended moves
export const openingBook: OpeningPosition[] = [
  // Starting position
  {
    name: "Starting position",
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    evaluation: 0.2,
    bestMove: "e4" // e4 is generally considered the strongest first move
  },
  
  // After 1.e4
  {
    name: "King's Pawn Opening",
    fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
    evaluation: 0.3,
    bestMove: "c5" // Sicilian Defense is a strong response
  },
  
  // After 1.e4 e5
  {
    name: "Open Game",
    fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2",
    evaluation: 0.2,
    bestMove: "Nf3" // The main Ruy Lopez line
  },
  
  // After 1.e4 e5 2.Nf3
  {
    name: "King's Knight Opening",
    fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2",
    evaluation: 0.2,
    bestMove: "Nc6" // Main response to Nf3
  },
  
  // After 1.e4 e5 2.Nf3 Nc6
  {
    name: "King's Knight Opening (response)",
    fen: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
    evaluation: 0.2, 
    bestMove: "Bb5" // Ruy Lopez
  },
  
  // Ruy Lopez main line
  {
    name: "Ruy Lopez",
    fen: "r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3",
    evaluation: 0.2,
    bestMove: "a6" // Morphy Defense
  },
  
  // Sicilian Defense main line
  {
    name: "Sicilian Defense",
    fen: "rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2",
    evaluation: 0.1,
    bestMove: "Nf3" // Open Sicilian
  },
  
  // Queen's Pawn Opening
  {
    name: "Queen's Pawn Game",
    fen: "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1",
    evaluation: 0.2,
    bestMove: "d5" // Standard symmetrical response
  },
  
  // Queen's Gambit
  {
    name: "Queen's Gambit",
    fen: "rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq c3 0 2",
    evaluation: 0.2, 
    bestMove: "e6" // QGD line
  },
  
  // Queen's Gambit Accepted
  {
    name: "Queen's Gambit Accepted",
    fen: "rnbqkbnr/ppp1pppp/8/8/2pP4/8/PP2PPPP/RNBQKBNR w KQkq - 0 3",
    evaluation: 0.1,
    bestMove: "Nf3" // Main line QGA
  },
  
  // French Defense
  {
    name: "French Defense",
    fen: "rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
    evaluation: 0.3,
    bestMove: "d4" // Main line French
  },
  
  // Caro-Kann Defense
  {
    name: "Caro-Kann Defense",
    fen: "rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
    evaluation: 0.2,
    bestMove: "d4" // Main line Caro-Kann
  },
  
  // King's Indian Defense
  {
    name: "King's Indian Defense",
    fen: "rnbqkb1r/pppppp1p/5np1/8/2PP4/8/PP2PPPP/RNBQKBNR w KQkq - 1 3",
    evaluation: 0.1,
    bestMove: "Nc3" // Classical KID
  },
  
  // English Opening
  {
    name: "English Opening",
    fen: "rnbqkbnr/pppppppp/8/8/2P5/8/PP1PPPPP/RNBQKBNR b KQkq c3 0 1",
    evaluation: 0.1,
    bestMove: "e5" // Reversed Sicilian
  },
  
  // Italian Game
  {
    name: "Italian Game",
    fen: "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3",
    evaluation: 0.2,
    bestMove: "Bc5" // Giuoco Piano
  }
];

/**
 * Look up a position in the opening book
 * @param fen - FEN position to look up
 * @returns Opening book entry or null if not found
 */
export function lookupPosition(fen: string): OpeningPosition | null {
  // For simplicity, we only match exact positions
  return openingBook.find(entry => {
    // Strip move counters from FEN for more robust matching
    const simplifiedFen = fen.split(' ').slice(0, 4).join(' ');
    const entrySimplifiedFen = entry.fen.split(' ').slice(0, 4).join(' ');
    return simplifiedFen === entrySimplifiedFen;
  }) || null;
}