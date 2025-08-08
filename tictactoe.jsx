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

// --- Drawing Helper Function ---

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

  // This useEffect hook draws the initial grid lines when the component first mounts.
  useEffect(() => {
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

  }, []); // The empty dependency array ensures this effect runs only once.

  /**
   * Handles click events on the canvas.
   * @param {React.MouseEvent<HTMLCanvasElement>} event - The mouse event.
   */
  const handleCanvasClick = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const lineSpacing = canvas.width / 3;

    // Get the position of the canvas on the page
    const rect = canvas.getBoundingClientRect();
    
    // Calculate the x and y coordinates of the click relative to the canvas
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Determine which column and row was clicked
    const col = Math.floor(x / lineSpacing);
    const row = Math.floor(y / lineSpacing);

    // Draw an 'O' in the clicked cell
    drawO(ctx, row, col, lineSpacing);
  };

  return (
    <>
      <h1>Ox Game</h1>
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
