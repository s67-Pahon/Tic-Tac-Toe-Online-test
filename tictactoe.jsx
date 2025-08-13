// Import React and some tools we need from the React library.
import React, { useRef, useEffect, useState } from 'react';

// This is the main container for our app. It just shows the GameBoard.
function App() {
  return (
    <div>
      <GameBoard />
    </div>
  );
}

// --- Helper Functions ---
// These functions do specific jobs for our main game component.

// This function knows how to draw an 'X' on the board.
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

// This function knows how to draw an 'O' on the board.
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
function calculateWinner(board) {
  // All the possible ways to win (3 rows, 3 columns, 2 diagonals).
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];

  // Check each winning line.
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    // If a line has three of the same symbols, we have a winner!
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a]; // Return 'X' or 'O'.
    }
  }
  return null; // If no winner is found, return nothing.
}


// #1: This is the main component for our game. It holds all the logic.
function GameBoard() {
  // We use a "ref" to get a direct link to our <canvas> element in the HTML.
  const canvasRef = useRef(null);
  
  // #2: These are the game's "memory" variables.
  // We use `useState` to create variables that React will remember.
  const [turn, setTurn] = useState(1); // Remembers whose turn it is.
  const [board, setBoard] = useState(Array(9).fill(null)); // Remembers what's in each square.
  const [winner, setWinner] = useState(null); // Remembers if someone has won.

  // This function draws the empty tic-tac-toe grid.
  const drawGrid = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Erase the canvas first.
    
    // Drawing logic for the grid lines.
    const size = canvas.width;
    const lineSpacing = size / 3;
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
  
  // #3: This special code runs only ONCE when the game first loads.
  // We use it to draw the initial empty grid.
  useEffect(() => {
    drawGrid();
  }, []);

  // #4: This function runs every time the user clicks on the game board.
  const handleCanvasClick = (event) => {
    // If the game is already won or over, do nothing.
    if (winner || turn > 9) return;
    
    // Figure out the exact (row, col) of the grid where the user clicked.
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const lineSpacing = canvas.width / 3;
    const col = Math.floor(x / lineSpacing);
    const row = Math.floor(y / lineSpacing);
    const index = row * 3 + col; // Convert (row, col) to a single number (0-8).

    // If the square is already taken, do nothing.
    if (board[index]) return; 

    // Decide if we should draw an 'X' or an 'O'.
    const currentPlayerSymbol = turn % 2 === 1 ? 'X' : 'O';
    const ctx = canvas.getContext('2d');
    if (currentPlayerSymbol === 'X') {
      drawX(ctx, row, col, lineSpacing);
    } else {
      drawO(ctx, row, col, lineSpacing);
    }

    // Update our game's "memory" with the new move.
    const newBoard = [...board];
    newBoard[index] = currentPlayerSymbol;
    setBoard(newBoard);

    // After the move, check if it caused a win.
    const newWinner = calculateWinner(newBoard);
    if (newWinner) {
      setWinner(newWinner); // Remember the winner.
    }

    // Go to the next turn.
    setTurn(turn + 1);
  };
  
  // #6: This function runs when the user clicks the "Reset" button.
  const handleReset = () => {
    // Set all our "memory" variables back to how they were at the start.
    setTurn(1);
    setBoard(Array(9).fill(null));
    setWinner(null);
    // Erase the board and draw a fresh grid.
    drawGrid();
  };

  // Figure out what message to show the user.
  let status;
  if (winner) {
    status = `Winner: Player ${winner}`;
  } else if (turn > 9) {
    status = "It's a Draw!";
  } else {
    status = `Turn ${turn}: Player ${turn % 2 === 1 ? 'X' : 'O'}`;
  }

  // #7: This is the HTML that our component shows on the screen.
  return (
    <>
      <h1>Ox Game</h1>
      <h2>{status}</h2>
      <canvas
        ref={canvasRef} // Link this to our canvasRef.
        width="300"
        height="300"
        style={{ border: '1px solid black' }}
        onClick={handleCanvasClick} // Run our click function when the canvas is clicked.
      ></canvas>
      <button id="reset-btn" onClick={handleReset} style={{marginTop: '10px'}}>
        Reset
      </button>
    </>
  );
}

// Make our App component available to be used by the rest of the application.
export default App;
