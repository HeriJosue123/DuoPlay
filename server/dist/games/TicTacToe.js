"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TicTacToe = void 0;
class TicTacToe {
    initGame(room) {
        const p1 = room.players[0].id;
        const p2 = room.players[1].id;
        // Player 1 is always X, Player 2 is always O
        const p1Symbol = 'X';
        const p2Symbol = 'O';
        room.matchState = {
            round: 1,
            totalRounds: room.settings.totalRounds,
            score: {
                [p1]: 0,
                [p2]: 0
            },
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
        const state = room.gameState;
        if (index < 0 || index > 8 || !state || state.board[index] !== null) {
            return { success: false, message: 'Invalid move.' };
        }
        const playerSymbol = room.matchState.symbolAssignments[playerId];
        state.board[index] = playerSymbol;
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
        const state = room.gameState;
        const board = state.board;
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
            state.winningLine = winLine;
            room.matchState.status = 'round_finished';
            const winnerId = Object.keys(room.matchState.symbolAssignments).find(id => room.matchState.symbolAssignments[id] === winnerSymbol);
            if (winnerId) {
                room.matchState.roundWinner = winnerId;
                room.matchState.score[winnerId] += 1;
            }
        }
        else if (!board.includes(null)) {
            room.matchState.status = 'round_finished';
            room.matchState.roundWinner = 'draw';
        }
        // Check if match is completely over
        if (room.matchState.status === 'round_finished') {
            if (room.matchState.round >= room.matchState.totalRounds) {
                room.matchState.status = 'match_finished';
                const p1 = room.players[0].id;
                // Check if there is a second player before extracting ID
                const p2 = room.players.length > 1 ? room.players[1].id : null;
                if (!p2) {
                    room.matchState.matchWinner = p1;
                }
                else {
                    const p1Score = room.matchState.score[p1];
                    const p2Score = room.matchState.score[p2];
                    if (p1Score > p2Score) {
                        room.matchState.matchWinner = p1;
                    }
                    else if (p2Score > p1Score) {
                        room.matchState.matchWinner = p2;
                    }
                    else {
                        room.matchState.matchWinner = 'draw';
                    }
                }
            }
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
                // Next round: do not alternate symbols, creator is always X.
                room.matchState.round += 1;
                this.initRound(room);
            }
        }
        return { success: true };
    }
}
exports.TicTacToe = TicTacToe;
