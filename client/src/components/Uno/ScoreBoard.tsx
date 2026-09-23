import React from 'react';
import type { UnoGameStateSanitized } from '../../types';

interface ScoreBoardProps {
  state: UnoGameStateSanitized;
  playerId: string;
  onContinue?: () => void;
  onExit?: () => void;
}

export const ScoreBoard: React.FC<ScoreBoardProps> = ({ state, playerId, onContinue, onExit }) => {
  const isMatchEnd = state.status === 'match_end';
  
  // Sort players by score descending
  const sortedPlayers = [...state.players].sort((a, b) => b.score - a.score);
  
  const winnerId = isMatchEnd ? state.matchWinner : state.roundWinner;
  const winner = state.players.find(p => p.id === winnerId);
  const isMe = winner?.id === playerId;

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-in fade-in zoom-in">
      <div className="w-full max-w-md panel-dark p-8 rounded-[2rem] border border-[#333] flex flex-col items-center gap-6 shadow-[0_0_50px_rgba(0,0,0,1)] relative overflow-hidden">
        
        {/* Glow effect */}
        <div className={`absolute -top-32 -inset-x-10 h-64 blur-[100px] pointer-events-none ${isMe ? 'bg-blue-600/30' : 'bg-red-600/20'}`} />

        <div className="text-center relative z-10">
          <div className="text-6xl mb-4">{isMe ? '🏆' : '💀'}</div>
          <h2 className="text-3xl font-black text-white uppercase tracking-widest glow-blue">
            {isMatchEnd ? '¡CAMPEÓN!' : 'FIN DE RONDA'}
          </h2>
          <p className="text-slate-400 font-bold mt-2 text-sm">
            {winner ? `${winner.name} ha ganado ${isMatchEnd ? 'la partida' : 'la ronda'}` : 'Hubo un error'}
          </p>
        </div>

        <div className="w-full space-y-2 mt-4 relative z-10">
          <div className="flex justify-between text-[10px] font-black text-slate-500 tracking-widest px-4 mb-2">
            <span>JUGADOR</span>
            <span>PUNTOS</span>
          </div>
          
          {sortedPlayers.map((p, idx) => (
            <div 
              key={p.id} 
              className={`flex justify-between items-center p-4 rounded-2xl border ${p.id === winnerId ? 'bg-blue-600/20 border-blue-500/50 text-white' : 'bg-[#111] border-[#222] text-slate-300'}`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${p.id === winnerId ? 'bg-blue-600' : 'bg-[#333]'}`}>
                  {idx + 1}
                </span>
                <span className="font-bold truncate max-w-[150px]">{p.name} {p.id === playerId ? '(Tú)' : ''}</span>
              </div>
              <span className={`font-black text-xl tracking-tighter ${p.id === winnerId ? 'glow-blue' : ''}`}>
                {p.score}
              </span>
            </div>
          ))}
        </div>

        <div className="w-full mt-6 space-y-3 relative z-10">
          {!isMatchEnd && onContinue && (
            <button 
              onClick={onContinue}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 px-6 rounded-2xl transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] active:scale-95 tracking-widest text-sm"
            >
              SIGUIENTE RONDA
            </button>
          )}
          {isMatchEnd && onExit && (
            <button 
              onClick={onExit}
              className="w-full bg-[#111] hover:bg-[#222] border border-[#333] text-white font-black py-4 px-6 rounded-2xl transition-transform active:scale-95 tracking-widest text-sm"
            >
              SALIR AL LOBBY
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
