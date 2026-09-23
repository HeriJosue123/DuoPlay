import { v4 as uuidv4 } from 'uuid';
import type { Room, UnoCard, UnoColor, UnoValue, UnoGameState, UnoPlayerState, UnoGameStateSanitized } from '../types';

export class UnoEngine {

  public initGame(room: Room) {
    const deck = this.createDeck();
    this.shuffle(deck);

    const players: UnoPlayerState[] = room.players.map(p => ({
      id: p.id,
      name: p.name,
      hand: [],
      hasCalledUno: false,
      canBeCaughtUno: false,
      score: 0,
      isEliminated: false,
      cardsDrawnThisTurn: 0
    }));

    // Deal 7 cards
    for (let i = 0; i < 7; i++) {
      players.forEach(p => {
        p.hand.push(deck.pop()!);
      });
    }

    // Draw first card (MUST be a number 0-9)
    let firstCard = deck.pop()!;
    while (!['0','1','2','3','4','5','6','7','8','9'].includes(firstCard.value as string)) {
      deck.unshift(firstCard);
      this.shuffle(deck);
      firstCard = deck.pop()!;
    }
    
    const discardPile = [firstCard];

    let currentTurnIndex = 0; // Host starts
    let direction: 1 | -1 = 1;
    let currentColor = firstCard.color;

    room.status = 'playing';
    room.gameState = {
      players,
      drawPile: deck,
      discardPile,
      currentTurnIndex,
      direction,
      currentColor,
      status: 'playing',
      actionRequiredFrom: null,
      playerWhoDrew: null,
      drawnCardPlayable: null,
      roundWinner: null,
      matchWinner: null,
      stackValue: 0,
      eliminatedPlayersThisRound: [],
      setAsidePile: []
    } as UnoGameState;
  }

  private createDeck(): UnoCard[] {
    const colors: UnoColor[] = ['red', 'blue', 'green', 'yellow'];
    const deck: UnoCard[] = [];

    colors.forEach(color => {
      // Numbers 0-9 (2 each)
      ['0','1','2','3','4','5','6','7','8','9'].forEach(val => {
        deck.push({ id: uuidv4(), color, value: val as UnoValue });
        deck.push({ id: uuidv4(), color, value: val as UnoValue });
      });
      // Skip, Reverse, Discard All (3 each)
      ['skip', 'reverse', 'discard_all'].forEach(val => {
        deck.push({ id: uuidv4(), color, value: val as UnoValue });
        deck.push({ id: uuidv4(), color, value: val as UnoValue });
        deck.push({ id: uuidv4(), color, value: val as UnoValue });
      });
      // Skip Everyone, Draw 4 (colored) (2 each)
      ['skip_everyone', 'draw_four'].forEach(val => {
        deck.push({ id: uuidv4(), color, value: val as UnoValue });
        deck.push({ id: uuidv4(), color, value: val as UnoValue });
      });
      // Draw 2 (3 each)
      deck.push({ id: uuidv4(), color, value: 'draw_two' });
      deck.push({ id: uuidv4(), color, value: 'draw_two' });
      deck.push({ id: uuidv4(), color, value: 'draw_two' });
    });

    // Wilds
    for (let i = 0; i < 8; i++) {
      deck.push({ id: uuidv4(), color: 'wild', value: 'wild_color_roulette' });
      deck.push({ id: uuidv4(), color: 'wild', value: 'wild_reverse_draw_four' });
    }
    for (let i = 0; i < 4; i++) {
      deck.push({ id: uuidv4(), color: 'wild', value: 'wild_draw_six' });
      deck.push({ id: uuidv4(), color: 'wild', value: 'wild_draw_ten' });
    }
    
    return deck;
  }

  private shuffle(array: any[]) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  private recycleDiscardPile(state: UnoGameState) {
    if (state.drawPile.length > 0) return;
    if (state.discardPile.length <= 1 && state.setAsidePile.length === 0) return; // Rare infinite loop prevention
    
    const topCard = state.discardPile.pop()!;
    // Bring both discard pile and set aside (Mercy) cards back into the draw pile
    state.drawPile = [...state.discardPile, ...state.setAsidePile];
    
    state.discardPile = [topCard];
    state.setAsidePile = [];
    
    state.drawPile.forEach(c => {
      if ((c.value as string).includes('wild')) c.color = 'wild';
    });
    
    this.shuffle(state.drawPile);
  }

  private getActivePlayers(state: UnoGameState): UnoPlayerState[] {
    return state.players.filter(p => !p.isEliminated);
  }

