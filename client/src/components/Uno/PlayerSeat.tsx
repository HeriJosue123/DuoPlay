import React from 'react';
import { User, Skull, BellRing } from 'lucide-react';
import type { UnoPlayerSanitized } from '../../types';
import { UnoCard } from './UnoCard';

interface PlayerSeatProps {
  player: UnoPlayerSanitized;
  isCurrentTurn: boolean;
  positionClass: string; // Tailwind positioning classes based on seat index
  connected?: boolean;
}

export const PlayerSeat: React.FC<PlayerSeatProps> = ({ player, isCurrentTurn, positionClass, connected = true }) => {
  const { name, cardCount, hasCalledUno, canBeCaughtUno, isEliminated } = player;

  // Render back of cards fanning out (max 5 visually to prevent clutter)
  const renderCards = () => {
    if (isEliminated || cardCount === 0) return null;
    
    const displayCount = Math.min(cardCount, 5);
    const cards = Array.from({ length: displayCount });
    
    return (
      <div className="relative flex justify-center -mt-6">
        {cards.map((_, i) => (
          <div 
            key={i}
            className="absolute origin-bottom transition-all"
            style={{ 
              transform: `rotate(${(i - (displayCount - 1) / 2) * 15}deg) translateX(${(i - (displayCount - 1) / 2) * 10}px)`,
              zIndex: i
            }}
          >
            <UnoCard size="sm" />
          </div>
        ))}
        {/* Placeholder to maintain height */}
        <div className="opacity-0"><UnoCard size="sm" /></div>
        
        <div className="absolute -bottom-3 z-20 bg-zinc-900 border-2 border-zinc-700 text-white text-xs font-black px-2 py-0.5 rounded-full shadow-lg">
          {cardCount}
        </div>
      </div>
    );
  };

  return (
    <div className={`absolute flex flex-col items-center transition-all duration-500 ${positionClass} ${isEliminated ? 'opacity-50 grayscale' : ''}`}>
      
      {/* UNO Shout Bubble */}
      {hasCalledUno && (
        <div className="absolute -top-12 z-30 animate-bounce">
          <div className="bg-[#ff1744] text-white font-black px-3 py-1 rounded-xl shadow-[0_0_15px_rgba(255,23,68,0.8)] border-2 border-white text-sm flex items-center gap-1">
            <BellRing size={14} className="animate-pulse" /> UNO!
          </div>
        </div>
      )}

      {/* Warning Bubble */}
      {canBeCaughtUno && (
        <div className="absolute -top-12 z-30 animate-pulse">
          <div className="bg-yellow-500 text-black font-black px-3 py-1 rounded-xl shadow-[0_0_15px_rgba(234,179,8,0.8)] border-2 border-black text-xs">
            ! DANGER !
          </div>
        </div>
      )}

      {/* Avatar Ring */}
      <div className={`relative p-1 rounded-full ${isCurrentTurn && !isEliminated && connected ? 'bg-gradient-to-tr from-[#ff1744] via-[#ffea00] to-[#2979ff] animate-spin-slow' : 'bg-zinc-800'}`}>
        {/* Anti-spin container for avatar inside the spinning ring */}
        <div className={`bg-zinc-950 p-2 sm:p-3 rounded-full border-4 ${isCurrentTurn && !isEliminated && connected ? 'border-transparent animate-reverse-spin' : 'border-zinc-800'} relative z-10 shadow-inner`}>
          {isEliminated ? (
            <Skull size={32} className="text-zinc-500" />
          ) : (
            <User size={32} className={`${isCurrentTurn ? 'text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]' : 'text-zinc-400'} ${!connected ? 'opacity-30' : ''}`} />
          )}
        </div>
      </div>

      {/* Nameplate */}
      <div className="mt-2 bg-black/80 backdrop-blur-md border border-white/10 text-white font-bold text-xs sm:text-sm px-4 py-1 rounded-full whitespace-nowrap shadow-lg flex flex-col items-center">
        <span className={`truncate max-w-[100px] sm:max-w-[150px] ${!connected ? 'text-zinc-500 line-through' : ''}`}>{name}</span>
        {!connected && <span className="text-[9px] text-red-500 uppercase tracking-widest mt-0.5">DISCONNECTED</span>}
      </div>

      {/* Hand visualization */}
      <div className="mt-4">
        {renderCards()}
      </div>
      
      {/* Elimination overlay */}
      {isEliminated && (
        <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
          <span className="text-red-500 font-black text-2xl -rotate-12 drop-shadow-[0_0_10px_rgba(255,0,0,1)] tracking-widest bg-black/80 px-2 py-1 border-2 border-red-500">MERCY</span>
        </div>
      )}
    </div>
  );
};
