import { Server, Socket } from 'socket.io';
import { RoomManager } from '../rooms/RoomManager';
import { TicTacToe } from '../games/TicTacToe';
import { MemoryMatch } from '../games/MemoryMatch';
import type { Player } from '../types';

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
    socket.on('create_room', (data: { playerName: string, playerId: string, totalRounds?: number, gameId?: string }, callback) => {
      const player: Player = {
        id: data.playerId,
        name: data.playerName,
        socketId: socket.id,
        connected: true
      };
      const rounds = data.totalRounds || 5;
      const gameId = data.gameId || 'tic-tac-toe';
      const room = this.roomManager.createRoom(player, rounds, gameId);
      socket.join(room.roomId);
      console.log(`Room created: ${room.roomId} by ${player.name} (${rounds} rounds, game: ${gameId})`);
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
        
        // Notify others
        socket.to(result.room.roomId).emit('player_joined', result.room);
        
        callback({ success: true, room: result.room });
      } else {
        callback({ success: false, message: result.message });
      }
    });

    socket.on('start_game', (data: { roomId: string, playerId: string }, callback) => {
      const room = this.roomManager.getRoom(data.roomId);
      if (!room) return callback({ success: false, message: 'Room not found' });
      if (room.players.length !== 2) return callback({ success: false, message: 'Need 2 players to start' });
      
      if (room.selectedGame === 'memory-match') {
        this.memoryMatch.initGame(room);
      } else {
        this.ticTacToe.initGame(room);
      }
      this.io.to(room.roomId).emit('game_started', room);
      if (callback) callback({ success: true });
    });

    socket.on('make_move', (data: { roomId: string, playerId: string, move: any }, callback) => {
      const room = this.roomManager.getRoom(data.roomId);
      if (!room) {
        if (callback) callback({ success: false, message: 'Room not found' });
        return;
      }

      const result = room.selectedGame === 'memory-match' 
        ? this.memoryMatch.handleMove(room, data.playerId, data.move)
        : this.ticTacToe.handleMove(room, data.playerId, data.move);

      if (result.success) {
        this.io.to(room.roomId).emit('game_state_updated', room);
      } else {
        socket.emit('error', result.message);
      }
      if (callback) callback(result);
    });

    socket.on('ready_for_next_round', (data: { roomId: string, playerId: string }, callback) => {
      const room = this.roomManager.getRoom(data.roomId);
      if (!room) return callback({ success: false, message: 'Room not found' });

      const result = room.selectedGame === 'memory-match'
        ? this.memoryMatch.handleReady(room, data.playerId)
        : this.ticTacToe.handleReady(room, data.playerId);

      if (result.success) {
        this.io.to(room.roomId).emit('game_state_updated', room);
      }
      if (callback) callback(result);
    });

    socket.on('resolve_turn', (data: { roomId: string, playerId: string }, callback) => {
      const room = this.roomManager.getRoom(data.roomId);
      if (!room || room.selectedGame !== 'memory-match') {
        if (callback) callback({ success: false, message: 'Invalid room or game' });
        return;
      }

      const result = this.memoryMatch.handleResolveTurn(room, data.playerId);
      if (result.success) {
        this.io.to(room.roomId).emit('game_state_updated', room);
      } else {
        socket.emit('error', result.message);
      }
      if (callback) callback(result);
    });
    
    socket.on('leave_room', (data: { roomId: string, playerId: string }) => {
      const { room, wasDestroyed } = this.roomManager.leaveRoom(data.roomId, data.playerId);
      if (room && !wasDestroyed) {
        this.io.to(room.roomId).emit('player_left', room);
      }
      socket.leave(data.roomId);
    });

    socket.on('webrtc_signal', (data: { roomId: string, playerId: string, signal: any }) => {
      // Validate that room and player exist before broadcasting
      const room = this.roomManager.getRoom(data.roomId);
      if (room && room.players.some(p => p.id === data.playerId)) {
        console.log(`[VOICE SERVER] Forwarding ${data.signal.type} from ${data.playerId} in room ${data.roomId}`);
        // Broadcast the signal to the other player in the room
        socket.to(data.roomId).emit('webrtc_signal', {
          playerId: data.playerId,
          signal: data.signal
        });
      } else {
        console.warn(`[VOICE SERVER] Ignored signal from ${data.playerId} - Room or player not found`);
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      
      const { room, player } = this.roomManager.handleDisconnect(socket.id, (timeoutRoom, timeoutPlayerId) => {
        // This runs if they don't reconnect in 10s
        console.log(`Player ${timeoutPlayerId} permanently left due to timeout`);
        const { room: updatedRoom, wasDestroyed } = this.roomManager.leaveRoom(timeoutRoom.roomId, timeoutPlayerId);
        if (updatedRoom && !wasDestroyed) {
          this.io.to(timeoutRoom.roomId).emit('player_left', updatedRoom);
        }
      });

      if (room && player) {
        this.io.to(room.roomId).emit('player_disconnected', room);
      }
    });
  }
}
