import React from 'react';
import { UnoCard } from './UnoCard';
import { Layers } from 'lucide-react';
import type { UnoCard as UnoCardType } from '../../types';

interface CenterTableProps {
  topCard: UnoCardType | null;
  drawPileCount: number;
  stackValue: number;
  currentColor: string;
  direction: 1 | -1;
  onDraw: () => void;
  canDraw: boolean;
}

export const CenterTable: React.FC<CenterTableProps> = ({
  topCard,
  drawPileCount,
  stackValue,
  currentColor,
  direction,
  onDraw,
  canDraw
}) => {

  const colorStyles: Record<string, string> = {
    red: 'shadow-[0_0_50px_rgba(255,23,68,0.5)] border-[#ff1744]',
    blue: 'shadow-[0_0_50px_rgba(41,121,255,0.5)] border-[#2979ff]',
    green: 'shadow-[0_0_50px_rgba(0,230,118,0.5)] border-[#00e676]',
    yellow: 'shadow-[0_0_50px_rgba(255,234,0,0.5)] border-[#ffea00]',
    wild: 'shadow-[0_0_50px_rgba(255,255,255,0.3)] border-zinc-500'
  };

  const currentStyle = colorStyles[currentColor] || colorStyles.wild;

  return (
    <div className={`relative flex items-center justify-center gap-4 sm:gap-16 p-8 sm:p-16 rounded-full bg-zinc-900/50 backdrop-blur-md border-2 transition-all duration-500 ${currentStyle}`}>
      
      {/* Direction Arrows */}
      <div className={`absolute inset-0 rounded-full border-[10px] sm:border-[20px] border-transparent border-t-white/5 border-b-white/5 pointer-events-none transition-transform duration-1000 ${direction === 1 ? 'animate-spin-slow' : 'animate-reverse-spin'}`} />

      {/* Draw Pile */}
      <div className="relative group cursor-pointer" onClick={canDraw ? onDraw : undefined}>
        {/* Simulate deck depth */}
        <div className="absolute top-2 left-2"><UnoCard size="md" /></div>
        <div className="absolute top-1 left-1"><UnoCard size="md" /></div>
        <div className={`relative transition-transform duration-200 ${canDraw ? 'group-hover:-translate-y-2 group-hover:shadow-[0_0_30px_rgba(255,255,255,0.5)]' : 'opacity-80 cursor-not-allowed'}`}>
          <UnoCard size="md" />
          
          {/* Deck count badge */}
          <div className="absolute -bottom-4 -right-4 bg-zinc-950 border border-zinc-700 text-white font-bold text-xs sm:text-sm px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
            <Layers size={14} /> {drawPileCount}
          </div>
        </div>
      </div>

      {/* Discard Pile */}
      <div className="relative">
        <div className="absolute inset-0 bg-black/20 rounded-xl transform rotate-3" />
        <div className="relative">
          {topCard ? (
            <UnoCard card={topCard} size="md" className="shadow-[0_10px_30px_rgba(0,0,0,0.8)]" />
          ) : (
            <div className="w-16 h-24 sm:w-24 sm:h-36 border-4 border-dashed border-white/20 rounded-xl flex items-center justify-center">
              <span className="text-white/20 font-black">?</span>
            </div>
          )}
        </div>

        {/* Stack Indicator */}
        {stackValue > 0 && (
          <div className="absolute -top-6 -right-6 bg-red-600 border-2 border-white text-white font-black text-lg sm:text-2xl px-3 py-1 rounded-full shadow-[0_0_20px_rgba(255,0,0,0.8)] animate-pulse z-50">
            +{stackValue}
          </div>
        )}
      </div>

    </div>
  );
};
