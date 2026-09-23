import React from 'react';
import { RefreshCw, Ban, FastForward, Repeat, Loader } from 'lucide-react';
import type { UnoCard as UnoCardType, UnoColor } from '../../types';

interface UnoCardProps {
  card?: UnoCardType; // If missing, renders back of card
  isPlayable?: boolean;
  isSelected?: boolean;
  isStaged?: boolean; // About to be played
  onClick?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  style?: React.CSSProperties;
}

const colorMap: Record<UnoColor, { bg: string, border: string, text: string, glow: string }> = {
  red: { bg: 'bg-[#ff1744]', border: 'border-[#b71c1c]', text: 'text-[#ff1744]', glow: 'shadow-[0_0_15px_#ff1744]' },
  blue: { bg: 'bg-[#2979ff]', border: 'border-[#0d47a1]', text: 'text-[#2979ff]', glow: 'shadow-[0_0_15px_#2979ff]' },
  green: { bg: 'bg-[#00e676]', border: 'border-[#1b5e20]', text: 'text-[#00e676]', glow: 'shadow-[0_0_15px_#00e676]' },
  yellow: { bg: 'bg-[#ffea00]', border: 'border-[#f57f17]', text: 'text-[#ffea00]', glow: 'shadow-[0_0_15px_#ffea00]' },
  wild: { bg: 'bg-zinc-900', border: 'border-zinc-700', text: 'text-white', glow: 'shadow-[0_0_15px_#ffffff]' }
};

