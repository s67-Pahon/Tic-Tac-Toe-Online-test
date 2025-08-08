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
 * Checks the board state for a winner.
 * @param {Array<string|null>} board - The 9-element array representing the board.
 * @returns {string|null} 'X', 'O', or null if there is no winner yet.
 */
function calculateWinner(board) {
  const lines = [
    // Horizontal
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    // Vertical
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    // Diagonal
    [0, 4, 8],
    [2, 4, 6],
  ];

  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    // Check if the first cell is filled and if all three cells in the line are the same.
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a]; // Return 'X' or 'O'
    }
  }
  return null; // No winner found
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
  const [winner, setWinner] = useState(null); // New state for the winner

  // This useEffect hook draws the initial grid lines.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    const lineSpacing = size / 3;

    ctx.beginPath();
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.moveTo(lineSpacing, 0);
    ctx.lineTo(lineSpacing, size);
    ctx.moveTo(lineSpacing * 2, 0);
    ctx.lineTo(lineSpacing * 2, size);
    ctx.moveTo(0, lineSpacing);
    ctx.lineTo(size, lineSpacing);
    ctx.moveTo(0, lineSpacing * 2);
    ctx.lineTo(size, lineSpacing * 2);
    ctx.stroke();

  }, []);

  const handleCanvasClick = (event) => {
    const canvas = canvasRef.current;
    // Stop if there's no canvas, if there's a winner, or if the board is full
    if (!canvas || winner || turn > 9) return;
    
    const ctx = canvas.getContext('2d');
    const lineSpacing = canvas.width / 3;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const col = Math.floor(x / lineSpacing);
    const row = Math.floor(y / lineSpacing);
    const index = row * 3 + col;

    if (board[index]) {
      return; 
    }

    const currentPlayerSymbol = turn % 2 === 1 ? 'X' : 'O';
    
    if (turn % 2 === 1) {
      drawX(ctx, row, col, lineSpacing);
    } else {
      drawO(ctx, row, col, lineSpacing);
    }

    const newBoard = [...board];
    newBoard[index] = currentPlayerSymbol;
    setBoard(newBoard);

    // Check for a winner after updating the board
    const newWinner = calculateWinner(newBoard);
    if (newWinner) {
      setWinner(newWinner);
    }

    setTurn(turn + 1);
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
    </>
  );
}

export default App;
