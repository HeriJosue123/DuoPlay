export interface Player {
  id: string; 
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

export interface Score {
  [playerId: string]: number;
}

export interface MatchState {
  round: number;
  score: Score;
  targetScore: number;
  symbolAssignments: { [playerId: string]: PlayerSymbol };
  roundWinner: string | null | 'draw';
  matchWinner: string | null;
  status: 'playing' | 'round_finished' | 'match_finished';
  readyPlayers: string[]; 
}

export interface Room {
  roomId: string;
  players: Player[];
  selectedGame: 'tic-tac-toe' | null;
  status: 'waiting' | 'playing' | 'finished';
  matchState: MatchState | null;
  gameState: TicTacToeState | null;
  currentTurn: string | null;
}
