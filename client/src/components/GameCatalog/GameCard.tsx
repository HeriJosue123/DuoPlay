import React from 'react';
import type { GameConfig } from '../../config/games';

interface Props {
  game: GameConfig;
  onSelect: (gameId: string) => void;
}

export const GameCard: React.FC<Props> = ({ game, onSelect }) => {
  return (
    <div 
      className={`relative w-full panel-dark rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col transition-all duration-300
        ${game.available ? 'hover:border-blue-500/30 hover:shadow-[0_0_30px_rgba(59,130,246,0.1)] group' : 'opacity-70'}
      `}
    >
      {/* Cover Image Placeholder */}
      <div className="relative w-full aspect-[4/3] sm:aspect-video bg-[#0a0a0a] overflow-hidden border-b border-[#222]">
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
          style={{ backgroundImage: `url('${game.image}')` }}
        />
        
        {/* Fallback pattern if image is not found */}
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#333] via-[#111] to-[#000] -z-10" />
        
        {/* Temporary visual identity based on game.id if image fails/is missing */}
        <div className="absolute inset-0 flex items-center justify-center -z-0 bg-black/40">
          {game.id === 'tic-tac-toe' && (
             <div className="flex gap-2 sm:gap-4 text-3xl sm:text-5xl font-black opacity-30">
               <span className="text-blue-500">X</span>
               <span className="text-red-500">O</span>
             </div>
          )}
          {game.id === 'memory-match' && (
             <div className="flex gap-2 sm:gap-4 text-3xl sm:text-5xl font-black opacity-30 text-white">
               <span>🧠</span>
             </div>
          )}
        </div>

        {/* Lock Overlay */}
        {!game.available && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
             <div className="bg-[#111] border border-[#333] px-3 py-1 sm:px-4 sm:py-2 rounded-full flex items-center gap-1 sm:gap-2 shadow-xl">
               <span className="text-xs sm:text-sm">🔒</span>
               <span className="text-[9px] sm:text-xs font-black text-slate-400 tracking-widest uppercase">Bloqueado</span>
             </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 sm:p-5 flex flex-col flex-1">
        <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-1 sm:gap-2 mb-2 sm:mb-3">
          <h3 className={`text-xs sm:text-base md:text-lg font-black tracking-widest uppercase truncate ${game.available ? 'text-white' : 'text-slate-500'}`}>
            {game.name}
          </h3>
          <div className="flex self-start items-center gap-1 bg-[#111] border border-[#222] px-2 py-0.5 sm:px-3 sm:py-1 rounded-full">
            <span className="text-[10px] sm:text-xs">👥</span>
            <span className="text-[10px] sm:text-xs font-bold text-slate-400">{game.players}</span>
          </div>
        </div>
        
        <p className="text-[10px] sm:text-xs md:text-sm text-slate-500 font-bold mb-3 sm:mb-5 flex-1 line-clamp-2">
          {game.description}
        </p>
        
        {/* Action Button */}
        <button
          onClick={() => game.available && onSelect(game.id)}
          disabled={!game.available}
          className={`w-full py-2 sm:py-3.5 px-2 sm:px-4 rounded-lg sm:rounded-xl font-black tracking-widest text-[9px] sm:text-xs uppercase transition-all
            ${game.available 
              ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)] active:scale-95 cursor-pointer' 
              : 'bg-[#111] text-slate-600 border border-[#222] cursor-not-allowed'
            }
          `}
        >
          {game.available ? 'Jugar' : 'Próximamente'}
        </button>
      </div>
    </div>
  );
};
