"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryMatch = void 0;
const EMOJIS = ['🍎', '🍌', '🐱', '🚀', '🎮', '⭐', '🍕', '🐶'];
class MemoryMatch {
    initGame(room) {
        const p1 = room.players[0].id;
        const p2 = room.players[1].id;
        room.matchState = {
            round: 1,
            totalRounds: room.settings.totalRounds,
            score: {
                [p1]: 0,
                [p2]: 0
            },
            symbolAssignments: {
                [p1]: 'X',
                [p2]: 'O'
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
        let cards = [];
        let idCounter = 0;
        for (const emoji of EMOJIS) {
            cards.push({ id: idCounter++, emoji, isFlipped: false, isMatched: false });
            cards.push({ id: idCounter++, emoji, isFlipped: false, isMatched: false });
        }
        for (let i = cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cards[i], cards[j]] = [cards[j], cards[i]];
        }
        room.gameState = {
            board: cards,
            firstSelection: null,
            secondSelection: null,
            isProcessing: false,
            pairsFound: {
                [room.players[0].id]: 0,
                [room.players[1] ? room.players[1].id : 'dummy']: 0
            }
        };
        room.matchState.status = 'playing';
        room.matchState.roundWinner = null;
        room.matchState.readyPlayers = [];
        // DO NOT RESET matchState.score, because that tracks Rounds won!
        room.currentTurn = room.players[0].id;
    }
    handleMove(room, playerId, move) {
        if (room.status !== 'playing' || !room.matchState || room.matchState.status !== 'playing')
            return { success: false, message: 'Game is not in playing state.' };
        if (room.currentTurn !== playerId)
            return { success: false, message: 'Not your turn.' };
        const state = room.gameState;
        if (!state || state.isProcessing)
            return { success: false, message: 'Wait for the current move to process.' };
        const { index } = move;
        if (index < 0 || index >= state.board.length)
            return { success: false, message: 'Invalid move.' };
        const card = state.board[index];
        if (card.isFlipped || card.isMatched)
            return { success: false, message: 'Card already revealed.' };
        card.isFlipped = true;
        if (state.firstSelection === null) {
            state.firstSelection = index;
        }
        else if (state.secondSelection === null) {
            state.secondSelection = index;
            state.isProcessing = true;
            const firstCard = state.board[state.firstSelection];
            const secondCard = state.board[state.secondSelection];
            if (firstCard.emoji === secondCard.emoji) {
                firstCard.isMatched = true;
                secondCard.isMatched = true;
                state.pairsFound[playerId] += 1; // Increment pairs found in the current round
                state.firstSelection = null;
                state.secondSelection = null;
                state.isProcessing = false;
                this.checkGameOver(room);
            }
        }
        return { success: true };
    }
    handleResolveTurn(room, playerId) {
        if (room.status !== 'playing' || !room.matchState || room.matchState.status !== 'playing')
            return { success: false, message: 'Game is not in playing state.' };
        if (room.currentTurn !== playerId)
            return { success: false, message: 'Not your turn to resolve.' };
        const state = room.gameState;
        if (!state || !state.isProcessing || state.firstSelection === null || state.secondSelection === null)
            return { success: false, message: 'Nothing to resolve.' };
        state.board[state.firstSelection].isFlipped = false;
        state.board[state.secondSelection].isFlipped = false;
        const nextPlayer = room.players.find(p => p.id !== room.currentTurn);
        if (nextPlayer)
            room.currentTurn = nextPlayer.id;
        state.firstSelection = null;
        state.secondSelection = null;
        state.isProcessing = false;
        return { success: true };
    }
    checkGameOver(room) {
        if (!room.gameState || !room.matchState)
            return;
        const state = room.gameState;
        const allMatched = state.board.every(card => card.isMatched);
        if (allMatched) {
            room.matchState.status = 'round_finished';
            const p1 = room.players[0].id;
            const p2 = room.players[1] ? room.players[1].id : null;
            if (!p2) {
                room.matchState.roundWinner = p1;
                room.matchState.score[p1] += 1;
            }
            else {
                const p1Pairs = state.pairsFound[p1];
                const p2Pairs = state.pairsFound[p2];
                if (p1Pairs > p2Pairs) {
                    room.matchState.roundWinner = p1;
                    room.matchState.score[p1] += 1;
                }
                else if (p2Pairs > p1Pairs) {
                    room.matchState.roundWinner = p2;
                    room.matchState.score[p2] += 1;
                }
                else {
                    room.matchState.roundWinner = 'draw';
                    // Draw gives 0 points typically.
                }
            }
            if (room.matchState.round >= room.matchState.totalRounds) {
                room.matchState.status = 'match_finished';
                if (!p2) {
                    room.matchState.matchWinner = p1;
                }
                else {
                    const p1Score = room.matchState.score[p1];
                    const p2Score = room.matchState.score[p2];
                    if (p1Score > p2Score)
                        room.matchState.matchWinner = p1;
                    else if (p2Score > p1Score)
                        room.matchState.matchWinner = p2;
                    else
                        room.matchState.matchWinner = 'draw';
                }
            }
        }
    }
    handleReady(room, playerId) {
        if (!room.matchState)
            return { success: false, message: 'Match not initialized.' };
        if (room.matchState.status === 'playing')
            return { success: false, message: 'Round is still playing.' };
        if (!room.matchState.readyPlayers.includes(playerId))
            room.matchState.readyPlayers.push(playerId);
        if (room.matchState.readyPlayers.length === 2) {
            if (room.matchState.status === 'match_finished')
                this.initGame(room);
            else if (room.matchState.status === 'round_finished') {
                room.matchState.round += 1;
                this.initRound(room);
            }
        }
        return { success: true };
    }
}
exports.MemoryMatch = MemoryMatch;