export const UnoCard: React.FC<UnoCardProps> = ({ 
  card, 
  isPlayable = false, 
  isSelected = false,
  isStaged = false, 
  onClick, 
  className = '',
  size = 'md',
  style = {}
}) => {
  const sizeClasses = {
    sm: 'w-12 h-16 sm:w-16 sm:h-24 rounded-lg text-xs border-2',
    md: 'w-16 h-24 sm:w-24 sm:h-36 rounded-xl text-sm sm:text-lg border-2 sm:border-4',
    lg: 'w-24 h-36 sm:w-32 sm:h-48 rounded-2xl text-xl sm:text-2xl border-4',
    xl: 'w-32 h-48 sm:w-48 sm:h-72 rounded-3xl text-2xl sm:text-4xl border-4 sm:border-8'
  };

  const isBack = !card;

  const baseClasses = `relative select-none flex-shrink-0 flex items-center justify-center font-black transition-all duration-300 transform 
    ${sizeClasses[size]} 
    ${isPlayable && !isSelected ? 'cursor-pointer hover:-translate-y-6 hover:shadow-[0_20px_30px_rgba(0,0,0,0.6)] hover:z-30' : ''}
    ${!isPlayable && !isBack ? 'opacity-50 grayscale-[50%] brightness-75 cursor-not-allowed' : ''}
    ${isSelected ? '-translate-y-8 ring-4 ring-white shadow-[0_0_40px_rgba(255,255,255,0.4)] z-40 scale-105' : 'shadow-[0_8px_16px_rgba(0,0,0,0.5)] z-10'}
    ${isStaged ? 'opacity-0 scale-50' : ''}
    ${className}`;

  if (isBack) {
    return (
      <div className={`${baseClasses} bg-[#ff1744] border-white overflow-hidden group shadow-[inset_0_0_8px_rgba(0,0,0,0.3)]`} style={style} onClick={onClick}>
        <div className="absolute inset-1.5 sm:inset-2 border-2 sm:border-4 border-[#ffea00] rounded-full flex items-center justify-center bg-[#ff1744] shadow-lg transform -rotate-[15deg]">
          <div className="absolute inset-0 rounded-full shadow-[inset_0_0_10px_rgba(0,0,0,0.4)]" />
          <span className="text-white font-black tracking-tighter text-xl sm:text-3xl lg:text-4xl drop-shadow-[2px_2px_0_rgba(0,0,0,0.8)] z-10">UNO</span>
        </div>
        <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent pointer-events-none" />
      </div>
    );
  }

  const { color, value } = card!;
  const cMap = colorMap[color];

  const isWildType = color === 'wild' && (value as string).includes('wild');
  
  const bgStyle = isWildType 
    ? 'bg-gradient-to-br from-[#ff1744] via-[#ffea00] to-[#2979ff] border-zinc-300' 
    : `${cMap.bg} ${cMap.border}`;

  const innerColor = (color === 'wild' || value === 'discard_all') ? 'bg-zinc-950' : 'bg-zinc-100';

  // Content Renderer
  const renderContent = () => {
    switch (value) {
      case 'skip': return <Ban strokeWidth={3} className="w-1/2 h-1/2 drop-shadow-md" />;
      case 'skip_everyone': return <FastForward strokeWidth={3} className="w-1/2 h-1/2 drop-shadow-md" />;
      case 'reverse': return <RefreshCw strokeWidth={3} className="w-1/2 h-1/2 drop-shadow-md" />;
      case 'draw_two': return '+2';
      case 'draw_four': return '+4';
      case 'wild_color_roulette': return <Loader strokeWidth={3} className="w-1/2 h-1/2 drop-shadow-md animate-spin-slow" />;
      case 'wild_reverse_draw_four': 
        return (
          <div className="flex flex-col items-center justify-center">
            <RefreshCw strokeWidth={4} className="w-8 h-8 sm:w-12 sm:h-12 absolute opacity-30" />
            <span className="z-10 drop-shadow-[0_2px_2px_rgba(0,0,0,1)]">+4</span>
          </div>
        );
      case 'wild_draw_six': return '+6';
      case 'wild_draw_ten': return '+10';
      case 'discard_all': return <Repeat strokeWidth={3} className="w-1/2 h-1/2 drop-shadow-md text-white" />;
      default: return value;
    }
  };

  const renderSmallContent = () => {
    switch (value) {
      case 'skip': return <Ban strokeWidth={4} className="w-3 h-3 sm:w-5 sm:h-5" />;
      case 'skip_everyone': return <FastForward strokeWidth={4} className="w-3 h-3 sm:w-5 sm:h-5" />;
      case 'reverse': return <RefreshCw strokeWidth={4} className="w-3 h-3 sm:w-5 sm:h-5" />;
      case 'draw_two': return '+2';
      case 'draw_four': return '+4';
      case 'wild_color_roulette': return <Loader strokeWidth={4} className="w-3 h-3 sm:w-5 sm:h-5" />;
      case 'wild_reverse_draw_four': return '+4R';
      case 'wild_draw_six': return '+6';
      case 'wild_draw_ten': return '+10';
      case 'discard_all': return <Repeat strokeWidth={4} className="w-3 h-3 sm:w-5 sm:h-5" />;
      default: return value;
    }
  }

  const symbolClass = isWildType ? 'text-transparent bg-clip-text bg-gradient-to-br from-[#ff1744] via-[#ffea00] to-[#2979ff]' : cMap.text;
  const smallSymbolClass = isWildType ? 'text-white' : 'text-white';

  return (
    <div 
      onClick={isPlayable ? onClick : undefined}
      className={`${baseClasses} ${bgStyle} overflow-hidden group border-white/20`}
      style={style}
    >
      {/* Top Left small symbol */}
      <div className={`absolute top-1 left-2 sm:top-2 sm:left-2 flex flex-col items-center ${smallSymbolClass} drop-shadow-md font-bold`}>
        {renderSmallContent()}
      </div>

      {/* Bottom Right small symbol (inverted) */}
      <div className={`absolute bottom-1 right-2 sm:bottom-2 sm:right-2 flex flex-col items-center rotate-180 ${smallSymbolClass} drop-shadow-md font-bold`}>
        {renderSmallContent()}
      </div>

      {/* Center Oval */}
      <div className={`w-[85%] h-[75%] sm:w-[80%] sm:h-[70%] rounded-[100%] ${innerColor} shadow-[inset_0_4px_15px_rgba(0,0,0,0.5)] flex items-center justify-center transform -rotate-[15deg] transition-transform duration-500 border-2 sm:border-4 border-black/30 group-hover:scale-105`}>
        <div className={`flex items-center justify-center w-full h-full text-3xl sm:text-5xl lg:text-7xl font-black tracking-tighter drop-shadow-sm ${symbolClass}`}>
          {renderContent()}
        </div>
      </div>
      
      {/* Glossy overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/30 via-white/5 to-transparent pointer-events-none" />
      {/* Inner shadow for depth */}
      <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.4)] pointer-events-none rounded-xl" />
      
      {/* Glowing aura if selected */}
      {isSelected && <div className={`absolute inset-0 ${cMap.glow} rounded-xl pointer-events-none opacity-50`} />}
    </div>
  );
};
