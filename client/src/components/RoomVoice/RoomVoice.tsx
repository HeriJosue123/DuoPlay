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
  
  const [remoteAudioState, setRemoteAudioState] = useState<'unavailable' | 'playing' | 'blocked'>('unavailable');
  const [playErrorMsg, setPlayErrorMsg] = useState('');

  const isActive = room.players.length === 2 && room.players.every(p => p.connected);
  const isInitiator = playerId === room.players[0]?.id;

  const {
    voiceState,
    isMuted,
    toggleMute,
    remoteStream,
    retryAccess
  } = useVoiceChat({
    roomId: room.roomId,
    playerId: playerId || '',
    socket,
    isActive,
    isInitiator
  });

  // Handle attaching and playing the remote stream safely
  useEffect(() => {
    if (audioRef.current && remoteStream) {
      audioRef.current.srcObject = remoteStream;
      const playPromise = audioRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise.then(() => {
          setRemoteAudioState('playing');
        }).catch((err) => {
          setRemoteAudioState('blocked');
          setPlayErrorMsg(`${err.name}: ${err.message}`);
        });
      }
    } else if (!remoteStream) {
      setRemoteAudioState('unavailable');
    }
  }, [remoteStream]);

  const handlePlayBlockedAudio = () => {
    if (audioRef.current) {
      const playPromise = audioRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise.then(() => {
          setRemoteAudioState('playing');
        }).catch((err) => {
          setPlayErrorMsg(`${err.name}: ${err.message}`);
        });
      }
    }
  };

  // Diagnostic log for state changes
  useEffect(() => {
    if (isActive) {
      console.log(`[RoomVoice UI] State: ${voiceState} | Muted: ${isMuted}`);
    }
  }, [voiceState, isMuted, isActive]);

  return (
    <div className="absolute top-4 right-4 z-40 flex flex-col items-end gap-2">
      <audio 
        ref={audioRef} 
        autoPlay 
        playsInline 
        style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }} 
      />
      
      {remoteAudioState === 'blocked' && (
        <div className="flex flex-col items-end gap-1">
          <button 
            onClick={handlePlayBlockedAudio}
            className="bg-red-500/20 border border-red-500 text-white text-[10px] font-bold px-4 py-2 rounded-full flex items-center gap-2 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse"
          >
            ▶ ACTIVAR AUDIO RIVAL
          </button>
          {playErrorMsg && (
            <div className="text-[8px] text-red-400 bg-black/80 px-2 py-1 rounded max-w-[150px] break-words text-center border border-red-900/50">
              {playErrorMsg}
            </div>
          )}
        </div>
      )}

      {voiceState === 'no-permission' && (
        <div className="text-[10px] text-red-400 bg-black/80 px-3 py-2 rounded-lg max-w-[200px] text-center border border-red-900/50 mb-1">
          Permiso de micrófono requerido. Por favor, habilítalo en tu navegador.
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={voiceState === 'no-permission' ? retryAccess : toggleMute}
          disabled={!isActive || voiceState === 'requesting' || voiceState === 'connecting' || voiceState === 'error'}
          className={`flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border text-[10px] sm:text-xs font-black tracking-widest uppercase transition-all backdrop-blur-md active:scale-95
            ${!isActive
              ? 'bg-black/50 border-[#222] text-slate-600 cursor-not-allowed'
              : voiceState === 'no-permission' || voiceState === 'error'
              ? 'bg-red-900/50 border-red-500/50 text-red-500 hover:bg-red-900/80' 
              : isMuted 
                ? 'bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-slate-700/80' 
                : 'bg-green-900/20 border-green-500/30 text-white shadow-[0_0_15px_rgba(34,197,94,0.15)] hover:bg-green-900/40'
            }
          `}
        >
          {voiceState === 'no-permission' || voiceState === 'error' ? (
            <AlertCircle size={14} className="sm:w-4 sm:h-4" />
          ) : isMuted ? (
            <MicOff size={14} className="sm:w-4 sm:h-4" />
          ) : (
            <Mic size={14} className="text-green-400 sm:w-4 sm:h-4" />
          )}

          <span className="hidden sm:inline">
            {!isActive && 'ESPERANDO VOZ...'}
            {isActive && voiceState === 'idle' && 'INICIANDO...'}
            {voiceState === 'connecting' && 'CONECTANDO...'}
            {voiceState === 'requesting' && 'PERMISO...'}
            {voiceState === 'no-permission' && 'SIN ACCESO'}
            {voiceState === 'connected' && (isMuted ? 'MIC APAGADO' : 'VOZ: ON')}
            {voiceState === 'error' && 'ERROR'}
          </span>
          <span className="sm:hidden">
            {voiceState === 'connected' ? (isMuted ? 'OFF' : 'ON') : '...'}
          </span>
        </button>
      </div>
    </div>
  );
};
