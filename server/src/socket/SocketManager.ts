import { Server, Socket } from 'socket.io';
import { RoomManager } from '../rooms/RoomManager';
import { TicTacToe } from '../games/TicTacToe';
import { MemoryMatch } from '../games/MemoryMatch';
import type { Player, Room, ChatMessage } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class SocketManager {
  private io: Server;
  private roomManager: RoomManager;
  private ticTacToe: TicTacToe;
  private memoryMatch: MemoryMatch;

  constructor(io: Server) {
    this.io = io;
    this.roomManager = new RoomManager();
    this.ticTacToe = new TicTacToe();
    this.memoryMatch = new MemoryMatch();

    this.io.on('connection', (socket: Socket) => {
      console.log('User connected:', socket.id);
      this.handleConnection(socket);
    });
  }

  private handleConnection(socket: Socket) {
    socket.on('create_room', (data: { playerName: string, playerId: string }, callback) => {
      const player: Player = {
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

    socket.on('join_room', (data: { playerName: string, roomId: string, playerId: string }, callback) => {
      const player: Player = {
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
      } else {
        callback({ success: false, message: result.message });
      }
    });

    socket.on('propose_game', (data: { roomId: string, playerId: string, gameId: 'tic-tac-toe' | 'memory-match' }, callback) => {
      const room = this.roomManager.getRoom(data.roomId);
      if (!room) return callback && callback({ success: false, message: 'Room not found' });
      if (!room.players.some(p => p.id === data.playerId)) return callback && callback({ success: false, message: 'Unauthorized' });
      if (room.activeGame) return callback && callback({ success: false, message: 'Game already active' });
      if (room.gameProposal) return callback && callback({ success: false, message: 'Proposal already exists' });

      room.gameProposal = { gameId: data.gameId, from: data.playerId };
      this.io.to(room.roomId).emit('game_proposed', room);
      if (callback) callback({ success: true });
    });

    socket.on('accept_game', (data: { roomId: string, playerId: string }, callback) => {
      const room = this.roomManager.getRoom(data.roomId);
      if (!room) return callback && callback({ success: false, message: 'Room not found' });
      if (!room.players.some(p => p.id === data.playerId)) return callback && callback({ success: false, message: 'Unauthorized' });
      if (!room.gameProposal) return callback && callback({ success: false, message: 'No game proposed' });
      if (room.gameProposal.from === data.playerId) return callback && callback({ success: false, message: 'You cannot accept your own proposal' });
      if (room.players.length !== 2) return callback && callback({ success: false, message: 'Need 2 players to start' });

      room.activeGame = room.gameProposal.gameId as any;
      room.gameProposal = null;

      if (room.activeGame === 'memory-match') {
        this.memoryMatch.initGame(room);
      } else {
        this.ticTacToe.initGame(room);
      }
      this.io.to(room.roomId).emit('game_started', room);
      if (callback) callback({ success: true });
    });

    socket.on('cancel_proposal', (data: { roomId: string, playerId: string }, callback) => {
      const room = this.roomManager.getRoom(data.roomId);
      if (!room) return callback && callback({ success: false, message: 'Room not found' });
      if (!room.players.some(p => p.id === data.playerId)) return callback && callback({ success: false, message: 'Unauthorized' });
      
      room.gameProposal = null;
      this.io.to(room.roomId).emit('proposal_cancelled', room);
      if (callback) callback({ success: true });
    });

    socket.on('return_to_lobby', (data: { roomId: string, playerId: string }, callback) => {
      const room = this.roomManager.getRoom(data.roomId);
      if (!room) return callback && callback({ success: false, message: 'Room not found' });
      if (!room.players.some(p => p.id === data.playerId)) return callback && callback({ success: false, message: 'Unauthorized' });

      room.activeGame = null;
      room.matchState = null;
      room.gameState = null;
      room.currentTurn = null;

      this.io.to(room.roomId).emit('returned_to_lobby', room);
      if (callback) callback({ success: true });
    });

    socket.on('send_chat', (data: { roomId: string, playerId: string, text: string }, callback) => {
      const room = this.roomManager.getRoom(data.roomId);
      if (!room) return callback && callback({ success: false, message: 'Room not found' });
      
      const player = room.players.find(p => p.id === data.playerId);
      if (!player) return callback && callback({ success: false, message: 'Player not in room' });

      if (!data.text || data.text.trim().length === 0) return callback && callback({ success: false, message: 'Empty message' });
      let safeText = data.text.trim();
      if (safeText.length > 500) safeText = safeText.substring(0, 500);

      const message: ChatMessage = {
        id: uuidv4(),
        playerId: player.id,
        playerName: player.name,
        text: safeText,
        timestamp: Date.now()
      };

      room.chat.push(message);
      this.io.to(room.roomId).emit('chat_message', room);
      if (callback) callback({ success: true });
    });

    socket.on('close_session', (data: { roomId: string, playerId: string }, callback) => {
      const room = this.roomManager.getRoom(data.roomId);
      if (!room) return callback && callback({ success: false, message: 'Room not found' });
      if (!room.players.some(p => p.id === data.playerId)) return callback && callback({ success: false, message: 'Unauthorized' });
      
      this.io.to(room.roomId).emit('session_closed');
      const playerIds = room.players.map(p => p.id);
      playerIds.forEach(id => this.roomManager.leaveRoom(room.roomId, id));
      
      if (callback) callback({ success: true });
    });

    socket.on('make_move', (data: { roomId: string, playerId: string, move: any }, callback) => {
      const room = this.roomManager.getRoom(data.roomId);
      if (!room || !room.activeGame) {
        if (callback) callback({ success: false, message: 'Game not found' });
        return;
      }
      if (!room.players.some(p => p.id === data.playerId)) return callback && callback({ success: false, message: 'Unauthorized' });

      const result = room.activeGame === 'memory-match' 
        ? this.memoryMatch.handleMove(room, data.playerId, data.move)
        : this.ticTacToe.handleMove(room, data.playerId, data.move);

      if (result.success) {
        this.io.to(room.roomId).emit('game_state_updated', room);
      } else {
        socket.emit('error', result.message);
      }
      if (callback) callback(result);
    });

    socket.on('resolve_turn', (data: { roomId: string, playerId: string }, callback) => {
      const room = this.roomManager.getRoom(data.roomId);
      if (!room || room.activeGame !== 'memory-match') {
        if (callback) callback({ success: false, message: 'Invalid resolve turn' });
        return;
      }
      if (!room.players.some(p => p.id === data.playerId)) return callback && callback({ success: false, message: 'Unauthorized' });

      const result = this.memoryMatch.handleResolveTurn(room, data.playerId);
      if (result.success) {
        this.io.to(room.roomId).emit('game_state_updated', room);
      }
      if (callback) callback(result);
    });

    socket.on('ready_for_next_round', (data: { roomId: string, playerId: string }, callback) => {
      const room = this.roomManager.getRoom(data.roomId);
      if (!room || !room.activeGame) return callback && callback({ success: false, message: 'Game not found' });
      if (!room.players.some(p => p.id === data.playerId)) return callback && callback({ success: false, message: 'Unauthorized' });

      const result = room.activeGame === 'memory-match'
        ? this.memoryMatch.handleReady(room, data.playerId)
        : this.ticTacToe.handleReady(room, data.playerId);

      if (result.success) {
        this.io.to(room.roomId).emit('game_state_updated', room);
      }
      if (callback) callback(result);
    });

    socket.on('leave_room', (data: { roomId: string, playerId: string }) => {
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
    socket.on('webrtc_offer', (data: { roomId: string, sdp: string, from: string }) => {
      socket.to(data.roomId).emit('webrtc_offer', data);
    });

    socket.on('webrtc_answer', (data: { roomId: string, sdp: string, from: string }) => {
      socket.to(data.roomId).emit('webrtc_answer', data);
    });

    socket.on('webrtc_ice_candidate', (data: { roomId: string, candidate: any, from: string }) => {
      socket.to(data.roomId).emit('webrtc_ice_candidate', data);
    });

    socket.on('ready_for_offer', (data: { roomId: string, from: string }) => {
      socket.to(data.roomId).emit('ready_for_offer', data);
    });
  }
}
