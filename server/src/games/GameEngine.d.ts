import { Room } from '../types';
export interface GameEngine {
    initGame(room: Room): void;
    handleMove(room: Room, playerSocketId: string, move: any): {
        success: boolean;
        message?: string;
    };
    checkGameOver(room: Room): void;
}
//# sourceMappingURL=GameEngine.d.ts.map