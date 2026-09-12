import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { TicTacToe } from '../games/TicTacToe/TicTacToe';
import { MemoryMatch } from '../games/MemoryMatch/MemoryMatch';
import { RoomVoice } from '../components/RoomVoice/RoomVoice';
import { DuoSessionLobby } from '../components/Lobby/DuoSessionLobby';
import { ChatBox } from '../components/Chat/ChatBox';
import { Copy, LogOut, ArrowLeft } from 'lucide-react';
import type { Room } from '../types';

export const RoomView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { socket, playerId } = useSocket();
  
  const [room, setRoom] = useState<Room | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showLeaveGameConfirm, setShowLeaveGameConfirm] = useState(false);
  const [sessionClosed, setSessionClosed] = useState(false);
  
  const isLeaving = useRef(false);

  useEffect(() => {
    if (!socket || !id) {
      if (!localStorage.getItem('duoplay_roomId')) {
        navigate('/', { replace: true });
      }
      return;
    }

    // Handlers
    const handleRoomUpdate = (updatedRoom: Room) => {
      if (updatedRoom.roomId === id) {
        setRoom(updatedRoom);
        if (!updatedRoom.activeGame) setShowLeaveGameConfirm(false);
      }
    };

    const handleSessionClosed = () => {
      setSessionClosed(true);
      localStorage.removeItem('duoplay_roomId');
    };

    // Attach events
    socket.on('player_joined', handleRoomUpdate);
    socket.on('player_disconnected', handleRoomUpdate);
    socket.on('player_left', handleRoomUpdate); // Fallback for legacy leaves
    socket.on('game_proposed', handleRoomUpdate);
    socket.on('proposal_cancelled', handleRoomUpdate);
    socket.on('game_started', handleRoomUpdate);
    socket.on('returned_to_lobby', handleRoomUpdate);
    socket.on('game_state_updated', handleRoomUpdate);
    socket.on('chat_message', handleRoomUpdate);
    socket.on('session_closed', handleSessionClosed);

    // Initial fetch via join (if reconnected) is handled by Home or SocketContext,
    // but if we are here and have no room, we might need to ask the server.
    // Actually, Home passes it via state or does a join. Let's just rely on that.
    // If we land here directly via URL, Home won't catch it if not root.
    // So we do a safety join just in case.
    if (!room) {
      const storedId = localStorage.getItem('duoplay_roomId');
      if (storedId === id) {
        socket.emit('join_room', { playerName: 'Player', roomId: id, playerId }, (res: any) => {
          if (res.success) setRoom(res.room);
          else navigate('/', { replace: true });
        });
      } else {
        navigate('/', { replace: true });
      }
    }

    return () => {
      socket.off('player_joined', handleRoomUpdate);
      socket.off('player_disconnected', handleRoomUpdate);
      socket.off('player_left', handleRoomUpdate);
      socket.off('game_proposed', handleRoomUpdate);
      socket.off('proposal_cancelled', handleRoomUpdate);
      socket.off('game_started', handleRoomUpdate);
      socket.off('returned_to_lobby', handleRoomUpdate);
      socket.off('game_state_updated', handleRoomUpdate);
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

  const handleReturnToLobby = () => {
    if (socket && id) {
      socket.emit('return_to_lobby', { roomId: id, playerId });
      setShowLeaveGameConfirm(false);
    }
  };

  const handleCloseSession = () => {
    if (isLeaving.current) return;
    isLeaving.current = true;
    
    if (socket && id) {
      socket.emit('close_session', { roomId: id, playerId });
    }
    localStorage.removeItem('duoplay_roomId');
    navigate('/', { replace: true });
  };

  if (sessionClosed) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in zoom-in">
        <div className="w-full max-w-sm panel-dark p-8 rounded-[2rem] border border-red-500/30 space-y-8 text-center shadow-[0_0_50px_rgba(239,68,68,0.15)]">
          <div className="text-6xl mb-4 relative z-10 animate-bounce">🚪</div>
          <h2 className="text-2xl font-black text-white uppercase tracking-widest glow-red leading-tight">
            SESIÓN CERRADA
          </h2>
          <p className="text-sm font-bold text-slate-400">El otro jugador cerró la sesión.</p>
          <button 
            onClick={() => navigate('/', { replace: true })}
            className="w-full bg-[#111] hover:bg-[#222] border border-[#333] text-white font-black py-4 px-6 rounded-2xl transition-transform active:scale-95 tracking-widest text-sm"
          >
            VOLVER AL CATÁLOGO
          </button>
        </div>
      </div>
    );
  }

  if (!room) return null;

  return (
    <>
      <RoomVoice room={room} />
      <ChatBox room={room} />
      
      {/* Floating Exit Button (Closes Session) */}
      {!room.activeGame && (
        <button
          onClick={() => setShowExitConfirm(true)}
          aria-label="Cerrar sesión"
          className="absolute top-4 left-4 z-40 bg-black/50 hover:bg-red-500/20 border border-[#333] hover:border-red-500/50 text-white/80 hover:text-red-400 px-4 py-2 rounded-full text-[10px] font-black tracking-widest transition-all backdrop-blur-md active:scale-95 flex items-center gap-2 group"
        >
          <LogOut size={12} className="group-hover:-translate-x-1 transition-transform" /> CERRAR SESIÓN
        </button>
      )}

      {/* Floating Leave Game Button */}
      {room.activeGame && (
        <button
          onClick={() => setShowLeaveGameConfirm(true)}
          aria-label="Salir de la partida"
          className="absolute top-4 left-4 z-40 bg-black/50 hover:bg-orange-500/20 border border-[#333] hover:border-orange-500/50 text-white/80 hover:text-orange-400 px-4 py-2 rounded-full text-[10px] font-black tracking-widest transition-all backdrop-blur-md active:scale-95 flex items-center gap-2 group"
        >
          <ArrowLeft size={12} className="group-hover:-translate-x-1 transition-transform" /> SALIR DE LA PARTIDA
        </button>
      )}

      {/* Confirmation Modal - Leave Game */}
      {showLeaveGameConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-[300px] panel-dark p-6 rounded-3xl border border-[#333] text-center shadow-2xl animate-pop">
            <h3 className="text-white font-black tracking-widest mb-2 text-sm">¿SALIR DE LA PARTIDA?</h3>
            <p className="text-xs text-slate-400 font-bold mb-6">Volverás al lobby de DUO SESSION.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowLeaveGameConfirm(false)}
                className="flex-1 bg-[#111] hover:bg-[#222] border border-[#333] text-white text-xs font-black py-3 rounded-xl transition-all"
              >
                CANCELAR
              </button>
              <button 
                onClick={handleReturnToLobby}
                className="flex-1 bg-orange-600 hover:bg-orange-500 text-white text-xs font-black py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(249,115,22,0.3)]"
              >
                SALIR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-[300px] panel-dark p-6 rounded-3xl border border-[#333] text-center shadow-2xl animate-pop">
            <h3 className="text-white font-black tracking-widest mb-2 text-sm">¿CERRAR SESIÓN?</h3>
            <p className="text-xs text-slate-400 font-bold mb-6">Esto desconectará al otro jugador y borrará el chat.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 bg-[#111] hover:bg-[#222] border border-[#333] text-white text-xs font-black py-3 rounded-xl transition-all"
              >
                CANCELAR
              </button>
              <button 
                onClick={handleCloseSession}
                disabled={isLeaving.current}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white text-xs font-black py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(239,68,68,0.3)] disabled:opacity-50"
              >
                CERRAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RENDER LOGIC */}
      {room.players.length < 2 ? (
        /* Waiting Room */
        <div className="flex flex-col items-center justify-center flex-1 p-6 space-y-8 w-full max-w-sm mx-auto animate-in fade-in zoom-in duration-500">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-white tracking-widest">SALA CREADA</h2>
            <p className="text-slate-400 font-bold text-xs">Comparte este código para jugar</p>
          </div>
          
          <div className="relative group w-full">
            <div className="absolute inset-0 bg-blue-500 opacity-20 blur-xl group-hover:opacity-30 transition-opacity rounded-3xl" />
            <button 
              onClick={copyCode}
              className="relative w-full panel-dark p-8 rounded-3xl flex flex-col items-center justify-center gap-4 border border-[#333] group-hover:border-blue-500/50 transition-colors active:scale-95 cursor-copy"
            >
              <span className="text-5xl font-mono tracking-[0.3em] font-black text-white glow-blue">
                {id}
              </span>
              <div className="flex items-center gap-2 text-slate-500 group-hover:text-blue-400 transition-colors font-bold text-xs uppercase tracking-widest">
                <Copy size={14} /> Copiar Código
              </div>
            </button>
          </div>
          
          <div className="flex items-center gap-3 text-slate-400">
            <div className="w-4 h-4 border-2 border-slate-600 border-t-blue-500 rounded-full animate-spin" />
            <span className="text-xs font-bold tracking-widest uppercase">Esperando jugador...</span>
          </div>
        </div>
      ) : room.activeGame === 'memory-match' ? (
        <MemoryMatch room={room} playerId={playerId} onLeave={handleReturnToLobby} />
      ) : room.activeGame === 'tic-tac-toe' ? (
        <TicTacToe room={room} playerId={playerId} onLeave={handleReturnToLobby} />
      ) : (
        <DuoSessionLobby room={room} />
      )}
    </>
  );
};
