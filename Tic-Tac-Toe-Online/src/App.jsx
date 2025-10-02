import React, { useRef, useEffect, useState, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

// --- Global Variables & Firebase Config ---
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

// --- Shared Helpers (REUSED by both modes) ---
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

// Minimal, generic winner check used by Local Mode.
// Accepts a flat board (length n*n) with 'X'/'O'/null.
function checkWinnerGeneric(board) {
  const n = Math.sqrt(board.length) | 0;
  const line = (cells) => cells.every(c => c && c === cells[0]) ? cells[0] : null;

  // Rows / Cols
  for (let r = 0; r < n; r++) {
    const row = [];
    const col = [];
    for (let c = 0; c < n; c++) {
      row.push(board[r * n + c]);
      col.push(board[c * n + r]);
    }
    const rw = line(row);
    if (rw) return rw;
    const cw = line(col);
    if (cw) return cw;
  }
  // Diagonals
  const d1 = [], d2 = [];
  for (let i = 0; i < n; i++) {
    d1.push(board[i * n + i]);
    d2.push(board[i * n + (n - 1 - i)]);
  }
  const w1 = line(d1);
  if (w1) return w1;
  const w2 = line(d2);
  if (w2) return w2;

  return null;
}

// --- Local Mode: tiny in-file engine (STATE ONLY) ---
// It mirrors the online gameData shape so <GameComponent/> can be reused.
function useLocalGame(initialSize = 3) {
  const makeEmpty = (n) => Array(n * n).fill(null);
  const [boardSize, setBoardSize] = useState(initialSize);
  const [board, setBoard] = useState(makeEmpty(initialSize));
  const [turn, setTurn] = useState('X');
  const [status, setStatus] = useState('active'); // 'active' | 'finished'
  const [winner, setWinner] = useState(null); // 'X' | 'O' | 'draw' | null

  const gameData = useMemo(() => ({
    board,
    turn,
    status,
    winner,
    playerX: 'local-X',
    playerO: 'local-O'
  }), [board, turn, status, winner]);

  const setSize = (n) => {
    setBoardSize(n);
    setBoard(makeEmpty(n));
    setTurn('X');
    setStatus('active');
    setWinner(null);
  };

  const resetGame = () => {
    setBoard(makeEmpty(boardSize));
    setTurn('X');
    setStatus('active');
    setWinner(null);
  };

  const makeMove = (index) => {
    if (status !== 'active' || board[index]) return;

    const next = board.slice();
    next[index] = turn;
    const w = checkWinnerGeneric(next);
    if (w) {
      setBoard(next);
      setWinner(w);
      setStatus('finished');
      return;
    }
    if (next.every(Boolean)) {
      setBoard(next);
      setWinner('draw');
      setStatus('finished');
      return;
    }
    setBoard(next);
    setTurn(turn === 'X' ? 'O' : 'X');
  };

  return {
    boardSize,
    setSize,
    gameData,
    makeMove,
    resetGame
  };
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

// REUSABLE: Same canvas/UI for both modes. We only branch inside small handlers.
const GameComponent = ({
  mode,                 // 'online' | 'local'
  gameId,               // online only
  gameData,             // shared shape for both modes
  userId,               // online only
  functions,            // online only
  setNotification,
  setError,
  isHost,               // online only; for local we’ll pass true
  onLocalMove,          // local: (index) => void
  onLocalReset          // local: () => void
}) => {
  const canvasRef = useRef(null);
  const canvasSize = 400;
  const boardSize = gameData?.board ? Math.sqrt(gameData.board.length) : 3;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !gameData) return;
    const ctx = canvas.getContext('2d');
    const lineSpacing = canvasSize / boardSize;

    ctx.clearRect(0, 0, canvasSize, canvasSize);
    ctx.strokeStyle = '#4b5563'; // grid
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
    if (!gameData || gameData.status !== 'active') return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const lineSpacing = canvasSize / boardSize;
    const col = Math.floor(x / lineSpacing);
    const row = Math.floor(y / lineSpacing);
    const index = row * boardSize + col;

    if (gameData.board[index] !== null) return;

    if (mode === 'local') {
      onLocalMove?.(index);
      return;
    }

    // online
    const myTurn = (gameData.turn === 'X' && gameData.playerX === userId) ||
                   (gameData.turn === 'O' && gameData.playerO === userId);
    if (!myTurn) return;

    try {
      const makeMoveFunc = httpsCallable(functions, 'makeMove');
      await makeMoveFunc({ gameId, index, userId });
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  const handleResetGame = async () => {
    if (mode === 'local') {
      onLocalReset?.();
      setNotification?.("Game has been reset!");
      return;
    }
    // online
    if (!functions || !isHost) {
      setNotification?.("Only the host (Player X) can reset the game.");
      return;
    }
    try {
      const resetGameFunc = httpsCallable(functions, 'resetGame');
      await resetGameFunc({ gameId, userId });
      setNotification?.("Game has been reset!");
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  const getStatusMessage = () => {
    if (!gameData) return '';
    if (gameData.status === 'waiting') return 'Waiting for an opponent...';

    if (gameData.status === 'finished') {
      if (gameData.winner && gameData.winner !== 'draw') {
        if (mode === 'local') return `${gameData.winner} Wins!`;
        const myMark = isHost ? 'X' : 'O';
        return gameData.winner === myMark ? "🎉 You Win! 🎉" : "😢 Opponent Wins! 😢";
      }
      return "🤝 It's a Draw! 🤝";
    }

    // active
    if (mode === 'local') {
      return `Turn: ${gameData.turn}`;
    } else {
      const myMark = isHost ? 'X' : 'O';
      const isMyTurn = (gameData.turn === 'X' && isHost) || (gameData.turn === 'O' && !isHost);
      return isMyTurn ? `Your Turn (${myMark})` : `Opponent's Turn (${gameData.turn})`;
    }
  };

  const isMyTurn =
    mode === 'local'
      ? gameData.status === 'active'
      : (gameData.status === 'active' &&
         ((gameData.turn === 'X' && isHost) || (gameData.turn === 'O' && !isHost)));

  return (
    <div className="mt-6 animate-fade-in">
      {mode === 'online' && (
        <div className="flex justify-between items-center bg-gray-700 p-2 rounded-lg mb-4">
          <span className="text-sm font-semibold text-gray-300">
            Game ID: <span className="text-yellow-400">{gameId}</span>
          </span>
          <button
            onClick={() => { navigator.clipboard.writeText(gameId); setNotification?.('Game ID Copied!'); }}
            className="text-xs bg-gray-600 hover:bg-gray-500 text-white font-bold py-1 px-2 rounded-md transition"
          >
            Copy ID
          </button>
        </div>
      )}

      <div className="text-xl font-bold text-sky-400 my-4 h-8 transition-all">{getStatusMessage()}</div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={400}
          height={400}
          className={`bg-gray-900/50 rounded-lg shadow-inner mx-auto transition-all duration-300 ${isMyTurn ? 'ring-2 ring-sky-400 ring-offset-4 ring-offset-gray-800' : 'opacity-70'}`}
          onClick={handleCanvasClick}
          style={{ cursor: isMyTurn ? 'pointer' : 'not-allowed' }}
        />
        {gameData.status === 'finished' && (
          <div className="absolute inset-0 bg-black/60 flex flex-col justify-center items-center rounded-lg animate-fade-in">
            <div className="text-4xl font-extrabold text-white mb-6">
              {getStatusMessage().replace('🎉', '').replace('😢', '').replace('🤝', '')}
            </div>
            <div className="flex space-x-4">
              <button
                onClick={handleResetGame}
                className="bg-sky-500 text-white font-bold py-2 px-5 rounded-lg hover:bg-sky-600 transition"
              >
                Play Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="bg-gray-600 text-white font-bold py-2 px-5 rounded-lg hover:bg-gray-700 transition"
              >
                Leave
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Main App Component ---
export default function App() {
  // mode
  const [mode, setMode] = useState('local'); // 'local' | 'online'

  // shared UI state
  const [notification, setNotification] = useState('');
  const [error, setError] = useState(null);

  // --- ONLINE STATE ---
  const [functions, setFunctions] = useState(null);
  const [db, setDb] = useState(null);
  const [userId, setUserId] = useState(null);
  const [gameId, setGameId] = useState('');
  const [gameData, setGameData] = useState(null);
  const [inputGameId, setInputGameId] = useState('');
  const [loading, setLoading] = useState(false);

  // --- LOCAL STATE via hook (reused shape) ---
  const {
    boardSize: localBoardSize,
    setSize: setLocalBoardSize,
    gameData: localGameData,
    makeMove: localMakeMove,
    resetGame: localResetGame
  } = useLocalGame(3);

  // --- Firebase Initialization & Auth (only if online mode might be used) ---
  useEffect(() => {
    try {
      if (firebaseConfig.apiKey.startsWith("YOUR_")) {
        // Only warn if user actually goes online
        if (mode === 'online') {
          setError("Firebase config is not set. Please update App.jsx with your project details.");
        }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Real-time Game Data Listener (online only) ---
  useEffect(() => {
    if (mode !== 'online') return;
    if (!gameId || !db) {
      setGameData(null);
      return;
    }

    const gameRef = doc(db, 'games', gameId);
    const unsubscribe = onSnapshot(gameRef, (docSnap) => {
      if (docSnap.exists()) {
        setGameData(docSnap.data());
        setError(null);
      } else {
        setNotification('Game not found or has been deleted.');
        setGameData(null);
        setGameId('');
      }
    }, () => {
      setError('Failed to load game data.');
    });
    return () => unsubscribe();
  }, [mode, gameId, db]);

  // --- Notification timeout ---
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // --- Cloud Function Handlers (online only) ---
  const handleCreateGame = async () => {
    if (!functions || !userId) {
      setError("Cannot create game: User ID is not available yet.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const createGameFunc = httpsCallable(functions, 'createGame');
      const result = await createGameFunc({ userId });
      setGameId(result.data.gameId);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleJoinGame = async () => {
    if (!functions || !userId || !inputGameId) return;
    setLoading(true);
    setError(null);
    try {
      const joinGameFunc = httpsCallable(functions, 'joinGame');
      await joinGameFunc({ gameId: inputGameId, userId });
      setGameId(inputGameId);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  // --- UI ---
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col justify-center items-center p-4 font-sans antialiased">
      <div className="w-full max-w-sm bg-gray-800 rounded-2xl shadow-2xl p-6 text-center">
        <h1 className="text-4xl font-bold text-white mb-2">Tic-Tac-Toe</h1>
        <p className="text-gray-400 mb-4">Built with Firebase — plus Local Mode</p>

        {/* Mode Toggle */}
        <div className="flex mb-4 bg-gray-700 rounded-lg overflow-hidden">
          <button
            className={`flex-1 py-2 font-semibold ${mode === 'local' ? 'bg-sky-500' : 'bg-gray-700 hover:bg-gray-600'}`}
            onClick={() => setMode('local')}
          >
            Local
          </button>
          <button
            className={`flex-1 py-2 font-semibold ${mode === 'online' ? 'bg-sky-500' : 'bg-gray-700 hover:bg-gray-600'}`}
            onClick={() => setMode('online')}
          >
            Online
          </button>
        </div>

        {/* Local controls (board size) */}
        {mode === 'local' && (
          <div className="mb-4 flex items-center justify-center space-x-2">
            <span className="text-sm text-gray-300">Board:</span>
            {[3, 4, 5].map(n => (
              <button
                key={n}
                onClick={() => setLocalBoardSize(n)}
                className={`px-3 py-1 rounded-md text-sm border ${localBoardSize === n ? 'bg-emerald-500 border-transparent' : 'bg-gray-700 border-gray-600 hover:bg-gray-600'}`}
              >
                {n}×{n}
              </button>
            ))}
          </div>
        )}

        {/* BODY */}
        {mode === 'local' ? (
          <GameComponent
            mode="local"
            gameData={localGameData}
            // local: grant reset to everyone; host concept irrelevant
            isHost={true}
            setNotification={setNotification}
            setError={setError}
            onLocalMove={localMakeMove}
            onLocalReset={localResetGame}
          />
        ) : (
          (!userId) ? (
            <div className="text-yellow-400 animate-pulse mb-4">Connecting...</div>
          ) : (
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
                mode="online"
                gameId={gameId}
                gameData={gameData}
                userId={userId}
                functions={functions}
                isHost={gameData?.playerX === userId}
                setNotification={setNotification}
                setError={setError}
              />
            ) : (
              <div className="text-sky-400 animate-pulse my-8">Loading Game...</div>
            )
          )
        )}

        {error && <p className="text-red-400 mt-4 text-sm bg-red-900/50 p-2 rounded-md">{error}</p>}
        {notification && <p className="text-green-400 mt-4 text-sm bg-green-900/50 p-2 rounded-md">{notification}</p>}
      </div>

      <footer className="text-xs text-gray-600 mt-4">
        {mode === 'online' ? <>Your User ID: {userId || '...'}</> : 'Local Mode'}
      </footer>
    </div>
  );
}
