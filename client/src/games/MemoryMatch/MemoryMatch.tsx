import React, { useEffect } from 'react';
import { useSocket } from '../../context/SocketContext';
import { RefreshCcw, LogOut } from 'lucide-react';

interface Card {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

interface MemoryMatchState {
  board: Card[];
  firstSelection: number | null;
  secondSelection: number | null;
  isProcessing: boolean;
  pairsFound: { [playerId: string]: number };
}

interface MemoryMatchProps {
  room: any; // Using any for room to avoid massive imports, similar to RoomView
  playerId: string;
  onLeave: () => void;
}

export const MemoryMatch: React.FC<MemoryMatchProps> = ({ room, playerId, onLeave }) => {
  const { socket } = useSocket();
  const gameState = room.gameState as MemoryMatchState;
  const matchState = room.matchState;
  
  const isMyTurn = room.currentTurn === playerId;
  const isSpectator = !room.players.some((p: any) => p.id === playerId);
  const p1 = room.players[0];
  const p2 = room.players[1];

  // Auto-resolve turn if we are the current player and 2 cards are selected
  useEffect(() => {
    if (gameState?.isProcessing && isMyTurn) {
      const timer = setTimeout(() => {
        socket?.emit('resolve_turn', { roomId: room.roomId, playerId });
      }, 1200); // 1.2 seconds to view the cards
      return () => clearTimeout(timer);
    }
  }, [gameState?.isProcessing, isMyTurn, socket, room.roomId, playerId]);

  const handleCardClick = (index: number) => {
    if (!isMyTurn || gameState.isProcessing || isSpectator) return;
    const card = gameState.board[index];
    if (card.isFlipped || card.isMatched) return;

    socket?.emit('make_move', { roomId: room.roomId, playerId, move: { index } });
  };

  const handleReady = () => {
    socket?.emit('ready_for_next_round', { roomId: room.roomId, playerId });
  };

  const amIReady = matchState?.readyPlayers.includes(playerId);

  if (matchState?.status === 'match_finished' || matchState?.status === 'round_finished') {
    const isDraw = matchState.roundWinner === 'draw';
    const iWon = matchState.roundWinner === playerId;
    
    return (
      <div className="flex flex-col items-center justify-center flex-1 p-6 space-y-8 animate-in fade-in zoom-in duration-500 max-w-sm mx-auto w-full">
        <div className="text-center space-y-6 panel-dark p-8 rounded-3xl w-full relative overflow-hidden border border-[#333]">
          <div className="text-7xl mb-6 relative z-10 animate-bounce">
            {isDraw ? '🤝' : iWon ? '🏆' : '😈'}
          </div>
          <div className="space-y-2 relative z-10">
            <h2 className={`text-4xl font-black tracking-widest uppercase glow-${isDraw ? 'white' : iWon ? 'green' : 'red'}`}>
              {isDraw ? 'EMPATE' : iWon ? 'VICTORIA' : 'DERROTA'}
            </h2>
          </div>
          
          <div className="space-y-2 text-slate-400 font-bold relative z-10">
             <p>Has ganado {matchState.score[playerId] || 0} {matchState.score[playerId] === 1 ? 'ronda' : 'rondas'}</p>
             <p>Tu rival ganó {matchState.score[p2?.id === playerId ? p1?.id : p2?.id] || 0} {matchState.score[p2?.id === playerId ? p1?.id : p2?.id] === 1 ? 'ronda' : 'rondas'}</p>
          </div>
          
          <div className="pt-6 relative z-10">
            <button
              onClick={handleReady}
              disabled={amIReady}
              className={`w-full flex items-center justify-center gap-2 font-black py-4 px-6 rounded-2xl transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-95 ${
                amIReady 
                  ? 'bg-green-500 text-white border border-green-400 cursor-not-allowed glow-green' 
                  : 'bg-white hover:bg-gray-200 text-black'
              }`}
            >
              {amIReady ? 'ESPERANDO RIVAL...' : (
                <>
                  <RefreshCcw size={20} className={amIReady ? 'animate-spin' : ''} />
                  JUGAR DE NUEVO
                </>
              )}
            </button>
          </div>
          <div className="pt-2 relative z-10">
            <button
              onClick={onLeave}
              className="w-full flex items-center justify-center gap-2 panel-dark border border-[#333] hover:bg-[#111] text-white font-black py-4 px-6 rounded-2xl transition-transform active:scale-95 text-xs tracking-widest"
            >
              <LogOut size={16} />
              CATÁLOGO
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 w-full max-w-md mx-auto pt-16 pb-6 px-4">
      {/* Header HUD */}
      <div className="flex justify-between items-end mb-8 px-2">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-1">
            Tus Parejas
          </span>
          <span className={`text-2xl font-black ${p1?.id === playerId ? 'text-blue-400' : 'text-white'}`}>
            {gameState?.pairsFound?.[playerId] || 0}
          </span>
        </div>
        
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-black tracking-[0.2em] uppercase px-3 py-1 bg-[#111] rounded-full border border-[#222]">
            {isMyTurn ? <span className="text-green-400">🟢 TU TURNO</span> : <span className="text-red-400">🔴 ESPERA</span>}
          </span>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-1">
            Rival
          </span>
          <span className={`text-2xl font-black ${p2?.id === playerId ? 'text-blue-400' : 'text-white'}`}>
            {gameState?.pairsFound?.[p2?.id === playerId ? p1?.id : p2?.id] || 0}
          </span>
        </div>
      </div>

      {/* Memory Board */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3 aspect-square w-full perspective-1000">
        {gameState?.board.map((card: Card, index: number) => {
          const isFlipped = card.isFlipped || card.isMatched;
          return (
            <div 
              key={card.id} 
              className={`relative w-full h-full transition-all duration-300 transform-style-3d cursor-pointer ${!isFlipped && isMyTurn && !gameState.isProcessing ? 'hover:scale-105 active:scale-95' : ''} ${isFlipped ? 'rotate-y-180' : ''}`}
              onClick={() => handleCardClick(index)}
            >
              {/* Card Back */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-[#333] rounded-xl sm:rounded-2xl flex items-center justify-center backface-hidden shadow-lg">
                <span className="text-2xl sm:text-4xl opacity-20">🧠</span>
              </div>
              
              {/* Card Front */}
              <div className={`absolute inset-0 bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] border border-[#444] rounded-xl sm:rounded-2xl flex items-center justify-center backface-hidden rotate-y-180 shadow-[0_0_15px_rgba(255,255,255,0.05)] ${card.isMatched ? 'glow-white scale-95 opacity-50' : ''}`}>
                <span className="text-4xl sm:text-6xl filter drop-shadow-lg">{card.emoji}</span>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Footer Info */}
      <div className="mt-8 text-center">
        <p className="text-xs font-bold text-slate-500 tracking-widest uppercase">
          Pares encontrados: {gameState?.board.filter((c: Card) => c.isMatched).length / 2} / 8
        </p>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .perspective-1000 { perspective: 1000px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}} />
    </div>
  );
};
