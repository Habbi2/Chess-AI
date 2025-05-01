# Chess AI Showcase

An interactive application demonstrating machine learning capabilities through chess. This project showcases the integration of neural network models with an interactive frontend, visualizing how AI evaluates chess positions with real-time training capabilities.

## Features

### Interactive Chessboard
- Fully playable chess board with drag-and-drop functionality
- Legal move validation
- Move highlighting
- AI move suggestions

### Machine Learning Capabilities
- Real-time position evaluation using neural networks
- Multiple AI models with different training approaches:
  - Basic heuristic evaluation
  - Supervised learning (neural network trained on master games)
  - Reinforcement learning (self-play optimization)
- Visual representation of AI "thinking" process

### Advanced Visualizations
- Position evaluation graphs over time
- Heatmap visualizations showing:
  - Piece mobility
  - Square control
  - Piece safety
  - Attack potential
- Move tree visualization

### Model Training
- In-browser training using TensorFlow.js
- Supervised learning from sample positions
- Model saving and loading via browser storage

## Technology Stack

- **Frontend**: React with TypeScript
- **Chess Logic**: chess.js
- **Interactive Chessboard**: react-chessboard
- **Data Visualization**: D3.js
- **Machine Learning**: TensorFlow.js
- **Styling**: CSS with custom variables

## Getting Started

### Prerequisites
- Node.js (v14 or later)
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

### Usage

1. Play chess by clicking and dragging pieces on the board
2. Select different AI models using the model selector
3. Train the models using the "Train" button
4. Adjust search depth to change how deeply the AI evaluates positions
5. View visualizations showing the AI's understanding of the position

## Project Structure

- `/src/components/chessboard` - Chess board UI components
- `/src/components/visualization` - D3.js based visualization components
- `/src/models` - AI model implementation with TensorFlow.js
- `/src/utils` - Utility functions and training data
- `/src/types` - TypeScript type definitions
- `/src/hooks` - Custom React hooks

## How the AI Works

The chess AI uses a combination of neural network evaluation and game tree search:

1. **Board Representation**: Chess positions are encoded as 8x8x13 tensors:
   - 12 channels for each piece type (6 pieces × 2 colors)
   - 1 channel for turn information

2. **Neural Network Architecture**:
   - Convolutional layers to extract spatial features
   - Dense layers to evaluate the position
   - Outputs a single evaluation score (positive for white advantage)

3. **Move Selection**:
   - Evaluates all possible moves
   - Sorts moves by evaluation score
   - Suggests the highest scoring move

4. **Training Process**:
   - Supervised learning from labeled positions
   - Can be extended with reinforcement learning (self-play)

## Future Enhancements

- Deeper neural network architecture
- Monte Carlo Tree Search implementation
- Opening book integration
- PGN import/export
- Game analysis with variation exploration

## License

MIT

## Acknowledgements

- Chess.js for chess logic
- TensorFlow.js for in-browser machine learning
- D3.js for visualizations
