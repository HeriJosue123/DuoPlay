import { Server, Socket } from 'socket.io';
import { RoomManager } from '../rooms/RoomManager';
import { UnoEngine } from '../games/UnoEngine';
import type { Player, Room, ChatMessage, UnoColor } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class SocketManager {
  private io: Server;
  private roomManager: RoomManager;
  private unoEngine: UnoEngine;

  constructor(io: Server) {
    this.io = io;
    this.roomManager = new RoomManager();
    this.unoEngine = new UnoEngine();

    this.io.on('connection', (socket: Socket) => {
      console.log('User connected:', socket.id);
      this.handleConnection(socket);
    });
  }

  private emitSanitizedState(roomId: string) {
    const room = this.roomManager.getRoom(roomId);
    if (!room || !room.gameState) return;
    
    room.players.forEach(p => {
      const safeState = this.unoEngine.getSanitizedState(room, p.id);
      this.io.to(p.socketId).emit('game_state_updated', safeState);
    });
  }

  private broadcastRoomUpdate(room: Room, event: string) {
    // Emits the room object to all players, but sanitizes the gameState per player if it exists
    room.players.forEach(p => {
      const roomCopy = { ...room };
      if (roomCopy.gameState) {
        roomCopy.gameState = this.unoEngine.getSanitizedState(room, p.id) as any;
      }
      this.io.to(p.socketId).emit(event, roomCopy);
    });
  }

  private handleConnection(socket: Socket) {
    socket.on('create_room', (data: { playerName: string, playerId: string, maxPlayers: number }, callback) => {
      const player: Player = {
        id: data.playerId,
        name: data.playerName,
        socketId: socket.id,
        connected: true
      };
      
      const room = this.roomManager.createRoom(player, data.maxPlayers || 4);
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
        
        const room = result.room;
        this.broadcastRoomUpdate(room, 'player_joined');
        
        // Reconnection scenario: sanitize room for the callback so client gets their hand and doesn't leak others
        const safeRoom = {
          ...room,
          gameState: room.gameState ? this.unoEngine.getSanitizedState(room, player.id) : undefined
        };
        
        callback({ success: true, room: safeRoom });
      } else {
        callback({ success: false, message: result.message });
      }
    });

    socket.on('start_game', (data: { roomId: string, playerId: string }, callback) => {
      const room = this.roomManager.getRoom(data.roomId);
      if (!room) return callback && callback({ success: false, message: 'Room not found' });
      // Usually only host (players[0]) can start, but let's allow any for now or verify
      if (room.players[0].id !== data.playerId) return callback && callback({ success: false, message: 'Only host can start' });
      if (room.players.length < 2) return callback && callback({ success: false, message: 'Need at least 2 players' });

      this.unoEngine.initGame(room);
      this.broadcastRoomUpdate(room, 'game_started');
      this.emitSanitizedState(room.roomId); // sanitized state broadcast
      
      if (callback) callback({ success: true });
    });

    socket.on('play_card', (data: { roomId: string, playerId: string, cardId: string, chosenColor?: UnoColor, targetPlayerId?: string }, callback) => {
      const room = this.roomManager.getRoom(data.roomId);
      if (!room) return callback && callback({ success: false, message: 'Room not found' });
      
      const result = this.unoEngine.playCard(room, data.playerId, data.cardId, data.chosenColor, data.targetPlayerId);
      if (result.success) {
        this.emitSanitizedState(room.roomId);
      }
      if (callback) callback(result);
    });

    socket.on('draw_card', (data: { roomId: string, playerId: string }, callback) => {
      const room = this.roomManager.getRoom(data.roomId);
      if (!room) return callback && callback({ success: false, message: 'Room not found' });
      
      const result = this.unoEngine.drawCard(room, data.playerId);
      if (result.success) {
        this.emitSanitizedState(room.roomId);
      }
      if (callback) callback(result);
    });

    socket.on('pass_turn', (data: { roomId: string, playerId: string }, callback) => {
      const room = this.roomManager.getRoom(data.roomId);
      if (!room) return callback && callback({ success: false, message: 'Room not found' });
      
      const result = this.unoEngine.passTurn(room, data.playerId);
      if (result.success) {
        this.emitSanitizedState(room.roomId);
      }
      if (callback) callback(result);
    });

    socket.on('call_uno', (data: { roomId: string, playerId: string }, callback) => {
      const room = this.roomManager.getRoom(data.roomId);
      if (!room) return callback && callback({ success: false, message: 'Room not found' });
      
      const result = this.unoEngine.callUno(room, data.playerId);
      if (result.success) {
        this.emitSanitizedState(room.roomId);
      }
      if (callback) callback(result);
    });

    socket.on('catch_uno', (data: { roomId: string, playerId: string, targetId: string }, callback) => {
      const room = this.roomManager.getRoom(data.roomId);
      if (!room) return callback && callback({ success: false, message: 'Room not found' });
      
      const result = this.unoEngine.catchUno(room, data.playerId, data.targetId);
      if (result.success) {
        this.emitSanitizedState(room.roomId);
      }
      if (callback) callback(result);
    });

    socket.on('challenge_draw_four', (data: { roomId: string, playerId: string, challenge: boolean }, callback) => {
      const room = this.roomManager.getRoom(data.roomId);
      if (!room) return callback && callback({ success: false, message: 'Room not found' });
      
      const result = this.unoEngine.challengeDrawFour(room, data.playerId, data.challenge);
      if (result.success) {
        this.emitSanitizedState(room.roomId);
      }
      if (callback) callback(result);
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
      this.broadcastRoomUpdate(room, 'chat_message');
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

    socket.on('leave_room', (data: { roomId: string, playerId: string }) => {
      const result = this.roomManager.leaveRoom(data.roomId, data.playerId);
      if (result.room && !result.wasDestroyed) {
        this.broadcastRoomUpdate(result.room, 'player_left');
      }
      socket.leave(data.roomId);
    });

    socket.on('disconnect', () => {
      const result = this.roomManager.handleDisconnect(socket.id, (room, playerId) => {
        const leaveResult = this.roomManager.leaveRoom(room.roomId, playerId);
        if (leaveResult.room && !leaveResult.wasDestroyed) {
          this.broadcastRoomUpdate(leaveResult.room, 'player_left');
        }
      });
      
      if (result.room) {
        this.broadcastRoomUpdate(result.room, 'player_disconnected');
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
