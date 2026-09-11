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

    if (!room) {
      const name = localStorage.getItem('duoplay_name') || 'Jugador';
      socket.emit('join_room', { playerName: name, roomId: id, playerId }, (res: any) => {
        if (res.success) {
          setRoom(res.room);
        } else {
          localStorage.removeItem('duoplay_roomId');
          navigate('/');
        }
      });
    }

    const handleUpdate = (updatedRoom: Room) => setRoom(updatedRoom);
    
    const handlePlayerLeft = (updatedRoom: Room) => {
      setRoom(updatedRoom);
      alert('EL JUGADOR ABANDONÓ LA PARTIDA DEFINITIVAMENTE');
    };

    socket.on('player_joined', handleUpdate);
    socket.on('player_disconnected', handleUpdate);
    socket.on('player_left', handlePlayerLeft);
    socket.on('game_started', handleUpdate);
    socket.on('game_state_updated', handleUpdate);

    // Removed the beforeunload listener that emitted 'leave_room'.
    // Now closing the tab relies on socket.disconnect, triggering the 30s recovery window.

    return () => {
      socket.off('player_joined', handleUpdate);
      socket.off('player_disconnected', handleUpdate);
      socket.off('player_left', handlePlayerLeft);
      socket.off('game_started', handleUpdate);
      socket.off('game_state_updated', handleUpdate);
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
      localStorage.removeItem('duoplay_roomId');
    }
    navigate('/');
  };

  if (!room) return null;

  if (room.status === 'playing' || room.status === 'finished') {
    return <TicTacToe room={room} playerId={playerId} onLeave={leaveRoom} />;
  }

  // Lobby view
  return (
    <div className="flex flex-col items-center justify-center flex-1 p-6 space-y-8 w-full max-w-sm mx-auto">
      <div className="w-full flex justify-start -mb-4">
        <button onClick={leaveRoom} className="text-slate-500 hover:text-white text-xs font-bold tracking-widest uppercase transition-colors">
          ← Abandonar
        </button>
      </div>
      
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
  );
};
