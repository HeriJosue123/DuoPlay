"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TicTacToe = void 0;
class TicTacToe {
    initGame(room) {
        room.gameState = {
            board: Array(9).fill(null),
        };
        room.status = 'playing';
        room.winner = null;
        // Randomly pick who starts
        const startingPlayer = room.players[Math.floor(Math.random() * 2)];
        room.currentTurn = startingPlayer.id;
    }
    handleMove(room, playerSocketId, move) {
        if (room.status !== 'playing') {
            return { success: false, message: 'Game is not in playing state.' };
        }
        const player = room.players.find(p => p.socketId === playerSocketId);
        if (!player)
            return { success: false, message: 'Player not found.' };
        if (room.currentTurn !== player.id) {
            return { success: false, message: 'Not your turn.' };
        }
        const { index } = move;
        if (index < 0 || index > 8 || room.gameState.board[index] !== null) {
            return { success: false, message: 'Invalid move.' };
        }
        const playerSymbol = room.players[0].id === player.id ? 'X' : 'O';
        room.gameState.board[index] = playerSymbol;
        this.checkGameOver(room);
        if (room.status === 'playing') {
            // Switch turn
            const nextPlayer = room.players.find(p => p.id !== player.id);
            room.currentTurn = nextPlayer.id;
        }
        return { success: true };
    }
    checkGameOver(room) {
        const board = room.gameState.board;
        const winningCombinations = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
            [0, 4, 8], [2, 4, 6] // Diagonals
        ];
        for (const combo of winningCombinations) {
            const [a, b, c] = combo;
            if (board[a] && board[a] === board[b] && board[a] === board[c]) {
                room.status = 'finished';
                // board[a] is 'X' or 'O'
                const winnerPlayer = room.players[0].id === (room.players[0].id === room.players[0].id && board[a] === 'X' ? room.players[0].id : (board[a] === 'O' ? room.players[1].id : room.players[0].id));
                // let's simplify winner detection
                const symbolXPlayer = room.players[0];
                const symbolOPlayer = room.players[1];
                if (board[a] === 'X')
                    room.winner = symbolXPlayer.id;
                else
                    room.winner = symbolOPlayer.id;
                return;
            }
        }
        if (!board.includes(null)) {
            room.status = 'finished';
            room.winner = 'draw';
        }
    }
}
exports.TicTacToe = TicTacToe;
