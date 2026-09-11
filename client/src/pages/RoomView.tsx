import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import type { Room } from '../types';
import { TicTacToe } from '../games/TicTacToe/TicTacToe';
import { Copy } from 'lucide-react';

export const RoomView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { socket, playerId } = useSocket();
  const [room, setRoom] = useState<Room | null>(location.state?.room || null);

  useEffect(() => {
    if (!socket || !id || !playerId) return;

    // Handle initial state if missing or socket reconnected
    if (!room) {
      const name = localStorage.getItem('duoplay_name');
      if (name) {
        socket.emit('join_room', { playerName: name, roomId: id, playerId }, (res: any) => {
          if (res.success) {
            setRoom(res.room);
          } else {
            navigate('/');
          }
        });
      } else {
        navigate('/');
      }
    }

    const handlePlayerJoined = (updatedRoom: Room) => setRoom(updatedRoom);
    
    const handlePlayerDisconnected = (updatedRoom: Room) => setRoom(updatedRoom);
    
    const handlePlayerLeft = (updatedRoom: Room) => {
      setRoom(updatedRoom);
      alert('El otro jugador ha abandonado la sala definitivamente.');
    };

    const handleGameStarted = (updatedRoom: Room) => setRoom(updatedRoom);
    const handleGameStateUpdated = (updatedRoom: Room) => setRoom(updatedRoom);

    socket.on('player_joined', handlePlayerJoined);
    socket.on('player_disconnected', handlePlayerDisconnected);
    socket.on('player_left', handlePlayerLeft);
    socket.on('game_started', handleGameStarted);
    socket.on('game_state_updated', handleGameStateUpdated);

    const handleBeforeUnload = () => {
      socket.emit('leave_room', { roomId: id, playerId });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      socket.off('player_joined', handlePlayerJoined);
      socket.off('player_disconnected', handlePlayerDisconnected);
      socket.off('player_left', handlePlayerLeft);
      socket.off('game_started', handleGameStarted);
      socket.off('game_state_updated', handleGameStateUpdated);
      window.removeEventListener('beforeunload', handleBeforeUnload);
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
  
  const leaveRoom = () => {
    if (socket && id) {
      socket.emit('leave_room', { roomId: id, playerId });
    }
    navigate('/');
  };

  if (!room) return null;

  if (room.status === 'playing' || room.status === 'finished') {
    return <TicTacToe room={room} playerId={playerId} onLeave={leaveRoom} />;
  }

  // Lobby view
  return (
    <div className="flex flex-col items-center justify-center flex-1 p-6 space-y-8">
      <div className="w-full flex justify-start -mb-4">
        <button onClick={leaveRoom} className="text-slate-400 hover:text-white text-sm">
          ← Salir
        </button>
      </div>
      
      <div className="text-center space-y-2">
        <h2 className="text-sm font-bold text-slate-400 tracking-widest">SALA</h2>
        <div className="flex items-center justify-center gap-4 bg-slate-800/80 px-8 py-4 rounded-2xl border border-slate-700">
          <span className="text-5xl font-mono font-bold tracking-[0.2em]">{id}</span>
          <button 
            onClick={copyCode}
            className="p-3 bg-slate-700 hover:bg-slate-600 rounded-xl transition-colors"
          >
            <Copy size={24} />
          </button>
        </div>
        <p className="text-slate-400 text-sm mt-4">Comparte este código con tu amigo ❤️</p>
      </div>

      <div className="w-full max-w-sm bg-slate-800/50 rounded-3xl border border-slate-700 p-6 space-y-6">
        <h3 className="text-center font-bold text-xl">🎮 PARTIDA LISTA</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-900 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${room.players[0]?.connected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="font-bold text-lg">{room.players[0]?.name || 'Esperando...'}</span>
            </div>
            <span className="text-xs text-slate-500 font-mono">PLAYER 1</span>
          </div>

          <div className="text-center text-slate-500 font-bold">VS</div>

          <div className="flex items-center justify-between p-4 bg-slate-900 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-3">
              {room.players[1] ? (
                 <div className={`w-3 h-3 rounded-full ${room.players[1].connected ? 'bg-green-500' : 'bg-red-500'}`} />
              ) : (
                 <div className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse" />
              )}
              <span className="font-bold text-lg text-slate-300">
                {room.players[1]?.name || 'Esperando al segundo jugador...'}
              </span>
            </div>
            <span className="text-xs text-slate-500 font-mono">PLAYER 2</span>
          </div>
        </div>

        {room.players.length === 2 && room.players[0].id === playerId && (
          <div className="pt-4 border-t border-slate-700">
            <p className="text-center text-sm text-slate-400 mb-4">ELIGE UN JUEGO</p>
            <button 
              onClick={startGame}
              className="w-full bg-brand hover:bg-brand-light text-white font-bold py-4 px-6 rounded-2xl transition-transform active:scale-95 shadow-lg shadow-brand/20 flex items-center justify-center gap-2"
            >
              ❌⭕ TRES EN RAYA
            </button>
          </div>
        )}
        {room.players.length === 2 && room.players[0].id !== playerId && (
           <div className="pt-4 border-t border-slate-700">
            <p className="text-center text-sm text-slate-400">Esperando que el líder inicie el juego...</p>
           </div>
        )}
      </div>
    </div>
  );
};
