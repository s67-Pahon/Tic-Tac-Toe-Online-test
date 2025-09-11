import React, { useRef, useEffect, useState } from 'react';

// --- Firebase Configuration ---
// These global variables are provided by the environment.
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// --- Drawing Functions (from original code) ---
function drawX(ctx, row, col, lineSpacing) {
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 8;
    const x = col * lineSpacing;
    const y = row * lineSpacing;
    const padding = lineSpacing / 5;
    ctx.beginPath();
    ctx.moveTo(x + padding, y + padding);
    ctx.lineTo(x + lineSpacing - padding, y + lineSpacing - padding);
    ctx.moveTo(x + lineSpacing - padding, y + padding);
    ctx.lineTo(x + padding, y + lineSpacing - padding);
    ctx.stroke();
}

function drawO(ctx, row, col, lineSpacing) {
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 8;
    const centerX = col * lineSpacing + lineSpacing / 2;
    const centerY = row * lineSpacing + lineSpacing / 2;
    const padding = lineSpacing / 5;
    const radius = lineSpacing / 2 - padding;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.stroke();
}

// --- Winner Calculation (from original code) ---
function calculateWinner(board, gridSize) {
    if (!board) return null;
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
                if (!board[j] || board[j][i] !== board[0][i]) {
                    isWin = false;
                    break;
                }
            }
            if (isWin) return board[0][i];
        }
    }

    // Check diagonal (top-left to bottom-right)
    if (board[0] && board[0][0]) {
        let isWin = true;
        for (let i = 1; i < gridSize; i++) {
            if (!board[i] || board[i][i] !== board[0][0]) {
                isWin = false;
                break;
            }
        }
        if (isWin) return board[0][0];
    }

    // Check diagonal (top-right to bottom-left)
    if (board[0] && board[0][gridSize - 1]) {
        let isWin = true;
        for (let i = 1; i < gridSize; i++) {
            if (!board[i] || board[i][gridSize - 1 - i] !== board[0][gridSize - 1]) {
                isWin = false;
                break;
            }
        }
        if (isWin) return board[0][gridSize - 1];
    }

    return null;
}


