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

  // Render back of cards fanning out, mimicking a real hand
  const renderCards = () => {
    if (isEliminated || cardCount === 0) return null;
    
    // Cap visual cards to prevent massive clutter, but show enough to feel like a hand
    const displayCount = Math.min(cardCount, 8);
    const cards = Array.from({ length: displayCount });
    
    // Determine fan style based on position
    const isLeft = positionClass.includes('left');
    const isRight = positionClass.includes('right');
    
    let containerClass = "flex justify-center -mt-2";
    let rotateBase = 0;
    
    if (isLeft) {
      containerClass = "flex flex-col items-end -mr-16 mt-4";
      rotateBase = 90;
    } else if (isRight) {
      containerClass = "flex flex-col items-start -ml-16 mt-4";
      rotateBase = -90;
    }
    
    return (
      <div className={`relative ${containerClass}`}>
        <div className="relative">
          {cards.map((_, i) => {
            const mid = (displayCount - 1) / 2;
            const distance = i - mid;
            // Tighter fan for side players, wider for top
            const angle = (isLeft || isRight) ? distance * 8 : distance * 10;
            const transX = (isLeft || isRight) ? distance * 3 : distance * 8;
            const transY = Math.abs(distance) * 2;
            
            return (
              <div 
                key={i}
                className="absolute origin-bottom transition-all"
                style={{ 
                  transform: `rotate(${rotateBase + angle}deg) translate(${transX}px, ${transY}px)`,
                  zIndex: i
                }}
              >
                <div className="w-8 h-12 sm:w-10 sm:h-16 rounded shadow-md transform transition-transform">
                  <UnoCard size="sm" className="w-full h-full !border-2" />
                </div>
              </div>
            );
          })}
          {/* Placeholder for layout */}
          <div className="opacity-0 w-8 h-12 sm:w-10 sm:h-16"><UnoCard size="sm" /></div>
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

      {/* Avatar Container */}
      <div className="flex flex-col items-center z-10">
        <div className={`relative p-0.5 rounded-full ${isCurrentTurn && !isEliminated && connected ? 'bg-gradient-to-tr from-[#ff1744] via-[#ffea00] to-[#2979ff] animate-spin-slow shadow-[0_0_15px_rgba(255,234,0,0.4)]' : 'bg-transparent'}`}>
          <div className={`bg-[#0a0a0a] w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center rounded-full border border-white/10 ${isCurrentTurn && !isEliminated && connected ? 'animate-reverse-spin' : ''} shadow-inner`}>
            {isEliminated ? (
              <Skull size={24} className="text-zinc-600" />
            ) : (
              <User size={24} className={`${isCurrentTurn ? 'text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]' : 'text-zinc-500'} ${!connected ? 'opacity-30' : ''}`} />
            )}
          </div>
        </div>

        {/* Nameplate */}
        <div className="mt-3 flex flex-col items-center">
          <span className={`bg-black/50 backdrop-blur-sm border border-white/5 px-3 py-0.5 rounded-full text-white font-bold text-xs sm:text-sm truncate max-w-[100px] sm:max-w-[120px] shadow-md ${!connected ? 'text-zinc-500 line-through' : ''}`}>
            {name}
          </span>
          <span className="text-[10px] text-zinc-400 font-bold tracking-widest mt-1">
            {cardCount} cartas
          </span>
          {!connected && <span className="text-[9px] text-red-500 uppercase tracking-widest mt-0.5">DISCONNECTED</span>}
        </div>
      </div>

      {/* Hand visualization */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 translate-y-8 pointer-events-none">
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
