import React, { useRef, useEffect, useState } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';

// --- Global Variables Provided by the Environment ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// --- Helper Functions (from original code) ---
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

function calculateWinner(board, gridSize) {
    if (!board) return null;

    // Check rows
    for (let i = 0; i < gridSize; i++) {
        const row = board[i];
        if (row && row[0] && row.every(cell => cell === row[0])) {
            return row[0];
        }
    }

    // Check columns
    for (let i = 0; i < gridSize; i++) {
        const col = board.map(row => row[i]);
        if (col[0] && col.every(cell => cell === col[0])) {
            return col[0];
        }
    }

    // Check diagonal (top-left to bottom-right)
    const diag1 = board.map((row, i) => row[i]);
    if (diag1[0] && diag1.every(cell => cell === diag1[0])) {
        return diag1[0];
    }

    // Check diagonal (top-right to bottom-left)
    const diag2 = board.map((row, i) => row[gridSize - 1 - i]);
    if (diag2[0] && diag2.every(cell => cell === diag2[0])) {
        return diag2[0];
    }

    return null;
}

// --- Main App Component ---
export default function App() {
    // State to manage game-related data
    const canvasRef = useRef(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [error, setError] = useState('');
    const [notification, setNotification] = useState('');

    // Game Lobby State
    const [gameId, setGameId] = useState('');
    const [gameIdInput, setGameIdInput] = useState('');

    // Game State (synced from Firestore)
    const [gameState, setGameState] = useState(null);
    const { board, gridSize, turn, winner, playerX, playerO, isDraw } = gameState || {};

    // Firestore and Auth instances
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);

    // Derived state for the current player
    const playerSymbol = userId === playerX ? 'X' : (userId === playerO ? 'O' : null);
    const isMyTurn = gameState && !winner && !isDraw && ((turn % 2 === 1 && playerSymbol === 'X') || (turn % 2 === 0 && playerSymbol === 'O'));
    const canvasSize = gridSize ? gridSize * 100 : 300;

    // --- Firebase Initialization and Authentication Effect ---
    useEffect(() => {
        try {
            const firebaseApp = initializeApp(firebaseConfig);
            const authInstance = getAuth(firebaseApp);
            const dbInstance = getFirestore(firebaseApp);
            setAuth(authInstance);
            setDb(dbInstance);

            const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
                if (user) {
                    setUserId(user.uid);
                } else {
                    try {
                        if (initialAuthToken) {
                            await signInWithCustomToken(authInstance, initialAuthToken);
                        } else {
                            await signInAnonymously(authInstance);
                        }
                    } catch (err) {
                        console.error("Authentication failed:", err);
                        setError("Could not connect to the game service.");
                    }
                }
                setIsAuthReady(true);
            });
            return () => unsubscribe();
        } catch (err) {
            console.error("Firebase initialization failed:", err);
            setError("Could not initialize the game service.");
        }
    }, []);

    // --- Firestore Game State Sync Effect ---
    useEffect(() => {
        if (!gameId || !isAuthReady || !db) return;

        const gameDocRef = doc(db, `/artifacts/${appId}/public/data/tictactoe/${gameId}`);
        const unsubscribe = onSnapshot(gameDocRef, (docSnap) => {
            if (docSnap.exists()) {
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

        return () => unsubscribe(); // Cleanup listener on unmount or gameId change
    }, [gameId, isAuthReady, db]);

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
    }, [gameState, gridSize]);

    // --- Game Actions ---
    const handleCreateOrJoinGame = async () => {
        if (!gameIdInput.trim() || !userId || !db) {
            setError("Please enter a Game ID.");
            return;
        }
        setError('');
        setNotification('');
        const newGameId = gameIdInput.trim();
        const gameDocRef = doc(db, `/artifacts/${appId}/public/data/tictactoe/${newGameId}`);

        try {
            const docSnap = await getDoc(gameDocRef);

            if (docSnap.exists()) {
                // Game exists, try to join
                const gameData = docSnap.data();
                if (gameData.playerO && gameData.playerO !== userId && gameData.playerX !== userId) {
                    setError("This game is already full.");
                    return;
                }
                if (!gameData.playerO && gameData.playerX !== userId) {
                    await updateDoc(gameDocRef, { playerO: userId });
                    setNotification("Joined game as Player O!");
                }
            } else {
                // Game doesn't exist, create it
                const initialBoard = Array.from({ length: 3 }, () => Array(3).fill(null));
                await setDoc(gameDocRef, {
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
        } catch (err) {
            console.error("Error creating/joining game:", err);
            setError("Failed to create or join the game.");
        }
    };

    const handleCanvasClick = async (event) => {
        if (!isMyTurn || !db) return;

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

        const gameDocRef = doc(db, `/artifacts/${appId}/public/data/tictactoe/${gameId}`);
        await updateDoc(gameDocRef, {
            board: newBoard,
            turn: newTurn,
            winner: newWinner,
            isDraw: newIsDraw,
        });
    };

    const handleGameReset = async (newSize) => {
        if (!gameId || !db) return;
        const newBoard = Array.from({ length: newSize }, () => Array(newSize).fill(null));
        const gameDocRef = doc(db, `/artifacts/${appId}/public/data/tictactoe/${gameId}`);
        await updateDoc(gameDocRef, {
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

    // --- Main Render Logic ---
    if (!isAuthReady) {
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
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateOrJoinGame()}
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
                    {playerX && <p>Player X ID: <span className="break-all text-gray-700">{playerX}</span></p>}
                    {playerO && <p>Player O ID: <span className="break-all text-gray-700">{playerO}</span></p>}
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
