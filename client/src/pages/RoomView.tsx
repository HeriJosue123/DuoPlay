import React, { useEffect, useState, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { TicTacToe } from '../games/TicTacToe/TicTacToe';
import { RoomVoice } from '../components/RoomVoice/RoomVoice';
import { Copy } from 'lucide-react';
import type { Room } from '../types';

export const RoomView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { socket, playerId } = useSocket();
  const navigate = useNavigate();
  
  const [room, setRoom] = useState<Room | null>(location.state?.room || null);
  const [playerAbandoned, setPlayerAbandoned] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const isLeaving = useRef(false);

  useEffect(() => {
    // Si no hay sala en el estado (ej. recargó la página directamente en /room/:id)
    // Redirigimos inmediatamente a '/' para que Home maneje la recuperación SPA
    if (!room) {
      navigate('/', { replace: true });
      return;
    }

    if (!socket || !id || !playerId) return;

    const handleUpdate = (updatedRoom: Room) => setRoom(updatedRoom);
    
    const handlePlayerLeft = (updatedRoom: Room) => {
      setRoom(updatedRoom);
      setPlayerAbandoned(true);
    };

    socket.on('player_joined', handleUpdate);
    socket.on('player_disconnected', handleUpdate);
    socket.on('player_left', handlePlayerLeft);
    socket.on('game_started', handleUpdate);
    socket.on('game_state_updated', handleUpdate);

    // Si el usuario usa el botón "Atrás" del navegador o Android (popstate)
    const handlePopState = () => {
      if (socket && id) socket.emit('leave_room', { roomId: id, playerId });
      localStorage.removeItem('duoplay_roomId');
    };
    window.addEventListener('popstate', handlePopState);

    return () => {
      socket.off('player_joined', handleUpdate);
      socket.off('player_disconnected', handleUpdate);
      socket.off('player_left', handlePlayerLeft);
      socket.off('game_started', handleUpdate);
      socket.off('game_state_updated', handleUpdate);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [socket, id, navigate, room, playerId]);

  const copyCode = () => {
    if (id) {
      navigator.clipboard.writeText(id);
      alert('Código copiado al portapapeles');
    }
  };

  const startGame = () => {
    if (socket && id) {
      socket.emit('start_game', { roomId: id, playerId }, (res: any) => {
        if (!res.success) alert(res.message);
      });
    }
  };
  
  const executeLeaveRoom = () => {
    if (isLeaving.current) return;
    isLeaving.current = true;
    
    if (socket && id) {
      socket.emit('leave_room', { roomId: id, playerId });
    }
    // Siempre asegurar la limpieza local para evitar loops al volver a Home
    localStorage.removeItem('duoplay_roomId');
    navigate('/', { replace: true });
  };

  if (!room) return null;

  return (
    <>
      <RoomVoice room={room} />
      
      {/* Floating Exit Button */}
      <button
        onClick={() => setShowExitConfirm(true)}
        aria-label="Salir de la sala"
        className="absolute top-4 left-4 z-40 bg-black/50 hover:bg-[#111] border border-[#333] text-white/80 hover:text-white px-4 py-2 rounded-full text-xs font-black tracking-widest transition-all backdrop-blur-md active:scale-95 flex items-center gap-2"
      >
        <span className="text-lg leading-none mt-[-2px]">←</span> SALIR
      </button>

      {/* Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-[300px] panel-dark p-6 rounded-3xl border border-[#333] text-center shadow-2xl animate-pop">
            <h3 className="text-white font-black tracking-widest mb-6">¿SALIR DE LA SALA?</h3>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 bg-[#111] hover:bg-[#222] border border-[#333] text-white text-xs font-black py-3 rounded-xl transition-all"
              >
                CANCELAR
              </button>
              <button 
                onClick={executeLeaveRoom}
                disabled={isLeaving.current}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white text-xs font-black py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(239,68,68,0.3)] disabled:opacity-50"
              >
                SALIR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Player Abandoned Modal */}
      {playerAbandoned && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in zoom-in">
          <div className="w-full max-w-sm panel-dark p-8 rounded-[2rem] border border-red-500/30 space-y-8 text-center animate-pop relative overflow-hidden shadow-[0_0_50px_rgba(239,68,68,0.15)]">
            <div className="absolute top-0 left-0 w-full h-full bg-red-500/5 pointer-events-none" />
            
            <div className="text-6xl mb-4 relative z-10 animate-bounce">
              🚪
            </div>
            
            <div className="space-y-2 relative z-10">
              <h2 className="text-2xl font-black text-white uppercase tracking-widest glow-red leading-tight">
                JUGADOR ABANDONÓ<br/>LA PARTIDA
              </h2>
            </div>
            
            <div className="space-y-1 relative z-10">
              <p className="text-sm font-bold text-slate-400">El otro jugador salió</p>
              <p className="text-sm font-bold text-slate-400">definitivamente de la sala.</p>
            </div>
            
            <div className="text-xs font-black tracking-[0.4em] text-red-500 mb-6 uppercase relative z-10 pt-6 border-t border-[#333]">
              ⏱ PARTIDA FINALIZADA
            </div>
            
            <button 
              onClick={() => {
                localStorage.removeItem('duoplay_roomId');
                navigate('/', { replace: true });
              }}
              className="w-full bg-[#111] hover:bg-[#222] border border-[#333] text-white font-black py-4 px-6 rounded-2xl transition-transform active:scale-95 tracking-widest text-sm relative z-10"
            >
              VOLVER AL MENÚ
            </button>
          </div>
        </div>
      )}

      {room.status === 'playing' || room.status === 'finished' ? (
        <TicTacToe room={room} playerId={playerId} onLeave={executeLeaveRoom} />
      ) : (
        /* Lobby View */
        <div className="flex flex-col items-center justify-center flex-1 p-6 space-y-8 w-full max-w-sm mx-auto">
          <div className="text-center space-y-4 w-full">
            <h2 className="text-xs font-bold text-slate-500 tracking-[0.3em]">CÓDIGO DE SALA</h2>
            <div className="flex items-center justify-center gap-4 panel-dark px-6 py-4 rounded-3xl w-full">
              <span className="text-5xl font-mono font-black tracking-[0.2em] text-white glow-blue">{id}</span>
              <button 
                onClick={copyCode}
                className="p-3 bg-[#111] hover:bg-[#222] border border-[#333] rounded-2xl transition-colors text-white"
              >
                <Copy size={24} />
              </button>
            </div>
          </div>

          <div className="w-full panel-dark rounded-3xl p-6 space-y-8">
            <h3 className="text-center font-black text-sm text-slate-400 tracking-[0.2em]">JUGADORES</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-[#111] border border-[#222] rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${room.players[0]?.connected ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-red-500'}`} />
                  <span className="font-bold text-lg text-white">{room.players[0]?.name || 'Esperando...'}</span>
                </div>
                <span className="text-xs text-slate-600 font-bold tracking-widest">P1</span>
              </div>

              <div className="text-center text-slate-600 font-black text-xl italic">VS</div>

              <div className="flex items-center justify-between p-4 bg-[#111] border border-[#222] rounded-2xl">
                <div className="flex items-center gap-3">
                  {room.players[1] ? (
                    <div className={`w-3 h-3 rounded-full ${room.players[1].connected ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-red-500 shadow-[0_0_10px_#ef4444]'}`} />
                  ) : (
                    <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-[0_0_10px_#eab308] animate-pulse" />
                  )}
                  <span className={`font-bold text-lg ${room.players[1] ? 'text-white' : 'text-slate-500'}`}>
                    {room.players[1]?.name || 'Esperando...'}
                  </span>
                </div>
                <span className="text-xs text-slate-600 font-bold tracking-widest">P2</span>
              </div>
            </div>

            {room.players.length === 2 && room.players[0].id === playerId && (
              <div className="pt-6 border-t border-[#222]">
                <button 
                  onClick={startGame}
                  className="w-full bg-white hover:bg-gray-200 text-black font-black py-4 px-6 rounded-2xl transition-transform active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)] flex items-center justify-center gap-2"
                >
                  COMENZAR MATCH
                </button>
              </div>
            )}
            {room.players.length === 2 && room.players[0].id !== playerId && (
              <div className="pt-6 border-t border-[#222]">
                <p className="text-center text-xs font-bold text-slate-500 tracking-widest">Esperando al líder...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