  private getNextTurnIndex(state: UnoGameState, steps: number = 1): number {
    let nextIndex = state.currentTurnIndex;
    const len = state.players.length;
    let activeSteps = 0;
    
    if (this.getActivePlayers(state).length <= 1) return nextIndex;

    while (activeSteps < steps) {
      nextIndex = (nextIndex + state.direction + len) % len;
      if (!state.players[nextIndex].isEliminated) {
        activeSteps++;
      }
    }
    return nextIndex;
  }
  
  private checkEliminationsAndWin(state: UnoGameState) {
    if (state.status !== 'playing') return;
    
    // Mercy Rule: >= 25 cards exact check
    let eliminationsHappened = false;
    state.players.forEach(p => {
      if (!p.isEliminated && p.hand.length >= 25) {
        p.isEliminated = true;
        state.eliminatedPlayersThisRound.push(p.id);
        // Set aside! Not discard pile directly.
        state.setAsidePile.push(...p.hand);
        p.hand = [];
        eliminationsHappened = true;
      }
    });

    const activePlayers = this.getActivePlayers(state);
    
    // Pass turn if current player was eliminated mid-action
    if (state.players[state.currentTurnIndex].isEliminated && activePlayers.length > 1) {
      state.currentTurnIndex = this.getNextTurnIndex(state, 1);
      state.playerWhoDrew = null;
      state.drawnCardPlayable = null;
    }

    if (activePlayers.length === 1) {
      this.handleRoundEnd(state, activePlayers[0].id);
      return;
    }

    // Win by 0 cards
    const winnerByZero = activePlayers.find(p => p.hand.length === 0);
    if (winnerByZero) {
      this.handleRoundEnd(state, winnerByZero.id);
    }
  }

  private getDrawValue(value: UnoValue): number {
    if (value === 'draw_two') return 2;
    if (value === 'draw_four' || value === 'wild_reverse_draw_four') return 4;
    if (value === 'wild_draw_six') return 6;
    if (value === 'wild_draw_ten') return 10;
    return 0;
  }

