import React, { useRef, useEffect, useState } from 'react';

function App() {
  return (
    <div style={{ textAlign: 'center' }}>
      <GameBoard />
    </div>
  );
}

function drawX(ctx, row, col, lineSpacing) {
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 5;
  const x = col * lineSpacing;
  const y = row * lineSpacing;
  // Padding is now proportional to the cell size
  const padding = lineSpacing / 5;
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
  // The radius is now calculated based on proportional padding
  const padding = lineSpacing / 5;
  const radius = lineSpacing / 2 - padding;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
  ctx.stroke();
}

function calculateWinner(board, gridSize) {
  // Check rows
  for (let i = 0; i < gridSize; i++) {
    if (board[i][0] && board[i].every(cell => cell === board[i][0])) {
      return board[i][0];
    }
  }

  // Check columns
  for (let i = 0; i < gridSize; i++) {
    if (board[0][i]) {
      let isWin = true;
      for (let j = 1; j < gridSize; j++) {
        if (board[j][i] !== board[0][i]) {
          isWin = false;
          break;
        }
      }
      if (isWin) {
        return board[0][i];
      }
    }
  }

  // Check diagonal (top-left to bottom-right)
  if (board[0][0]) {
    let isWin = true;
    for (let i = 1; i < gridSize; i++) {
      if (board[i][i] !== board[0][0]) {
        isWin = false;
        break;
      }
    }
    if (isWin) {
      return board[0][0];
    }
  }

  // Check diagonal (top-right to bottom-left)
  if (board[0][gridSize - 1]) {
    let isWin = true;
    for (let i = 1; i < gridSize; i++) {
      if (board[i][gridSize - 1 - i] !== board[0][gridSize - 1]) {
        isWin = false;
        break;
      }
    }
    if (isWin) {
      return board[0][gridSize - 1];
    }
  }

  return null;
}

function GameBoard() {
  const canvasRef = useRef(null);
  // Grid size is now a fixed value.
  const [gridSize] = useState(3); 
  // Canvas size is derived from the fixed grid size.
  const [canvasSize] = useState(gridSize * 100); 

  const [turn, setTurn] = useState(1);
  const [board, setBoard] = useState(
    Array.from({ length: gridSize }, () => Array(gridSize).fill(null))
  );
  const [winner, setWinner] = useState(null);

  // This effect is now the single source of truth for drawing.
  // It runs whenever the board state changes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // 1. Clear the canvas and draw the grid lines
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const lineSpacing = canvas.width / gridSize;
    ctx.beginPath();
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    for (let i = 1; i < gridSize; i++) {
      ctx.moveTo(lineSpacing * i, 0);
      ctx.lineTo(lineSpacing * i, canvas.height);
      ctx.moveTo(0, lineSpacing * i);
      ctx.lineTo(canvas.width, lineSpacing * i);
    }
    ctx.stroke();

    // 2. Loop through the board state and draw all the symbols
    board.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        if (cell === 'X') {
          drawX(ctx, rowIndex, colIndex, lineSpacing);
        } else if (cell === 'O') {
          drawO(ctx, rowIndex, colIndex, lineSpacing);
        }
      });
    });
  }, [board, gridSize]); // Rerun this effect whenever the board changes

  const handleCanvasClick = (event) => {
    if (winner || turn > gridSize * gridSize) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const lineSpacing = canvas.width / gridSize;
    const col = Math.floor(x / lineSpacing);
    const row = Math.floor(y / lineSpacing);

    if (board[row][col]) return;

    // We no longer draw directly here. We only update the state.
    // The useEffect hook will handle all the drawing.
    const currentPlayerSymbol = turn % 2 === 1 ? 'X' : 'O';
    const newBoard = board.map(arr => [...arr]);
    newBoard[row][col] = currentPlayerSymbol;
    setBoard(newBoard);

    const newWinner = calculateWinner(newBoard, gridSize);
    if (newWinner) {
      setWinner(newWinner);
    }

    setTurn(turn + 1);
  };

  const handleReset = () => {
    setTurn(1);
    setBoard(Array.from({ length: gridSize }, () => Array(gridSize).fill(null)));
    setWinner(null);
  };

  let status;
  if (winner) {
    status = `Winner: Player ${winner}`;
  } else if (turn > gridSize * gridSize) {
    status = "It's a Draw!";
  } else {
    status = `Turn ${turn}: Player ${turn % 2 === 1 ? 'X' : 'O'}`;
  }

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
      <div>
        <button id="reset-btn" onClick={handleReset} style={{ marginTop: '10px' }}>
          Reset
        </button>
      </div>
    </>
  );
}

export default App;
