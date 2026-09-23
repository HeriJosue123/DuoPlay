export type UnoColor = 'red' | 'blue' | 'green' | 'yellow' | 'wild';

export type UnoValue = 
  | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
  | 'skip'
  | 'skip_everyone'
  | 'reverse'
  | 'draw_two'
  | 'draw_four'
  | 'discard_all'
  | 'wild_color_roulette'
  | 'wild_reverse_draw_four'
  | 'wild_draw_six'
  | 'wild_draw_ten';

export interface UnoCard {
  id: string;
  color: UnoColor;
  value: UnoValue;
}

export interface UnoPlayerState {
  id: string;
  name: string;
  hand: UnoCard[];
  hasCalledUno: boolean;
  canBeCaughtUno: boolean;
  score: number;
  isEliminated: boolean;
  cardsDrawnThisTurn: number;
}

export interface UnoGameState {
  players: UnoPlayerState[];
  drawPile: UnoCard[];
  discardPile: UnoCard[];
  currentTurnIndex: number;
  direction: 1 | -1;
  currentColor: UnoColor;
  status: 'waiting' | 'playing' | 'round_end' | 'match_end';
  actionRequiredFrom: string | null;
  playerWhoDrew: string | null;
  drawnCardPlayable: UnoCard | null;
  roundWinner: string | null;
  matchWinner: string | null;
  
  // No Mercy specific states
  stackValue: number;
  eliminatedPlayersThisRound: string[];
  setAsidePile: UnoCard[];
}

export interface UnoPlayerSanitized {
  id: string;
  name: string;
  cardCount: number;
  hasCalledUno: boolean;
  canBeCaughtUno: boolean;
  score: number;
  isEliminated: boolean;
}

export interface UnoGameStateSanitized {
  players: UnoPlayerSanitized[];
  discardPile: UnoCard[];
  drawPileCount: number;
  currentTurnIndex: number;
  direction: 1 | -1;
  currentColor: UnoColor;
  status: UnoGameState['status'];
  actionRequiredFrom: string | null;
  playerWhoDrew: string | null;
  drawnCardPlayable: UnoCard | null;
  roundWinner: string | null;
  matchWinner: string | null;
  stackValue: number;
  
  myHand: UnoCard[];
}
