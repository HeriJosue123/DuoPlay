import React from 'react';
import type { Room } from '../../types';
import { useSocket } from '../../context/SocketContext';

interface Props {
  room: Room;
  playerId: string;
  onLeave: () => void;
}

export const TicTacToe: React.FC<Props> = ({ room, playerId, onLeave }) => {
  const { socket } = useSocket();

  const matchState = room.matchState;
  const gameState = room.gameState;
  if (!matchState || !gameState) return null;

  const myPlayer = room.players.find(p => p.id === playerId);
  const opponent = room.players.find(p => p.id !== playerId);
  
  const isMyTurn = room.currentTurn === playerId && matchState.status === 'playing';
  const mySymbol = matchState.symbolAssignments[playerId];
  
  const opponentSymbol = opponent ? matchState.symbolAssignments[opponent.id] : null;

  const handleCellClick = (index: number) => {
    if (!isMyTurn || gameState.board[index] !== null || matchState.status !== 'playing') return;
    socket?.emit('make_move', { roomId: room.roomId, playerId, move: { index } });
  };

  const handleReady = () => {
    socket?.emit('ready_for_next_round', { roomId: room.roomId, playerId });
  };

  const iAmReady = matchState.readyPlayers.includes(playerId);
  const opponentIsReady = opponent && matchState.readyPlayers.includes(opponent.id);

  // Helper for Strike Line
  const getLineStyles = (line: number[]): React.CSSProperties => {
    const isRow = line[0] === 0 && line[1] === 1 || line[0] === 3 || line[0] === 6;
    const isCol = line[0] === 0 && line[1] === 3 || line[0] === 1 || line[0] === 2;
    const isDiag1 = line[0] === 0 && line[1] === 4;
    const isDiag2 = line[0] === 2 && line[1] === 4;

    const winnerSym = gameState.board[line[0]];
    const color = winnerSym === 'X' ? '#3b82f6' : '#ef4444'; // blue-500 or red-500

    if (isRow) {
      const top = line[0] === 0 ? '16.6%' : line[0] === 3 ? '50%' : '83.3%';
      return { top, left: '5%', width: '90%', height: '8px', marginTop: '-4px', backgroundColor: color };
    }
    if (isCol) {
      const left = line[0] === 0 ? '16.6%' : line[0] === 1 ? '50%' : '83.3%';
      return { left, top: '5%', width: '90%', height: '8px', transform: 'rotate(90deg)', transformOrigin: 'left center', marginTop: '-4px', backgroundColor: color };
    }
    if (isDiag1) {
      return { top: '5%', left: '5%', width: '127%', height: '8px', transform: 'rotate(45deg)', transformOrigin: 'top left', backgroundColor: color };
    }
    if (isDiag2) {
      return { top: '5%', left: '95%', width: '127%', height: '8px', transform: 'rotate(135deg)', transformOrigin: 'top left', backgroundColor: color };
    }
    return {};
  };

  return (
    <div className="flex flex-col items-center justify-center flex-1 p-4 space-y-6 w-full max-w-md mx-auto">
      
      {/* Header Info */}
      <div className="w-full flex justify-between items-center px-2">
        <button onClick={onLeave} className="text-slate-400 hover:text-white text-sm">
          ← Abandonar
        </button>
        <div className="text-xs font-bold text-slate-500 tracking-widest uppercase">
          PRIMERO A {matchState.targetScore}
        </div>
      </div>

      {/* Scoreboard */}
      <div className="w-full bg-slate-800/80 rounded-2xl p-4 border border-slate-700 flex justify-between items-center shadow-lg">
        <div className={`flex flex-col items-center p-2 rounded-xl transition-colors min-w-[80px] ${room.currentTurn === playerId ? 'bg-slate-700/50' : ''}`}>
          <span className="text-xs font-bold uppercase truncate max-w-full">{myPlayer?.name}</span>
          <span className="text-3xl font-black">{matchState.score[playerId]}</span>
          <span className={`text-xl font-bold ${mySymbol === 'X' ? 'text-blue-500 glow-blue' : 'text-red-500 glow-red'}`}>
            {mySymbol}
          </span>
        </div>
        
        <div className="text-center flex-1">
          {matchState.status === 'playing' ? (
            <div className={`text-sm font-bold tracking-widest ${isMyTurn ? 'text-green-400' : 'text-slate-400'}`}>
              {isMyTurn ? '🔵 TU TURNO' : opponent ? `🟣 TURNO DE ${opponent.name.toUpperCase()}` : 'ESPERANDO...'}
            </div>
          ) : (
            <div className="text-lg font-black text-yellow-400">
              {matchState.status === 'match_finished' ? 'FIN DEL MATCH' : 'FIN DE RONDA'}
            </div>
          )}
        </div>

        <div className={`flex flex-col items-center p-2 rounded-xl transition-colors min-w-[80px] ${room.currentTurn === opponent?.id ? 'bg-slate-700/50' : ''} ${!opponent?.connected ? 'opacity-50' : ''}`}>
          <span className="text-xs font-bold uppercase truncate max-w-full">
            {opponent?.name || '---'} {!opponent?.connected && '(Desc)'}
          </span>
          <span className="text-3xl font-black">{opponent ? matchState.score[opponent.id] : 0}</span>
          <span className={`text-xl font-bold ${opponentSymbol === 'X' ? 'text-blue-500 glow-blue' : 'text-red-500 glow-red'}`}>
            {opponentSymbol || '-'}
          </span>
        </div>
      </div>

      {/* Board */}
      <div className="relative grid grid-cols-3 gap-3 w-full aspect-square bg-slate-800 p-3 rounded-3xl border border-slate-700 shadow-xl">
        {gameState.winningLine && (
          <div className="strike-line shadow-lg" style={getLineStyles(gameState.winningLine)} />
        )}
        {gameState.board.map((cell: string | null, i: number) => (
          <button
            key={i}
            onClick={() => handleCellClick(i)}
            disabled={cell !== null || !isMyTurn || matchState.status !== 'playing'}
            className={`
              flex items-center justify-center text-6xl font-black rounded-2xl transition-all relative
              ${cell === null && isMyTurn && matchState.status === 'playing' ? 'hover:bg-slate-700 active:scale-95 cursor-pointer bg-slate-900' : 'bg-slate-900'}
              ${cell === null && !isMyTurn ? 'cursor-not-allowed' : ''}
              ${matchState.status !== 'playing' && cell === null ? 'opacity-50' : ''}
            `}
          >
            {cell && (
              <span className={`animate-pop ${cell === 'X' ? 'text-blue-500 glow-blue' : 'text-red-500 glow-red'}`}>
                {cell}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Connection Status */}
      {opponent && !opponent.connected && matchState.status === 'playing' && (
        <div className="bg-yellow-500/20 text-yellow-500 border border-yellow-500/50 rounded-xl px-4 py-2 text-sm font-bold animate-pulse">
          El oponente se ha desconectado. Esperando reconexión...
        </div>
      )}

      {/* Round Finished Overlay */}
      {matchState.status === 'round_finished' && (
        <div className="w-full bg-slate-800/95 backdrop-blur-md p-6 rounded-3xl border border-slate-700 shadow-2xl space-y-6 text-center animate-in slide-in-from-bottom-4">
          <div className="text-2xl font-black">
            {matchState.roundWinner === 'draw' ? '🤝 ¡EMPATE!' : 
             matchState.roundWinner === playerId ? '🏆 ¡GANASTE LA RONDA!' : 
             `😈 ${opponent?.name} GANÓ LA RONDA`}
          </div>
          <div className="text-sm text-slate-400">Preparando siguiente ronda...</div>
          
          <div className="space-y-3 pt-4 border-t border-slate-700">
            <button 
              onClick={handleReady}
              disabled={iAmReady}
              className={`w-full font-bold py-4 px-6 rounded-2xl transition-all shadow-lg ${iAmReady ? 'bg-green-500/20 text-green-400 cursor-not-allowed' : 'bg-brand hover:bg-brand-light text-white active:scale-95 shadow-brand/20'}`}
            >
              {iAmReady ? 'ESPERANDO AL RIVAL...' : 'LISTO PARA LA SIGUIENTE'}
            </button>
            {opponentIsReady && !iAmReady && (
              <p className="text-sm text-green-400">{opponent?.name} ya está listo</p>
            )}
          </div>
        </div>
      )}

      {/* Match Finished Overlay */}
      {matchState.status === 'match_finished' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-slate-800 p-8 rounded-3xl border border-yellow-500/30 shadow-2xl space-y-8 text-center animate-pop relative overflow-hidden">
            {/* Confetti effect using CSS could be added here, but keeping it simple */}
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-yellow-500/10 to-transparent pointer-events-none" />
            
            <div className="space-y-2">
              <div className="text-6xl mb-4">🏆</div>
              <div className="text-sm font-bold text-yellow-500 tracking-widest">CAMPEÓN DEFINITIVO</div>
              <div className="text-3xl font-black text-white">
                {matchState.matchWinner === playerId ? '¡GANASTE EL MATCH!' : `¡${opponent?.name} GANÓ!`}
              </div>
            </div>

            <div className="flex justify-center items-center gap-8 py-6 border-y border-slate-700">
              <div className="text-center">
                <div className="text-sm text-slate-400">{myPlayer?.name}</div>
                <div className="text-4xl font-black">{matchState.score[playerId]}</div>
              </div>
              <div className="text-2xl text-slate-600">-</div>
              <div className="text-center">
                <div className="text-sm text-slate-400">{opponent?.name}</div>
                <div className="text-4xl font-black">{opponent ? matchState.score[opponent.id] : 0}</div>
              </div>
            </div>
            
            <div className="space-y-3">
              <button 
                onClick={handleReady}
                disabled={iAmReady}
                className={`w-full font-bold py-4 px-6 rounded-2xl transition-all shadow-lg ${iAmReady ? 'bg-green-500/20 text-green-400 cursor-not-allowed' : 'bg-brand hover:bg-brand-light text-white active:scale-95 shadow-brand/20'}`}
              >
                {iAmReady ? 'ESPERANDO RESPUESTA...' : 'REVANCHA'}
              </button>
              {opponentIsReady && !iAmReady && (
                <p className="text-sm text-green-400">{opponent?.name} quiere la revancha</p>
              )}
              <button 
                onClick={onLeave}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-4 px-6 rounded-2xl transition-transform active:scale-95"
              >
                VOLVER AL MENÚ
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
