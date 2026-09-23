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
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] p-6 space-y-4">
        <div className="w-12 h-12 border-4 border-slate-800 border-t-blue-500 rounded-full animate-spin shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
        <p className="text-blue-400 text-sm tracking-widest font-black animate-pulse">RECONECTANDO...</p>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-[#020202] w-full overflow-hidden font-sans selection:bg-blue-500/30">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#0f172a_0%,_#020202_70%)] opacity-80" />
        <div className="absolute inset-0 opacity-[0.015] mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
        
        {/* Glows */}
        <div className="absolute top-1/2 -left-32 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/2 -right-32 w-[500px] h-[500px] bg-red-600/20 rounded-full blur-[120px] pointer-events-none" />
        
        {/* Tech Grid */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ 
          backgroundImage: `linear-gradient(0deg, transparent 24%, rgba(255, 255, 255, .5) 25%, rgba(255, 255, 255, .5) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .5) 75%, rgba(255, 255, 255, .5) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(255, 255, 255, .5) 25%, rgba(255, 255, 255, .5) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .5) 75%, rgba(255, 255, 255, .5) 76%, transparent 77%, transparent)`, 
          backgroundSize: '40px 40px' 
        }} />

        {/* Diagonal Neon Lines */}
        <div className="absolute -top-32 -left-32 w-1 h-[200vh] bg-blue-500 rotate-[35deg] shadow-[0_0_30px_#3b82f6] opacity-60 blur-[1px]" />
        <div className="absolute -top-32 -right-32 w-1 h-[200vh] bg-red-500 rotate-[-35deg] shadow-[0_0_30px_#ef4444] opacity-60 blur-[1px]" />

        {/* Decorative Floating Cards (Hidden on very small mobile) */}
        <div className="hidden sm:block">
          <div className="absolute top-[15%] left-[10%] rotate-[-15deg] scale-75 opacity-40 blur-[2px] pointer-events-none">
            <div className="w-24 h-36 bg-[#111] rounded-2xl border-4 border-zinc-800 flex items-center justify-center">
              <span className="text-zinc-700 font-black text-2xl -rotate-[15deg]">UNO</span>
            </div>
          </div>
          <div className="absolute bottom-[20%] left-[5%] rotate-[25deg] scale-125 opacity-30 blur-[4px] pointer-events-none">
            <div className="w-32 h-48 bg-[#111] rounded-3xl border-4 border-zinc-800 flex items-center justify-center">
              <span className="text-zinc-700 font-black text-4xl -rotate-[15deg]">UNO</span>
            </div>
          </div>
          <div className="absolute top-[30%] right-[8%] rotate-[15deg] scale-75 opacity-50 blur-[2px] pointer-events-none">
            <div className="w-24 h-36 bg-[#111] rounded-2xl border-4 border-zinc-800 flex items-center justify-center">
              <span className="text-zinc-700 font-black text-2xl -rotate-[15deg]">UNO</span>
            </div>
          </div>
          <div className="absolute bottom-[10%] right-[2%] rotate-[-25deg] scale-150 opacity-20 blur-[6px] pointer-events-none">
            <div className="w-32 h-48 bg-[#111] rounded-3xl border-4 border-zinc-800 flex items-center justify-center">
              <span className="text-zinc-700 font-black text-4xl -rotate-[15deg]">UNO</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Settings Icon */}
      <div className="absolute top-6 right-6 z-50">
        <button className="w-10 h-10 rounded-xl bg-black/40 border border-white/10 hover:border-white/30 hover:bg-black/60 flex items-center justify-center transition-all text-white backdrop-blur-md group">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:rotate-90 transition-transform duration-500"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        </button>
      </div>

      {mode === 'menu' ? (
        <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-[600px] px-6 mt-12 sm:mt-0">
          
          {/* Logo Section */}
          <div className="text-center mb-16 relative">
            <h1 className="text-[5rem] sm:text-[8rem] leading-none font-black text-transparent bg-clip-text bg-gradient-to-b from-blue-300 via-blue-500 to-blue-700 filter drop-shadow-[0_0_20px_rgba(59,130,246,0.6)] tracking-tighter italic">
              UNO
            </h1>
            <h2 className="text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-blue-200 uppercase tracking-widest filter drop-shadow-[0_0_15px_rgba(255,255,255,0.4)] -mt-2 sm:-mt-6 relative z-10">
              ONLINE
            </h2>
            
            {/* Swoosh simulation */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] border-[6px] sm:border-[8px] border-transparent border-t-red-600 border-l-red-600 rounded-[100%] rotate-[-15deg] opacity-80 shadow-[0_0_15px_rgba(220,38,38,0.5)] pointer-events-none" />
            
            <p className="text-zinc-400 font-bold text-xs sm:text-sm tracking-[0.4em] uppercase mt-8 relative z-20">
              Multijugador 2-6 Jugadores
            </p>
            <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-red-500 mx-auto mt-4 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.2)]" />
          </div>

          {/* Action Buttons */}
          <div className="w-full sm:w-[400px] space-y-4">
            <button 
              onClick={() => { setName(''); setRoomCode(''); setError(''); setMode('create'); }}
              className="group relative w-full flex items-center justify-center bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 hover:from-blue-500 hover:via-blue-400 hover:to-blue-500 text-white font-black py-5 px-6 rounded-2xl transition-all shadow-[0_0_30px_rgba(59,130,246,0.6)] active:scale-95 border border-blue-400/50 overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
              <div className="flex items-center gap-3 text-lg sm:text-xl tracking-widest z-10">
                <Gamepad2 size={24} />
                CREAR SALA
              </div>
              <div className="absolute right-6 text-white/50 group-hover:text-white transition-colors z-10">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </div>
            </button>
            
            <button 
              onClick={() => { setName(''); setRoomCode(''); setError(''); setMode('join'); }}
              className="group relative w-full flex items-center justify-center bg-black/60 hover:bg-[#111] backdrop-blur-md border border-white/10 hover:border-white/20 text-white font-black py-5 px-6 rounded-2xl transition-all active:scale-95 overflow-hidden"
            >
              <div className="flex items-center gap-3 text-lg sm:text-xl tracking-widest z-10 text-zinc-300 group-hover:text-white transition-colors">
                <Users size={24} />
                UNIRSE A SALA
              </div>
              <div className="absolute right-6 text-zinc-600 group-hover:text-white transition-colors z-10">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </div>
            </button>
          </div>

          {/* Server Status Pill */}
          <div className="mt-10 flex items-center gap-2 bg-black/50 border border-white/10 px-5 py-2 rounded-full backdrop-blur-md shadow-lg">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-red-500 shadow-[0_0_10px_#ef4444]'} animate-pulse`} />
            <span className="text-[10px] font-bold text-zinc-300 tracking-[0.2em] uppercase">
              {isConnected ? 'SERVIDOR ONLINE' : 'SERVIDOR OFFLINE'}
            </span>
          </div>

        </div>
      ) : (
        <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-sm px-6 animate-in fade-in zoom-in duration-300">
          <div className="w-full p-8 bg-black/80 backdrop-blur-xl rounded-[2rem] space-y-8 border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <button 
              onClick={() => { setName(''); setRoomCode(''); setError(''); setMode('menu'); }}
              className="text-zinc-400 hover:text-white text-xs font-bold tracking-widest uppercase transition-colors flex items-center gap-2 group"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Volver
            </button>

            <h2 className="text-2xl font-black text-center text-white tracking-widest glow-blue">
              {mode === 'create' ? 'NUEVA SALA' : 'UNIRSE'}
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 mb-2 tracking-[0.2em] uppercase">Tu Nombre</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Alex"
                  autoComplete="off"
                  className="w-full bg-[#111] border border-white/10 focus:border-blue-500 rounded-xl px-5 py-4 text-white text-lg font-bold placeholder:text-zinc-700 focus:outline-none transition-all shadow-inner focus:shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                />
              </div>

              {mode === 'create' && (
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 mb-2 tracking-[0.2em] uppercase">Jugadores (Máximo)</label>
                  <select 
                    value={maxPlayers} 
                    onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
                    className="w-full bg-[#111] border border-white/10 text-white px-5 py-4 rounded-xl outline-none focus:border-blue-500 transition-all cursor-pointer text-sm font-bold tracking-widest uppercase shadow-inner"
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
                  <label className="block text-[10px] font-bold text-zinc-500 mb-2 tracking-[0.2em] uppercase">Código de Sala</label>
                  <input
                    type="text"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    placeholder="000000"
                    autoComplete="off"
                    className="w-full bg-[#111] border border-white/10 focus:border-blue-500 rounded-xl px-5 py-4 text-white font-mono text-center text-2xl tracking-[0.4em] font-black placeholder:text-zinc-800 focus:outline-none transition-all shadow-inner uppercase"
                  />
                </div>
              )}

              {error && (
                <div className="bg-red-500/10 border border-red-500/50 p-3 rounded-lg flex items-center justify-center">
                  <p className="text-red-400 text-xs text-center font-bold tracking-widest uppercase">{error}</p>
                </div>
              )}

              <button
                onClick={mode === 'create' ? handleCreate : handleJoin}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-black py-4 px-6 rounded-xl transition-all shadow-[0_0_20px_rgba(59,130,246,0.4)] active:scale-95 mt-4 tracking-widest text-sm"
              >
                {mode === 'create' ? 'CREAR SALA' : 'ENTRAR'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Indicators */}
      {mode === 'menu' && (
        <div className="absolute bottom-8 left-0 right-0 z-20 flex justify-center w-full px-4">
          <div className="flex items-center gap-6 sm:gap-16 text-left flex-wrap justify-center">
            
            <div className="flex items-center gap-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              <div className="flex flex-col">
                <span className="text-white text-xs font-black tracking-widest">RÁPIDO</span>
                <span className="text-zinc-500 text-[9px] font-bold tracking-widest">Juega al instante</span>
              </div>
            </div>

            <div className="hidden sm:block w-px h-8 bg-white/10" />

            <div className="flex items-center gap-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
              <div className="flex flex-col">
                <span className="text-white text-xs font-black tracking-widest">SEGURO</span>
                <span className="text-zinc-500 text-[9px] font-bold tracking-widest">Tus partidas protegidas</span>
              </div>
            </div>

            <div className="hidden sm:block w-px h-8 bg-white/10" />

            <div className="flex items-center gap-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-500"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <div className="flex flex-col">
                <span className="text-white text-xs font-black tracking-widest">DIVERTIDO</span>
                <span className="text-zinc-500 text-[9px] font-bold tracking-widest">Conecta y disfruta</span>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