  public playCard(room: Room, playerId: string, cardId: string, chosenColor?: UnoColor, targetPlayerId?: string): { success: boolean, message?: string } {
    if (!room.gameState) return { success: false, message: 'Game not started' };
    const state = room.gameState as UnoGameState;
    
    if (state.status !== 'playing') return { success: false, message: 'Not in playing phase' };
    if (state.players[state.currentTurnIndex].id !== playerId) return { success: false, message: 'Not your turn' };
    
    state.players.forEach(p => {
      if (p.id !== playerId) p.canBeCaughtUno = false;
    });

    const player = state.players[state.currentTurnIndex];
    const cardIndex = player.hand.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return { success: false, message: 'Card not in hand' };
    const card = player.hand[cardIndex];

    if (state.playerWhoDrew === playerId && state.drawnCardPlayable && card.id !== state.drawnCardPlayable.id) {
      return { success: false, message: 'You must play the card you just drew' };
    }

    if (state.stackValue > 0) {
      const cardDrawVal = this.getDrawValue(card.value);
      if (cardDrawVal === 0) return { success: false, message: 'Must play a draw card to stack' };
      
      const lastDrawVal = this.getDrawValue(state.discardPile[state.discardPile.length - 1].value);
      if (cardDrawVal < lastDrawVal) return { success: false, message: 'Must play a draw card of equal or higher value' };
    } else {
      const topCard = state.discardPile[state.discardPile.length - 1];
      const isWild = (card.color as string) === 'wild' || (card.value as string).includes('wild');
      const isValid = isWild || card.color === state.currentColor || card.value === topCard.value;
      if (!isValid) return { success: false, message: 'Invalid card played' };
    }

    if ((card.color as string) === 'wild' && !chosenColor) return { success: false, message: 'Must choose a color' };
    if (card.value === '7') {
      if (!targetPlayerId) return { success: false, message: 'Must choose a target to swap hands' };
      if (targetPlayerId === playerId) return { success: false, message: 'Cannot swap with yourself' };
      const target = state.players.find(p => p.id === targetPlayerId);
      if (!target || target.isEliminated) return { success: false, message: 'Invalid or eliminated target' };
    }

    // Discard All logic
    if (card.value === 'discard_all') {
      const matchColor = (card.color as string) === 'wild' ? chosenColor : card.color;
      const otherMatchingCards = player.hand.filter(c => c.color === matchColor && c.id !== cardId);
      player.hand = player.hand.filter(c => c.color !== matchColor);
      state.discardPile.push(...otherMatchingCards);
    } else {
      player.hand.splice(cardIndex, 1);
    }
    
    let nextColor = state.currentColor;
    if ((card.color as string) === 'wild') {
      card.color = chosenColor!;
      nextColor = chosenColor!;
    } else {
      nextColor = card.color;
    }
    
    state.discardPile.push(card);
    state.currentColor = nextColor;
    state.playerWhoDrew = null;
    state.drawnCardPlayable = null;

    if (player.hand.length === 1 && !player.hasCalledUno) {
      player.canBeCaughtUno = true;
    } else if (player.hand.length > 1) {
      player.hasCalledUno = false;
    }

    const activeLen = this.getActivePlayers(state).length;
    const is1v1 = activeLen === 2;
    let nextTurnOffset = 1;

    state.stackValue += this.getDrawValue(card.value);

    // Rules 0 and 7
    if (card.value === '0') {
      const activePlayers = this.getActivePlayers(state);
      const activeIds = activePlayers.map(p => p.id);
      const hands = activePlayers.map(p => p.hand);
      for (let i = 0; i < activePlayers.length; i++) {
        const nextActiveIdx = (i + state.direction + activePlayers.length) % activePlayers.length;
        const targetP = state.players.find(x => x.id === activeIds[nextActiveIdx])!;
        targetP.hand = hands[i];
      }
    }

    if (card.value === '7' && targetPlayerId) {
      const target = state.players.find(p => p.id === targetPlayerId)!;
      const myHand = [...player.hand];
      player.hand = [...target.hand];
      target.hand = myHand;
    }

    // Turn logic
    if (card.value === 'skip') {
      nextTurnOffset = 2;
    } else if (card.value === 'skip_everyone') {
      nextTurnOffset = 0;
    } else if (card.value === 'reverse') {
      state.direction = (state.direction * -1) as 1 | -1;
      if (is1v1) nextTurnOffset = 0; // Acts as skip
    } else if (card.value === 'wild_reverse_draw_four') {
      state.direction = (state.direction * -1) as 1 | -1;
      if (is1v1) {
        nextTurnOffset = 0; // Hits the player who played it!
      } else {
        nextTurnOffset = 1; 
      }
    } else if (card.value === 'wild_color_roulette') {
      const victim = state.players[this.getNextTurnIndex(state, 1)];
      let found = false;
      while (!found) {
        this.recycleDiscardPile(state);
        if (state.drawPile.length === 0) break;
        const drawn = state.drawPile.pop()!;
        victim.hand.push(drawn);
        // Correct Rule: Wilds do NOT match the color in roulette!
        if (drawn.color === nextColor && !(drawn.value as string).includes('wild')) found = true;
        
        // Mercy Mid-Roulette
        if (victim.hand.length >= 25) {
          break; // Check eliminations will handle this immediately
        }
      }
      nextTurnOffset = 2;
    }

    state.currentTurnIndex = this.getNextTurnIndex(state, nextTurnOffset);
    
    // Eliminations might happen due to 7 swap, 0 pass, or Roulette
    this.checkEliminationsAndWin(state);

    return { success: true };
  }

  public drawCard(room: Room, playerId: string): { success: boolean, message?: string } {
    if (!room.gameState) return { success: false, message: 'Game not started' };
    const state = room.gameState as UnoGameState;
    
    if (state.status !== 'playing') return { success: false, message: 'Not in playing phase' };
    if (state.players[state.currentTurnIndex].id !== playerId) return { success: false, message: 'Not your turn' };
    if (state.playerWhoDrew === playerId) return { success: false, message: 'Already drew this turn' };

    state.players.forEach(p => {
      if (p.id !== playerId) p.canBeCaughtUno = false;
    });

    const player = state.players[state.currentTurnIndex];

    if (state.stackValue > 0) {
      for (let i = 0; i < state.stackValue; i++) {
        this.recycleDiscardPile(state);
        if (state.drawPile.length > 0) player.hand.push(state.drawPile.pop()!);
        if (player.hand.length >= 25) break; // Mercy mid-penalty
      }
      state.stackValue = 0;
      state.currentTurnIndex = this.getNextTurnIndex(state, 1);
      this.checkEliminationsAndWin(state);
      return { success: true };
    }

    // Continuous Draw
    let foundPlayable = false;
    const topCard = state.discardPile[state.discardPile.length - 1];

    while (!foundPlayable) {
      this.recycleDiscardPile(state);
      if (state.drawPile.length === 0) break; 

      const card = state.drawPile.pop()!;
      player.hand.push(card);
      
      const isWild = (card.color as string) === 'wild' || (card.value as string).includes('wild');
      const isPlayable = isWild || card.color === state.currentColor || card.value === topCard.value;
      
      if (isPlayable) {
        state.playerWhoDrew = playerId;
        state.drawnCardPlayable = card;
        foundPlayable = true;
      }

      if (player.hand.length >= 25) {
        break; // Mercy mid-continuous draw
      }
    }

    this.checkEliminationsAndWin(state);
    
    // checkEliminationsAndWin automatically skipped the turn if the player died.
    // We only skip manually if they survived, didn't find a playable card, AND the deck is completely empty.
    if (!player.isEliminated && (!foundPlayable && state.drawPile.length === 0)) {
      if (state.status === 'playing') state.currentTurnIndex = this.getNextTurnIndex(state, 1);
      state.playerWhoDrew = null;
      state.drawnCardPlayable = null;
    }

    return { success: true };
  }

