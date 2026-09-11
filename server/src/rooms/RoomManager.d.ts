import { Room, Player } from '../types';
export declare class RoomManager {
    private rooms;
    createRoom(player: Player): Room;
    joinRoom(roomId: string, player: Player): {
        success: boolean;
        room?: Room;
        message?: string;
    };
    getRoom(roomId: string): Room | undefined;
    getRoomBySocketId(socketId: string): Room | undefined;
    removePlayer(socketId: string): {
        room?: Room;
        wasDestroyed: boolean;
    };
    private generateRoomId;
}
//# sourceMappingURL=RoomManager.d.ts.map