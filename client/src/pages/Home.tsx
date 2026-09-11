import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { Gamepad2, Users } from 'lucide-react';

export const Home: React.FC = () => {
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
  const [error, setError] = useState('');
  const { socket, isConnected } = useSocket();
  const navigate = useNavigate();

  const handleCreate = () => {
    if (!name.trim()) return setError('Ingresa tu nombre');
    if (!socket) return setError('Sin conexión al servidor');
    
    socket.emit('create_room', { playerName: name }, (response: any) => {
      if (response.success) {
        navigate(`/room/${response.room.roomId}`, { state: { room: response.room, me: name } });
      } else {
        setError(response.message || 'Error al crear sala');
      }
    });
  };

  const handleJoin = () => {
    if (!name.trim()) return setError('Ingresa tu nombre');
    if (roomCode.length !== 6) return setError('Código debe tener 6 caracteres');
    if (!socket) return setError('Sin conexión al servidor');

    socket.emit('join_room', { playerName: name, roomId: roomCode }, (response: any) => {
      if (response.success) {
        navigate(`/room/${response.room.roomId}`, { state: { room: response.room, me: name } });
      } else {
        setError(response.message || 'Error al unirse');
      }
    });
  };

  if (mode === 'menu') {
    return (
      <div className="flex flex-col items-center justify-center flex-1 p-6 space-y-12">
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-brand-light to-blue-400">
            DUO PLAY
          </h1>
          <p className="text-slate-400 text-lg tracking-widest uppercase">Dos teléfonos. Una partida.</p>
        </div>

        <div className="w-full max-w-sm space-y-4">
          <button 
            onClick={() => setMode('create')}
            className="w-full flex items-center justify-center gap-3 bg-brand hover:bg-brand-light text-white font-bold py-4 px-6 rounded-2xl transition-transform active:scale-95 shadow-lg shadow-brand/20"
          >
            <Gamepad2 size={24} />
            CREAR PARTIDA
          </button>
          <button 
            onClick={() => setMode('join')}
            className="w-full flex items-center justify-center gap-3 bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 px-6 rounded-2xl transition-transform active:scale-95 border border-slate-700"
          >
            <Users size={24} />
            UNIRSE A PARTIDA
          </button>
        </div>

        <div className="absolute bottom-6 flex items-center gap-2 text-sm text-slate-500">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          {isConnected ? 'Servidor conectado' : 'Conectando...'}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center flex-1 p-6">
      <div className="w-full max-w-sm p-8 bg-slate-800/50 rounded-3xl border border-slate-700 backdrop-blur-sm space-y-6">
        <button 
          onClick={() => { setMode('menu'); setError(''); }}
          className="text-slate-400 hover:text-white text-sm mb-4"
        >
          ← Volver
        </button>

        <h2 className="text-2xl font-bold text-center">
          {mode === 'create' ? 'Crear Nueva Sala' : 'Unirse a Sala'}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Tu Nombre</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Alex"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>

          {mode === 'join' && (
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Código de Sala (6 letras)</label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                maxLength={6}
                placeholder="A1B2C3"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-mono text-center text-xl tracking-[0.2em] focus:outline-none focus:border-brand"
              />
            </div>
          )}

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button
            onClick={mode === 'create' ? handleCreate : handleJoin}
            className="w-full bg-brand hover:bg-brand-light text-white font-bold py-3 px-6 rounded-xl transition-transform active:scale-95 mt-4"
          >
            {mode === 'create' ? 'Crear' : 'Entrar'}
          </button>
        </div>
      </div>
    </div>
  );
};
