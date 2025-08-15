// We start by importing the 'React' library and some special tools from it.
// These tools are called "Hooks" and they let us add features like memory and
// lifecycle events to our components.
import React, { useRef, useEffect, useState } from 'react';

// #A: REACT COMPONENTS
// In React, we build user interfaces by creating "components". Think of them
// as custom, reusable HTML tags. This 'App' function is a component.
// Its only job is to display our main 'GameBoard' component.
function App() {
  return (
    <div>
      <GameBoard />
    </div>
  );
}

// --- Helper Functions ---
// These are regular JavaScript functions that do specific jobs for our game.

// This function knows how to draw an 'X'.
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

// This function knows how to draw an 'O'.
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

// #5: This function checks if a player has won.
// It no longer uses a hard-coded list of winning lines.
// #5: This function checks if a player has won.
// It now takes the grid size as an argument.
function calculateWinner(board, gridSize) {
  const size = gridSize; // Use the passed-in gridSize
  // Check rows for a win
  for (let i = 0; i < size; i++) {
    // Check if the first cell of the row is not empty
    if (board[i * size]) {
      let isWin = true;
      for (let j = 1; j < size; j++) {
        if (board[i * size] !== board[i * size + j]) {
          isWin = false;
          break;
        }
      }
      if (isWin) {
        return board[i * size];
      }
    }
  }

  // Check columns for a win
  for (let i = 0; i < size; i++) {
    // Check if the first cell of the column is not empty
    if (board[i]) {
      let isWin = true;
      for (let j = 1; j < size; j++) {
        if (board[i] !== board[i + j * size]) {
          isWin = false;
          break;
        }
      }
      if (isWin) {
        return board[i];
      }
    }
  }

  // Check diagonals for a win (top-left to bottom-right)
  if (board[0]) {
    let isWin = true;
    for (let i = 1; i < size; i++) {
      if (board[0] !== board[i * size + i]) {
        isWin = false;
        break;
      }
    }
    if (isWin) {
      return board[0];
    }
  }

  // Check diagonals for a win (top-right to bottom-left)
  if (board[size - 1]) {
    let isWin = true;
    for (let i = 1; i < size; i++) {
      if (board[size - 1] !== board[i * (size - 1) + (size - 1)]) {
        isWin = false;
        break;
      }
    }
    if (isWin) {
      return board[size - 1];
    }
  }

  // If no winner is found after all checks, return nothing.
  return null;
}


// #1: This is the main component for our game. It holds all the logic and visuals.
function GameBoard() {
  // #B: REFS
  // A "ref" gives us a direct link to a specific HTML element that React renders.
  // Here, we're creating a ref to link to our <canvas> element.
  const canvasRef = useRef(null);
  const [canvasSize , setCanvasSize] = useState(300);
  const canvasGrid = canvasSize/100;
  // #2 & #C: STATE
  // "State" is the memory of our component. We use the `useState` Hook to create
  // variables that React will remember and can change over time. When a state
  // variable changes, React automatically re-renders the component to show the update.
  const [turn, setTurn] = useState(1); // Remembers the current turn.
  const [board, setBoard] = useState(Array(9).fill(null)); // Remembers the game board.
  const [winner, setWinner] = useState(null); // Remembers the winner.

  // This function draws the empty tic-tac-toe grid on the canvas.
  const drawGrid = () => {
    // 1. Get our canvas element using the ref we created.
    const canvas = canvasRef.current;
    if (!canvas) return;
    // 2. Get the "2d context", which is the toolset for drawing shapes.
    const ctx = canvas.getContext('2d');
    // 3. Erase anything that was previously on the canvas to start fresh.
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 4. Begin drawing the lines.
    const size = canvasSize;
    const lineSpacing = size / 3;
    ctx.beginPath(); // Start a new path.
    ctx.strokeStyle = 'black'; // Set the line color.
    ctx.lineWidth = 2; // Set the line thickness.
    // Draw the two vertical lines.
    ctx.moveTo(lineSpacing, 0);
    ctx.lineTo(lineSpacing, size);
    ctx.moveTo(lineSpacing * 2, 0);
    ctx.lineTo(lineSpacing * 2, size);
    // Draw the two horizontal lines.
    ctx.moveTo(0, lineSpacing);
    ctx.lineTo(size, lineSpacing);
    ctx.moveTo(0, lineSpacing * 2);
    ctx.lineTo(size, lineSpacing * 2);
    // 5. Actually draw all the lines onto the canvas.
    ctx.stroke();
  };
  
  // #3 & #D: EFFECTS
  // The `useEffect` Hook lets us run code at specific moments in a component's life.
  // By passing an empty array `[]` at the end, we tell React to run this code
  // only ONCE, right after the component first appears on the screen.
  // This is perfect for setting up our initial empty grid.
  useEffect(() => {
    drawGrid();
  }, []);

  // #4: This function runs every time the user clicks on the game board.
  const handleCanvasClick = (event) => {
    if (winner || turn > 9) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const lineSpacing = canvas.width / 3;
    const col = Math.floor(x / lineSpacing);
    const row = Math.floor(y / lineSpacing);
    const index = row * 3 + col;

    if (board[index]) return; 

    const currentPlayerSymbol = turn % 2 === 1 ? 'X' : 'O';
    const ctx = canvas.getContext('2d');
    if (currentPlayerSymbol === 'X') {
      drawX(ctx, row, col, lineSpacing);
    } else {
      drawO(ctx, row, col, lineSpacing);
    }

    // When we update state, we create a new copy of the array.
    // This is important for telling React that something has changed.
    const newBoard = [...board];
    newBoard[index] = currentPlayerSymbol;
    setBoard(newBoard); // Update the board state, causing a re-render.

    const newWinner = calculateWinner(newBoard ,canvasGrid);
    if (newWinner) {
      setWinner(newWinner); // Update the winner state.
    }

    setTurn(turn + 1); // Update the turn state.
  };
  
  // #6: This function runs when the user clicks the "Reset" button.
  const handleReset = () => {
    // We reset all the state variables back to their original values.
    setTurn(1);
    setBoard(Array(9).fill(null));
    setWinner(null);
    // We also manually redraw the grid to clear the old X's and O's.
    drawGrid();
  };

  // Figure out what message to show the user based on the current state.
  let status;
  if (winner) {
    status = `Winner: Player ${winner}`;
  } else if (turn > 9) {
    status = "It's a Draw!";
  } else {
    status = `Turn ${turn}: Player ${turn % 2 === 1 ? 'X' : 'O'}`;
  }

  // #7 & #E: JSX
  // This looks like HTML, but it's actually "JSX". It's a syntax that lets us
  // write HTML-like code in our JavaScript. React turns this into real HTML
  // that the browser can understand. We can embed JavaScript variables right
  // inside it using curly braces {}.
  return (
    <>
      <h1>Tic Tac Toe</h1>
      <h2>{status}</h2>
      <canvas
        ref={canvasRef}
        width={canvasSize}
        height={canvasSize}
        style={{ border: '1px solid black' }}
        onClick={handleCanvasClick}
      ></canvas>
      <button id="reset-btn" onClick={handleReset} style={{marginTop: '10px'}}>
        Reset
      </button>
    </>
  );
}

// We "export" our main App component so it can be used by other parts of the project.
export default App;
