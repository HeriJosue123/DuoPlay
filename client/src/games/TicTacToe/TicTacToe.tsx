import React, { useEffect, useState } from 'react';
import type { Room } from '../../types';
import { useSocket } from '../../context/SocketContext';
import confetti from 'canvas-confetti';

interface Props {
  room: Room;
  playerId: string;
  onLeave: () => void;
}

export const TicTacToe: React.FC<Props> = ({ room, playerId, onLeave }) => {
  const { socket } = useSocket();
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const matchState = room.matchState;
  const gameState = room.gameState;
  if (!matchState || !gameState) return null;

  const myPlayer = room.players.find(p => p.id === playerId);
  const opponent = room.players.find(p => p.id !== playerId);
  
  const isMyTurn = room.currentTurn === playerId && matchState.status === 'playing';
  const mySymbol = matchState.symbolAssignments[playerId];
  const opponentSymbol = opponent ? matchState.symbolAssignments[opponent.id] : null;

  // Sync disconnect timer
  useEffect(() => {
    if (opponent && !opponent.connected && opponent.disconnectExpiresAt) {
      const interval = setInterval(() => {
        const remaining = Math.max(0, Math.floor((opponent.disconnectExpiresAt! - Date.now()) / 1000));
        setTimeLeft(remaining);
        if (remaining === 0) clearInterval(interval);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setTimeLeft(null);
    }
  }, [opponent?.connected, opponent?.disconnectExpiresAt]);

  // Handle Confetti
  useEffect(() => {
    if (matchState.status === 'round_finished' && matchState.roundWinner === playerId) {
      // Small confetti for round win
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: [mySymbol === 'X' ? '#3b82f6' : '#ef4444', '#ffffff']
      });
    } else if (matchState.status === 'match_finished') {
      if (matchState.matchWinner === playerId) {
        // Big confetti for match win
        const duration = 3000;
        const end = Date.now() + duration;

        const frame = () => {
          confetti({
            particleCount: 5,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: [mySymbol === 'X' ? '#3b82f6' : '#ef4444', '#ffffff']
          });
          confetti({
            particleCount: 5,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: [mySymbol === 'X' ? '#3b82f6' : '#ef4444', '#ffffff']
          });

          if (Date.now() < end) {
            requestAnimationFrame(frame);
          }
        };
        frame();
      } else if (matchState.matchWinner === 'draw') {
        // Neutral confetti for draw
        confetti({
          particleCount: 50,
          spread: 100,
          origin: { y: 0.6 },
          colors: ['#888888', '#ffffff']
        });
      }
    }
  }, [matchState.status, matchState.roundWinner, matchState.matchWinner, playerId, mySymbol]);

  // Auto-advance to next round
  useEffect(() => {
    if (matchState.status === 'round_finished') {
      const timer = setTimeout(() => {
        socket?.emit('ready_for_next_round', { roomId: room.roomId, playerId });
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [matchState.status, socket, room.roomId, playerId]);

  const handleCellClick = (index: number) => {
    if (!isMyTurn || gameState.board[index] !== null || matchState.status !== 'playing') return;
    socket?.emit('make_move', { roomId: room.roomId, playerId, move: { index } });
  };

  const handleReady = () => {
    socket?.emit('ready_for_next_round', { roomId: room.roomId, playerId });
  };

  const iAmReady = matchState.readyPlayers.includes(playerId);
  const opponentIsReady = opponent && matchState.readyPlayers.includes(opponent.id);

  // Helper for Strike Line (precise mapping)
  const getLineStyles = (line: number[]): React.CSSProperties => {
    const lineStr = line.sort((a,b)=>a-b).join(',');
    const winnerSym = gameState.board[line[0]];
    const color = winnerSym === 'X' ? '#3b82f6' : '#ef4444'; // blue-500 or red-500
    const shadow = `0 0 10px ${color}, 0 0 20px ${color}`;

    const base: React.CSSProperties = {
      position: 'absolute',
      backgroundColor: color,
      boxShadow: shadow,
      borderRadius: '4px',
      animation: 'drawLine 0.4s ease-out forwards',
      zIndex: 10,
      height: '6px',
      marginTop: '-3px',
      transformOrigin: 'left center',
    };

    switch (lineStr) {
      case '0,1,2': return { ...base, top: '16.66%', left: '2%', width: '96%' };
      case '3,4,5': return { ...base, top: '50%', left: '2%', width: '96%' };
      case '6,7,8': return { ...base, top: '83.33%', left: '2%', width: '96%' };
      
      case '0,3,6': return { ...base, top: '2%', left: '16.66%', width: '96%', transform: 'rotate(90deg)' };
      case '1,4,7': return { ...base, top: '2%', left: '50%', width: '96%', transform: 'rotate(90deg)' };
      case '2,5,8': return { ...base, top: '2%', left: '83.33%', width: '96%', transform: 'rotate(90deg)' };
      
      case '0,4,8': return { ...base, top: '2%', left: '2%', width: '135%', transform: 'rotate(45deg)' };
      case '2,4,6': return { ...base, top: '2%', left: '98%', width: '135%', transform: 'rotate(135deg)' };
    }
    return {};
  };

  return (
    <div className="flex flex-col items-center justify-center flex-1 p-4 space-y-6 w-full max-w-[500px] mx-auto">
      
      {/* Header Info */}
      <div className="w-full flex justify-between items-center px-2 pt-4">
        <button onClick={onLeave} className="text-slate-500 hover:text-white text-xs font-bold tracking-widest uppercase transition-colors">
          ← Abandonar
        </button>
        <div className="flex items-center gap-4">
          <div className="text-xs font-black text-white tracking-[0.2em] uppercase bg-[#111] border border-[#222] px-3 py-1 rounded-full shadow-[0_0_15px_rgba(255,255,255,0.05)]">
            RONDA {matchState.round} DE {matchState.totalRounds}
          </div>
        </div>
      </div>

      {/* Scoreboard */}
      <div className="w-full panel-dark rounded-[2rem] p-4 flex justify-between items-center relative overflow-hidden">
        {/* Subtle background glow depending on turn */}
        {room.currentTurn === playerId && <div className="absolute left-0 top-0 w-1/2 h-full bg-white/5 blur-xl pointer-events-none" />}
        {room.currentTurn === opponent?.id && <div className="absolute right-0 top-0 w-1/2 h-full bg-white/5 blur-xl pointer-events-none" />}
        
        <div className={`flex flex-col items-center p-3 rounded-2xl min-w-[90px] transition-all z-10 ${room.currentTurn === playerId ? 'bg-[#111] border border-[#333]' : 'border border-transparent'}`}>
          <span className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">{myPlayer?.name}</span>
          <span className="text-4xl font-black text-white">{matchState.score[playerId]}</span>
          <span className={`text-xl font-bold mt-1 ${mySymbol === 'X' ? 'glow-blue' : 'glow-red'}`}>
            {mySymbol}
          </span>
        </div>
        
        <div className="text-center flex-1 z-10 flex flex-col items-center justify-center">
          {matchState.status === 'playing' ? (
            <div className={`text-[10px] font-black tracking-[0.3em] px-4 py-2 rounded-full border transition-all ${isMyTurn ? 'bg-[#111] text-white border-[#333] shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'bg-transparent text-slate-600 border-transparent'}`}>
              {isMyTurn ? 'TU TURNO' : opponent ? `TURNO DE ${opponent.name.toUpperCase()}` : 'ESPERANDO...'}
            </div>
          ) : (
            <div className="text-sm font-black text-white tracking-[0.3em] bg-[#111] px-4 py-2 rounded-full border border-[#333]">
              {matchState.status === 'match_finished' ? 'FIN MATCH' : 'FIN RONDA'}
            </div>
          )}
        </div>

        <div className={`flex flex-col items-center p-3 rounded-2xl min-w-[90px] transition-all z-10 ${room.currentTurn === opponent?.id ? 'bg-[#111] border border-[#333]' : 'border border-transparent'} ${!opponent?.connected ? 'opacity-30' : ''}`}>
          <span className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">
            {opponent?.name || '---'}
          </span>
          <span className="text-4xl font-black text-white">{opponent ? matchState.score[opponent.id] : 0}</span>
          <span className={`text-xl font-bold mt-1 ${opponentSymbol === 'X' ? 'glow-blue' : opponentSymbol === 'O' ? 'glow-red' : 'text-slate-700'}`}>
            {opponentSymbol || '-'}
          </span>
        </div>
      </div>

      {/* Disconnect Overlay for playing area */}
      <div className="w-full relative">
        {opponent && !opponent.connected && timeLeft !== null && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm rounded-[2rem] border border-[#222]">
            <p className="text-sm font-black text-red-500 tracking-[0.2em] mb-2 glow-red">JUGADOR DESCONECTADO</p>
            <p className="text-xs font-bold text-slate-400 mb-6">Esperando reconexión...</p>
            <div className="text-4xl font-black text-white font-mono">00:{timeLeft.toString().padStart(2, '0')}</div>
          </div>
        )}

        {/* Board */}
        <div className="board-grid w-full aspect-square relative">
          {gameState.winningLine && (
            <div style={getLineStyles(gameState.winningLine)} />
          )}
          {gameState.board.map((cell: string | null, i: number) => {
            const isWinnerCell = gameState.winningLine?.includes(i);
            const isFinished = matchState.status !== 'playing';
            const showDimmed = isFinished && !isWinnerCell && cell !== null;
            const isWinningCellClass = isWinnerCell ? 'bg-[#111] border-[#333] z-0 shadow-[0_0_20px_rgba(255,255,255,0.05)] scale-[1.02]' : '';

            return (
              <button
                key={i}
                onClick={() => handleCellClick(i)}
                disabled={cell !== null || !isMyTurn || matchState.status !== 'playing'}
                className={`board-cell ${showDimmed ? 'opacity-30' : ''} ${isWinningCellClass}`}
              >
                {cell && (
                  <span className={`animate-pop ${cell === 'X' ? 'glow-blue' : 'glow-red'}`}>
                    {cell}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Round Finished Overlay (Small Temporary Popup) */}
        {matchState.status === 'round_finished' && (
          <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
            <div className="bg-black/90 text-white font-black px-8 py-4 rounded-full border border-[#333] animate-pop shadow-[0_0_30px_rgba(255,255,255,0.1)] backdrop-blur-md text-2xl tracking-widest text-center">
              {matchState.roundWinner === 'draw' 
                ? '🤝 EMPATE' 
                : `🎉 +1 ${matchState.roundWinner === playerId ? myPlayer?.name.toUpperCase() : opponent?.name?.toUpperCase()}`}
            </div>
          </div>
        )}
      </div>

      {/* Match Finished Overlay */}
      {matchState.status === 'match_finished' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in">
          <div className="w-full max-w-sm panel-dark p-8 rounded-[2rem] border border-[#333] space-y-10 text-center animate-pop relative overflow-hidden">
            {matchState.matchWinner === playerId ? (
              <div className="absolute top-0 left-0 w-full h-full bg-blue-500/10 pointer-events-none" />
            ) : matchState.matchWinner === 'draw' ? (
              <div className="absolute top-0 left-0 w-full h-full bg-slate-500/10 pointer-events-none" />
            ) : (
              <div className="absolute top-0 left-0 w-full h-full bg-red-500/10 pointer-events-none" />
            )}
            
            <div className="space-y-4 relative z-10">
              <div className="text-6xl mb-4">
                {matchState.matchWinner === 'draw' ? '🤝' : '🏆'}
              </div>
              <div className={`text-3xl font-black text-white uppercase tracking-widest leading-tight ${matchState.matchWinner === playerId ? 'glow-blue' : matchState.matchWinner === 'draw' ? '' : 'glow-red'}`}>
                {matchState.matchWinner === 'draw' ? 'MATCH EMPATADO' : 
                 matchState.matchWinner === playerId ? '¡GANASTE EL MATCH!' : 
                 `${opponent?.name} GANÓ EL MATCH`}
              </div>
            </div>

            <div className="flex justify-center items-center gap-6 py-6 border-y border-[#222] relative z-10">
              <div className="text-center">
                <div className="text-xs font-bold text-slate-500 mb-2 tracking-widest uppercase">{myPlayer?.name}</div>
                <div className={`text-5xl font-black ${matchState.matchWinner === playerId || matchState.matchWinner === 'draw' ? 'text-white' : 'text-slate-600'}`}>{matchState.score[playerId]}</div>
              </div>
              <div className="text-2xl text-slate-800 font-black">—</div>
              <div className="text-center">
                <div className="text-xs font-bold text-slate-500 mb-2 tracking-widest uppercase">{opponent?.name}</div>
                <div className={`text-5xl font-black ${matchState.matchWinner === opponent?.id || matchState.matchWinner === 'draw' ? 'text-white' : 'text-slate-600'}`}>{opponent ? matchState.score[opponent.id] : 0}</div>
              </div>
            </div>
            
            <div className="space-y-4 relative z-10">
              <div className="text-xs font-black tracking-[0.4em] text-slate-500 mb-6 uppercase">
                FIN DEL JUEGO
              </div>
              <button 
                onClick={handleReady}
                disabled={iAmReady}
                className={`w-full font-black py-4 px-6 rounded-2xl transition-all tracking-widest text-sm ${iAmReady ? 'bg-[#111] text-slate-500 border border-[#333] cursor-not-allowed' : 'bg-white hover:bg-gray-200 text-black active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)]'}`}
              >
                {iAmReady ? 'ESPERANDO RESPUESTA...' : 'REVANCHA'}
              </button>
              {opponentIsReady && !iAmReady && (
                <p className="text-xs font-bold text-green-500 tracking-widest animate-pulse">{opponent?.name} quiere revancha</p>
              )}
              <button 
                onClick={onLeave}
                className="w-full bg-[#111] hover:bg-[#222] border border-[#333] text-white font-black py-4 px-6 rounded-2xl transition-transform active:scale-95 tracking-widest text-sm"
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
