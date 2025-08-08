import React, { useRef, useEffect } from 'react';

// Main App component that will render our game board
function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', textAlign: 'center' }}>
      <GameBoard />
    </div>
  );
}

// The GameBoard component contains the canvas and drawing logic
function GameBoard() {
  // 1. Create a ref. This is React's way of getting a direct reference to a DOM element.
  const canvasRef = useRef(null);

  // 2. Use the useEffect hook. This hook runs code *after* the component renders to the screen.
  // This is the perfect place for code that needs to interact with the DOM, like drawing on a canvas.
  // The empty array [] at the end means this effect will only run once, similar to the original script.
  useEffect(() => {
    // --- Canvas Setup ---
    // Inside the effect, we can safely access the canvas element via the ref's "current" property.
    const canvas = canvasRef.current;
    if (!canvas) return; // Exit if the canvas isn't ready yet

    const ctx = canvas.getContext('2d');
    const size = canvas.width; // The canvas is square
    const lineSpacing = size / 3; // Space between each line is 1/3 of the total size

    // --- Draw Grid Lines ---
    // This drawing logic is exactly the same as your original script!
    ctx.beginPath();
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas before drawing

    // Draw Vertical Lines
    // Line 1: from (100, 0) to (100, 300)
    ctx.moveTo(lineSpacing, 0);
    ctx.lineTo(lineSpacing, size);

    // Line 2: from (200, 0) to (200, 300)
    ctx.moveTo(lineSpacing * 2, 0);
    ctx.lineTo(lineSpacing * 2, size);

    // Draw Horizontal Lines
    // Line 1: from (0, 100) to (300, 100)
    ctx.moveTo(0, lineSpacing);
    ctx.lineTo(size, lineSpacing);

    // Line 2: from (0, 200) to (300, 200)
    ctx.moveTo(0, lineSpacing * 2);
    ctx.lineTo(size, lineSpacing * 2);

    // Render all the lines on the canvas
    ctx.stroke();

  }, []); // The empty dependency array ensures this effect runs only once after initial render.

  // 3. Return the JSX. This is what React will render to the screen.
  // Notice the `ref={canvasRef}` which connects our ref to the canvas element.
  return (
    <>
      <h1>Ox Game</h1>
      {/* A single canvas element for the entire game board. */}
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

