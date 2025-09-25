import React, { useRef, useEffect, useState } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

// --- Global Variables & Firebase Config ---
//
// !!!!!!!!!!!!!!!!!!!!!!!!!!! IMPORTANT !!!!!!!!!!!!!!!!!!!!!!!!!!!
// YOU MUST REPLACE THESE PLACEHOLDER VALUES WITH YOUR ACTUAL
// FIREBASE PROJECT CONFIGURATION. YOU CAN FIND THIS IN YOUR
// FIREBASE CONSOLE > PROJECT SETTINGS > GENERAL > YOUR APPS.
// THE APP WILL NOT WORK IF YOU DO NOT DO THIS.
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
//
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
     apiKey: "AIzaSyA-ezETUvJsjdcceG-3WpQK2NuXZQLGFmw",
  authDomain: "tic-tac-toe-online-955d0.firebaseapp.com",
  projectId: "tic-tac-toe-online-955d0",
  storageBucket: "tic-tac-toe-online-955d0.firebasestorage.app",
  messagingSenderId: "61466632785",
  appId: "1:61466632785:web:e90047573f2c3bbf328e70",
  measurementId: "G-8WECGZY7RW"
};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// --- Helper Functions ---
function drawX(ctx, row, col, lineSpacing) {
    ctx.strokeStyle = '#38bdf8'; // Light Blue
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
    ctx.closePath();
}

