export interface Player {
  id: string;
  name: string;
  socketId: string;
}

export interface Room {
  roomId: string;
  players: Player[];
  selectedGame: 'tic-tac-toe' | null;
  status: 'waiting' | 'playing' | 'finished';
  gameState: any;
  currentTurn: string | null;
  winner: string | null | 'draw';
}
