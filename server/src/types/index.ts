export interface Player {
  id: string; // Persistent ID from client
  name: string;
  socketId: string;
  connected: boolean;
  disconnectExpiresAt?: number;
}

export type PlayerSymbol = 'X' | 'O';
export type BoardState = (PlayerSymbol | null)[];

export interface TicTacToeState {
  board: BoardState;
  winningLine: number[] | null;
}

export interface MemoryMatchCard {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

export interface MemoryMatchState {
  board: MemoryMatchCard[];
  firstSelection: number | null;
  secondSelection: number | null;
  isProcessing: boolean;
  pairsFound: { [playerId: string]: number };
}

export interface Score {
  [playerId: string]: number;
}

export interface MatchState {
  round: number;
  totalRounds: number;
  score: Score;
  symbolAssignments: { [playerId: string]: PlayerSymbol }; // Still used for tic-tac-toe, could be abstracted later
  roundWinner: string | null | 'draw';
  matchWinner: string | null | 'draw';
  status: 'playing' | 'round_finished' | 'match_finished';
  readyPlayers: string[]; 
}

export interface Room {
  roomId: string;
  players: Player[];
  selectedGame: 'tic-tac-toe' | 'memory-match' | null;
  settings: {
    totalRounds: number;
  };
  status: 'waiting' | 'playing' | 'finished';
  matchState: MatchState | null;
  gameState: TicTacToeState | MemoryMatchState | null;
  currentTurn: string | null;
}
