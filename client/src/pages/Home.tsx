import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { Gamepad2, Users, ArrowLeft } from 'lucide-react';
import { gamesCatalog } from '../config/games';
import { GameCard } from '../components/GameCatalog/GameCard';

export const Home: React.FC = () => {
  const [mode, setMode] = useState<'catalog' | 'menu' | 'create' | 'join'>('catalog');
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const [reconnecting, setReconnecting] = useState(false);
  const [totalRounds, setTotalRounds] = useState(5);
  
  const { socket, isConnected, playerId } = useSocket();
  const navigate = useNavigate();

  useEffect(() => {
    const savedRoomId = localStorage.getItem('duoplay_roomId');
    if (savedRoomId && socket && isConnected && !reconnecting && (mode === 'catalog' || mode === 'menu')) {
      setReconnecting(true);
      // El nombre enviado aquí será ignorado por el servidor si es una reconexión exitosa, 
      // ya que el servidor recupera el nombre original asociado al playerId.
      const savedName = 'Jugador';
      
      socket.emit('join_room', { playerName: savedName, roomId: savedRoomId, playerId }, (response: any) => {
        if (response.success) {
          navigate(`/room/${response.room.roomId}`, { state: { room: response.room }, replace: true });
        } else {
          localStorage.removeItem('duoplay_roomId');
          setReconnecting(false);
        }
      });
    }
  }, [socket, isConnected, navigate, playerId, mode, reconnecting]);

  const handleCreate = () => {
    if (!name.trim()) return setError('Ingresa tu nombre');
    if (!socket) return setError('Sin conexión al servidor');

    // Mantenemos totalRounds por defecto, y luego el backend usa 'tic-tac-toe' automáticamente.
    socket.emit('create_room', { playerName: name, playerId, totalRounds, gameId: selectedGameId }, (response: any) => {
      if (response.success) {
        localStorage.setItem('duoplay_roomId', response.room.roomId);
        navigate(`/room/${response.room.roomId}`, { state: { room: response.room } });
      } else {
        setError(response.message || 'Error al crear sala');
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

  if (mode === 'catalog') {
    return (
      <div className="flex flex-col flex-1 p-6 w-full max-w-5xl mx-auto overflow-y-auto">
        <div className="text-center space-y-2 mb-10 mt-6">
          <h1 className="text-5xl font-black tracking-tight text-white glow-blue">
            DUO PLAY
          </h1>
          <p className="text-slate-500 text-xs tracking-[0.3em] uppercase">Dos teléfonos. Una partida.</p>
        </div>
        
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-black text-white tracking-[0.3em] uppercase">
            JUEGOS
          </h2>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 tracking-widest">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-red-500 shadow-[0_0_10px_#ef4444]'}`} />
            {isConnected ? 'CONECTADO' : 'OFFLINE'}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {gamesCatalog.map(game => (
            <GameCard 
              key={game.id} 
              game={game} 
              onSelect={(id) => {
                setSelectedGameId(id);
                setMode('menu');
              }} 
            />
          ))}
        </div>
      </div>
    );
  }

  if (mode === 'menu') {
    return (
      <div className="flex flex-col items-center justify-center flex-1 p-6 w-full max-w-sm mx-auto">
        <div className="w-full flex justify-start mb-8">
          <button 
            onClick={() => { setSelectedGameId(null); setMode('catalog'); }}
            className="text-slate-500 hover:text-white text-xs font-bold tracking-widest uppercase transition-colors flex items-center gap-2"
          >
            <ArrowLeft size={16} /> CATÁLOGO
          </button>
        </div>

        <div className="text-center space-y-2 mb-12">
          <h2 className="text-3xl font-black tracking-widest text-white glow-blue uppercase">
            {gamesCatalog.find(g => g.id === selectedGameId)?.name || 'SALA'}
          </h2>
          <p className="text-slate-500 text-xs tracking-[0.3em] uppercase">Elige cómo jugar</p>
        </div>

        <div className="w-full space-y-4">
          <button 
            onClick={() => { setName(''); setTotalRounds(5); setRoomCode(''); setError(''); setMode('create'); }}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-200 text-black font-black py-4 px-6 rounded-2xl transition-transform active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
          >
            <Gamepad2 size={24} />
            CREAR PARTIDA
          </button>
          <button 
            onClick={() => { setName(''); setTotalRounds(5); setRoomCode(''); setError(''); setMode('join'); }}
            className="w-full flex items-center justify-center gap-3 panel-dark hover:bg-[#111] text-white font-black py-4 px-6 rounded-2xl transition-transform active:scale-95"
          >
            <Users size={24} />
            UNIRSE A PARTIDA
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center flex-1 p-6 w-full max-w-sm mx-auto overflow-y-auto">
      <div className="w-full p-8 panel-dark rounded-3xl space-y-8 my-auto">
        <button 
          onClick={() => { setName(''); setTotalRounds(5); setRoomCode(''); setError(''); setMode('menu'); }}
          className="text-slate-500 hover:text-white text-xs font-bold tracking-widest uppercase transition-colors"
        >
          ← Volver
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
              className="w-full panel-dark border-[#333] focus:border-white rounded-xl px-4 py-4 text-white text-lg font-bold placeholder:text-slate-700 focus:outline-none transition-colors"
            />
          </div>

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
                className="w-full panel-dark border-[#333] focus:border-white rounded-xl px-4 py-4 text-white font-mono text-center text-2xl tracking-[0.3em] font-black placeholder:text-slate-800 focus:outline-none transition-colors"
              />
            </div>
          )}

          {mode === 'create' && (
            <div className="space-y-4">
              <label className="block text-xs font-bold text-slate-500 tracking-widest uppercase text-center">
                ¿Cuántas rondas?
              </label>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((r) => (
                  <button
                    key={r}
                    onClick={() => setTotalRounds(r)}
                    className={`
                      aspect-square rounded-xl font-black text-lg flex items-center justify-center transition-all
                      ${totalRounds === r 
                        ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.2)] scale-110 z-10' 
                        : 'bg-[#111] text-slate-500 border border-[#222] hover:bg-[#1a1a1a] hover:text-white'}
                    `}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <p className="text-center text-xs font-bold text-white tracking-[0.2em] mt-2 bg-[#111] py-2 rounded-lg border border-[#222]">
                {totalRounds} {totalRounds === 1 ? 'RONDA' : 'RONDAS'}
              </p>
            </div>
          )}

          {error && <p className="text-red-500 text-sm text-center font-bold glow-red">{error}</p>}

          <button
            onClick={mode === 'create' ? handleCreate : handleJoin}
            className="w-full bg-white hover:bg-gray-200 text-black font-black py-4 px-6 rounded-xl transition-transform active:scale-95 mt-4"
          >
            {mode === 'create' ? 'CREAR' : 'ENTRAR'}
          </button>
        </div>
      </div>
    </div>
  );
};
