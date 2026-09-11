import React from 'react';
import type { Room } from '../../types';
import { useSocket } from '../../context/SocketContext';
import { useNavigate } from 'react-router-dom';

interface Props {
  room: Room;
  me: string;
}

export const TicTacToe: React.FC<Props> = ({ room, me }) => {
  const { socket } = useSocket();
  const navigate = useNavigate();

  const myPlayer = room.players.find(p => p.name === me);
  const isMyTurn = room.currentTurn === myPlayer?.id;
  const board = room.gameState?.board || Array(9).fill(null);
  
  const opponent = room.players.find(p => p.name !== me);
  const mySymbol = room.players[0].name === me ? 'X' : 'O';

  const handleCellClick = (index: number) => {
    if (!isMyTurn || board[index] !== null || room.status !== 'playing') return;
    
    socket?.emit('make_move', { roomId: room.roomId, move: { index } });
  };

  const requestRematch = () => {
    socket?.emit('request_rematch', { roomId: room.roomId });
  };

  const quit = () => {
    socket?.emit('leave_room', { roomId: room.roomId });
    navigate('/');
  };

  return (
    <div className="flex flex-col items-center justify-center flex-1 p-4 space-y-8 w-full max-w-md mx-auto">
      
      {/* Header / Turn Indicator */}
      <div className="w-full bg-slate-800/80 rounded-2xl p-4 border border-slate-700 flex justify-between items-center shadow-lg">
        <div className={`flex flex-col items-center p-2 rounded-xl transition-colors ${isMyTurn ? 'bg-brand/20 text-brand-light' : 'opacity-50'}`}>
          <span className="text-2xl font-bold">{mySymbol}</span>
          <span className="text-xs font-bold uppercase">{me}</span>
        </div>
        
        <div className="text-center flex-1">
          {room.status === 'playing' ? (
            <div className={`text-sm font-bold tracking-widest ${isMyTurn ? 'text-brand-light' : 'text-slate-400'}`}>
              {isMyTurn ? 'TU TURNO' : `TURNO DE ${opponent?.name.toUpperCase()}`}
            </div>
          ) : (
            <div className="text-lg font-black text-yellow-400">FIN DEL JUEGO</div>
          )}
        </div>

        <div className={`flex flex-col items-center p-2 rounded-xl transition-colors ${!isMyTurn && room.status === 'playing' ? 'bg-purple-500/20 text-purple-400' : 'opacity-50'}`}>
          <span className="text-2xl font-bold">{mySymbol === 'X' ? 'O' : 'X'}</span>
          <span className="text-xs font-bold uppercase">{opponent?.name || '---'}</span>
        </div>
      </div>

      {/* Board */}
      <div className="grid grid-cols-3 gap-3 w-full aspect-square bg-slate-800 p-3 rounded-3xl border border-slate-700 shadow-xl">
        {board.map((cell: string | null, i: number) => (
          <button
            key={i}
            onClick={() => handleCellClick(i)}
            disabled={cell !== null || !isMyTurn || room.status !== 'playing'}
            className={`
              flex items-center justify-center text-6xl font-black rounded-2xl transition-all
              ${cell === null && isMyTurn && room.status === 'playing' ? 'hover:bg-slate-700 active:scale-95 cursor-pointer bg-slate-900' : 'bg-slate-900'}
              ${cell === 'X' ? 'text-brand-light' : 'text-purple-400'}
              ${cell === null && !isMyTurn ? 'cursor-not-allowed' : ''}
            `}
          >
            {cell}
          </button>
        ))}
      </div>

      {/* Game Over Panel */}
      {room.status === 'finished' && (
        <div className="w-full bg-slate-800/90 backdrop-blur-sm p-6 rounded-3xl border border-slate-700 shadow-2xl space-y-6 text-center animate-in slide-in-from-bottom-4">
          <div className="text-3xl font-black">
            {room.winner === 'draw' ? '🤝 EMPATE' : 
             room.winner === myPlayer?.id ? '🏆 ¡GANASTE!' : 
             `😈 ${opponent?.name} GANÓ`}
          </div>
          
          <div className="space-y-3">
            <button 
              onClick={requestRematch}
              className="w-full bg-brand hover:bg-brand-light text-white font-bold py-4 px-6 rounded-2xl transition-transform active:scale-95 shadow-lg shadow-brand/20"
            >
              ¿JUGAR OTRA VEZ?
            </button>
            <button 
              onClick={quit}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-4 px-6 rounded-2xl transition-transform active:scale-95"
            >
              VOLVER AL MENÚ
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
