"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TicTacToe = void 0;
class TicTacToe {
    initGame(room) {
        const p1 = room.players[0].id;
        const p2 = room.players[1].id;
        // Randomly assign initial symbols
        const p1Symbol = Math.random() > 0.5 ? 'X' : 'O';
        const p2Symbol = p1Symbol === 'X' ? 'O' : 'X';
        room.matchState = {
            round: 1,
            score: {
                [p1]: 0,
                [p2]: 0
            },
            targetScore: 5,
            symbolAssignments: {
                [p1]: p1Symbol,
                [p2]: p2Symbol
            },
            roundWinner: null,
            matchWinner: null,
            status: 'playing',
            readyPlayers: []
        };
        room.status = 'playing';
        this.initRound(room);
    }
    initRound(room) {
        if (!room.matchState)
            return;
        room.gameState = {
            board: Array(9).fill(null),
            winningLine: null
        };
        room.matchState.status = 'playing';
        room.matchState.roundWinner = null;
        room.matchState.readyPlayers = [];
        // The player with 'X' always starts
        const startingPlayerId = Object.keys(room.matchState.symbolAssignments).find(id => room.matchState.symbolAssignments[id] === 'X');
        room.currentTurn = startingPlayerId || room.players[0].id;
    }
    handleMove(room, playerId, move) {
        if (room.status !== 'playing' || !room.matchState || room.matchState.status !== 'playing') {
            return { success: false, message: 'Game is not in playing state.' };
        }
        if (room.currentTurn !== playerId) {
            return { success: false, message: 'Not your turn.' };
        }
        const { index } = move;
        if (index < 0 || index > 8 || !room.gameState || room.gameState.board[index] !== null) {
            return { success: false, message: 'Invalid move.' };
        }
        const playerSymbol = room.matchState.symbolAssignments[playerId];
        room.gameState.board[index] = playerSymbol;
        this.checkGameOver(room);
        if (room.matchState.status === 'playing') {
            // Switch turn
            const nextPlayer = room.players.find(p => p.id !== playerId);
            if (nextPlayer) {
                room.currentTurn = nextPlayer.id;
            }
        }
        else {
            room.currentTurn = null; // round over
        }
        return { success: true };
    }
    checkGameOver(room) {
        if (!room.gameState || !room.matchState)
            return;
        const board = room.gameState.board;
        const winningCombinations = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
            [0, 4, 8], [2, 4, 6] // Diagonals
        ];
        let winnerSymbol = null;
        let winLine = null;
        for (const combo of winningCombinations) {
            const [a, b, c] = combo;
            if (board[a] && board[a] === board[b] && board[a] === board[c]) {
                winnerSymbol = board[a];
                winLine = combo;
                break;
            }
        }
        if (winnerSymbol) {
            room.gameState.winningLine = winLine;
            room.matchState.status = 'round_finished';
            const winnerId = Object.keys(room.matchState.symbolAssignments).find(id => room.matchState.symbolAssignments[id] === winnerSymbol);
            if (winnerId) {
                room.matchState.roundWinner = winnerId;
                room.matchState.score[winnerId] += 1;
                if (room.matchState.score[winnerId] >= room.matchState.targetScore) {
                    room.matchState.status = 'match_finished';
                    room.matchState.matchWinner = winnerId;
                }
            }
            return;
        }
        if (!board.includes(null)) {
            room.matchState.status = 'round_finished';
            room.matchState.roundWinner = 'draw';
        }
    }
    handleReady(room, playerId) {
        if (!room.matchState)
            return { success: false, message: 'Match not initialized.' };
        if (room.matchState.status === 'playing') {
            return { success: false, message: 'Round is still playing.' };
        }
        if (!room.matchState.readyPlayers.includes(playerId)) {
            room.matchState.readyPlayers.push(playerId);
        }
        if (room.matchState.readyPlayers.length === 2) {
            if (room.matchState.status === 'match_finished') {
                // Rematch: completely restart
                this.initGame(room);
            }
            else if (room.matchState.status === 'round_finished') {
                // Next round: alternate symbols
                room.matchState.round += 1;
                const p1 = room.players[0].id;
                const p2 = room.players[1].id;
                // Swap symbols
                const currentP1Symbol = room.matchState.symbolAssignments[p1];
                room.matchState.symbolAssignments[p1] = room.matchState.symbolAssignments[p2];
                room.matchState.symbolAssignments[p2] = currentP1Symbol;
                this.initRound(room);
            }
        }
        return { success: true };
    }
}
exports.TicTacToe = TicTacToe;
