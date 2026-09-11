import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, AlertCircle } from 'lucide-react';
import { useVoiceChat } from '../../hooks/useVoiceChat';
import { useSocket } from '../../context/SocketContext';
import type { Room } from '../../types';

interface Props {
  room: Room;
}

export const RoomVoice: React.FC<Props> = ({ room }) => {
  const { socket, playerId } = useSocket();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  // Voice chat is active only if both players are present and connected
  const isActive = room.players.length === 2 && room.players.every(p => p.connected);
  
  // P1 is initiator (the creator of the room). 
  // If P1 is missing, fallback safely (shouldn't happen in a valid 2-player state).
  const isInitiator = playerId === room.players[0]?.id;

  const {
    voiceState,
    isMuted,
    toggleMute,
    remoteStream,
    isSpeaking,
    retryAccess
  } = useVoiceChat({
    roomId: room.roomId,
    playerId: playerId || '',
    socket,
    isActive,
    isInitiator
  });

  // Attach remote stream to audio element
  useEffect(() => {
    if (audioRef.current && remoteStream) {
      audioRef.current.srcObject = remoteStream;
      audioRef.current.play().catch((err) => {
        console.error('Audio playback failed due to autoplay policy:', err);
        setAutoplayBlocked(true);
      });
    }
  }, [remoteStream]);

  const handlePlayBlockedAudio = () => {
    if (audioRef.current) {
      audioRef.current.play().then(() => {
        setAutoplayBlocked(false);
      }).catch(console.error);
    }
  };

  return (
    <div className="absolute top-4 right-4 z-40 flex flex-col items-end gap-2">
      {/* Invisible Audio Element (using styles instead of display:none to prevent mobile browsers from pausing it) */}
      <audio 
        ref={audioRef} 
        autoPlay 
        playsInline 
        style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }} 
      />
      
      {/* Autoplay blocked banner */}
      {autoplayBlocked && (
        <button 
          onClick={handlePlayBlockedAudio}
          className="bg-red-500/20 border border-red-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-2 shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-pulse"
        >
          🔊 ACTIVAR AUDIO
        </button>
      )}

      {/* Voice Control Button */}
      <div className="flex items-center gap-2">
        {/* Connection Status Text */}
        <div className="text-[9px] font-bold tracking-widest uppercase text-slate-400">
          {!isActive && 'Esperando voz...'}
          {isActive && voiceState === 'idle' && 'Iniciando...'}
          {voiceState === 'connecting' && 'Conectando...'}
          {voiceState === 'requesting' && 'Permiso...'}
          {voiceState === 'no-permission' && 'Sin acceso'}
          {voiceState === 'connected' && (isSpeaking ? <span className="text-green-400">Hablando...</span> : 'Conectado')}
        </div>

        <button
          onClick={voiceState === 'no-permission' ? retryAccess : toggleMute}
          disabled={!isActive || voiceState === 'requesting' || voiceState === 'connecting'}
          className={`relative p-3 rounded-full transition-all backdrop-blur-md active:scale-95 border
            ${!isActive
              ? 'bg-black/50 border-[#222] text-slate-600 cursor-not-allowed'
              : voiceState === 'no-permission' 
              ? 'bg-red-900/50 border-red-500/50 text-red-500 hover:bg-red-900/80' 
              : isMuted 
                ? 'bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-slate-700/80' 
                : 'bg-[#111] border-[#333] text-white hover:bg-[#222]'
            }
          `}
        >
          {/* Speaking Indicator Glow Ring */}
          {isSpeaking && !isMuted && voiceState === 'connected' && (
            <div className="absolute inset-0 rounded-full border-2 border-green-500 animate-ping opacity-50" />
          )}
          {isSpeaking && !isMuted && voiceState === 'connected' && (
            <div className="absolute inset-0 rounded-full border-2 border-green-400 shadow-[0_0_10px_rgba(74,222,128,0.5)]" />
          )}

          {voiceState === 'no-permission' ? (
            <AlertCircle size={18} />
          ) : isMuted ? (
            <MicOff size={18} />
          ) : (
            <Mic size={18} className={isSpeaking ? 'text-green-400' : 'text-white'} />
          )}
        </button>
      </div>
    </div>
  );
};
