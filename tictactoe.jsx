import React, { useRef, useEffect, useState } from 'react';

// Main App component that will render our game board
function App() {
  return (
    <div>
      <GameBoard />
    </div>
  );
}

// --- Helper Functions ---

/**
 * Generates all possible winning lines for a square board of a given size.
 * @param {number} size - The side length of the square board (e.g., 3 for a 3x3 board).
 * @returns {Array<Array<number>>} An array of winning line indices.
 */
const generateWinningLines = (size) => {
  const lines = [];
  // Rows
  for (let i = 0; i < size; i++) {
    const row = [];
    for (let j = 0; j < size; j++) {
      row.push(i * size + j);
    }
    lines.push(row);
  }
  // Columns
  for (let i = 0; i < size; i++) {
    const col = [];
    for (let j = 0; j < size; j++) {
      col.push(i + j * size);
    }
    lines.push(col);
  }
  // Diagonals
  const diag1 = [];
  const diag2 = [];
  for (let i = 0; i < size; i++) {
    diag1.push(i * (size + 1));
    diag2.push((i + 1) * (size - 1));
  }
  lines.push(diag1, diag2);
  return lines;
};

/**
 * Checks the board state for a winner using dynamically generated lines.
 * @param {Array<string|null>} board - The array representing the board.
 * @returns {string|null} 'X', 'O', or null if there is no winner yet.
 */
function calculateWinner(board) {
  const BOARD_SIZE = 3;
  const lines = generateWinningLines(BOARD_SIZE);

  for (const line of lines) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}

function drawX(ctx, row, col, lineSpacing) {
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 5;
    const x = col * lineSpacing;
    const y = row * lineSpacing;
    const padding = 20;
    ctx.beginPath();
    ctx.moveTo(x + padding, y + padding);
    ctx.lineTo(x + lineSpacing - padding, y + lineSpacing - padding);
    ctx.moveTo(x + lineSpacing - padding, y + padding);
    ctx.lineTo(x + padding, y + lineSpacing - padding);
    ctx.stroke();
}

function drawO(ctx, row, col, lineSpacing) {
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 5;
    const centerX = col * lineSpacing + lineSpacing / 2;
    const centerY = row * lineSpacing + lineSpacing / 2;
    const radius = lineSpacing / 2 - 20;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.stroke();
}


// The GameBoard component contains the canvas and drawing logic
function GameBoard() {
  const canvasRef = useRef(null);
  const [turn, setTurn] = useState(1);
  const [board, setBoard] = useState(Array(9).fill(null));
  const [winner, setWinner] = useState(null);

  /**
   * Function to draw the initial grid. Can be called to reset the board.
   */
  const drawGrid = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    const lineSpacing = size / 3;

    // Clear the entire canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the grid lines
    ctx.beginPath();
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.moveTo(lineSpacing, 0);
    ctx.lineTo(lineSpacing, size);
    ctx.moveTo(lineSpacing * 2, 0);
    ctx.lineTo(lineSpacing * 2, size);
    ctx.moveTo(0, lineSpacing);
    ctx.lineTo(size, lineSpacing);
    ctx.moveTo(0, lineSpacing * 2);
    ctx.lineTo(size, lineSpacing * 2);
    ctx.stroke();
  };
  
  // This useEffect hook draws the initial grid lines only once.
  useEffect(() => {
    drawGrid();
  }, []);

  const handleCanvasClick = (event) => {
    if (winner || turn > 9) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const lineSpacing = canvas.width / 3;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const col = Math.floor(x / lineSpacing);
    const row = Math.floor(y / lineSpacing);
    const index = row * 3 + col;

    if (board[index]) return; 

    const currentPlayerSymbol = turn % 2 === 1 ? 'X' : 'O';
    
    if (currentPlayerSymbol === 'X') {
      drawX(ctx, row, col, lineSpacing);
    } else {
      drawO(ctx, row, col, lineSpacing);
    }

    const newBoard = [...board];
    newBoard[index] = currentPlayerSymbol;
    setBoard(newBoard);

    const newWinner = calculateWinner(newBoard);
    if (newWinner) {
      setWinner(newWinner);
    }

    setTurn(turn + 1);
  };
  
  /**
   * Resets the game state to its initial values.
   */
  const handleReset = () => {
    // Reset all the state variables
    setTurn(1);
    setBoard(Array(9).fill(null));
    setWinner(null);
    // Redraw the grid, which also clears the canvas
    drawGrid();
  };

  // Determine the status message
  let status;
  if (winner) {
    status = `Winner: Player ${winner}`;
  } else if (turn > 9) {
    status = "It's a Draw!";
  } else {
    status = `Turn ${turn}: Player ${turn % 2 === 1 ? 'X' : 'O'}`;
  }

  return (
    <>
      <h1>Ox Game</h1>
      <h2>{status}</h2>
      <canvas
        ref={canvasRef}
        width="300"
        height="300"
        style={{ border: '1px solid black' }}
        onClick={handleCanvasClick}
      ></canvas>
      {/* Add the reset button below the canvas */}
      <button id="reset-btn" onClick={handleReset} style={{marginTop: '10px'}}>
        Reset
      </button>
    </>
  );
}

export default App;
