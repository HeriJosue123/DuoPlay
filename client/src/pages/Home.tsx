import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gamepad2, Users, ArrowLeft } from 'lucide-react';
import { useSocket } from '../context/SocketContext';

export const Home = () => {
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
  const [error, setError] = useState('');
  const [reconnecting, setReconnecting] = useState(true);
  
  const navigate = useNavigate();
  const { socket, isConnected, playerId } = useSocket();

  useEffect(() => {
    const existingRoom = localStorage.getItem('duoplay_roomId');
    if (existingRoom && socket && isConnected) {
      socket.emit('join_room', { playerName: 'Player', roomId: existingRoom, playerId }, (response: any) => {
        if (response.success) {
          navigate(`/room/${response.room.roomId}`, { state: { room: response.room }, replace: true });
        } else {
          localStorage.removeItem('duoplay_roomId');
          setReconnecting(false);
        }
      });
    } else {
      setReconnecting(false);
    }
  }, [socket, isConnected, navigate, playerId]);

  const handleCreate = () => {
    if (!name.trim()) return setError('Ingresa tu nombre');
    if (!socket) return setError('Sin conexión al servidor');

    socket.emit('create_room', { playerName: name, playerId, maxPlayers }, (response: any) => {
      if (response.success) {
        localStorage.setItem('duoplay_roomId', response.room.roomId);
        navigate(`/room/${response.room.roomId}`, { state: { room: response.room } });
      } else {
        setError(response.message || 'Error al crear la sala');
      }
    });
  };

  const handleJoin = () => {
    if (!name.trim()) return setError('Ingresa tu nombre');
    if (roomCode.length !== 6) return setError('Código debe tener 6 caracteres');
    if (!socket) return setError('Sin conexión al servidor');

    socket.emit('join_room', { playerName: name, roomId: roomCode, playerId }, (response: any) => {
      if (response.success) {
        localStorage.setItem('duoplay_roomId', response.room.roomId);
        navigate(`/room/${response.room.roomId}`, { state: { room: response.room } });
      } else {
        setError(response.message || 'Error al unirse');
      }
    });
  };

  if (reconnecting) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 p-6 space-y-4">
        <div className="w-8 h-8 border-4 border-slate-800 border-t-white rounded-full animate-spin" />
        <p className="text-slate-400 text-sm tracking-widest font-bold">RECONECTANDO A PARTIDA...</p>
      </div>
    );
  }

  if (mode === 'menu') {
    return (
      <div className="flex flex-col items-center justify-center flex-1 p-6 w-full max-w-sm mx-auto">
        <div className="text-center space-y-2 mb-12">
          <h1 className="text-5xl font-black tracking-tight text-white glow-blue">
            UNO ONLINE
          </h1>
          <p className="text-slate-500 text-xs tracking-[0.3em] uppercase">Multijugador 2-4 Jugadores</p>
        </div>

        <div className="w-full space-y-4">
          <button 
            onClick={() => { setName(''); setRoomCode(''); setError(''); setMode('create'); }}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-200 text-black font-black py-4 px-6 rounded-2xl transition-transform active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
          >
            <Gamepad2 size={24} />
            CREAR SALA
          </button>
          <button 
            onClick={() => { setName(''); setRoomCode(''); setError(''); setMode('join'); }}
            className="w-full flex items-center justify-center gap-3 panel-dark hover:bg-[#111] border border-[#333] text-white font-black py-4 px-6 rounded-2xl transition-transform active:scale-95"
          >
            <Users size={24} />
            UNIRSE A SALA
          </button>
        </div>

        <div className="mt-12 flex items-center gap-2 text-[10px] font-bold text-slate-600 tracking-widest">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-red-500 shadow-[0_0_10px_#ef4444]'}`} />
          {isConnected ? 'SERVIDOR ONLINE' : 'SERVIDOR OFFLINE'}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center flex-1 p-6 w-full max-w-sm mx-auto overflow-y-auto">
      <div className="w-full p-8 panel-dark rounded-3xl space-y-8 my-auto border border-[#333]">
        <button 
          onClick={() => { setName(''); setRoomCode(''); setError(''); setMode('menu'); }}
          className="text-slate-500 hover:text-white text-xs font-bold tracking-widest uppercase transition-colors flex items-center gap-2"
        >
          <ArrowLeft size={16} /> Volver
        </button>

        <h2 className="text-2xl font-black text-center text-white">
          {mode === 'create' ? 'NUEVA SALA' : 'UNIRSE'}
        </h2>

        <div className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-2 tracking-widest uppercase">Tu Nombre</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Alex"
              autoComplete="off"
              className="w-full panel-dark border border-[#333] focus:border-white rounded-xl px-4 py-4 text-white text-lg font-bold placeholder:text-slate-700 focus:outline-none transition-colors"
            />
          </div>

          {mode === 'create' && (
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 tracking-widest uppercase">Jugadores (Máximo)</label>
                  <select 
                    value={maxPlayers} 
                    onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
                    className="flex-1 bg-[#111] border border-[#333] text-white p-4 rounded-2xl outline-none focus:border-blue-500 transition-colors cursor-pointer text-sm font-bold tracking-widest uppercase"
                  >
                    <option value={2}>2 JUGADORES</option>
                    <option value={3}>3 JUGADORES</option>
                    <option value={4}>4 JUGADORES</option>
                    <option value={5}>5 JUGADORES</option>
                    <option value={6}>6 JUGADORES</option>
                  </select>
            </div>
          )}

          {mode === 'join' && (
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 tracking-widest uppercase">Código de Sala</label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                maxLength={6}
                placeholder="000000"
                autoComplete="off"
                className="w-full panel-dark border border-[#333] focus:border-white rounded-xl px-4 py-4 text-white font-mono text-center text-2xl tracking-[0.3em] font-black placeholder:text-slate-800 focus:outline-none transition-colors"
              />
            </div>
          )}

          {error && <p className="text-red-500 text-sm text-center font-bold glow-red">{error}</p>}

          <button
            onClick={mode === 'create' ? handleCreate : handleJoin}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 px-6 rounded-xl transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] active:scale-95 mt-4"
          >
            {mode === 'create' ? 'CREAR SALA' : 'ENTRAR'}
          </button>
        </div>
      </div>
    </div>
  );
};
