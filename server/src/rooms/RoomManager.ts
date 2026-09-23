import type { Room, Player } from '../types';

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private disconnectTimers: Map<string, NodeJS.Timeout> = new Map();

  public createRoom(host: Player, maxPlayers: number = 6): Room {
    const roomId = this.generateRoomId();
    host.connected = true;
    // Default to maximum 6 if not explicitly provided or outside bounds
    const validMax = Math.min(Math.max(maxPlayers, 2), 6);
    
    const newRoom: Room = {
      roomId,
      players: [host],
      activeGame: 'uno',
      chat: [],
      settings: { maxPlayers: validMax },
      status: 'waiting',
      matchState: null,
      gameState: null,
      currentTurn: null,
    };
    this.rooms.set(roomId, newRoom);
    return newRoom;
  }

  joinRoom(roomId: string, player: Player): { success: boolean, room?: Room, message?: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, message: 'Room does not exist' };
    
    // Check if player is already in room (reconnection)
    const existingPlayer = room.players.find(p => p.id === player.id);
    if (existingPlayer) {
      existingPlayer.socketId = player.socketId;
      existingPlayer.connected = true;
      existingPlayer.name = player.name;
      existingPlayer.disconnectExpiresAt = undefined;
      this.clearDisconnectTimer(existingPlayer.id);
      return { success: true, room };
    }

    if (room.players.length >= room.settings.maxPlayers) {
      return { success: false, message: 'Room is full' };
    }
    
    if (room.status !== 'waiting') {
      return { success: false, message: 'Game has already started' };
    }

    player.connected = true;
    room.players.push(player);
    return { success: true, room };
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  getRoomByPlayerId(playerId: string): Room | undefined {
    for (const room of this.rooms.values()) {
      if (room.players.some(p => p.id === playerId)) return room;
    }
    return undefined;
  }

  getRoomBySocketId(socketId: string): Room | undefined {
    for (const room of this.rooms.values()) {
      if (room.players.some(p => p.socketId === socketId)) return room;
    }
    return undefined;
  }

  getPlayerBySocketId(socketId: string): Player | undefined {
    const room = this.getRoomBySocketId(socketId);
    return room?.players.find(p => p.socketId === socketId);
  }

  leaveRoom(roomId: string, playerId: string): { room?: Room, wasDestroyed: boolean } {
    const room = this.rooms.get(roomId);
    if (!room) return { wasDestroyed: false };

    this.clearDisconnectTimer(playerId);
    const playerIndex = room.players.findIndex(p => p.id === playerId);
    
    if (playerIndex !== -1) {
      room.players.splice(playerIndex, 1);
      if (room.players.length === 0) {
        this.rooms.delete(roomId);
        return { room, wasDestroyed: true };
      }
      return { room, wasDestroyed: false };
    }
    return { wasDestroyed: false };
  }

  handleDisconnect(socketId: string, onTimeout: (room: Room, playerId: string) => void): { room?: Room, player?: Player } {
    const room = this.getRoomBySocketId(socketId);
    const player = room?.players.find(p => p.socketId === socketId);
    
    if (room && player) {
      player.connected = false;
      player.disconnectExpiresAt = Date.now() + 120000; // 120 seconds to reconnect
      
      const timer = setTimeout(() => {
        onTimeout(room, player.id);
      }, 120000); 
      
      this.disconnectTimers.set(player.id, timer);
      return { room, player };
    }
    
    return {};
  }

  private clearDisconnectTimer(playerId: string) {
    const timer = this.disconnectTimers.get(playerId);
    if (timer) {
      clearTimeout(timer);
      this.disconnectTimers.delete(playerId);
    }
  }

  private generateRoomId(): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    if (this.rooms.has(result)) return this.generateRoomId();
    return result;
  }
}
