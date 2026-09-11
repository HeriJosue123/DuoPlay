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
  const [isMuted, setIsMuted] = useState(true); // OFF by default
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const speakingRafRef = useRef<number | null>(null);
  
  const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);
  const p2ReadyForOfferRef = useRef<boolean>(false);
  const pcReadyRef = useRef<boolean>(false); // tracks if our pc is fully instantiated and tracks are added
  const offerSentRef = useRef<boolean>(false);

  const attemptSendOffer = useCallback(async () => {
    if (!isInitiator) return;
    if (!pcRef.current) return;
    if (!pcReadyRef.current) return;
    if (!p2ReadyForOfferRef.current) return;
    if (offerSentRef.current) return;

    try {
      offerSentRef.current = true;
      console.log('[VOICE] OFFER CREATED (creating...)');
      const offer = await pcRef.current.createOffer();
      await pcRef.current.setLocalDescription(offer);
      console.log('[VOICE] OFFER CREATED and LocalDescription set');
      
      if (socket) {
        socket.emit('webrtc_offer', {
          roomId,
          from: playerId,
          sdp: offer.sdp
        });
        console.log('[VOICE] OFFER SENT');
      }
    } catch (err) {
      console.error('[VOICE] Error creating offer:', err);
    }
  }, [isInitiator, socket, roomId, playerId]);

  // Initialize Audio & PeerConnection
  const initWebRTC = useCallback(async () => {
    if (pcRef.current) return; // Already initialized
    
    console.log(`[VOICE] initWebRTC called. isActive: ${isActive}, isInitiator: ${isInitiator}`);
    
    try {
      setVoiceState('requesting');
      console.log('[VOICE] Requesting getUserMedia...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });
      console.log('[VOICE] getUserMedia OK');
      
      localStreamRef.current = stream;
      // Force initial tracks to be disabled (Mute is ON by default)
      stream.getAudioTracks().forEach(track => {
        track.enabled = false;
      });

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });
      console.log('[VOICE] PeerConnection CREATED');
      pcRef.current = pc;
      pcReadyRef.current = false;
      iceCandidateQueue.current = [];

      // Add local tracks
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Listen for remote tracks
      pc.ontrack = (event) => {
        console.log('[VOICE] ONTRACK EVENT FIRED');
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        } else {
          setRemoteStream(new MediaStream([event.track]));
        }
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          console.log('[VOICE] ICE CANDIDATE SENT');
          socket.emit('webrtc_ice_candidate', {
            roomId,
            from: playerId,
            candidate: event.candidate
          });
        }
      };

      // More reliable than connectionState in older mobile browsers
      pc.oniceconnectionstatechange = () => {
        console.log(`[VOICE] ICE STATE: ${pc.iceConnectionState}`);
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          setVoiceState('connected');
        } else if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
          setVoiceState('connecting');
        }
      };

      pc.onconnectionstatechange = () => {
        console.log(`[VOICE] CONNECTION STATE: ${pc.connectionState}`);
      };

      setVoiceState('connecting');
      pcReadyRef.current = true;

      // Instead of shooting the offer blindly, P2 tells P1 it is ready to receive
      if (!isInitiator && socket) {
        console.log('[VOICE] ready_for_offer SENT');
        socket.emit('ready_for_offer', {
          roomId,
          from: playerId
        });
      } else if (isInitiator) {
        attemptSendOffer();
      }

    } catch (err) {
      console.error('[VOICE] Error accessing microphone:', err);
      setVoiceState('no-permission');
    }
  }, [roomId, playerId, socket, isInitiator, attemptSendOffer, isActive]);

  // Clean up WebRTC
  const cleanupWebRTC = useCallback(() => {
    console.log('[VOICE] cleanupWebRTC called');
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
    pcReadyRef.current = false;
    p2ReadyForOfferRef.current = false;
    offerSentRef.current = false;
    iceCandidateQueue.current = [];
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

    const handleReadyForOffer = (data: { roomId: string, from: string }) => {
      if (data.from === playerId) return;
      if (isInitiator) {
        console.log('[VOICE] ready_for_offer RECEIVED');
        p2ReadyForOfferRef.current = true;
        attemptSendOffer();
      }
    };

    const handleOffer = async (data: { roomId: string, sdp: string, from: string }) => {
      if (data.from === playerId) return;
      console.log('[VOICE] OFFER RECEIVED');
      const pc = pcRef.current;
      if (!pc) return;
      
      try {
        await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: data.sdp }));
        console.log('[VOICE] REMOTE DESCRIPTION SET (Offer)');
        
        while (iceCandidateQueue.current.length > 0) {
          const candidate = iceCandidateQueue.current.shift();
          if (candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }

        console.log('[VOICE] ANSWER CREATED (creating...)');
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        console.log('[VOICE] ANSWER CREATED and LocalDescription set');
        
        socket.emit('webrtc_answer', {
          roomId,
          from: playerId,
          sdp: answer.sdp
        });
        console.log('[VOICE] ANSWER SENT');
      } catch (e) {
        console.error('[VOICE] handleOffer error', e);
      }
    };

    const handleAnswer = async (data: { roomId: string, sdp: string, from: string }) => {
      if (data.from === playerId) return;
      console.log('[VOICE] ANSWER RECEIVED');
      const pc = pcRef.current;
      if (!pc) return;
      
      try {
        await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: data.sdp }));
        console.log('[VOICE] REMOTE DESCRIPTION SET (Answer)');
        
        while (iceCandidateQueue.current.length > 0) {
          const candidate = iceCandidateQueue.current.shift();
          if (candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (e) {
        console.error('[VOICE] handleAnswer error', e);
      }
    };

    const handleIceCandidate = async (data: { roomId: string, candidate: any, from: string }) => {
      if (data.from === playerId) return;
      console.log('[VOICE] ICE CANDIDATE RECEIVED');
      const pc = pcRef.current;
      if (!pc) {
        iceCandidateQueue.current.push(data.candidate);
        return;
      }
      if (pc.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      } else {
        iceCandidateQueue.current.push(data.candidate);
      }
    };

    socket.on('ready_for_offer', handleReadyForOffer);
    socket.on('webrtc_offer', handleOffer);
    socket.on('webrtc_answer', handleAnswer);
    socket.on('webrtc_ice_candidate', handleIceCandidate);

    return () => {
      socket.off('ready_for_offer', handleReadyForOffer);
      socket.off('webrtc_offer', handleOffer);
      socket.off('webrtc_answer', handleAnswer);
      socket.off('webrtc_ice_candidate', handleIceCandidate);
    };
  }, [socket, roomId, playerId, isInitiator, attemptSendOffer]);

  // Handle Audio Activity (Speaking indicator)
  useEffect(() => {
    if (!remoteStream) {
      setIsSpeaking(false);
      return;
    }

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      const analyser = audioContext.createAnalyser();
      analyserRef.current = analyser;
      analyser.fftSize = 256;

      // Clone the stream to prevent Safari from rerouting and muting the <audio> playback!
      const clonedStream = remoteStream.clone();
      const source = audioContext.createMediaStreamSource(clonedStream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkAudioLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;

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
