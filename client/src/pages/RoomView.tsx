import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Copy, LogOut, Play, Mic, MicOff, AlertCircle } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { RoomVoice } from '../components/RoomVoice/RoomVoice';
import { ChatBox } from '../components/Chat/ChatBox';
import { UnoBoard } from '../components/Uno/UnoBoard';
import { ScoreBoard } from '../components/Uno/ScoreBoard';
import { UnoCard } from '../components/Uno/UnoCard';
import type { Room } from '../types';

export const RoomView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { socket, playerId } = useSocket();
  const [room, setRoom] = useState<Room | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [sessionClosed, setSessionClosed] = useState(false);
  const [voiceStatuses, setVoiceStatuses] = useState<Record<string, boolean>>({});
  const isLeaving = useRef(false);

  useEffect(() => {
    if (!socket || !id) {
      navigate('/');
      return;
    }

    const handleRoomUpdate = (updatedRoom: Room) => {
      setRoom(updatedRoom);
    };

    const handleSessionClosed = () => {
      setSessionClosed(true);
      localStorage.removeItem('duoplay_roomId');
    };

    const storedName = localStorage.getItem('duoplay_playerName') || 'Player';
    socket.emit('join_room', { playerName: storedName, roomId: id, playerId }, (res: any) => {
      if (res.success) {
        setRoom(res.room);
      } else {
        localStorage.removeItem('duoplay_roomId');
        navigate('/');
      }
    });

    socket.on('player_joined', handleRoomUpdate);
    socket.on('player_left', handleRoomUpdate);
    socket.on('player_disconnected', handleRoomUpdate);
    socket.on('game_started', handleRoomUpdate);
    socket.on('game_state_updated', (safeState) => {
      setRoom(prev => prev ? { ...prev, gameState: safeState, status: 'playing' } as Room : null);
    });
    socket.on('chat_message', handleRoomUpdate);
    socket.on('session_closed', handleSessionClosed);
    
    // Add voice_status listener
    socket.on('voice_status', (data: { roomId: string, playerId: string, isMuted: boolean }) => {
      setVoiceStatuses(prev => ({ ...prev, [data.playerId]: data.isMuted }));
    });

    return () => {
      socket.off('player_joined', handleRoomUpdate);
      socket.off('player_left', handleRoomUpdate);
      socket.off('player_disconnected', handleRoomUpdate);
      socket.off('game_started', handleRoomUpdate);
      socket.off('game_state_updated');
      socket.off('chat_message', handleRoomUpdate);
      socket.off('session_closed', handleSessionClosed);
      socket.off('voice_status');
    };
  }, [socket, id, navigate, playerId]);

  const copyCode = () => {
    if (id) {
      navigator.clipboard.writeText(id);
      alert('Código copiado al portapapeles');
    }
  };

  const handleStartGame = () => {
    socket?.emit('start_game', { roomId: id, playerId });
  };

  const handleCloseSession = () => {
    if (isLeaving.current) return;
    isLeaving.current = true;
    socket?.emit('close_session', { roomId: id, playerId });
    localStorage.removeItem('duoplay_roomId');
    navigate('/', { replace: true });
  };

  if (sessionClosed) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in zoom-in">
        <div className="w-full max-w-sm panel-dark p-8 rounded-[2rem] border border-red-500/30 space-y-8 text-center shadow-[0_0_50px_rgba(239,68,68,0.15)]">
          <div className="text-6xl mb-4 relative z-10 animate-bounce">🚪</div>
          <h2 className="text-2xl font-black text-white uppercase tracking-widest glow-red leading-tight">
            SALA CERRADA
          </h2>
          <p className="text-sm font-bold text-slate-400">El anfitrión cerró la sala.</p>
          <button 
            onClick={() => navigate('/', { replace: true })}
            className="w-full bg-[#111] hover:bg-[#222] border border-[#333] text-white font-black py-4 px-6 rounded-2xl transition-transform active:scale-95 tracking-widest text-sm"
          >
            VOLVER AL INICIO
          </button>
        </div>
      </div>
    );
  }

  if (!room) return null;

  const isHost = room.players[0]?.id === playerId;
  const canStart = isHost && room.players.length >= 2;
  const gameState = room.gameState;

  return (
    <>
      <RoomVoice room={room} />
      <ChatBox room={room} />
      
      {/* Floating Exit Button */}
      <button
        onClick={() => setShowExitConfirm(true)}
        aria-label="Cerrar sala"
        className="absolute top-4 left-4 z-40 bg-black/50 hover:bg-red-500/20 border border-[#333] hover:border-red-500/50 text-white/80 hover:text-red-400 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-[9px] sm:text-[10px] font-black tracking-widest transition-all backdrop-blur-md active:scale-95 flex items-center gap-1.5 sm:gap-2 group"
      >
        <LogOut size={12} className="group-hover:-translate-x-1 transition-transform" /> 
        <span>CERRAR<span className="hidden sm:inline"> SALA</span></span>
      </button>

      {/* Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-[300px] panel-dark p-6 rounded-3xl border border-[#333] text-center shadow-2xl animate-pop">
            <h3 className="text-white font-black tracking-widest mb-2 text-sm">¿CERRAR SALA?</h3>
            <p className="text-xs text-slate-400 font-bold mb-6">Esto desconectará a todos los jugadores.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowExitConfirm(false)} className="flex-1 bg-[#111] hover:bg-[#222] border border-[#333] text-white text-xs font-black py-3 rounded-xl transition-all">
                CANCELAR
              </button>
              <button onClick={handleCloseSession} disabled={isLeaving.current} className="flex-1 bg-red-600 hover:bg-red-500 text-white text-xs font-black py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(239,68,68,0.3)] disabled:opacity-50">
                CERRAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SCORE BOARD OVERLAY */}
      {gameState && (gameState.status === 'round_end' || gameState.status === 'match_end') && (
        <ScoreBoard 
          state={gameState} 
          playerId={playerId}
          onContinue={isHost ? handleStartGame : undefined}
          onExit={handleCloseSession}
        />
      )}

      {/* LOBBY / GAME RENDERING */}
      {room.status === 'waiting' || !gameState ? (
        <div className="fixed inset-0 flex flex-col items-center overflow-y-auto overflow-x-hidden bg-[#020202] selection:bg-blue-500/30 font-sans z-0">
          
          {/* Premium Background Ambience */}
          <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden min-h-[100dvh]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#0a0f1c_0%,_#020202_80%)] opacity-100" />
            <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: `linear-gradient(0deg, transparent 24%, rgba(255, 255, 255, 1) 25%, rgba(255, 255, 255, 1) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, 1) 75%, rgba(255, 255, 255, 1) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(255, 255, 255, 1) 25%, rgba(255, 255, 255, 1) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, 1) 75%, rgba(255, 255, 255, 1) 76%, transparent 77%, transparent)`, backgroundSize: '50px 50px' }} />
            <div className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[800px] bg-[radial-gradient(ellipse_at_center,_rgba(37,99,235,0.15)_0%,_transparent_70%)]" />
            <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-[600px] h-[800px] bg-[radial-gradient(ellipse_at_center,_rgba(220,38,38,0.12)_0%,_transparent_70%)]" />
            <div className="absolute -top-[20%] left-[10%] w-[2px] h-[140%] bg-blue-500 rotate-[35deg] opacity-20 sm:opacity-80" />
            <div className="absolute -top-[20%] right-[10%] w-[2px] h-[140%] bg-red-500 rotate-[-35deg] opacity-20 sm:opacity-80" />
            
            <div className="hidden lg:block">
              <div className="absolute top-[12%] left-[15%] rotate-[-15deg] scale-90 drop-shadow-[0_20px_35px_rgba(0,0,0,0.8)] opacity-95">
                <UnoCard size="lg" />
              </div>
              <div className="absolute bottom-[18%] right-[15%] rotate-[20deg] scale-90 drop-shadow-[0_20px_35px_rgba(0,0,0,0.8)] opacity-95">
                <UnoCard size="lg" />
              </div>
            </div>
            
            {/* Swoosh simulation behind logo */}
            <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[280px] sm:w-[350px] h-[100px] sm:h-[120px] border-2 sm:border-[4px] border-transparent border-t-red-600 border-l-red-600 rounded-[100%] rotate-[-15deg] opacity-40 sm:opacity-80 shadow-[0_0_15px_rgba(220,38,38,0.5)]" />
          </div>

          <div className="relative z-10 w-full max-w-[420px] px-4 pt-16 pb-8 sm:py-12 flex flex-col items-center mt-auto mb-auto space-y-6 sm:space-y-8 animate-in fade-in zoom-in duration-500">
            
            {/* Logo Section */}
            <div className="text-center relative">
              <div className="filter drop-shadow-[0_0_20px_rgba(59,130,246,0.6)]">
                <h1 className="text-4xl sm:text-5xl leading-none font-black text-transparent bg-clip-text bg-gradient-to-b from-blue-300 via-blue-500 to-blue-700 tracking-tighter italic">
                  UNO
                </h1>
              </div>
              <div className="filter drop-shadow-[0_0_15px_rgba(255,255,255,0.4)] relative z-10 -mt-2 sm:-mt-3">
                <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-blue-200 uppercase tracking-widest">
                  ONLINE
                </h2>
              </div>
              <div className="w-12 h-[2px] bg-gradient-to-r from-blue-500 to-red-500 mx-auto mt-2 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.3)]" />
              <p className="text-blue-200/80 font-black text-[10px] sm:text-xs tracking-[0.3em] uppercase mt-3">
                SALA {room.players.length}/{room.settings.maxPlayers}
              </p>
            </div>
            
            {/* Code Panel */}
            <div className="w-full bg-black/60 backdrop-blur-md rounded-[2rem] p-5 sm:p-6 border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.8)]">
              <p className="text-center text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mb-3">Código de sala</p>
              <div className="text-center mb-4">
                <span className="text-4xl sm:text-5xl font-mono tracking-[0.2em] font-black text-blue-400 drop-shadow-[0_0_15px_rgba(96,165,250,0.5)]">
                  {id}
                </span>
              </div>
              <button 
                onClick={copyCode} 
                className="w-full flex items-center justify-center gap-2 text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl py-2.5 transition-colors font-bold text-xs uppercase tracking-widest active:scale-95"
              >
                <Copy size={14} /> Copiar Código
              </button>
            </div>

            {/* Players Panel */}
            <div className="w-full bg-black/60 backdrop-blur-md rounded-[2rem] p-5 sm:p-6 border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.8)] space-y-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em]">Jugadores ({room.players.length}/{room.settings.maxPlayers})</p>
                {room.players.length === room.settings.maxPlayers && (
                  <span className="flex items-center gap-1.5 text-[9px] text-green-400 font-black tracking-widest uppercase bg-green-500/10 px-2 py-1 rounded-full border border-green-500/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Sala llena
                  </span>
                )}
              </div>
              
              <div className="space-y-2">
                {room.players.map((p, idx) => {
                  const isMicMuted = voiceStatuses[p.id] ?? true;
                  return (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-2xl bg-[#0a0a0a] border border-white/5 group">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shadow-inner border ${idx === 0 ? 'bg-blue-600/20 text-blue-400 border-blue-500/30' : 'bg-red-600/20 text-red-400 border-red-500/30'}`}>
                          PL
                        </div>
                        <div className="flex flex-col">
                          <span className="text-white font-bold text-sm tracking-wide flex items-center gap-2">
                            {p.name}
                            {idx === 0 && <span className="text-[8px] bg-blue-600/30 text-blue-300 px-1.5 py-0.5 rounded font-black tracking-widest uppercase border border-blue-500/20">HOST</span>}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {p.connected ? (
                          isMicMuted ? (
                            <MicOff size={16} className="text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                          ) : (
                            <Mic size={16} className="text-green-500 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                          )
                        ) : (
                          <span title="Desconectado">
                            <AlertCircle size={16} className="text-yellow-500" />
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {Array.from({ length: room.settings.maxPlayers - room.players.length }).map((_, i) => (
                  <div key={`empty-${i}`} className="flex items-center p-3 rounded-2xl border border-dashed border-white/10 bg-white/[0.02]">
                    <div className="flex items-center gap-3 opacity-40">
                      <div className="w-9 h-9 rounded-full bg-black flex items-center justify-center text-xs font-black border border-white/10">
                        ?
                      </div>
                      <span className="text-zinc-500 font-bold text-xs uppercase tracking-widest">Esperando...</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Start Button */}
            <div className="w-full">
              {isHost ? (
                <button
                  onClick={handleStartGame}
                  disabled={!canStart}
                  className="relative w-full bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 hover:from-blue-500 hover:via-blue-400 hover:to-blue-500 disabled:from-[#222] disabled:to-[#222] disabled:text-slate-500 disabled:shadow-none text-white font-black py-4 px-6 rounded-2xl transition-all shadow-[0_0_30px_rgba(59,130,246,0.6)] active:scale-95 border border-blue-400/50 disabled:border-[#333] flex items-center justify-center gap-3 overflow-hidden group min-h-[64px]"
                >
                  <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out hidden sm:block" />
                  <Play size={20} fill="currentColor" className="relative z-10" /> 
                  <span className="relative z-10 text-sm sm:text-base tracking-widest">{canStart ? 'INICIAR PARTIDA' : 'FALTAN JUGADORES'}</span>
                </button>
              ) : (
                <div className="w-full bg-[#111] border border-[#222] rounded-2xl py-5 flex flex-col items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-center text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Esperando a que el host inicie la partida...
                  </span>
                </div>
              )}
            </div>

          </div>
        </div>
      ) : (
        <UnoBoard room={room} />
      )}
    </>
  );
};
