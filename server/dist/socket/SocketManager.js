"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketManager = void 0;
const RoomManager_1 = require("../rooms/RoomManager");
const TicTacToe_1 = require("../games/TicTacToe");
const MemoryMatch_1 = require("../games/MemoryMatch");
const uuid_1 = require("uuid");
class SocketManager {
    io;
    roomManager;
    ticTacToe;
    memoryMatch;
    constructor(io) {
        this.io = io;
        this.roomManager = new RoomManager_1.RoomManager();
        this.ticTacToe = new TicTacToe_1.TicTacToe();
        this.memoryMatch = new MemoryMatch_1.MemoryMatch();
        this.io.on('connection', (socket) => {
            console.log('User connected:', socket.id);
            this.handleConnection(socket);
        });
    }
    handleConnection(socket) {
        socket.on('create_room', (data, callback) => {
            const player = {
                id: data.playerId,
                name: data.playerName,
                socketId: socket.id,
                connected: true
            };
            const room = this.roomManager.createRoom(player, 3); // Default 3 rounds for games
            socket.join(room.roomId);
            console.log(`Room created: ${room.roomId} by ${player.name}`);
            callback({ success: true, room });
        });
        socket.on('join_room', (data, callback) => {
            const player = {
                id: data.playerId,
                name: data.playerName,
                socketId: socket.id,
                connected: true
            };
            const result = this.roomManager.joinRoom(data.roomId.toUpperCase(), player);
            if (result.success && result.room) {
                socket.join(result.room.roomId);
                console.log(`Player ${player.name} joined/rejoined room ${result.room.roomId}`);
                socket.to(result.room.roomId).emit('player_joined', result.room);
                callback({ success: true, room: result.room });
            }
            else {
                callback({ success: false, message: result.message });
            }
        });
        socket.on('propose_game', (data, callback) => {
            const room = this.roomManager.getRoom(data.roomId);
            if (!room)
                return callback && callback({ success: false, message: 'Room not found' });
            if (!room.players.some(p => p.id === data.playerId))
                return callback && callback({ success: false, message: 'Unauthorized' });
            if (room.activeGame)
                return callback && callback({ success: false, message: 'Game already active' });
            if (room.gameProposal)
                return callback && callback({ success: false, message: 'Proposal already exists' });
            room.gameProposal = { gameId: data.gameId, from: data.playerId };
            this.io.to(room.roomId).emit('game_proposed', room);
            if (callback)
                callback({ success: true });
        });
        socket.on('accept_game', (data, callback) => {
            const room = this.roomManager.getRoom(data.roomId);
            if (!room)
                return callback && callback({ success: false, message: 'Room not found' });
            if (!room.players.some(p => p.id === data.playerId))
                return callback && callback({ success: false, message: 'Unauthorized' });
            if (!room.gameProposal)
                return callback && callback({ success: false, message: 'No game proposed' });
            if (room.gameProposal.from === data.playerId)
                return callback && callback({ success: false, message: 'You cannot accept your own proposal' });
            if (room.players.length !== 2)
                return callback && callback({ success: false, message: 'Need 2 players to start' });
            room.activeGame = room.gameProposal.gameId;
            room.gameProposal = null;
            if (room.activeGame === 'memory-match') {
                this.memoryMatch.initGame(room);
            }
            else {
                this.ticTacToe.initGame(room);
            }
            this.io.to(room.roomId).emit('game_started', room);
            if (callback)
                callback({ success: true });
        });
        socket.on('cancel_proposal', (data, callback) => {
            const room = this.roomManager.getRoom(data.roomId);
            if (!room)
                return callback && callback({ success: false, message: 'Room not found' });
            if (!room.players.some(p => p.id === data.playerId))
                return callback && callback({ success: false, message: 'Unauthorized' });
            room.gameProposal = null;
            this.io.to(room.roomId).emit('proposal_cancelled', room);
            if (callback)
                callback({ success: true });
        });
        socket.on('return_to_lobby', (data, callback) => {
            const room = this.roomManager.getRoom(data.roomId);
            if (!room)
                return callback && callback({ success: false, message: 'Room not found' });
            if (!room.players.some(p => p.id === data.playerId))
                return callback && callback({ success: false, message: 'Unauthorized' });
            room.activeGame = null;
            room.matchState = null;
            room.gameState = null;
            room.currentTurn = null;
            this.io.to(room.roomId).emit('returned_to_lobby', room);
            if (callback)
                callback({ success: true });
        });
        socket.on('send_chat', (data, callback) => {
            const room = this.roomManager.getRoom(data.roomId);
            if (!room)
                return callback && callback({ success: false, message: 'Room not found' });
            const player = room.players.find(p => p.id === data.playerId);
            if (!player)
                return callback && callback({ success: false, message: 'Player not in room' });
            if (!data.text || data.text.trim().length === 0)
                return callback && callback({ success: false, message: 'Empty message' });
            let safeText = data.text.trim();
            if (safeText.length > 500)
                safeText = safeText.substring(0, 500);
            const message = {
                id: (0, uuid_1.v4)(),
                playerId: player.id,
                playerName: player.name,
                text: safeText,
                timestamp: Date.now()
            };
            room.chat.push(message);
            this.io.to(room.roomId).emit('chat_message', room);
            if (callback)
                callback({ success: true });
        });
        socket.on('close_session', (data, callback) => {
            const room = this.roomManager.getRoom(data.roomId);
            if (!room)
                return callback && callback({ success: false, message: 'Room not found' });
            if (!room.players.some(p => p.id === data.playerId))
                return callback && callback({ success: false, message: 'Unauthorized' });
            this.io.to(room.roomId).emit('session_closed');
            const playerIds = room.players.map(p => p.id);
            playerIds.forEach(id => this.roomManager.leaveRoom(room.roomId, id));
            if (callback)
                callback({ success: true });
        });
        socket.on('make_move', (data, callback) => {
            const room = this.roomManager.getRoom(data.roomId);
            if (!room || !room.activeGame) {
                if (callback)
                    callback({ success: false, message: 'Game not found' });
                return;
            }
            if (!room.players.some(p => p.id === data.playerId))
                return callback && callback({ success: false, message: 'Unauthorized' });
            const result = room.activeGame === 'memory-match'
                ? this.memoryMatch.handleMove(room, data.playerId, data.move)
                : this.ticTacToe.handleMove(room, data.playerId, data.move);
            if (result.success) {
                this.io.to(room.roomId).emit('game_state_updated', room);
            }
            else {
                socket.emit('error', result.message);
            }
            if (callback)
                callback(result);
        });
        socket.on('resolve_turn', (data, callback) => {
            const room = this.roomManager.getRoom(data.roomId);
            if (!room || room.activeGame !== 'memory-match') {
                if (callback)
                    callback({ success: false, message: 'Invalid resolve turn' });
                return;
            }
            if (!room.players.some(p => p.id === data.playerId))
                return callback && callback({ success: false, message: 'Unauthorized' });
            const result = this.memoryMatch.handleResolveTurn(room, data.playerId);
            if (result.success) {
                this.io.to(room.roomId).emit('game_state_updated', room);
            }
            if (callback)
                callback(result);
        });
        socket.on('ready_for_next_round', (data, callback) => {
            const room = this.roomManager.getRoom(data.roomId);
            if (!room || !room.activeGame)
                return callback && callback({ success: false, message: 'Game not found' });
            if (!room.players.some(p => p.id === data.playerId))
                return callback && callback({ success: false, message: 'Unauthorized' });
            const result = room.activeGame === 'memory-match'
                ? this.memoryMatch.handleReady(room, data.playerId)
                : this.ticTacToe.handleReady(room, data.playerId);
            if (result.success) {
                this.io.to(room.roomId).emit('game_state_updated', room);
            }
            if (callback)
                callback(result);
        });
        socket.on('leave_room', (data) => {
            // Legacy support for explicit disconnect handling if needed
            // but 'close_session' handles intended destruction.
            const result = this.roomManager.leaveRoom(data.roomId, data.playerId);
            if (result.room && !result.wasDestroyed) {
                socket.to(data.roomId).emit('player_left', result.room);
            }
            socket.leave(data.roomId);
        });
        socket.on('disconnect', () => {
            const result = this.roomManager.handleDisconnect(socket.id, (room, playerId) => {
                const leaveResult = this.roomManager.leaveRoom(room.roomId, playerId);
                if (leaveResult.room && !leaveResult.wasDestroyed) {
                    this.io.to(room.roomId).emit('player_left', leaveResult.room);
                }
            });
            if (result.room) {
                socket.to(result.room.roomId).emit('player_disconnected', result.room);
            }
        });
        // WebRTC Signaling Events
        socket.on('webrtc_offer', (data) => {
            socket.to(data.roomId).emit('webrtc_offer', data);
        });
        socket.on('webrtc_answer', (data) => {
            socket.to(data.roomId).emit('webrtc_answer', data);
        });
        socket.on('webrtc_ice_candidate', (data) => {
            socket.to(data.roomId).emit('webrtc_ice_candidate', data);
        });
        socket.on('ready_for_offer', (data) => {
            socket.to(data.roomId).emit('ready_for_offer', data);
        });
    }
}
exports.SocketManager = SocketManager;