  public passTurn(room: Room, playerId: string): { success: boolean, message?: string } {
    return { success: false, message: 'Passing turn is not allowed in No Mercy (Must play drawn card)' };
  }

  public callUno(room: Room, playerId: string): { success: boolean, message?: string } {
    if (!room.gameState) return { success: false, message: 'Game not started' };
    const state = room.gameState as UnoGameState;
    
    const player = state.players.find(p => p.id === playerId);
    if (!player || player.isEliminated) return { success: false, message: 'Player not found/eliminated' };

    if (player.hand.length > 2) return { success: false, message: 'Too many cards to call UNO' };
    
    player.hasCalledUno = true;
    player.canBeCaughtUno = false;
    return { success: true };
  }

  public catchUno(room: Room, callerId: string, targetId: string): { success: boolean, message?: string } {
    if (!room.gameState) return { success: false, message: 'Game not started' };
    const state = room.gameState as UnoGameState;
    
    const target = state.players.find(p => p.id === targetId);
    if (!target || target.isEliminated) return { success: false, message: 'Target not found/eliminated' };

    if (target.canBeCaughtUno && target.hand.length === 1) {
      for(let i=0; i<2; i++) {
        this.recycleDiscardPile(state);
        if (state.drawPile.length > 0) target.hand.push(state.drawPile.pop()!);
      }
      target.canBeCaughtUno = false;
      this.checkEliminationsAndWin(state);
      return { success: true };
    }
    return { success: false, message: 'Player cannot be caught right now' };
  }

  public challengeDrawFour(room?: Room, playerId?: string, challenge?: boolean): { success: boolean, message?: string } {
    return { success: false, message: 'No challenge rule in No Mercy standard rules' };
  }

  private handleRoundEnd(state: UnoGameState, winnerId: string) {
    state.status = 'round_end';
    state.roundWinner = winnerId;
    
    const winner = state.players.find(p => p.id === winnerId)!;

    let roundScore = 0;
    
    // Count remaining cards (losers)
    state.players.forEach(p => {
      if (p.id === winnerId) return;
      p.hand.forEach(c => {
        if ((c.color as string) === 'wild' || (c.value as string).includes('wild')) roundScore += 50;
        else if (['skip', 'reverse', 'draw_two', 'draw_four', 'discard_all', 'skip_everyone'].includes(c.value as string)) roundScore += 20;
        else roundScore += parseInt(c.value as string);
      });
    });

    roundScore += state.eliminatedPlayersThisRound.length * 250;
    winner.score += roundScore;

    if (winner.score >= 1000) {
      state.status = 'match_end';
      state.matchWinner = winner.id;
    }
  }

  public getSanitizedState(room: Room, targetPlayerId: string): UnoGameStateSanitized | null {
    if (!room.gameState) return null;
    const state = room.gameState as UnoGameState;

    const myPlayer = state.players.find(p => p.id === targetPlayerId);
    
    return {
      players: state.players.map(p => ({
        id: p.id,
        name: p.name,
        cardCount: p.hand.length,
        hasCalledUno: p.hasCalledUno,
        canBeCaughtUno: p.canBeCaughtUno,
        score: p.score,
        isEliminated: p.isEliminated
      })),
      // Mask discard pile partially? Standard says top card is public, but we send whole discard pile for animations usually.
      discardPile: state.discardPile,
      drawPileCount: state.drawPile.length,
      currentTurnIndex: state.currentTurnIndex,
      direction: state.direction,
      currentColor: state.currentColor,
      status: state.status,
      actionRequiredFrom: state.actionRequiredFrom,
      playerWhoDrew: state.playerWhoDrew,
      drawnCardPlayable: state.drawnCardPlayable,
      roundWinner: state.roundWinner,
      matchWinner: state.matchWinner,
      stackValue: state.stackValue,
      myHand: myPlayer ? myPlayer.hand : []
    };
  }
}
