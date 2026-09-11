import { GameEngine } from './GameEngine';
import { Room } from '../types';
export declare class TicTacToe implements GameEngine {
    initGame(room: Room): void;
    handleMove(room: Room, playerSocketId: string, move: any): {
        success: boolean;
        message?: string;
    };
    checkGameOver(room: Room): void;
}
//# sourceMappingURL=TicTacToe.d.ts.map