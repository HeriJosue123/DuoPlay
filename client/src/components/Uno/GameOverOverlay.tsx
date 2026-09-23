import React from 'react';
import { Crown, Trophy } from 'lucide-react';
import type { UnoPlayerSanitized } from '../../types';

interface GameOverOverlayProps {
  winnerId: string | null;
  players: UnoPlayerSanitized[];
  myId: string;
  isMatchEnd?: boolean;
}

export const GameOverOverlay: React.FC<GameOverOverlayProps> = ({ winnerId, players, myId, isMatchEnd = false }) => {
  if (!winnerId) return null;

  const winner = players.find(p => p.id === winnerId);
  const amIWinner = winnerId === myId;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="flex flex-col items-center animate-in fade-in zoom-in duration-700">
        
        {isMatchEnd ? (
          <Trophy className="text-yellow-400 w-32 h-32 sm:w-48 sm:h-48 drop-shadow-[0_0_50px_rgba(250,204,21,1)] animate-bounce" />
        ) : (
          <Crown className="text-yellow-400 w-32 h-32 sm:w-48 sm:h-48 drop-shadow-[0_0_50px_rgba(250,204,21,1)] animate-bounce" />
        )}
        
        <h1 className="text-4xl sm:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 to-yellow-600 mt-8 text-center drop-shadow-2xl">
          {amIWinner ? 'VICTORY' : 'DEFEAT'}
        </h1>
        
        <p className="text-xl sm:text-3xl font-bold text-zinc-300 mt-4 text-center">
          {winner?.name} won the {isMatchEnd ? 'match' : 'round'}!
        </p>

        <div className="mt-12 w-full max-w-md bg-zinc-950/80 rounded-3xl border border-zinc-800 p-6 shadow-2xl">
          <h2 className="text-white text-center font-black tracking-widest uppercase mb-4 text-sm sm:text-base border-b border-zinc-800 pb-4">
            Standings
          </h2>
          <div className="flex flex-col gap-3">
            {[...players].sort((a, b) => b.score - a.score).map((p, idx) => (
              <div key={p.id} className="flex justify-between items-center bg-black/50 p-3 rounded-xl border border-white/5">
                <div className="flex items-center gap-3">
                  <span className="text-zinc-500 font-black w-4">{idx + 1}</span>
                  <span className={`font-bold ${p.id === myId ? 'text-white' : 'text-zinc-400'}`}>
                    {p.name}
                  </span>
                </div>
                <span className="text-yellow-400 font-black">{p.score} PTS</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
