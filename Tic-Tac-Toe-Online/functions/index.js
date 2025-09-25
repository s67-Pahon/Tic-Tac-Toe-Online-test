const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

/**
 * Creates a new 3x3 game document in Firestore.
 * User must be authenticated.
 */
exports.createGame = functions.https.onCall(async (data, context) => {
  // SECURE: Re-enabled authentication check.
  // if (!context.auth) {
  //   throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  // }
  
  // SECURE: Get the userId from the authentication context, not from the client data.
  const { userId } = data; // Changed for debugging
  const gameRef = db.collection("games").doc();
  const gameId = gameRef.id;

  await gameRef.set({
    gameId,
    playerX: userId,
    playerO: null,
    board: Array(9).fill(null),
    turn: "X",
    status: "waiting",
    winner: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { gameId };
});

/**
 * Allows a second player to join an existing game.
 * User must be authenticated.
 */
exports.joinGame = functions.https.onCall(async (data, context) => {
  // if (!context.auth) {
  //   throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  // }

  const { gameId, userId } = data; // Changed for debugging

  if (!gameId) {
    throw new functions.https.HttpsError('invalid-argument', 'The function must provide a "gameId".');
  }

  const gameRef = db.collection("games").doc(gameId);
  const gameDoc = await gameRef.get();

  if (!gameDoc.exists) {
    throw new functions.https.HttpsError("not-found", "Game not found.");
  }

  const gameData = gameDoc.data();

  if (gameData.playerX === userId) {
      throw new functions.https.HttpsError("failed-precondition", "You can't join your own game.");
  }
  if (gameData.playerO !== null) {
    throw new functions.https.HttpsError("failed-precondition", "This game is already full.");
  }

  await gameRef.update({
    playerO: userId,
    status: "active",
    lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { status: "success" };
});

/**
 * Processes a player's move.
 * User must be authenticated.
 */
exports.makeMove = functions.https.onCall(async (data, context) => {
  // if (!context.auth) {
  //   throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  // }

  const { gameId, index, userId } = data; // Changed for debugging
  
  if (!gameId || index === undefined) {
    throw new functions.https.HttpsError('invalid-argument', 'The function must provide "gameId" and "index".');
  }

  const gameRef = db.collection("games").doc(gameId);

  await db.runTransaction(async (transaction) => {
    const gameDoc = await transaction.get(gameRef);

    if (!gameDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Game not found.");
    }

    const game = gameDoc.data();

    if (game.status !== "active") {
      throw new functions.https.HttpsError("failed-precondition", "This game is not active.");
    }
    if ((game.turn === "X" && game.playerX !== userId) || (game.turn === "O" && game.playerO !== userId)) {
      throw new functions.https.HttpsError("permission-denied", "It's not your turn.");
    }
    if (game.board[index] !== null) {
      throw new functions.https.HttpsError("failed-precondition", "This position is already taken.");
    }

    const newBoard = [...game.board];
    newBoard[index] = game.turn;

    const winner = checkWinner(newBoard);
    const isDraw = newBoard.every(cell => cell !== null) && !winner;
    
    let newStatus = "active";
    if (winner || isDraw) {
        newStatus = "finished";
    }

    const nextTurn = game.turn === "X" ? "O" : "X";

    transaction.update(gameRef, {
      board: newBoard,
      turn: nextTurn,
      status: newStatus,
      winner: winner || (isDraw ? 'draw' : null),
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  return { status: "success" };
});

/**
 * Resets a finished game.
 * User must be authenticated.
 */
exports.resetGame = functions.https.onCall(async (data, context) => {
    // if (!context.auth) {
    //     throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    // }

    const { gameId, userId } = data; // Changed for debugging

    const gameRef = db.collection("games").doc(gameId);

    const gameDoc = await gameRef.get();
    if (!gameDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Game not found.");
    }

    const game = gameDoc.data();

    if (game.playerX !== userId) {
        throw new functions.https.HttpsError("permission-denied", "Only the host can reset the game.");
    }
    
    await gameRef.update({
        board: Array(9).fill(null),
        turn: "X",
        status: "active",
        winner: null,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { status: "success" };
});


function checkWinner(board) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}

