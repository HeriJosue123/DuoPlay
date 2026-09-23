import React from 'react';
import { User, Target } from 'lucide-react';
import type { UnoPlayerSanitized } from '../../types';

interface TargetSelectorProps {
  players: UnoPlayerSanitized[];
  myId: string;
  onSelect: (targetId: string) => void;
  onCancel: () => void;
}

export const TargetSelector: React.FC<TargetSelectorProps> = ({ players, myId, onSelect, onCancel }) => {
  const validTargets = players.filter(p => p.id !== myId && !p.isEliminated);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 shadow-[0_0_50px_rgba(0,0,0,0.8)] rounded-3xl p-6 sm:p-10 w-full max-w-md flex flex-col items-center">
        
        <div className="flex items-center gap-3 text-white font-black text-xl sm:text-2xl mb-2 tracking-widest uppercase text-center">
          <Target className="text-red-500 animate-pulse" size={32} />
          <span>Select Target</span>
        </div>
        <p className="text-zinc-400 text-center text-sm mb-8">Choose a player to swap hands with.</p>

        <div className="flex flex-col gap-3 w-full">
          {validTargets.map(p => (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className="flex items-center justify-between bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-red-500 rounded-2xl p-4 transition-all hover:scale-105 active:scale-95 group"
            >
              <div className="flex items-center gap-3">
                <div className="bg-black p-2 rounded-full border-2 border-zinc-700 group-hover:border-red-500">
                  <User size={24} className="text-zinc-400 group-hover:text-white" />
                </div>
                <span className="text-white font-bold text-lg">{p.name}</span>
              </div>
              
              <div className="bg-black/50 px-3 py-1 rounded-full border border-zinc-700 text-xs text-zinc-300 font-black">
                {p.cardCount} CARDS
              </div>
            </button>
          ))}
        </div>

        <button 
          onClick={onCancel}
          className="mt-8 text-zinc-500 hover:text-white uppercase font-bold text-sm tracking-widest transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
