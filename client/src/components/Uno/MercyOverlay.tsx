import React, { useEffect, useState } from 'react';
import { Skull } from 'lucide-react';

interface MercyOverlayProps {
  playerName: string;
}

export const MercyOverlay: React.FC<MercyOverlayProps> = ({ playerName }) => {
  const [visible, setVisible] = useState(true);

  // Auto-hide after 3 seconds for opponents, but keep a smaller badge for myself?
  // Let's just flash it for 3 seconds then disappear.
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 3500);
    return () => clearTimeout(t);
  }, [playerName]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none p-4">
      <div className="absolute inset-0 bg-red-900/40 animate-pulse" />
      <div className="bg-black border-4 border-red-600 shadow-[0_0_100px_rgba(220,38,38,0.8)] rounded-3xl p-8 sm:p-16 flex flex-col items-center animate-in zoom-in duration-500 relative overflow-hidden">
        
        {/* Grungy background texture effect (CSS) */}
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-600 via-transparent to-transparent pointer-events-none" />
        
        <Skull size={80} className="text-red-500 mb-6 drop-shadow-[0_0_15px_rgba(220,38,38,1)] animate-bounce" />
        
        <h2 className="text-5xl sm:text-7xl font-black text-white tracking-widest text-center uppercase drop-shadow-[0_5px_5px_rgba(0,0,0,1)]">
          MERCY
        </h2>
        
        <div className="mt-4 bg-red-600 text-white font-black px-6 py-2 rounded-full border-2 border-red-400 shadow-lg text-lg sm:text-2xl uppercase tracking-widest">
          {playerName} ELIMINATED
        </div>
      </div>
    </div>
  );
};
