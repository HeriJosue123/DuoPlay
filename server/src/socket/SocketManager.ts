import { Server, Socket } from 'socket.io';
import { RoomManager } from '../rooms/RoomManager';
import { TicTacToe } from '../games/TicTacToe';
import { Player } from '../types';

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
    socket.on('create_room', (data: { playerName: string }, callback) => {
      const player: Player = {
        id: socket.id, // Using socket ID as player ID for simplicity, though could generate UUID
        name: data.playerName,
        socketId: socket.id,
      };
      const room = this.roomManager.createRoom(player);
      socket.join(room.roomId);
      console.log(`Room created: ${room.roomId} by ${player.name}`);
      callback({ success: true, room });
    });

    socket.on('join_room', (data: { playerName: string, roomId: string }, callback) => {
      const player: Player = {
        id: socket.id,
        name: data.playerName,
        socketId: socket.id,
      };
      
      const result = this.roomManager.joinRoom(data.roomId.toUpperCase(), player);
      
      if (result.success && result.room) {
        socket.join(result.room.roomId);
        console.log(`Player ${player.name} joined room ${result.room.roomId}`);
        
        // Notify others in room
        socket.to(result.room.roomId).emit('player_joined', result.room);
        
        callback({ success: true, room: result.room });
      } else {
        callback({ success: false, message: result.message });
      }
    });

    socket.on('start_game', (data: { roomId: string }, callback) => {
      const room = this.roomManager.getRoom(data.roomId);
      if (!room) return callback({ success: false, message: 'Room not found' });
      if (room.players.length !== 2) return callback({ success: false, message: 'Need 2 players to start' });
      
      this.ticTacToe.initGame(room);
      this.io.to(room.roomId).emit('game_started', room);
      callback({ success: true });
    });

    socket.on('make_move', (data: { roomId: string, move: any }, callback) => {
      const room = this.roomManager.getRoom(data.roomId);
      if (!room) return callback({ success: false, message: 'Room not found' });

      const result = this.ticTacToe.handleMove(room, socket.id, data.move);
      if (result.success) {
        this.io.to(room.roomId).emit('game_state_updated', room);
        if (room.status === 'finished') {
          this.io.to(room.roomId).emit('game_over', room);
        }
      } else {
        socket.emit('error', result.message);
      }
      if (callback) callback(result);
    });

    socket.on('request_rematch', (data: { roomId: string }, callback) => {
      const room = this.roomManager.getRoom(data.roomId);
      if (!room) return callback({ success: false, message: 'Room not found' });
      
      // We can directly restart for simplicity if someone requests rematch
      this.ticTacToe.initGame(room);
      this.io.to(room.roomId).emit('game_started', room);
      callback({ success: true });
    });
    
    socket.on('leave_room', () => {
      this.handleDisconnect(socket);
    });

    socket.on('disconnect', () => {
      this.handleDisconnect(socket);
      console.log('User disconnected:', socket.id);
    });
  }

  private handleDisconnect(socket: Socket) {
    const { room, wasDestroyed } = this.roomManager.removePlayer(socket.id);
    if (room && !wasDestroyed) {
      this.io.to(room.roomId).emit('player_left', room);
    }
  }
}
