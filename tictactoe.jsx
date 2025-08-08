import React, { useRef, useEffect, useState } from 'react';

// Main App component that will render our game board
function App() {
  return (
    <div>
      <GameBoard />
    </div>
  );
}

// --- Drawing Helper Functions ---

/**
 * Draws an 'X' in a specified grid cell.
 * @param {CanvasRenderingContext2D} ctx - The 2D rendering context.
 * @param {number} row - The row of the cell (0, 1, or 2).
 * @param {number} col - The column of the cell (0, 1, or 2).
 * @param {number} lineSpacing - The size of each cell.
 */
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

/**
 * Draws an 'O' in a specified grid cell.
 * @param {CanvasRenderingContext2D} ctx - The 2D rendering context.
 * @param {number} row - The row of the cell (0, 1, or 2).
 * @param {number} col - The column of the cell (0, 1, or 2).
 * @param {number} lineSpacing - The size of each cell.
 */
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
  // State to keep track of the current turn number. Starts at 1 for Player X.
  const [turn, setTurn] = useState(1);

  // This useEffect hook draws the initial grid lines when the component first mounts.
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

    // Draw grid lines
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

  /**
   * Handles click events on the canvas.
   * @param {React.MouseEvent<HTMLCanvasElement>} event - The mouse event.
   */
  const handleCanvasClick = (event) => {
    const canvas = canvasRef.current;
    if (!canvas || turn > 9) return; // Stop if canvas isn't ready or game is over
    
    const ctx = canvas.getContext('2d');
    const lineSpacing = canvas.width / 3;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const col = Math.floor(x / lineSpacing);
    const row = Math.floor(y / lineSpacing);

    // Check if the current turn is odd or even to decide which symbol to draw
    if (turn % 2 === 1) {
      // Odd turn: Player X
      drawX(ctx, row, col, lineSpacing);
    } else {
      // Even turn: Player O
      drawO(ctx, row, col, lineSpacing);
    }

    // Increment the turn counter for the next player
    setTurn(turn + 1);
  };

  return (
    <>
      <h1>Ox Game</h1>
      {/* Display whose turn it is. Shows nothing after turn 9. */}
      <h2>
        {turn <= 9 ? `Turn ${turn}: Player ${turn % 2 === 1 ? 'X' : 'O'}` : 'Game Over'}
      </h2>
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
