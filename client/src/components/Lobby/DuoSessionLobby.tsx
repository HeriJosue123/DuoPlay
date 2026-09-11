
import { Check, X } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import type { Room } from '../../types';

export const DuoSessionLobby = ({ room }: { room: Room }) => {
  const { socket, playerId } = useSocket();

  const p1 = room.players[0];
  const p2 = room.players[1];

  const handlePropose = (gameId: 'tic-tac-toe' | 'memory-match') => {
    socket?.emit('propose_game', { roomId: room.roomId, playerId, gameId }, (res) => { if (!res || !res.success) alert('Server Error: ' + (res ? res.message : 'No response')); });
  };

  const handleAccept = () => {
    alert('CLICK ACEPTAR! Socket: ' + (socket ? socket.connected : 'NULO'));
    if (!socket) { alert('ERROR: Socket es nulo'); return; }
    socket.emit('accept_game', { roomId: room.roomId, playerId }, (res: any) => { 
      alert('Respuesta Server: ' + JSON.stringify(res)); 
    });
  };

  const handleCancel = () => {
    socket?.emit('cancel_proposal', { roomId: room.roomId, playerId });
  };

  return (
    <div className="flex flex-col items-center flex-1 w-full max-w-md mx-auto p-4 space-y-6 pt-16 animate-in fade-in zoom-in duration-300">
      
      {/* HEADER */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black tracking-widest text-white">DUO SESSION</h1>
        <p className="text-slate-400 font-bold tracking-widest text-xs">CÓDIGO: <span className="text-white tracking-[0.2em]">{room.roomId}</span></p>
      </div>

      {/* PLAYERS */}
      <div className="w-full panel-dark p-6 rounded-3xl border border-[#333] space-y-4 shadow-xl">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center font-black">
              {p1.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-white">{p1.name}</span>
              <span className="text-[10px] text-green-400 font-black tracking-widest flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                CONECTADO
              </span>
            </div>
          </div>
          {playerId === p1.id && <span className="text-xs bg-[#222] px-2 py-1 rounded text-slate-400 font-bold">TÚ</span>}
        </div>

        <div className="flex justify-between items-center border-t border-[#333] pt-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center font-black">
              {p2.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-white">{p2.name}</span>
              <span className="text-[10px] text-green-400 font-black tracking-widest flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                CONECTADO
              </span>
            </div>
          </div>
          {playerId === p2.id && <span className="text-xs bg-[#222] px-2 py-1 rounded text-slate-400 font-bold">TÚ</span>}
        </div>
      </div>

      {/* PROPOSAL IN PROGRESS */}
      {room.gameProposal ? (
        <div className="w-full bg-blue-900/30 border border-blue-500/50 rounded-3xl p-6 text-center animate-pop shadow-[0_0_30px_rgba(37,99,235,0.1)]">
          <p className="text-white font-bold mb-6 text-sm">
            {room.gameProposal.from === playerId 
              ? 'Esperando a que el otro jugador acepte...' 
              : `¡El otro jugador propone jugar ${room.gameProposal.gameId.replace('-', ' ').toUpperCase()}!`}
          </p>
          
          <div className="flex gap-3 justify-center">
            {room.gameProposal.from !== playerId ? (
              <>
                <button onClick={handleCancel} className="flex-1 bg-[#111] hover:bg-[#222] border border-[#333] text-white py-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2">
                  <X size={16} /> RECHAZAR
                </button>
                <button onClick={handleAccept} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-black text-xs transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] flex items-center justify-center gap-2 active:scale-95">
                  <Check size={16} /> ACEPTAR
                </button>
              </>
            ) : (
              <button onClick={handleCancel} className="w-full bg-[#111] hover:bg-[#222] border border-[#333] text-white py-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 active:scale-95">
                <X size={16} /> CANCELAR PROPUESTA
              </button>
            )}
          </div>
        </div>
      ) : (
        /* GAME CATALOG */
        <div className="w-full space-y-3 pt-4">
          <h2 className="text-[10px] font-black tracking-widest text-slate-500 text-center uppercase mb-4">¿Qué quieren jugar?</h2>
          
          <button 
            onClick={() => handlePropose('tic-tac-toe')}
            className="w-full flex items-center gap-4 panel-dark p-4 rounded-2xl border border-[#333] hover:border-blue-500/50 transition-all group active:scale-95"
          >
            <div className="w-12 h-12 rounded-xl bg-black/50 flex items-center justify-center text-xl font-black shrink-0">
              <span className="text-blue-500">X</span><span className="text-red-500">O</span>
            </div>
            <div className="flex flex-col text-left">
              <span className="font-black text-white group-hover:text-blue-400 transition-colors">TRES EN RAYA</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Partida rápida 1v1</span>
            </div>
          </button>

          <button 
            onClick={() => handlePropose('memory-match')}
            className="w-full flex items-center gap-4 panel-dark p-4 rounded-2xl border border-[#333] hover:border-blue-500/50 transition-all group active:scale-95"
          >
            <div className="w-12 h-12 rounded-xl bg-black/50 flex items-center justify-center text-xl shrink-0 opacity-80">
              🧠
            </div>
            <div className="flex flex-col text-left">
              <span className="font-black text-white group-hover:text-blue-400 transition-colors">MEMORY MATCH</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Encuentra las 8 parejas</span>
            </div>
          </button>
          
          <div className="w-full flex items-center gap-4 bg-[#111] p-4 rounded-2xl border border-[#222] opacity-50 cursor-not-allowed">
            <div className="w-12 h-12 rounded-xl bg-black/50 flex items-center justify-center text-xl shrink-0">
              🔒
            </div>
            <div className="flex flex-col text-left">
              <span className="font-black text-slate-500">PRÓXIMAMENTE</span>
              <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">Nuevos juegos en camino</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
