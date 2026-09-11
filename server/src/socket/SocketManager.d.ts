import { Server } from 'socket.io';
export declare class SocketManager {
    private io;
    private roomManager;
    private ticTacToe;
    constructor(io: Server);
    private handleConnection;
    private handleDisconnect;
}
//# sourceMappingURL=SocketManager.d.ts.map