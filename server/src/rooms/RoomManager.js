"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomManager = void 0;
const types_1 = require("../types");
class RoomManager {
    rooms = new Map();
    createRoom(player) {
        const roomId = this.generateRoomId();
        const room = {
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
    joinRoom(roomId, player) {
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
    getRoom(roomId) {
        return this.rooms.get(roomId);
    }
    getRoomBySocketId(socketId) {
        for (const room of this.rooms.values()) {
            if (room.players.some(p => p.socketId === socketId)) {
                return room;
            }
        }
        return undefined;
    }
    removePlayer(socketId) {
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
    generateRoomId() {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        // ensure unique
        if (this.rooms.has(result))
            return this.generateRoomId();
        return result;
    }
}
exports.RoomManager = RoomManager;
//# sourceMappingURL=RoomManager.js.map