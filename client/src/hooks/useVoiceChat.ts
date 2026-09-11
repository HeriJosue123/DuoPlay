import { useEffect, useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';

export type VoiceState = 'idle' | 'requesting' | 'connecting' | 'connected' | 'error' | 'no-permission';

interface UseVoiceChatProps {
  roomId: string;
  playerId: string;
  socket: Socket | null;
  isActive: boolean; // True when there are 2 players connected
  isInitiator: boolean; // True for Player 1, False for Player 2
}

export const useVoiceChat = ({ roomId, playerId, socket, isActive, isInitiator }: UseVoiceChatProps) => {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const speakingRafRef = useRef<number | null>(null);

  // Initialize Audio & PeerConnection
  const initWebRTC = useCallback(async () => {
    if (pcRef.current) return; // Already initialized
    
    try {
      setVoiceState('requesting');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });
      
      localStreamRef.current = stream;
      // Apply initial mute state
      stream.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;
      });

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });
      pcRef.current = pc;

      // Add local tracks
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Handle incoming tracks
      pc.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('webrtc_signal', {
            roomId,
            playerId,
            signal: { type: 'ice-candidate', candidate: event.candidate }
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setVoiceState('connected');
        } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          setVoiceState('connecting'); // Or error, but we'll attempt to reconnect later
        }
      };

      setVoiceState('connecting');

      // Initiator creates the offer
      if (isInitiator) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket?.emit('webrtc_signal', {
          roomId,
          playerId,
          signal: { type: 'offer', offer }
        });
      }

    } catch (err) {
      console.error('Error accessing microphone:', err);
      setVoiceState('no-permission');
    }
  }, [roomId, playerId, socket, isInitiator, isMuted]);

  // Clean up WebRTC
  const cleanupWebRTC = useCallback(() => {
    if (speakingRafRef.current) cancelAnimationFrame(speakingRafRef.current);
    if (audioContextRef.current) audioContextRef.current.close();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    setRemoteStream(null);
    setVoiceState('idle');
    setIsSpeaking(false);
  }, []);

  // Handle Activation/Deactivation based on Room State
  useEffect(() => {
    if (isActive) {
      initWebRTC();
    } else {
      cleanupWebRTC();
    }
    return () => cleanupWebRTC();
  }, [isActive, initWebRTC, cleanupWebRTC]);

  // Handle Socket Signaling
  useEffect(() => {
    if (!socket) return;

    const handleSignal = async (data: { playerId: string, signal: any }) => {
      // Ignore our own signals (just in case, though server filters it)
      if (data.playerId === playerId) return;
      
      const pc = pcRef.current;
      if (!pc) return;

      const { signal } = data;
      
      try {
        if (signal.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('webrtc_signal', {
            roomId,
            playerId,
            signal: { type: 'answer', answer }
          });
        } else if (signal.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.answer));
        } else if (signal.type === 'ice-candidate') {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      } catch (err) {
        console.error('Error handling WebRTC signal:', err);
      }
    };

    socket.on('webrtc_signal', handleSignal);
    return () => {
      socket.off('webrtc_signal', handleSignal);
    };
  }, [socket, roomId, playerId]);

  // Handle Audio Activity (Speaking indicator)
  useEffect(() => {
    if (!remoteStream) {
      setIsSpeaking(false);
      return;
    }

    try {
      // Create audio context and analyser
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      const analyser = audioContext.createAnalyser();
      analyserRef.current = analyser;
      analyser.fftSize = 256;

      const source = audioContext.createMediaStreamSource(remoteStream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkAudioLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Calculate average volume
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;

        // Threshold to determine if speaking
        setIsSpeaking(average > 10);

        speakingRafRef.current = requestAnimationFrame(checkAudioLevel);
      };

      checkAudioLevel();
    } catch (err) {
      console.error('Error setting up audio analyser:', err);
    }

    return () => {
      if (speakingRafRef.current) cancelAnimationFrame(speakingRafRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, [remoteStream]);

  // Toggle Mute
  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const nextMuted = !prev;
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach(track => {
          track.enabled = !nextMuted;
        });
      }
      return nextMuted;
    });
  }, []);

  return {
    voiceState,
    isMuted,
    toggleMute,
    remoteStream,
    isSpeaking,
    retryAccess: initWebRTC
  };
};
