import React, { useRef, useEffect } from 'react';

// Main App component that will render our game board
function App() {
  // Removed styling from this div to adhere to the "no styling" rule.
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
    
    // Calculate the starting and ending points based on cell and padding
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

    // Calculate the center of the cell
    const centerX = col * lineSpacing + lineSpacing / 2;
    const centerY = row * lineSpacing + lineSpacing / 2;
    const radius = lineSpacing / 2 - 20; // Radius with padding

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.stroke();
}


// The GameBoard component contains the canvas and drawing logic
function GameBoard() {
  const canvasRef = useRef(null);

  useEffect(() => {
    // --- Canvas Setup ---
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    const lineSpacing = size / 3;

    // --- Draw Grid Lines ---
    ctx.beginPath();
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Vertical Lines
    ctx.moveTo(lineSpacing, 0);
    ctx.lineTo(lineSpacing, size);
    ctx.moveTo(lineSpacing * 2, 0);
    ctx.lineTo(lineSpacing * 2, size);

    // Draw Horizontal Lines
    ctx.moveTo(0, lineSpacing);
    ctx.lineTo(size, lineSpacing);
    ctx.moveTo(0, lineSpacing * 2);
    ctx.lineTo(size, lineSpacing * 2);
    ctx.stroke();

    // --- Draw Static Game Pieces ---
    // Draw an 'X' in the first row, first column (0, 0)
    drawX(ctx, 0, 0, lineSpacing);

    // Draw an 'O' in the second row, second column (1, 1)
    drawO(ctx, 1, 1, lineSpacing);


  }, []); // The empty dependency array ensures this effect runs only once.

  return (
    <>
      <h1>Ox Game</h1>
      <canvas
        ref={canvasRef}
        width="300"
        height="300"
        style={{ border: '1px solid black' }}
      ></canvas>
    </>
  );
}

export default App;


