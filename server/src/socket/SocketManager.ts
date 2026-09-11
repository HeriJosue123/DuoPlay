import { Server, Socket } from 'socket.io';
import { RoomManager } from '../rooms/RoomManager';
import { TicTacToe } from '../games/TicTacToe';
import type { Player } from '../types';

export class SocketManager {
  private io: Server;
  private roomManager: RoomManager;
  private ticTacToe: TicTacToe;

  constructor(io: Server) {
    this.io = io;
    this.roomManager = new RoomManager();
    this.ticTacToe = new TicTacToe();

    this.io.on('connection', (socket: Socket) => {
      console.log('User connected:', socket.id);
      this.handleConnection(socket);
    });
  }

  private handleConnection(socket: Socket) {
    socket.on('create_room', (data: { playerName: string, playerId: string, totalRounds?: number }, callback) => {
      const player: Player = {
        id: data.playerId,
        name: data.playerName,
        socketId: socket.id,
        connected: true
      };
      const rounds = data.totalRounds || 5;
      const room = this.roomManager.createRoom(player, rounds);
      socket.join(room.roomId);
      console.log(`Room created: ${room.roomId} by ${player.name} (${rounds} rounds)`);
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
      
      this.ticTacToe.initGame(room);
      this.io.to(room.roomId).emit('game_started', room);
      callback({ success: true });
    });

    socket.on('make_move', (data: { roomId: string, playerId: string, move: any }, callback) => {
      const room = this.roomManager.getRoom(data.roomId);
      if (!room) {
        if (callback) callback({ success: false, message: 'Room not found' });
        return;
      }

      const result = this.ticTacToe.handleMove(room, data.playerId, data.move);
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

      const result = this.ticTacToe.handleReady(room, data.playerId);
      if (result.success) {
        this.io.to(room.roomId).emit('game_state_updated', room);
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
        // Broadcast the signal to the other player in the room
        socket.to(data.roomId).emit('webrtc_signal', {
          playerId: data.playerId,
          signal: data.signal
        });
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