// --- Main Game Component ---
function TicTacToeGame() {
    const canvasRef = useRef(null);
    const [userId, setUserId] = useState(null);
    const [error, setError] = useState('');
    const [notification, setNotification] = useState('');

    // Game Lobby State
    const [gameId, setGameId] = useState('');
    const [gameIdInput, setGameIdInput] = useState('');

    // Game State (synced from Firestore)
    const [gameState, setGameState] = useState(null);
    const { board, gridSize, turn, winner, playerX, playerO, isDraw } = gameState || {};
    
    // Get Firebase services from the global window object
    const auth = window.firebase.auth();
    const db = window.firebase.firestore();

    const canvasSize = gridSize ? gridSize * 100 : 300;
    const playerSymbol = userId === playerX ? 'X' : (userId === playerO ? 'O' : null);
    const isMyTurn = gameState && !winner && !isDraw && ((turn % 2 === 1 && playerSymbol === 'X') || (turn % 2 === 0 && playerSymbol === 'O'));

    // --- Authentication Effect ---
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                setUserId(user.uid);
            } else {
                try {
                    if (initialAuthToken) {
                        await auth.signInWithCustomToken(initialAuthToken);
                    } else {
                        await auth.signInAnonymously();
                    }
                } catch (err) {
                    console.error("Authentication failed:", err);
                    setError("Could not connect to the game service.");
                }
            }
        });
        return () => unsubscribe();
    }, [auth]);

    // --- Firestore Game State Sync Effect ---
    useEffect(() => {
        if (!gameId) return;

        const gameDocRef = db.doc(`/artifacts/${appId}/public/data/tictactoe/${gameId}`);
        const unsubscribe = gameDocRef.onSnapshot((docSnap) => {
            if (docSnap.exists) {
                setGameState(docSnap.data());
            } else {
                setError("Game not found. It might have been deleted.");
                setGameId('');
                setGameState(null);
            }
        }, (err) => {
            console.error("Firestore snapshot error:", err);
            setError("Lost connection to the game.");
        });

        return () => unsubscribe(); // Cleanup listener
    }, [gameId, db]);


    // --- Canvas Drawing Effect ---
    useEffect(() => {
        if (!gameState) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const lineSpacing = canvas.width / gridSize;

        // Clear and draw grid
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath();
        ctx.strokeStyle = '#bdc3c7';
        ctx.lineWidth = 2;
        for (let i = 1; i < gridSize; i++) {
            ctx.moveTo(lineSpacing * i, 0);
            ctx.lineTo(lineSpacing * i, canvas.height);
            ctx.moveTo(0, lineSpacing * i);
            ctx.lineTo(canvas.width, lineSpacing * i);
        }
        ctx.stroke();

        // Draw X's and O's
        board.forEach((row, rowIndex) => {
            row.forEach((cell, colIndex) => {
                if (cell === 'X') {
                    drawX(ctx, rowIndex, colIndex, lineSpacing);
                } else if (cell === 'O') {
                    drawO(ctx, rowIndex, colIndex, lineSpacing);
                }
            });
        });
    }, [gameState]);


    // --- Game Actions ---
    const handleCreateOrJoinGame = async () => {
        if (!gameIdInput.trim() || !userId) {
            setError("Please enter a Game ID.");
            return;
        }
        setError('');
        setNotification('');
        const newGameId = gameIdInput.trim();
        const gameDocRef = db.doc(`/artifacts/${appId}/public/data/tictactoe/${newGameId}`);
        
        try {
            const docSnap = await gameDocRef.get();

            if (docSnap.exists) {
                // Game exists, try to join
                const gameData = docSnap.data();
                if (gameData.playerO && gameData.playerO !== userId && gameData.playerX !== userId) {
                    setError("This game is already full.");
                    return;
                }
                if (!gameData.playerO && gameData.playerX !== userId) {
                    await gameDocRef.update({ playerO: userId });
                    setNotification("Joined game as Player O!");
                }
            } else {
                // Game doesn't exist, create it
                const initialBoard = Array.from({ length: 3 }, () => Array(3).fill(null));
                await gameDocRef.set({
                    board: initialBoard,
                    gridSize: 3,
                    turn: 1,
                    winner: null,
                    isDraw: false,
                    playerX: userId,
                    playerO: null,
                });
                setNotification("Game created! Waiting for Player O to join.");
            }
            setGameId(newGameId);
        } catch(err) {
            console.error("Error creating/joining game:", err);
            setError("Failed to create or join the game.");
        }
    };
    
    const handleCanvasClick = async (event) => {
        if (!isMyTurn) return;

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const lineSpacing = canvas.width / gridSize;
        const col = Math.floor(x / lineSpacing);
        const row = Math.floor(y / lineSpacing);

        if (board[row][col]) return; // Cell already taken

        const newBoard = board.map(arr => [...arr]);
        newBoard[row][col] = playerSymbol;
        
        const newWinner = calculateWinner(newBoard, gridSize);
        const newTurn = turn + 1;
        const newIsDraw = !newWinner && newTurn > gridSize * gridSize;

        const gameDocRef = db.doc(`/artifacts/${appId}/public/data/tictactoe/${gameId}`);
        await gameDocRef.update({
            board: newBoard,
            turn: newTurn,
            winner: newWinner,
            isDraw: newIsDraw,
        });
    };

    const handleGameReset = async (newSize) => {
        if (!gameId) return;
        const newBoard = Array.from({ length: newSize }, () => Array(newSize).fill(null));
        const gameDocRef = db.doc(`/artifacts/${appId}/public/data/tictactoe/${gameId}`);
        await gameDocRef.update({
            board: newBoard,
            gridSize: newSize,
            turn: 1,
            winner: null,
            isDraw: false,
        });
    };

    // --- Status Message Logic ---
    const getStatusMessage = () => {
        if (!gameState) return "Welcome to Tic-Tac-Toe!";
        if (winner) {
             return winner === playerSymbol ? `You win!` : `Player ${winner} wins!`;
        }
        if (isDraw) return "It's a Draw!";
        if (!playerO) return "Waiting for opponent to join...";
        return isMyTurn ? `Your turn (${playerSymbol})` : `Opponent's turn (${playerSymbol === 'X' ? 'O' : 'X'})`;
    };

    // --- Main Render ---
    if (!userId) {
        return <div className="flex justify-center items-center h-screen bg-gray-100 text-gray-700">Connecting...</div>;
    }

    if (!gameId) {
        return (
            <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4 font-sans">
                <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 text-center">
                    <h1 className="text-4xl font-bold text-gray-800 mb-2">Online Tic-Tac-Toe</h1>
                    <p className="text-gray-600 mb-6">Create a new game or join an existing one.</p>
                    <div className="mb-4">
                        <input
                            type="text"
                            value={gameIdInput}
                            onChange={(e) => setGameIdInput(e.target.value)}
                            placeholder="Enter a Game ID"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <button
                        onClick={handleCreateOrJoinGame}
                        className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition duration-300 ease-in-out transform hover:scale-105 shadow-md"
                    >
                        Create / Join Game
                    </button>
                    {error && <p className="text-red-500 mt-4">{error}</p>}
                    <div className="mt-6 text-sm text-gray-500">
                      <p className="font-semibold">Your User ID:</p>
                      <p className="break-all">{userId}</p>
                    </div>
                </div>
            </div>
        );
    }
    
    return (
        <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4 font-sans text-center">
             <div className="w-full max-w-lg bg-white rounded-xl shadow-lg p-6">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Tic Tac Toe</h1>
                <div className="text-sm text-gray-500 mb-4">
                  <p>Game ID: <strong className="text-gray-700">{gameId}</strong></p>
                  <p>Your Symbol: <strong className="text-2xl">{playerSymbol}</strong></p>
                </div>

                <div className="mb-4 space-x-2">
                    <button onClick={() => handleGameReset(3)} className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition">3x3</button>
                    <button onClick={() => handleGameReset(4)} className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition">4x4</button>
                    <button onClick={() => handleGameReset(5)} className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition">5x5</button>
                </div>

                <h2 className="text-2xl font-semibold text-indigo-600 my-4 h-8">{getStatusMessage()}</h2>
                
                <div className="relative">
                    <canvas
                        ref={canvasRef}
                        width={canvasSize}
                        height={canvasSize}
                        className={`rounded-lg shadow-md transition-opacity duration-300 ${isMyTurn ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}`}
                        onClick={handleCanvasClick}
                    />
                     {!isMyTurn && <div className="absolute top-0 left-0 w-full h-full bg-gray-500 bg-opacity-10 rounded-lg"></div>}
                </div>

                {notification && <p className="text-green-600 mt-4">{notification}</p>}
                {error && <p className="text-red-500 mt-4">{error}</p>}
            </div>
        </div>
    );
}

// --- New App component to load Firebase scripts ---
function App() {
    const [firebaseReady, setFirebaseReady] = useState(false);

    useEffect(() => {
        const loadScript = (src) => new Promise((resolve, reject) => {
            const existingScript = document.querySelector(`script[src="${src}"]`);
            if (existingScript) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });

        const initFirebase = async () => {
            try {
                // Load Firebase v8 compat libraries
                await loadScript("https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js");
                await loadScript("https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js");
                await loadScript("https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore.js");
                
                if (!window.firebase.apps.length) {
                    const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
                    window.firebase.initializeApp(firebaseConfig);
                }
                setFirebaseReady(true);
            } catch (error) {
                console.error("Firebase SDK loading failed:", error);
            }
        };

        initFirebase();
    }, []);

    if (!firebaseReady) {
        return <div className="flex justify-center items-center h-screen bg-gray-100 text-gray-700">Initializing Game Engine...</div>;
    }

    return <TicTacToeGame />;
}

export default App;

