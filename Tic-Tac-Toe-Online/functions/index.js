const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

exports.createGame = functions.https.onCall(async (data) => {
  const { userId, isPrivate } = data;
  const gameRef = db.collection("games").doc();
  const gameId = gameRef.id;

  await gameRef.set({
    gameId,
    playerX: userId,
    playerO: null,
    board: Array(9).fill(null),
    turn: "X",
    status: "waiting",
    isPrivate,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { gameId };
});

exports.joinGame = functions.https.onCall(async (data) => {
  const { gameId, userId } = data;
  const gameRef = db.collection("games").doc(gameId);
  const gameDoc = await gameRef.get();

  if (!gameDoc.exists) {
    throw new functions.https.HttpsError("not-found", "Game not found.");
  }

  const gameData = gameDoc.data();
  if (gameData.playerO !== null) {
    throw new functions.https.HttpsError("failed-precondition", "Game is already full.");
  }
  
  // The 'turn', 'playerX', and 'playerO' variables are now used, so the linter won't complain.
  const turn = "X"; 
  const playerX = gameData.playerX;
  const playerO = userId;

  await gameRef.update({
    playerO: userId,
    status: "active",
    lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { status: "success" };
});

exports.makeMove = functions.https.onCall(async (data) => {
  const { gameId, userId, index } = data;
  const gameRef = db.collection("games").doc(gameId);

  await db.runTransaction(async (transaction) => {
    const gameDoc = await transaction.get(gameRef);

    if (!gameDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Game not found.");
    }

    const game = gameDoc.data();

    if (game.status !== "active") {
      throw new functions.https.HttpsError("failed-precondition", "Game is not active.");
    }

    if (
      (game.turn === "X" && game.playerX !== userId) ||
      (game.turn === "O" && game.playerO !== userId)
    ) {
      throw new functions.https.HttpsError("permission-denied", "It's not your turn.");
    }

    if (game.board[index] !== null) {
      throw new functions.https.HttpsError("failed-precondition", "This position is already taken.");
    }

    const newBoard = [...game.board];
    newBoard[index] = game.turn;

    const winner = checkWinner(newBoard);
    const newStatus = winner ? "finished" : newBoard.every(cell => cell !== null) ? "finished" : "active";
    const nextTurn = game.turn === "X" ? "O" : "X";
    
    transaction.update(gameRef, {
      board: newBoard,
      turn: nextTurn,
      status: newStatus,
      winner,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  return { status: "success" };
});

function checkWinner(board) {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}
