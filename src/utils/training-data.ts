// Sample chess positions with evaluations for training
// Format: { fen: string, evaluation: number }
// Positive evaluation means advantage for white, negative means advantage for black

export interface TrainingSample {
  fen: string;
  evaluation: number;
}

export const trainingSamples: TrainingSample[] = [
  // Starting position - roughly equal
  {
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    evaluation: 0.2 // Slight advantage to white for moving first
  },
  
  // Some common openings
  {
    fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
    evaluation: 0.3 // e4 opening - small advantage to white
  },
  {
    fen: 'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1',
    evaluation: 0.25 // d4 opening - small advantage to white
  },
  
  // Sicilian Defense
  {
    fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2',
    evaluation: 0.1 // Slightly better for white
  },
  
  // French Defense
  {
    fen: 'rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
    evaluation: 0.3 // Small white advantage
  },
  
  // King's Gambit
  {
    fen: 'rnbqkbnr/pppp1ppp/8/4p3/4PP2/8/PPPP2PP/RNBQKBNR b KQkq f3 0 2',
    evaluation: 0.0 // Roughly equal position
  },
  
  // Position with material advantage for white
  {
    fen: 'rnbqkbnr/ppp2ppp/4p3/3p4/3PP3/2N5/PPP2PPP/R1BQKBNR b KQkq - 1 4',
    evaluation: 1.2 // White has better development and center control
  },
  
  // Position with material advantage for black
  {
    fen: 'rnbqkb1r/pppp1ppp/5n2/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR w KQkq - 2 3',
    evaluation: -0.9 // Black has better development
  },
  
  // Captured pawn by white
  {
    fen: 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
    evaluation: 0.3
  },
  {
    fen: 'rnbqkbnr/ppp1pppp/8/8/3Pp3/8/PPP2PPP/RNBQKBNR w KQkq - 0 3',
    evaluation: -0.7 // Black has a pawn advantage
  },
  
  // Mid-game positions
  {
    fen: 'r1bqk2r/ppp2ppp/2n2n2/2bpp3/4P3/2PP1N2/PP1N1PPP/R1BQKB1R w KQkq - 0 6',
    evaluation: 0.1 // Roughly even position
  },
  {
    fen: 'r1bq1rk1/pp2ppbp/2np1np1/8/3NP3/2N1BP2/PPPQ2PP/2KR1B1R w - - 0 9',
    evaluation: 0.4 // Slight white advantage in this position
  },
  
  // More complex positions
  {
    fen: 'r4rk1/pp1n1ppp/1qp1p3/3pP3/1b1P4/1P3N2/PB1N1PPP/R2Q1RK1 b - - 0 12',
    evaluation: -0.2 // Slightly better for black
  },
  {
    fen: '3r2k1/ppq2pp1/2p1r2p/8/3P1Q2/2P3P1/PP3P1P/R3R1K1 w - - 0 20',
    evaluation: 1.8 // Much better for white
  },
  
  // Positions with major piece advantages
  {
    fen: 'r1b1kbnr/pppp1ppp/2n5/4p3/4P1q1/2P2N2/PP1P1PPP/RNBQKB1R w KQkq - 4 4',
    evaluation: -2.5 // Black has won a queen for a knight
  },
  {
    fen: 'rn2kb1r/pp2pppp/2p2n2/q2p1b2/3P1B2/2P1PN2/PP3PPP/RN1QKB1R w KQkq - 2 7',
    evaluation: 0.6 // White has better development and control
  },
  
  // Endgame positions
  {
    fen: '8/2p5/8/1p2k3/1P5p/2P2K1P/8/8 w - - 0 40',
    evaluation: 0.0 // Dead drawn pawn endgame
  },
  {
    fen: '8/8/2k5/5ppp/8/3K1PPP/8/8 b - - 0 50',
    evaluation: 0.0 // Drawn king and pawn endgame
  },
  {
    fen: '8/8/1p6/p1p5/P1P1k3/4p3/4P1K1/8 w - - 0 60',
    evaluation: -3.0 // Black will queen the e-pawn
  },
  
  // Checkmate positions
  {
    fen: 'r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4',
    evaluation: 9.0 // White has scholar's mate
  },
  {
    fen: 'r1bqkbnr/ppp2ppp/2np4/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 4',
    evaluation: 5.0 // White is threatening scholar's mate
  },
  
  // Tactical positions
  {
    fen: 'r3k2r/ppp1qppp/2n1bn2/3p4/3P1B2/2PB1N2/PP1N1PPP/R2QK2R b KQkq - 3 8',
    evaluation: 0.0 // Complex, roughly equal position
  },
  {
    fen: 'r1bq1rk1/pppp1ppp/2n2n2/2b1p3/2B1P3/2PP1N2/PP3PPP/RNBQK2R w KQ - 0 6',
    evaluation: 0.4 // White has slightly better piece coordination
  },
  
  // Additional positions for training diversity
  
  // Ruy Lopez opening positions
  {
    fen: 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
    evaluation: 0.2 // Classic Ruy Lopez position
  },
  {
    fen: 'r1bqkbnr/1ppp1ppp/p1n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4',
    evaluation: 0.3 // Ruy Lopez Morphy Defense
  },
  
  // Queen's Gambit positions
  {
    fen: 'rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq c3 0 2',
    evaluation: 0.2 // Queen's Gambit 
  },
  {
    fen: 'rnbqkbnr/pp2pppp/2p5/3p4/2PP4/5N2/PP2PPPP/RNBQKB1R b KQkq - 1 3',
    evaluation: 0.2 // Queen's Gambit, Slav Defense
  },
  
  // King's Indian Defense positions
  {
    fen: 'rnbqkb1r/pppppp1p/5np1/8/2PP4/8/PP2PPPP/RNBQKBNR w KQkq - 1 3',
    evaluation: 0.1 // King's Indian setup
  },
  {
    fen: 'rnbq1rk1/ppp1ppbp/3p1np1/8/2PPP3/2N2N2/PP3PPP/R1BQKB1R w KQ - 0 6',
    evaluation: 0.3 // King's Indian Classical Variation
  },
  
  // Najdorf Sicilian positions
  {
    fen: 'rnbqkb1r/1p2pppp/p2p1n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R w KQkq - 0 6',
    evaluation: 0.1 // Najdorf main line
  },
  {
    fen: 'r1bqkb1r/pp2pppp/2np1n2/8/3NP3/2N1B3/PPP2PPP/R2QKB1R b KQkq - 2 6',
    evaluation: 0.2 // Najdorf English Attack
  },
  
  // Complex middle game positions
  {
    fen: 'r4rk1/pp1n1pp1/1qp1p2p/3pPb2/1b1P4/1PN2NP1/PB2QPBP/R2R2K1 b - - 0 15',
    evaluation: -0.1 // Complex middle game with fairly equal chances
  },
  {
    fen: '2rq1rk1/1b1nbppp/pp2pn2/3p4/3P1B2/2NB1N1P/PPQ1PPP1/3RK2R w K - 4 12',
    evaluation: 0.2 // Closed position with maneuvering
  },
  
  // Positions with opposite-side castling (dynamic positions)
  {
    fen: 'r1bq1rk1/ppp1nppp/3bp3/3p4/3P4/1P2PNP1/P1PN1PBP/R2Q1RK1 w - - 0 9',
    evaluation: 0.0 // Position with kings on same side
  },
  {
    fen: 'r3kb1r/pp1n1ppp/2p1pn2/q2p4/1bPP4/2N1PN2/PP1BBPPP/R2QK2R b KQkq - 5 8',
    evaluation: -0.2 // Position with opposite side castling potential
  },
  
  // Endgame positions with various piece combinations
  {
    fen: '8/5pk1/7p/8/5KP1/7P/8/8 b - - 0 45',
    evaluation: 0.0 // King and pawn endgame (drawn)
  },
  {
    fen: '8/8/1p1k4/p1p2p1p/P1P2P1P/1P1K4/8/8 w - - 0 50',
    evaluation: 0.0 // Symmetrical pawn structure (drawn)
  },
  {
    fen: '8/5pk1/4n2p/4P3/5KP1/7P/8/8 w - - 0 1',
    evaluation: 0.5 // Knight vs pawn endgame
  },
  {
    fen: '8/5pk1/7p/8/5KP1/7P/4B3/8 w - - 0 1',
    evaluation: 1.0 // Bishop vs pawn endgame (winning for white)
  },
  {
    fen: '8/R7/1b6/2pk4/8/3K4/8/8 w - - 0 1',
    evaluation: 5.0 // Rook vs bishop endgame (winning for white)
  },
  {
    fen: '8/8/3k4/8/8/3K4/4Q3/8 w - - 0 1',
    evaluation: 9.0 // Queen endgame (winning for white)
  },
  
  // Positions with tactical themes
  {
    fen: 'r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 1',
    evaluation: 9.0 // Scholar's mate position
  },
  {
    fen: 'r3k2r/pppq1ppp/2npbn2/4p3/2B1P1b1/2NP1N2/PPPBQPPP/R3K2R w KQkq - 6 8',
    evaluation: 0.0 // Position with multiple possible tactical motifs
  },
  {
    fen: 'r2qkb1r/pp2pppp/2p2n2/3p1b2/3P4/2N1PN2/PP3PPP/R1BQK2R w KQkq - 0 8',
    evaluation: 0.1 // Position with pin themes
  },
  {
    fen: 'r1bqk2r/ppp2ppp/2n5/2bPp3/4P3/5N2/PPP2PPP/RNBQK2R b KQkq - 0 6',
    evaluation: -1.0 // Position with fork potential
  },
  
  // Positions from famous games
  {
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/4P3/2N2N2/PPPP1PPP/R1BQKB1R w KQkq - 4 4',
    evaluation: 0.0 // Four Knights Game
  },
  {
    fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R b KQkq - 0 5',
    evaluation: 0.1 // Giuoco Piano position
  },
  {
    fen: 'r1bq1rk1/2p1bppp/p1n2n2/1p1pp3/4P3/1BP2N2/PP1P1PPP/RNBQR1K1 w - - 0 9',
    evaluation: -0.1 // Spanish Opening, Closed Variation
  }
];