import React, { useState, useEffect } from 'react';
import { useSocket } from '../../context/SocketContext';
import { UnoHand } from './UnoHand';
import { PlayerSeat } from './PlayerSeat';
import { CenterTable } from './CenterTable';
import { ColorPicker } from './ColorPicker';
import { TargetSelector } from './TargetSelector';
import { ActionHUD } from './ActionHUD';
import { GameOverOverlay } from './GameOverOverlay';
import { MercyOverlay } from './MercyOverlay';
import type { UnoGameStateSanitized, UnoColor } from '../../types';

interface UnoBoardProps {
  room: any;
}

export const UnoBoard: React.FC<UnoBoardProps> = ({ room }) => {
  const { socket, playerId } = useSocket();
  const state: UnoGameStateSanitized = room.gameState;

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showTargetSelector, setShowTargetSelector] = useState(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  
  // Track eliminated players to trigger Mercy overlay
  const [justEliminated, setJustEliminated] = useState<string | null>(null);
  const [knownEliminatedIds, setKnownEliminatedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!state?.players) return;
    
    let newlyEliminatedPlayer = null;
    const newSet = new Set(knownEliminatedIds);

    for (const p of state.players) {
      if (p.isEliminated && !newSet.has(p.id)) {
        newlyEliminatedPlayer = p;
        newSet.add(p.id);
      }
    }

    if (newlyEliminatedPlayer) {
      setKnownEliminatedIds(newSet);
      setJustEliminated(newlyEliminatedPlayer.name);
      setTimeout(() => setJustEliminated(null), 3500);
    }
  }, [state?.players]);

  if (!state || !playerId) return null;

  const showError = (msg: string) => {
    setErrorToast(msg);
    setTimeout(() => setErrorToast(null), 3000);
  };

  const myPlayerIndex = state.players.findIndex(p => p.id === playerId);
  const myPlayer = state.players[myPlayerIndex];
  const isMyTurn = state.status === 'playing' && state.currentTurnIndex === myPlayerIndex;

  // Arrange opponents dynamically in a circle/arc
  const opponents = [];
  const numOpponents = state.players.length - 1;
  for (let i = 1; i <= numOpponents; i++) {
    const oppIndex = (myPlayerIndex + i) % state.players.length;
    const oppSanitized = state.players[oppIndex];
    const oppFull = room.players.find((p: any) => p.id === oppSanitized.id);
    opponents.push({ ...oppSanitized, connected: oppFull?.connected ?? true });
  }

  const getPositionClass = (index: number, total: number) => {
    // Distribute around the top half of the screen
    if (total === 1) return "top-[10%] left-1/2 -translate-x-1/2"; // 1 opponent -> top center
    if (total === 2) {
      if (index === 0) return "top-[20%] left-[10%]";
      if (index === 1) return "top-[20%] right-[10%]";
    }
    if (total === 3) {
      if (index === 0) return "top-[40%] left-[5%]";
      if (index === 1) return "top-[10%] left-1/2 -translate-x-1/2";
      if (index === 2) return "top-[40%] right-[5%]";
    }
    if (total === 4) {
      if (index === 0) return "top-[40%] left-[5%]";
      if (index === 1) return "top-[15%] left-[25%]";
      if (index === 2) return "top-[15%] right-[25%]";
      if (index === 3) return "top-[40%] right-[5%]";
    }
    if (total === 5) {
      if (index === 0) return "top-[50%] left-[2%]";
      if (index === 1) return "top-[20%] left-[15%]";
      if (index === 2) return "top-[5%] left-1/2 -translate-x-1/2";
      if (index === 3) return "top-[20%] right-[15%]";
      if (index === 4) return "top-[50%] right-[2%]";
    }
    return "top-[10%] left-1/2 -translate-x-1/2"; // fallback
  };

  const handleCardClick = (cardId: string) => {
    if (!isMyTurn) return;
    
    const card = state.myHand?.find(c => c.id === cardId);
    if (!card) return;

    const requiresColor = card.color === 'wild' || (card.value as string).includes('wild');
    const requiresTarget = card.value === '7';

    if (requiresColor) {
      setSelectedCardId(cardId);
      setShowColorPicker(true);
    } else if (requiresTarget) {
      setSelectedCardId(cardId);
      setShowTargetSelector(true);
    } else {
      socket?.emit('play_card', { roomId: room.roomId, playerId, cardId }, (res: any) => {
        if (!res?.success && res?.message) showError(res.message);
      });
      setSelectedCardId(null);
    }
  };

  const handleColorSelect = (color: UnoColor) => {
    if (!selectedCardId) return;
    const card = state.myHand?.find(c => c.id === selectedCardId);
    if (card?.value === '7') {
      setShowColorPicker(false);
      setShowTargetSelector(true);
    } else {
      socket?.emit('play_card', { roomId: room.roomId, playerId, cardId: selectedCardId, chosenColor: color }, (res: any) => {
        if (!res?.success && res?.message) showError(res.message);
      });
      setShowColorPicker(false);
      setSelectedCardId(null);
    }
  };

  const handleTargetSelect = (targetId: string) => {
    if (!selectedCardId) return;
    socket?.emit('play_card', { roomId: room.roomId, playerId, cardId: selectedCardId, targetPlayerId: targetId }, (res: any) => {
      if (!res?.success && res?.message) showError(res.message);
    });
    setShowTargetSelector(false);
    setSelectedCardId(null);
  };

  const handleDraw = () => {
    if (!isMyTurn) return;
    socket?.emit('draw_card', { roomId: room.roomId, playerId }, (res: any) => {
      if (!res?.success && res?.message) showError(res.message);
    });
  };

  const handleCallUno = () => {
    socket?.emit('call_uno', { roomId: room.roomId, playerId }, (res: any) => {
      if (!res?.success && res?.message) showError(res.message);
    });
  };

  const handleCatchUno = (targetId: string) => {
    socket?.emit('catch_uno', { roomId: room.roomId, callerId: playerId, targetId }, (res: any) => {
      if (!res?.success && res?.message) showError(res.message);
    });
  };

  const topCard = state.discardPile.length > 0 ? state.discardPile[state.discardPile.length - 1] : null;

  return (
    <div className="relative w-full h-full min-h-screen bg-[#020202] overflow-hidden flex flex-col font-sans selection:bg-red-500/30">
      
      {/* Background Ambience - Pure CSS Futuristic Table */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {/* Base radial table gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#0f172a_0%,_#020202_70%)] opacity-80" />
        
        {/* Subtle SVG Noise Texture */}
        <div className="absolute inset-0 opacity-[0.015] mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
        
        {/* Central blue/cyan glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[800px] max-h-[800px] bg-cyan-900/10 rounded-full blur-[100px] animate-pulse pointer-events-none" style={{ animationDuration: '8s' }} />
        
        {/* Subtle red edge glows */}
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] bg-red-900/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-red-900/10 rounded-full blur-[120px] pointer-events-none" />
        
        {/* Tech grid pattern */}
        <div className="absolute inset-0 opacity-10" style={{ 
          backgroundImage: `radial-gradient(circle at center, transparent 30%, #020202 80%), linear-gradient(0deg, transparent 24%, rgba(255, 255, 255, .05) 25%, rgba(255, 255, 255, .05) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .05) 75%, rgba(255, 255, 255, .05) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(255, 255, 255, .05) 25%, rgba(255, 255, 255, .05) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .05) 75%, rgba(255, 255, 255, .05) 76%, transparent 77%, transparent)`, 
          backgroundSize: '50px 50px' 
        }} />
      </div>

      {/* Opponents */}
      <div className="absolute inset-0 pointer-events-none">
        {opponents.map((opp, idx) => (
          <div key={opp.id} className="pointer-events-auto">
            <PlayerSeat 
              player={opp} 
              isCurrentTurn={state.status === 'playing' && state.players[state.currentTurnIndex].id === opp.id}
              positionClass={getPositionClass(idx, numOpponents)}
              connected={opp.connected}
            />
          </div>
        ))}
      </div>

      {/* Center Table */}
      <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 scale-75 sm:scale-100">
        <CenterTable 
          topCard={topCard}
          drawPileCount={state.drawPileCount}
          stackValue={state.stackValue}
          currentColor={state.currentColor}
          direction={state.direction}
          onDraw={handleDraw}
          canDraw={isMyTurn && !state.playerWhoDrew}
        />
      </div>

      {/* My Hand */}
      <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none">
        <div className="pointer-events-auto">
          {/* My Player Info Plate */}
          <div className="absolute -top-12 left-4 sm:left-8 bg-zinc-900/80 backdrop-blur-md border border-white/10 text-white font-bold px-4 py-2 rounded-2xl shadow-lg flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-xs text-zinc-400">YOU</span>
              <span className="text-sm sm:text-base truncate max-w-[150px]">{myPlayer.name}</span>
            </div>
            {isMyTurn && (
              <div className="bg-red-600 text-white text-xs font-black px-2 py-1 rounded animate-pulse">
                YOUR TURN
              </div>
            )}
            {myPlayer.isEliminated && (
              <div className="bg-zinc-800 text-red-500 text-xs font-black px-2 py-1 rounded">
                ELIMINATED
              </div>
            )}
          </div>

          <UnoHand 
            cards={state.myHand || []}
            playableCardId={state.drawnCardPlayable?.id}
            selectedCardId={selectedCardId}
            onSelectCard={handleCardClick}
            isMyTurn={isMyTurn && !myPlayer.isEliminated}
            currentColor={state.currentColor}
            topCardValue={topCard?.value as string}
            stackValue={state.stackValue}
          />
        </div>
      </div>

      {/* Overlays & Interactivity */}
      {showColorPicker && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <ColorPicker onSelect={handleColorSelect} onCancel={() => { setShowColorPicker(false); setSelectedCardId(null); }} />
        </div>
      )}

      {showTargetSelector && (
        <TargetSelector 
          players={state.players}
          myId={playerId}
          onSelect={handleTargetSelect}
          onCancel={() => { setShowTargetSelector(false); setSelectedCardId(null); }}
        />
      )}

      <ActionHUD 
        myPlayer={myPlayer}
        opponents={opponents}
        onCallUno={handleCallUno}
        onCatchUno={handleCatchUno}
      />

      {state.status === 'round_end' && (
        <GameOverOverlay winnerId={state.roundWinner!} players={state.players} myId={playerId} isMatchEnd={false} />
      )}
      {state.status === 'match_end' && (
        <GameOverOverlay winnerId={state.matchWinner!} players={state.players} myId={playerId} isMatchEnd={true} />
      )}

      {justEliminated && <MercyOverlay playerName={justEliminated} />}

      {/* Error Toast */}
      {errorToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-10 fade-in duration-300">
          <div className="bg-red-600/90 backdrop-blur-md text-white font-bold px-6 py-3 rounded-full shadow-[0_0_20px_rgba(220,38,38,0.8)] border-2 border-red-400 flex items-center gap-2">
            <span className="text-xl">⚠️</span> {errorToast}
          </div>
        </div>
      )}

    </div>
  );
};
