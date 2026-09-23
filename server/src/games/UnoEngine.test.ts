import { UnoEngine } from './UnoEngine';
import type { Room, Player, UnoGameState } from '../types';

function createMockRoom(playerCount: number): Room {
  const players: Player[] = [];
  for (let i = 0; i < playerCount; i++) {
    players.push({
      id: `p${i + 1}`,
      name: `Player ${i + 1}`,
      socketId: `socket${i + 1}`,
      connected: true
    });
  }
  return {
    roomId: 'TEST_ROOM',
    players,
    activeGame: 'uno',
    chat: [],
    settings: { maxPlayers: 6 },
    status: 'waiting',
    matchState: null,
    gameState: null,
    currentTurn: null
  };
}

const engine = new UnoEngine();
let passed = 0;
let failed = 0;

function assertEq(actual: any, expected: any, msg: string) {
  if (actual !== expected) throw new Error(`${msg} | Expected ${expected}, got ${actual}`);
}
function assertTrue(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function runTest(name: string, playerCount: number, testFn: (room: Room, state: UnoGameState) => void) {
  const room = createMockRoom(playerCount);
  engine.initGame(room);
  const state = room.gameState as UnoGameState;
  
  // Clean start for isolated logic
  state.discardPile = [{ id: 'top', color: 'red', value: '5' }];
  state.currentColor = 'red';
  state.currentTurnIndex = 0;
  state.stackValue = 0;
  state.direction = 1;
  state.eliminatedPlayersThisRound = [];
  state.setAsidePile = [];
  state.players.forEach(p => p.hand = [{ id: `${p.id}_base`, color: 'yellow', value: '1' }]);
  
  try {
    testFn(room, state);
    console.log(`✅ [PASS] ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`❌ [FAIL] ${name} -> ${err.message}`);
    failed++;
  }
}

console.log('--- STARTING UNO NO MERCY AUDIT TESTS ---');

// 1-5: Initialization & Deck counts
[2, 3, 4, 5, 6].forEach(count => {
  try {
    const room = createMockRoom(count);
    engine.initGame(room);
    const state = room.gameState as UnoGameState;
    assertEq(state.players.length, count, `Player count init ${count}`);
    assertEq(state.players[0].hand.length, 7, '7 cards initial');
    assertEq(state.drawPile.length, 168 - (7 * count) - 1, 'Exact draw pile count');
    assertTrue(['0','1','2','3','4','5','6','7','8','9'].includes(state.discardPile[0].value as string), 'First card is number');
    console.log(`✅ [PASS] Init rules for ${count} players`);
    passed++;
  } catch (err: any) {
    console.error(`❌ [FAIL] Init rules for ${count} players -> ${err.message}`);
    failed++;
  }
});

runTest('Matching: Color, Number, and Invalid', 4, (room, state) => {
  state.players[0].hand.push({ id: 'invalid', color: 'blue', value: '3' }, { id: 'valid', color: 'red', value: '9' });
  const fail = engine.playCard(room, 'p1', 'invalid');
  assertTrue(!fail.success, 'Invalid card rejected');
  const success = engine.playCard(room, 'p1', 'valid');
  assertTrue(success.success, 'Valid card accepted');
  assertEq(state.currentTurnIndex, 1, 'Turn passes to next');
});

runTest('Draw: Continuous draw until playable', 4, (room, state) => {
  state.players[0].hand = [];
  state.drawPile = [
    { id: 'ok', color: 'red', value: '1' },
    { id: 'bad1', color: 'green', value: '2' },
    { id: 'bad2', color: 'blue', value: '3' }
  ];
  engine.drawCard(room, 'p1');
  assertEq(state.players[0].hand.length, 3, 'Drew 3 cards');
  assertEq(state.drawnCardPlayable?.id, 'ok', 'Playable card stored');
  assertEq(state.currentTurnIndex, 0, 'Turn remains for player to play drawn card');
});

runTest('Stacking: +2, +4, +6, +10 logic', 4, (room, state) => {
  state.players[0].hand.push({ id: 'd2', color: 'red', value: 'draw_two' });
  state.players[1].hand.push({ id: 'd4', color: 'blue', value: 'draw_four' });
  state.players[2].hand.push({ id: 'w6', color: 'wild', value: 'wild_draw_six' });
  state.players[3].hand.push({ id: 'w10', color: 'wild', value: 'wild_draw_ten' });
  
  engine.playCard(room, 'p1', 'd2');
  assertEq(state.stackValue, 2, 'Stack is 2');
  engine.playCard(room, 'p2', 'd4');
  assertEq(state.stackValue, 6, 'Stack is 6');
  engine.playCard(room, 'p3', 'w6', 'green');
  assertEq(state.stackValue, 12, 'Stack is 12');
  engine.playCard(room, 'p4', 'w10', 'yellow');
  assertEq(state.stackValue, 22, 'Stack is 22');
});

runTest('Stacking: Penalty draw skip', 4, (room, state) => {
  state.stackValue = 4;
  state.drawPile = Array.from({length: 10}).map((_,i) => ({id:`d${i}`, color:'blue', value:'1'}));
  engine.drawCard(room, 'p1');
  assertEq(state.stackValue, 0, 'Stack cleared');
  assertEq(state.players[0].hand.length, 5, 'Drew 4 cards + 1 base');
  assertEq(state.currentTurnIndex, 1, 'Turn skips after penalty draw');
});

runTest('Mercy: During normal draw & setAsidePile', 4, (room, state) => {
  state.players[0].hand = Array.from({length: 24}).map((_,i) => ({id:`c${i}`, color:'blue', value:'1'}));
  state.drawPile = [
    { id: 'b1', color: 'green', value: '2' },
    { id: 'b2', color: 'green', value: '3' }
  ];
  engine.drawCard(room, 'p1');
  assertTrue(state.players[0].isEliminated, 'Player eliminated');
  assertEq(state.players[0].hand.length, 0, 'Hand emptied');
  assertEq(state.setAsidePile.length, 25, 'Cards moved to setAsidePile (24 + 1 drawn)');
  assertEq(state.currentTurnIndex, 1, 'Turn passes to next player');
});

runTest('Action: 7 Swap', 4, (room, state) => {
  state.players[0].hand.push({ id: '7', color: 'red', value: '7' });
  const p4HandBeforeId = state.players[3].hand[0].id;
  engine.playCard(room, 'p1', '7', undefined, 'p4');
  assertEq(state.players[0].hand[0].id, p4HandBeforeId, 'Hands swapped');
  assertEq(state.currentTurnIndex, 1, 'Turn passes normally');
});

runTest('Action: 0 Pass', 4, (room, state) => {
  state.direction = 1;
  const p1Hand = state.players[0].hand[0].id;
  const p4Hand = state.players[3].hand[0].id;
  state.players[0].hand.push({ id: '0', color: 'red', value: '0' });
  engine.playCard(room, 'p1', '0');
  assertEq(state.players[1].hand[0].id, p1Hand, 'p2 got p1 hand');
  assertEq(state.players[0].hand[0].id, p4Hand, 'p1 got p4 hand');
  assertEq(state.currentTurnIndex, 1, 'Turn passes normally');
});

runTest('Action: Reverse with 2 players', 2, (room, state) => {
  state.players[0].hand.push({ id: 'rev', color: 'red', value: 'reverse' });
  engine.playCard(room, 'p1', 'rev');
  assertEq(state.direction, -1, 'Direction reversed');
  assertEq(state.currentTurnIndex, 0, 'Acts as skip in 2p, turn stays on p1');
});

runTest('Action: Skip Everyone', 4, (room, state) => {
  state.players[0].hand.push({ id: 'se', color: 'red', value: 'skip_everyone' });
  engine.playCard(room, 'p1', 'se');
  assertEq(state.currentTurnIndex, 0, 'Turn stays on p1');
});

runTest('Action: Wild Reverse Draw 4 with 2 players', 2, (room, state) => {
  state.players[0].hand.push({ id: 'wrd4', color: 'wild', value: 'wild_reverse_draw_four' });
  engine.playCard(room, 'p1', 'wrd4', 'blue');
  assertEq(state.direction, -1, 'Direction reversed');
  assertEq(state.stackValue, 4, 'Stack is 4');
  assertEq(state.currentTurnIndex, 0, 'In 2p, player who played it receives the stack (Rule twist!)');
});

runTest('Action: Wild Reverse Draw 4 with 3 players', 3, (room, state) => {
  state.players[0].hand.push({ id: 'wrd4', color: 'wild', value: 'wild_reverse_draw_four' });
  engine.playCard(room, 'p1', 'wrd4', 'blue');
  assertEq(state.direction, -1, 'Direction reversed');
  assertEq(state.stackValue, 4, 'Stack is 4');
  assertEq(state.currentTurnIndex, 2, 'In 3p, hits previous player (p3)');
});

runTest('Action: Wild Color Roulette (ignores wilds)', 4, (room, state) => {
  state.players[0].hand.push({ id: 'wcr', color: 'wild', value: 'wild_color_roulette' });
  state.drawPile = [
    { id: 'ok', color: 'blue', value: '1' },
    { id: 'ignore', color: 'wild', value: 'wild_color_roulette' },
    { id: 'bad1', color: 'green', value: '1' }
  ];
  engine.playCard(room, 'p1', 'wcr', 'blue');
  assertEq(state.players[1].hand.length, 4, 'Victim drew 3 cards (1 base + 3 drawn)');
  assertEq(state.currentTurnIndex, 2, 'Victim loses turn');
});

runTest('Action: Wild Color Roulette + Mercy Elimination', 4, (room, state) => {
  state.players[0].hand.push({ id: 'wcr', color: 'wild', value: 'wild_color_roulette' });
  state.players[1].hand = Array.from({length: 23}).map((_,i) => ({id:`m${i}`, color:'green', value:'1'}));
  state.drawPile = [
    { id: 'ok', color: 'blue', value: '1' },
    { id: 'bad2', color: 'green', value: '2' },
    { id: 'bad1', color: 'green', value: '1' }
  ];
  engine.playCard(room, 'p1', 'wcr', 'blue');
  assertTrue(state.players[1].isEliminated, 'Victim eliminated mid-roulette');
  assertEq(state.setAsidePile.length, 25, 'Victim cards in setAsidePile');
  assertEq(state.currentTurnIndex, 2, 'Turn passes to p3 naturally');
});

runTest('UNO: Call and Catch', 4, (room, state) => {
  state.players[0].hand = [{ id: 'last', color: 'red', value: '1' }, { id: 'play', color: 'red', value: '2' }];
  engine.playCard(room, 'p1', 'play');
  assertTrue(state.players[0].canBeCaughtUno, 'P1 vulnerable to catch');
  engine.catchUno(room, 'p4', 'p1');
  assertEq(state.players[0].hand.length, 3, 'P1 drew 2 penalty cards');
});

runTest('Victory: Empty Hand', 4, (room, state) => {
  state.players[0].hand = [{ id: 'last', color: 'red', value: '9' }];
  engine.playCard(room, 'p1', 'last');
  assertEq(state.status, 'round_end', 'Round ends');
  assertEq(state.roundWinner, 'p1', 'P1 wins by 0 cards');
});

runTest('Victory: Elimination', 4, (room, state) => {
  state.players[1].isEliminated = true;
  state.players[2].isEliminated = true;
  state.players[3].hand = Array.from({length: 24}).map((_,i) => ({id:`x${i}`, color:'blue', value:'1'}));
  state.drawPile = [{ id: 'b1', color: 'green', value: '2' }, { id: 'b2', color: 'green', value: '3' }];
  state.currentTurnIndex = 3;
  engine.drawCard(room, 'p4');
  assertTrue(state.players[3].isEliminated, 'P4 eliminated');
  assertEq(state.status, 'round_end', 'Round ends');
  assertEq(state.roundWinner, 'p1', 'P1 wins by survival');
});

runTest('Reshuffle: Uses Discard AND setAsidePile', 4, (room, state) => {
  state.discardPile = Array.from({length: 10}).map((_,i) => ({id:`dc${i}`, color:'red', value:'1'}));
  // Give setAsidePile matching color so it stops on first draw
  state.setAsidePile = Array.from({length: 25}).map((_,i) => ({id:`sa${i}`, color:'red', value:'2'}));
  state.drawPile = [];
  engine.drawCard(room, 'p1'); // triggers reshuffle and draws 1 card
  assertEq(state.setAsidePile.length, 0, 'setAsidePile cleared');
  assertEq(state.discardPile.length, 1, 'Discard pile leaves 1 top card');
  assertEq(state.drawPile.length, 33, 'Draw pile rebuilt (9 + 25) and 1 card drawn');
});

console.log(`\nTests finished: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
