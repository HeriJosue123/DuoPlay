import React from 'react';
import { UnoCard } from './UnoCard';
import type { UnoCard as UnoCardType } from '../../types';

interface CenterTableProps {
  topCard: UnoCardType | null;
  drawPileCount: number; // Keep in interface to avoid breaking caller
  stackValue: number;
  currentColor: string;
  direction: 1 | -1;
  onDraw: () => void;
  canDraw: boolean;
}

export const CenterTable: React.FC<CenterTableProps> = ({
  topCard,
  stackValue,
  currentColor,
  direction,
  onDraw,
  canDraw
}) => {

  const colorStyles: Record<string, string> = {
    red: 'shadow-[0_0_60px_rgba(255,23,68,0.3)] border-[#ff1744]',
    blue: 'shadow-[0_0_60px_rgba(41,121,255,0.3)] border-[#2979ff]',
    green: 'shadow-[0_0_60px_rgba(0,230,118,0.3)] border-[#00e676]',
    yellow: 'shadow-[0_0_60px_rgba(255,234,0,0.3)] border-[#ffea00]',
    wild: 'shadow-[0_0_60px_rgba(255,255,255,0.1)] border-[#333]'
  };

  const currentStyle = colorStyles[currentColor] || colorStyles.wild;

  return (
    <div className={`relative flex items-center justify-center gap-6 sm:gap-12 w-[320px] sm:w-[480px] h-[180px] sm:h-[260px] rounded-[100px] sm:rounded-[150px] bg-[#0c0c0e]/80 backdrop-blur-md border-[3px] sm:border-[4px] transition-all duration-500 ${currentStyle}`}>
      
      {/* Direction Arrows - subtle side indicators instead of full ring */}
      <div className={`absolute left-4 opacity-20 text-white font-bold text-2xl transition-transform duration-1000 ${direction === 1 ? 'rotate-0' : 'rotate-180'}`}>&lt;</div>
      <div className={`absolute right-4 opacity-20 text-white font-bold text-2xl transition-transform duration-1000 ${direction === 1 ? 'rotate-0' : 'rotate-180'}`}>&gt;</div>

      {/* Draw Pile */}
      <div className="relative group cursor-pointer" onClick={canDraw ? onDraw : undefined}>
        {/* Simulate deck depth seamlessly */}
        <div className="absolute top-[3px] left-[3px]"><UnoCard size="md" /></div>
        <div className="absolute top-[1.5px] left-[1.5px]"><UnoCard size="md" /></div>
        <div className={`relative transition-transform duration-200 ${canDraw ? 'group-hover:-translate-y-2 group-hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]' : 'opacity-90 cursor-not-allowed'}`}>
          <UnoCard size="md" />
        </div>
      </div>

      {/* Discard Pile */}
      <div className="relative">
        <div className="relative">
          {topCard ? (
            <UnoCard card={topCard} size="md" className="shadow-[0_10px_30px_rgba(0,0,0,0.5)]" />
          ) : (
            <div className="w-16 h-24 sm:w-24 sm:h-36 border-2 border-dashed border-white/10 rounded-xl flex items-center justify-center">
              <span className="text-white/10 font-black">?</span>
            </div>
          )}
        </div>

        {/* Stack Indicator */}
        {stackValue > 0 && (
          <div className="absolute -top-4 -right-4 bg-red-600 border-2 border-white text-white font-black text-lg px-3 py-0.5 rounded-full shadow-[0_0_15px_rgba(255,0,0,0.6)] animate-pulse z-50">
            +{stackValue}
          </div>
        )}
      </div>

    </div>
  );
};
