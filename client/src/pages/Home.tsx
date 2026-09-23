import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gamepad2, Users, ArrowLeft } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { UnoCard } from '../components/Uno/UnoCard';

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
      <div className="flex flex-col items-center justify-center min-h-[100dvh] w-full bg-[#050505] p-6 space-y-4">
        <div className="w-12 h-12 border-4 border-slate-800 border-t-blue-500 rounded-full animate-spin shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
        <p className="text-blue-400 text-sm tracking-widest font-black animate-pulse">RECONECTANDO...</p>
      </div>
    );
  }

  return (
    <div 
      className="relative flex flex-col items-center justify-center min-h-[100dvh] w-full overflow-hidden bg-[#020202] font-sans selection:bg-blue-500/30"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)'
      }}
    >
      
      {/* Background Ambience (100% viewport, NO max-width) */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden w-full h-full">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#0a0f1c_0%,_#020202_80%)] opacity-100" />
        
        {/* Tech Grid - Sharp and defined */}
        <div className="absolute inset-0 opacity-[0.05]" style={{ 
          backgroundImage: `linear-gradient(0deg, transparent 24%, rgba(255, 255, 255, 1) 25%, rgba(255, 255, 255, 1) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, 1) 75%, rgba(255, 255, 255, 1) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(255, 255, 255, 1) 25%, rgba(255, 255, 255, 1) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, 1) 75%, rgba(255, 255, 255, 1) 76%, transparent 77%, transparent)`, 
          backgroundSize: '50px 50px' 
        }} />
        
        {/* Glows using radial gradients instead of heavy blur for better HD rendering */}
        <div className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[800px] bg-[radial-gradient(ellipse_at_center,_rgba(37,99,235,0.15)_0%,_transparent_70%)]" />
        <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-[600px] h-[800px] bg-[radial-gradient(ellipse_at_center,_rgba(220,38,38,0.12)_0%,_transparent_70%)]" />

        {/* Diagonal Neon Lines - Sharp */}
        <div className="absolute -top-[20%] left-[10%] w-[2px] h-[140%] bg-blue-500 rotate-[35deg] shadow-[0_0_20px_#3b82f6,0_0_40px_#3b82f6] opacity-80" />
        <div className="absolute -top-[20%] right-[10%] w-[2px] h-[140%] bg-red-500 rotate-[-35deg] shadow-[0_0_20px_#ef4444,0_0_40px_#ef4444] opacity-80" />

        {/* Decorative Floating Cards - HD and Responsive */}
        {/* Desktop Cards */}
        <div className="hidden lg:block">
          <div className="absolute top-[12%] left-[12%] rotate-[-15deg] scale-125 drop-shadow-[0_25px_35px_rgba(0,0,0,0.8)] opacity-95">
            <UnoCard size="xl" />
          </div>
          <div className="absolute bottom-[15%] left-[8%] rotate-[25deg] scale-100 drop-shadow-[0_15px_25px_rgba(0,0,0,0.9)] opacity-90">
            <UnoCard size="lg" />
          </div>
          <div className="absolute top-[25%] right-[15%] rotate-[20deg] scale-100 drop-shadow-[0_15px_25px_rgba(0,0,0,0.8)] opacity-90 blur-[1px]">
            <UnoCard size="lg" />
          </div>
          <div className="absolute bottom-[10%] right-[5%] rotate-[-25deg] scale-125 drop-shadow-[0_25px_35px_rgba(0,0,0,0.9)] opacity-95">
            <UnoCard size="xl" />
          </div>
        </div>

        {/* Tablet Cards */}
        <div className="hidden md:block lg:hidden">
          <div className="absolute top-[15%] left-[5%] rotate-[-15deg] scale-100 drop-shadow-[0_20px_30px_rgba(0,0,0,0.8)] opacity-90">
            <UnoCard size="lg" />
          </div>
          <div className="absolute bottom-[15%] right-[5%] rotate-[-25deg] scale-100 drop-shadow-[0_20px_30px_rgba(0,0,0,0.8)] opacity-90">
            <UnoCard size="lg" />
          </div>
        </div>

        {/* Mobile Cards (Just one very subtle card to not clutter) */}
        <div className="block md:hidden">
          <div className="absolute top-[10%] left-[-20%] rotate-[15deg] scale-75 drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] opacity-40 blur-[1px]">
            <UnoCard size="md" />
          </div>
          <div className="absolute bottom-[5%] right-[-15%] rotate-[-20deg] scale-75 drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] opacity-40 blur-[1px]">
            <UnoCard size="md" />
          </div>
        </div>
      </div>

      {/* Top Settings Icon */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-50">
        <button className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-black/40 border border-white/10 hover:border-white/30 hover:bg-black/60 flex items-center justify-center transition-all text-white backdrop-blur-md group shadow-lg">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:rotate-90 transition-transform duration-500"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        </button>
      </div>

      {mode === 'menu' ? (
        <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-[800px] px-4 sm:px-6 flex-1 py-12">
          
          {/* Logo Section */}
          <div className="text-center mb-10 sm:mb-16 relative">
            <h1 className="text-[clamp(4.5rem,15vw,8rem)] leading-none font-black text-transparent bg-clip-text bg-gradient-to-b from-blue-300 via-blue-500 to-blue-700 filter drop-shadow-[0_0_20px_rgba(59,130,246,0.6)] tracking-tighter italic">
              UNO
            </h1>
            <h2 className="text-[clamp(2.5rem,8vw,5rem)] font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-blue-200 uppercase tracking-widest filter drop-shadow-[0_0_15px_rgba(255,255,255,0.4)] -mt-2 sm:-mt-6 relative z-10">
              ONLINE
            </h2>
            
            {/* Swoosh simulation */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[110%] sm:h-[130%] border-[4px] sm:border-[8px] border-transparent border-t-red-600 border-l-red-600 rounded-[100%] rotate-[-15deg] opacity-90 shadow-[0_0_15px_rgba(220,38,38,0.6)] pointer-events-none" />
            
            <p className="text-zinc-300 font-black text-[10px] sm:text-sm tracking-[0.3em] sm:tracking-[0.5em] uppercase mt-6 sm:mt-10 relative z-20">
              Multijugador 2-6 Jugadores
            </p>
            <div className="w-16 sm:w-24 h-1 bg-gradient-to-r from-blue-500 to-red-500 mx-auto mt-3 sm:mt-5 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.3)]" />
          </div>

          {/* Action Buttons */}
          <div className="w-[calc(100%-16px)] sm:w-[420px] max-w-full space-y-4">
            <button 
              onClick={() => { setName(''); setRoomCode(''); setError(''); setMode('create'); }}
              className="group relative w-full flex items-center justify-center bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 hover:from-blue-500 hover:via-blue-400 hover:to-blue-500 text-white font-black py-4 sm:py-5 px-6 rounded-2xl transition-all shadow-[0_0_30px_rgba(59,130,246,0.6)] active:scale-95 border border-blue-400/50 overflow-hidden min-h-[56px] sm:min-h-[72px]"
            >
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
              <div className="flex items-center gap-3 text-base sm:text-xl tracking-widest z-10 drop-shadow-md">
                <Gamepad2 size={24} className="w-5 h-5 sm:w-6 sm:h-6" />
                CREAR SALA
              </div>
              <div className="absolute right-4 sm:right-6 text-white/60 group-hover:text-white transition-colors z-10">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 sm:w-6 sm:h-6"><path d="m9 18 6-6-6-6"/></svg>
              </div>
            </button>
            
            <button 
              onClick={() => { setName(''); setRoomCode(''); setError(''); setMode('join'); }}
              className="group relative w-full flex items-center justify-center bg-black/70 hover:bg-black/90 backdrop-blur-md border border-white/20 hover:border-white/40 text-white font-black py-4 sm:py-5 px-6 rounded-2xl transition-all active:scale-95 overflow-hidden min-h-[56px] sm:min-h-[72px] shadow-[0_10px_20px_rgba(0,0,0,0.5)]"
            >
              <div className="flex items-center gap-3 text-base sm:text-xl tracking-widest z-10 text-zinc-200 group-hover:text-white transition-colors">
                <Users size={24} className="w-5 h-5 sm:w-6 sm:h-6" />
                UNIRSE A SALA
              </div>
              <div className="absolute right-4 sm:right-6 text-zinc-500 group-hover:text-white transition-colors z-10">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 sm:w-6 sm:h-6"><path d="m9 18 6-6-6-6"/></svg>
              </div>
            </button>
          </div>

          {/* Server Status Pill */}
          <div className="mt-8 sm:mt-12 flex items-center gap-2 sm:gap-3 bg-black/60 border border-white/10 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full backdrop-blur-md shadow-xl">
            <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_12px_#22c55e]' : 'bg-red-500 shadow-[0_0_12px_#ef4444]'} animate-pulse`} />
            <span className="text-[10px] sm:text-xs font-black text-zinc-200 tracking-[0.2em] uppercase">
              {isConnected ? 'SERVIDOR ONLINE' : 'SERVIDOR OFFLINE'}
            </span>
          </div>

        </div>
      ) : (
        <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-[420px] px-4 sm:px-6 flex-1 py-8 animate-in fade-in zoom-in duration-300">
          <div className="w-full p-6 sm:p-10 bg-black/85 backdrop-blur-xl rounded-[2rem] space-y-6 sm:space-y-8 border border-white/15 shadow-[0_0_50px_rgba(0,0,0,0.6)]">
            <button 
              onClick={() => { setName(''); setRoomCode(''); setError(''); setMode('menu'); }}
              className="text-zinc-400 hover:text-white text-[10px] sm:text-xs font-black tracking-widest uppercase transition-colors flex items-center gap-2 group"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform w-4 h-4 sm:w-5 sm:h-5" /> Volver
            </button>

            <h2 className="text-xl sm:text-3xl font-black text-center text-white tracking-widest glow-blue">
              {mode === 'create' ? 'NUEVA SALA' : 'UNIRSE'}
            </h2>

            <div className="space-y-5 sm:space-y-6">
              <div>
                <label className="block text-[10px] sm:text-xs font-black text-zinc-400 mb-2 tracking-[0.2em] uppercase">Tu Nombre</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Alex"
                  autoComplete="off"
                  className="w-full bg-[#0a0a0a] border border-white/10 focus:border-blue-500 rounded-xl px-4 sm:px-5 py-3 sm:py-4 text-white text-base sm:text-lg font-bold placeholder:text-zinc-700 focus:outline-none transition-all shadow-inner focus:shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                />
              </div>

              {mode === 'create' && (
                <div>
                  <label className="block text-[10px] sm:text-xs font-black text-zinc-400 mb-2 tracking-[0.2em] uppercase">Jugadores (Máximo)</label>
                  <select 
                    value={maxPlayers} 
                    onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
                    className="w-full bg-[#0a0a0a] border border-white/10 text-white px-4 sm:px-5 py-3 sm:py-4 rounded-xl outline-none focus:border-blue-500 transition-all cursor-pointer text-xs sm:text-sm font-bold tracking-widest uppercase shadow-inner appearance-none"
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
                  <label className="block text-[10px] sm:text-xs font-black text-zinc-400 mb-2 tracking-[0.2em] uppercase">Código de Sala</label>
                  <input
                    type="text"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    placeholder="000000"
                    autoComplete="off"
                    className="w-full bg-[#0a0a0a] border border-white/10 focus:border-blue-500 rounded-xl px-4 sm:px-5 py-3 sm:py-4 text-white font-mono text-center text-xl sm:text-2xl tracking-[0.4em] font-black placeholder:text-zinc-800 focus:outline-none transition-all shadow-inner uppercase"
                  />
                </div>
              )}

              {error && (
                <div className="bg-red-500/10 border border-red-500/50 p-3 rounded-xl flex items-center justify-center">
                  <p className="text-red-400 text-[10px] sm:text-xs text-center font-black tracking-widest uppercase">{error}</p>
                </div>
              )}

              <button
                onClick={mode === 'create' ? handleCreate : handleJoin}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-black py-4 sm:py-5 px-6 rounded-xl transition-all shadow-[0_0_25px_rgba(59,130,246,0.5)] active:scale-95 mt-2 sm:mt-4 tracking-widest text-sm sm:text-base min-h-[56px] sm:min-h-[64px]"
              >
                {mode === 'create' ? 'CREAR SALA' : 'ENTRAR'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Indicators - Responsive Grid/Flex layout */}
      {mode === 'menu' && (
        <div className="w-full px-4 sm:px-8 pb-6 sm:pb-8 pt-4 z-20 mt-auto">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-12 lg:gap-20 text-left w-full max-w-5xl mx-auto">
            
            <div className="flex items-center gap-4 bg-black/40 sm:bg-transparent px-6 py-3 sm:px-0 sm:py-0 rounded-2xl sm:rounded-none w-full sm:w-auto justify-center sm:justify-start border border-white/5 sm:border-none backdrop-blur-sm sm:backdrop-blur-none">
              <div className="bg-blue-500/20 p-2 sm:p-0 rounded-lg sm:bg-transparent">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500 w-5 h-5 sm:w-6 sm:h-6"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              </div>
              <div className="flex flex-col">
                <span className="text-white text-[11px] sm:text-xs font-black tracking-widest uppercase">Rápido</span>
                <span className="text-zinc-500 text-[9px] sm:text-[10px] font-bold tracking-widest uppercase mt-0.5">Juega al instante</span>
              </div>
            </div>

            <div className="hidden sm:block w-px h-10 bg-gradient-to-b from-transparent via-white/20 to-transparent" />

            <div className="flex items-center gap-4 bg-black/40 sm:bg-transparent px-6 py-3 sm:px-0 sm:py-0 rounded-2xl sm:rounded-none w-full sm:w-auto justify-center sm:justify-start border border-white/5 sm:border-none backdrop-blur-sm sm:backdrop-blur-none">
              <div className="bg-green-500/20 p-2 sm:p-0 rounded-lg sm:bg-transparent">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-500 w-5 h-5 sm:w-6 sm:h-6"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
              </div>
              <div className="flex flex-col">
                <span className="text-white text-[11px] sm:text-xs font-black tracking-widest uppercase">Seguro</span>
                <span className="text-zinc-500 text-[9px] sm:text-[10px] font-bold tracking-widest uppercase mt-0.5">Tus partidas protegidas</span>
              </div>
            </div>

            <div className="hidden sm:block w-px h-10 bg-gradient-to-b from-transparent via-white/20 to-transparent" />

            <div className="flex items-center gap-4 bg-black/40 sm:bg-transparent px-6 py-3 sm:px-0 sm:py-0 rounded-2xl sm:rounded-none w-full sm:w-auto justify-center sm:justify-start border border-white/5 sm:border-none backdrop-blur-sm sm:backdrop-blur-none">
              <div className="bg-purple-500/20 p-2 sm:p-0 rounded-lg sm:bg-transparent">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-purple-500 w-5 h-5 sm:w-6 sm:h-6"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <div className="flex flex-col">
                <span className="text-white text-[11px] sm:text-xs font-black tracking-widest uppercase">Divertido</span>
                <span className="text-zinc-500 text-[9px] sm:text-[10px] font-bold tracking-widest uppercase mt-0.5">Conecta y disfruta</span>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
