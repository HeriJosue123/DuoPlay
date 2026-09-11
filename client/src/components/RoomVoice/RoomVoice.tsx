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
      console.log('[IOS VOICE] Assigning remoteStream to audio element srcObject');
      audioRef.current.srcObject = remoteStream;
      
      console.log('[IOS VOICE] Executing audio.play() automatically');
      const playPromise = audioRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise.then(() => {
          console.log('[IOS VOICE] audio.play() SUCCESS (autoPlay)');
          setRemoteAudioState('playing');
        }).catch((err) => {
          console.error('[IOS VOICE] audio.play() BLOCKED by Autoplay Policy:', err);
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
      console.log('[IOS VOICE] User manually clicked UNBLOCK audio button');
      const playPromise = audioRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise.then(() => {
          console.log('[IOS VOICE] audio.play() SUCCESS (manual interaction)');
          setRemoteAudioState('playing');
        }).catch((err) => {
          console.error('[IOS VOICE] audio.play() FAILED despite manual interaction:', err);
          setPlayErrorMsg(`${err.name}: ${err.message}`);
        });
      }
    }
  };

  return (
    <div className="absolute top-4 right-4 z-40 flex flex-col items-end gap-2">
      {/* 
        CRITICAL FOR SAFARI: 
        - Must have autoPlay and playsInline
        - Do NOT use muted=true for the remote stream
      */}
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
            🔊 ACTIVAR AUDIO
          </button>
          {playErrorMsg && (
            <div className="text-[8px] text-red-400 bg-black/80 px-2 py-1 rounded max-w-[150px] break-words text-center border border-red-900/50">
              {playErrorMsg}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className="text-[9px] font-bold tracking-widest uppercase text-slate-400">
          {!isActive && 'Esperando voz...'}
          {isActive && voiceState === 'idle' && 'Iniciando...'}
          {voiceState === 'connecting' && 'Conectando...'}
          {voiceState === 'requesting' && 'Permiso...'}
          {voiceState === 'no-permission' && 'Sin acceso'}
          {voiceState === 'connected' && (
            isMuted ? 'Micrófono apagado' : <span className="text-green-400">Micrófono encendido</span>
          )}
          {voiceState === 'error' && <span className="text-red-400">Error de conexión</span>}
        </div>

        <button
          onClick={voiceState === 'no-permission' ? retryAccess : toggleMute}
          disabled={!isActive || voiceState === 'requesting' || voiceState === 'connecting' || voiceState === 'error'}
          className={`relative p-3 rounded-full transition-all backdrop-blur-md active:scale-95 border
            ${!isActive
              ? 'bg-black/50 border-[#222] text-slate-600 cursor-not-allowed'
              : voiceState === 'no-permission' || voiceState === 'error'
              ? 'bg-red-900/50 border-red-500/50 text-red-500 hover:bg-red-900/80' 
              : isMuted 
                ? 'bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-slate-700/80' 
                : 'bg-[#111] border-[#333] text-white hover:bg-[#222]'
            }
          `}
        >
          {/* Subtle glow when unmuted (since we removed AnalyserNode for Safari safety, we just show a static glow) */}
          {!isMuted && voiceState === 'connected' && (
            <div className="absolute inset-0 rounded-full border-2 border-green-500/50 shadow-[0_0_10px_rgba(74,222,128,0.3)]" />
          )}

          {voiceState === 'no-permission' || voiceState === 'error' ? (
            <AlertCircle size={18} />
          ) : isMuted ? (
            <MicOff size={18} />
          ) : (
            <Mic size={18} className="text-green-400" />
          )}
        </button>
      </div>
    </div>
  );
};
