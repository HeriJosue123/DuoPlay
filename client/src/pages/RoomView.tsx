import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Copy, LogOut, Play } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { RoomVoice } from '../components/RoomVoice/RoomVoice';
import { ChatBox } from '../components/Chat/ChatBox';
import { UnoBoard } from '../components/Uno/UnoBoard';
import { ScoreBoard } from '../components/Uno/ScoreBoard';
import type { Room } from '../types';

export const RoomView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { socket, playerId } = useSocket();
  const [room, setRoom] = useState<Room | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [sessionClosed, setSessionClosed] = useState(false);
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

    socket.emit('join_room', { playerName: 'Player', roomId: id, playerId }, (res: any) => {
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

    return () => {
      socket.off('player_joined', handleRoomUpdate);
      socket.off('player_left', handleRoomUpdate);
      socket.off('player_disconnected', handleRoomUpdate);
      socket.off('game_started', handleRoomUpdate);
      socket.off('game_state_updated');
      socket.off('chat_message', handleRoomUpdate);
      socket.off('session_closed', handleSessionClosed);
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
        <div className="flex flex-col items-center justify-center flex-1 p-6 space-y-8 w-full max-w-md mx-auto animate-in fade-in zoom-in duration-500">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-black text-white tracking-tighter glow-blue">UNO ONLINE</h1>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">
              SALA {room.players.length}/{room.settings.maxPlayers}
            </p>
          </div>
          
          <div className="relative group w-full">
            <div className="absolute inset-0 bg-blue-500 opacity-20 blur-xl group-hover:opacity-30 transition-opacity rounded-3xl" />
            <button onClick={copyCode} className="relative w-full panel-dark p-8 rounded-3xl flex flex-col items-center justify-center gap-4 border border-[#333] group-hover:border-blue-500/50 transition-colors active:scale-95 cursor-copy">
              <span className="text-5xl font-mono tracking-[0.3em] font-black text-white glow-blue">
                {id}
              </span>
              <div className="flex items-center gap-2 text-slate-500 group-hover:text-blue-400 transition-colors font-bold text-xs uppercase tracking-widest">
                <Copy size={14} /> Copiar Código
              </div>
            </button>
          </div>

          <div className="w-full panel-dark rounded-3xl p-4 border border-[#333] space-y-2">
            {room.players.map((p, idx) => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-2xl bg-[#111] border border-[#222]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-black border border-[#444]">
                    {p.name.substring(0, 2).toUpperCase()}
                  </div>
                  <span className="text-white font-bold text-sm">{p.name} {p.id === playerId ? '(Tú)' : ''}</span>
                </div>
                {idx === 0 && <span className="text-[9px] bg-blue-600/20 text-blue-400 px-2 py-1 rounded-full font-black tracking-widest">HOST</span>}
              </div>
            ))}
            {Array.from({ length: room.settings.maxPlayers - room.players.length }).map((_, i) => (
              <div key={`empty-${i}`} className="flex items-center justify-center p-3 rounded-2xl border border-dashed border-[#333] opacity-50">
                <span className="text-slate-500 font-bold text-xs uppercase tracking-widest">Esperando jugador...</span>
              </div>
            ))}
          </div>
          
          {isHost ? (
            <button
              onClick={handleStartGame}
              disabled={!canStart}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-[#222] disabled:text-slate-500 disabled:shadow-none text-white font-black py-4 px-6 rounded-2xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] active:scale-95 flex items-center justify-center gap-2"
            >
              <Play size={18} fill="currentColor" /> {canStart ? 'INICIAR PARTIDA' : 'FALTAN JUGADORES'}
            </button>
          ) : (
            <div className="text-center text-xs font-bold text-slate-500 uppercase tracking-widest animate-pulse">
              Esperando que el Host inicie...
            </div>
          )}
        </div>
      ) : (
        <UnoBoard room={room} />
      )}
    </>
  );
};
