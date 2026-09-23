export * from './uno';
import type { UnoGameStateSanitized } from './uno';

export interface Player {
  id: string; // Persistent ID from client
  name: string;
  socketId: string;
  connected: boolean;
  disconnectExpiresAt?: number;
}

export interface Score {
  [playerId: string]: number;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  text: string;
  timestamp: number;
}

// Global Match State (keeps track of rounds in a generic way)
export interface MatchState {
  round: number;
  readyPlayers: string[]; 
}

export interface Room {
  roomId: string;
  players: Player[];
  activeGame: 'uno' | null;
  chat: ChatMessage[];
  settings: {
    maxPlayers: number;
  };
  status: 'waiting' | 'playing' | 'finished';
  matchState: MatchState | null;
  gameState: UnoGameStateSanitized | null; // Typed strictly to Uno
  currentTurn: string | null;
}