function drawO(ctx, row, col, lineSpacing) {
    ctx.strokeStyle = '#fb923c'; // Orange
    ctx.lineWidth = 8;
    ctx.beginPath();
    const x = col * lineSpacing + lineSpacing / 2;
    const y = row * lineSpacing + lineSpacing / 2;
    ctx.arc(x, y, lineSpacing / 2.5, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.closePath();
}

// --- Child Components ---

const Lobby = ({ handleCreateGame, handleJoinGame, inputGameId, setInputGameId, loading, disabled }) => (
    <div className="space-y-4 animate-fade-in">
        <button
            onClick={handleCreateGame}
            disabled={loading || disabled}
            className="w-full bg-sky-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-sky-600 transition transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:scale-100"
        >
            {loading ? 'Creating...' : 'Create New Game'}
        </button>
        <div className="flex items-center space-x-2">
            <hr className="flex-grow border-gray-600"/>
            <span className="text-gray-500 font-bold">OR</span>
            <hr className="flex-grow border-gray-600"/>
        </div>
        <div className="flex space-x-2">
             <input
                type="text"
                value={inputGameId}
                onChange={(e) => setInputGameId(e.target.value.trim())}
                placeholder="Enter Game ID"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-white"
            />
            <button
                onClick={handleJoinGame}
                disabled={loading || disabled || !inputGameId}
                className="bg-emerald-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-emerald-600 transition transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:scale-100"
            >
                Join
            </button>
        </div>
    </div>
);

const GameComponent = ({ gameId, gameData, userId, functions, setNotification, setError }) => {
    const canvasRef = useRef(null);
    const canvasSize = 400;
    const boardSize = gameData?.board ? Math.sqrt(gameData.board.length) : 3;
    const isHost = gameData?.playerX === userId;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !gameData) return;
        const ctx = canvas.getContext('2d');
        const lineSpacing = canvasSize / boardSize;

        ctx.clearRect(0, 0, canvasSize, canvasSize);
        ctx.strokeStyle = '#4b5563'; // Gray for grid
        ctx.lineWidth = 4;
        for (let i = 1; i < boardSize; i++) {
            ctx.beginPath();
            ctx.moveTo(i * lineSpacing, 0);
            ctx.lineTo(i * lineSpacing, canvasSize);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, i * lineSpacing);
            ctx.lineTo(canvasSize, i * lineSpacing);
            ctx.stroke();
        }

        gameData.board.forEach((mark, index) => {
            const row = Math.floor(index / boardSize);
            const col = index % boardSize;
            if (mark === 'X') drawX(ctx, row, col, lineSpacing);
            else if (mark === 'O') drawO(ctx, row, col, lineSpacing);
        });
    }, [gameData, boardSize]);

    const handleCanvasClick = async (event) => {
        if (!functions || gameData.status !== 'active') return;
        const myTurn = (gameData.turn === 'X' && gameData.playerX === userId) ||
                       (gameData.turn === 'O' && gameData.playerO === userId);
        if (!myTurn) return;

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const lineSpacing = canvasSize / boardSize;
        const col = Math.floor(x / lineSpacing);
        const row = Math.floor(y / lineSpacing);
        const index = row * boardSize + col;

        if (gameData.board[index] !== null) return;

        try {
            const makeMoveFunc = httpsCallable(functions, 'makeMove');
            await makeMoveFunc({ gameId, index, userId });
        } catch (err) {
            console.error(err);
            setError(err.message);
        }
    };
    
    const handleResetGame = async () => {
        if (!functions || !isHost) {
            setNotification("Only the host (Player X) can reset the game.");
            return;
        }
        try {
            const resetGameFunc = httpsCallable(functions, 'resetGame');
            await resetGameFunc({ gameId, userId });
            setNotification("Game has been reset!");
        } catch (err) {
            console.error(err);
            setError(err.message);
        }
    };

    const getStatusMessage = () => {
        const myMark = isHost ? 'X' : 'O';
        if (gameData.status === 'waiting') return 'Waiting for an opponent...';
        if (gameData.status === 'finished') {
            if (gameData.winner && gameData.winner !== 'draw') {
                return gameData.winner === myMark ? "🎉 You Win! 🎉" : "😢 Opponent Wins! 😢";
            }
            return "🤝 It's a Draw! 🤝";
        }
        if (gameData.status === 'active') {
            const isMyTurn = (gameData.turn === 'X' && isHost) || (gameData.turn === 'O' && !isHost);
            return isMyTurn ? `Your Turn (${myMark})` : `Opponent's Turn (${gameData.turn})`;
        }
        return '';
    };

    const isMyTurn = gameData.status === 'active' && ((gameData.turn === 'X' && isHost) || (gameData.turn === 'O' && !isHost));

    return (
        <div className="mt-6 animate-fade-in">
            <div className="flex justify-between items-center bg-gray-700 p-2 rounded-lg mb-4">
                <span className="text-sm font-semibold text-gray-300">Game ID: <span className="text-yellow-400">{gameId}</span></span>
                <button 
                    onClick={() => { navigator.clipboard.writeText(gameId); setNotification('Game ID Copied!'); }}
                    className="text-xs bg-gray-600 hover:bg-gray-500 text-white font-bold py-1 px-2 rounded-md transition"
                >Copy ID</button>
            </div>

            <div className="text-xl font-bold text-sky-400 my-4 h-8 transition-all">{getStatusMessage()}</div>

            <div className="relative">
                <canvas
                    ref={canvasRef}
                    width={canvasSize}
                    height={canvasSize}
                    className={`bg-gray-900/50 rounded-lg shadow-inner mx-auto transition-all duration-300 ${isMyTurn ? 'ring-2 ring-sky-400 ring-offset-4 ring-offset-gray-800' : 'opacity-70'}`}
                    onClick={handleCanvasClick}
                    style={{ cursor: isMyTurn ? 'pointer' : 'not-allowed' }}
                />
                 {gameData.status === 'finished' && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col justify-center items-center rounded-lg animate-fade-in">
                         <div className="text-4xl font-extrabold text-white mb-6">{getStatusMessage().replace('🎉', '').replace('😢', '').replace('🤝', '')}</div>
                         <div className="flex space-x-4">
                            {isHost && <button onClick={handleResetGame} className="bg-sky-500 text-white font-bold py-2 px-5 rounded-lg hover:bg-sky-600 transition">Play Again</button>}
                            <button onClick={() => window.location.reload()} className="bg-gray-600 text-white font-bold py-2 px-5 rounded-lg hover:bg-gray-700 transition">Leave Game</button>
                         </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Main App Component ---
export default function App() {
    const [functions, setFunctions] = useState(null);
    const [db, setDb] = useState(null);
    const [userId, setUserId] = useState(null);
    const [gameId, setGameId] = useState('');
    const [gameData, setGameData] = useState(null);
    const [inputGameId, setInputGameId] = useState('');
    const [error, setError] = useState(null);
    const [notification, setNotification] = useState('');
    const [loading, setLoading] = useState(false);
    
    // --- Firebase Initialization & Auth ---
    useEffect(() => {
        try {
            if (firebaseConfig.apiKey.startsWith("YOUR_")) {
                setError("Firebase config is not set. Please update App.jsx with your project details.");
                return;
            }

            const app = initializeApp(firebaseConfig);
            const authInstance = getAuth(app);
            const functionsInstance = getFunctions(app);
            const dbInstance = getFirestore(app);
            
            setFunctions(functionsInstance);
            setDb(dbInstance);

            onAuthStateChanged(authInstance, async (user) => {
                if (user) {
                    setUserId(user.uid);
                } else if (initialAuthToken) {
                    try { await signInWithCustomToken(authInstance, initialAuthToken); }
                    catch (e) { await signInAnonymously(authInstance); }
                } else {
                    await signInAnonymously(authInstance);
                }
            });
        } catch (err) {
            setError('Could not initialize Firebase.');
            console.error(err);
        }
    }, []);
    
    // --- Real-time Game Data Listener ---
    useEffect(() => {
        if (!gameId || !db) {
            setGameData(null);
            return;
        }
        
        const gameRef = doc(db, 'games', gameId);
        const unsubscribe = onSnapshot(gameRef, (doc) => {
            if (doc.exists()) {
                setGameData(doc.data());
                setError(null);
            } else {
                setNotification('Game not found or has been deleted.');
                setGameData(null);
                setGameId('');
            }
        }, (err) => {
            setError('Failed to load game data.');
        });
        return () => unsubscribe();
    }, [gameId, db]);

    // --- Notification timeout ---
    useEffect(() => {
        if(notification) {
            const timer = setTimeout(() => setNotification(''), 3000);
            return () => clearTimeout(timer);
        }
    }, [notification])


    // --- Cloud Function Handlers ---
    const handleCreateGame = async () => {
        if (!functions || !userId) {
            setError("Cannot create game: User ID is not available yet.");
            return;
        };
        setLoading(true);
        setError(null);
        try {
            const createGameFunc = httpsCallable(functions, 'createGame');
            // FIX: Explicitly send the userId in the payload
            const result = await createGameFunc({ userId: userId }); 
            setGameId(result.data.gameId);
        } catch (err) { setError(err.message); }
        setLoading(false);
    };

    const handleJoinGame = async () => {
        if (!functions || !userId || !inputGameId) return;
        setLoading(true);
        setError(null);
        try {
            const joinGameFunc = httpsCallable(functions, 'joinGame');
            // FIX: Explicitly send the userId in the payload
            await joinGameFunc({ gameId: inputGameId, userId: userId });
            setGameId(inputGameId);
        } catch (err) { setError(err.message); }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col justify-center items-center p-4 font-sans antialiased">
            <div className="w-full max-w-sm bg-gray-800 rounded-2xl shadow-2xl p-6 text-center">
                <h1 className="text-4xl font-bold text-white mb-2">Tic-Tac-Toe</h1>
                <p className="text-gray-400 mb-6">Built with Firebase</p>
                
                {(!userId) ? <div className="text-yellow-400 animate-pulse mb-4">Connecting...</div> : (
                    !gameId ? (
                        <Lobby 
                            handleCreateGame={handleCreateGame}
                            handleJoinGame={handleJoinGame}
                            inputGameId={inputGameId}
                            setInputGameId={setInputGameId}
                            loading={loading}
                            disabled={!userId}
                        />
                    ) : gameData ? (
                        <GameComponent 
                            gameId={gameId}
                            gameData={gameData}
                            userId={userId}
                            functions={functions}
                            setNotification={setNotification}
                            setError={setError}
                        />
                    ) : (
                        <div className="text-sky-400 animate-pulse my-8">Loading Game...</div>
                    )
                )}

                 {error && <p className="text-red-400 mt-4 text-sm bg-red-900/50 p-2 rounded-md">{error}</p>}
                 {notification && <p className="text-green-400 mt-4 text-sm bg-green-900/50 p-2 rounded-md">{notification}</p>}
            </div>
             <footer className="text-xs text-gray-600 mt-4">Your User ID: {userId || '...'}</footer>
        </div>
    );
}

