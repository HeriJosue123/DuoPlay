import React from 'react';
import { BellRing, AlertTriangle } from 'lucide-react';
import type { UnoPlayerSanitized } from '../../types';

interface ActionHUDProps {
  myPlayer: UnoPlayerSanitized | undefined;
  opponents: UnoPlayerSanitized[];
  onCallUno: () => void;
  onCatchUno: (targetId: string) => void;
}

export const ActionHUD: React.FC<ActionHUDProps> = ({
  myPlayer,
  opponents,
  onCallUno,
  onCatchUno
}) => {
  const canICallUno = myPlayer && myPlayer.cardCount <= 2 && !myPlayer.hasCalledUno;
  
  const vulnerableOpponents = opponents.filter(p => p.canBeCaughtUno);

  if (!canICallUno && vulnerableOpponents.length === 0) return null;

  return (
    <div className="fixed bottom-32 sm:bottom-40 right-4 sm:right-8 flex flex-col gap-3 z-50">
      
      {/* Call UNO Button */}
      {canICallUno && (
        <button 
          onClick={onCallUno}
          className="bg-red-600 hover:bg-red-500 text-white font-black tracking-widest text-lg sm:text-xl px-6 py-4 rounded-full shadow-[0_0_30px_rgba(220,38,38,0.8)] border-4 border-white transform transition-all hover:scale-110 active:scale-95 flex items-center gap-2 animate-bounce"
        >
          <BellRing size={24} />
          UNO!
        </button>
      )}

      {/* Catch UNO Buttons */}
      {vulnerableOpponents.map(opp => (
        <button
          key={`catch-${opp.id}`}
          onClick={() => onCatchUno(opp.id)}
          className="bg-yellow-500 hover:bg-yellow-400 text-black font-black tracking-widest px-6 py-3 rounded-full shadow-[0_0_20px_rgba(234,179,8,0.8)] border-4 border-black transform transition-all hover:scale-110 active:scale-95 flex items-center gap-2 animate-pulse"
        >
          <AlertTriangle size={20} />
          CATCH {opp.name.toUpperCase()}
        </button>
      ))}
      
    </div>
  );
};
