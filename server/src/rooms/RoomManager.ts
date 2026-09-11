import { Room, Player } from '../types';

export class RoomManager {
  private rooms: Map<string, Room> = new Map();

  createRoom(player: Player): Room {
    const roomId = this.generateRoomId();
    const room: Room = {
      roomId,
      players: [player],
      selectedGame: 'tic-tac-toe', // default for now
      status: 'waiting',
      gameState: null,
      currentTurn: null,
      winner: null,
    };
    this.rooms.set(roomId, room);
    return room;
  }

  joinRoom(roomId: string, player: Player): { success: boolean, room?: Room, message?: string } {
    const room = this.rooms.get(roomId);
    if (!room) {
      return { success: false, message: 'Room does not exist' };
    }
    if (room.players.length >= 2) {
      return { success: false, message: 'Room is full' };
    }
    
    room.players.push(player);
    return { success: true, room };
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  getRoomBySocketId(socketId: string): Room | undefined {
    for (const room of this.rooms.values()) {
      if (room.players.some(p => p.socketId === socketId)) {
        return room;
      }
    }
    return undefined;
  }

  removePlayer(socketId: string): { room?: Room, wasDestroyed: boolean } {
    for (const [roomId, room] of this.rooms.entries()) {
      const playerIndex = room.players.findIndex(p => p.socketId === socketId);
      if (playerIndex !== -1) {
        room.players.splice(playerIndex, 1);
        if (room.players.length === 0) {
          this.rooms.delete(roomId);
          return { room, wasDestroyed: true };
        }
        return { room, wasDestroyed: false };
      }
    }
    return { wasDestroyed: false };
  }

  private generateRoomId(): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    // ensure unique
    if (this.rooms.has(result)) return this.generateRoomId();
    return result;
  }
}
