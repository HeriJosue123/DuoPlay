export interface Player {
  id: string; // Persistent ID from client
  name: string;
  socketId: string;
  connected: boolean;
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
  readyPlayers: string[]; // array of playerIds who are ready for next round/rematch
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
