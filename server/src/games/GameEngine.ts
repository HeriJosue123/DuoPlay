import type { Room } from '../types';

export interface GameEngine {
  initGame(room: Room): void;
  handleMove(room: Room, playerId: string, move: { index: number }): { success: boolean, message?: string };
  checkGameOver(room: Room): void;
  handleReady(room: Room, playerId: string): { success: boolean, message?: string };
}
