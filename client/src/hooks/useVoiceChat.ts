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
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  
  const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);
  const p2ReadyForOfferRef = useRef<boolean>(false);
  const offerSentRef = useRef<boolean>(false);
  const isCleaningUp = useRef<boolean>(false);

  const attemptSendOffer = useCallback(async () => {
    if (!isInitiator) return;
    if (!pcRef.current) return;
    if (!p2ReadyForOfferRef.current) return;
    if (offerSentRef.current) return;

    try {
      offerSentRef.current = true;
      console.log('[IOS VOICE] attemptSendOffer STARTED');
      const offer = await pcRef.current.createOffer();
      await pcRef.current.setLocalDescription(offer);
      console.log(`[IOS VOICE] LocalDescription SET (Offer). signalingState: ${pcRef.current.signalingState}`);
      
      if (socket) {
        socket.emit('webrtc_offer', {
          roomId,
          from: playerId,
          sdp: offer.sdp
        });
        console.log('[IOS VOICE] OFFER SENT');
      }
    } catch (err) {
      console.error('[IOS VOICE] Error creating offer:', err);
    }
  }, [isInitiator, socket, roomId, playerId]);

  // Initialize Audio & PeerConnection
  const initWebRTC = useCallback(async () => {
    if (pcRef.current) return; // Already initialized
    if (isCleaningUp.current) return;
    
    console.log(`[IOS VOICE] initWebRTC called. isActive: ${isActive}, isInitiator: ${isInitiator}`);
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error('[IOS VOICE] navigator.mediaDevices.getUserMedia NOT SUPPORTED. HTTPS required.');
      setVoiceState('no-permission');
      return;
    }

    try {
      setVoiceState('requesting');
      console.log('[IOS VOICE] getUserMedia START (audio only)');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });
      console.log('[IOS VOICE] getUserMedia SUCCESS');
      
      localStreamRef.current = stream;
      
      // Microphone MUST start OFF (Muted = true initially)
      stream.getAudioTracks().forEach(track => {
        track.enabled = false;
        console.log(`[IOS VOICE] Track initialized to disabled (muted): ${track.enabled}`);
      });
      setIsMuted(true);

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });
      console.log('[IOS VOICE] RTCPeerConnection created');
      pcRef.current = pc;
      iceCandidateQueue.current = [];
      p2ReadyForOfferRef.current = false;
      offerSentRef.current = false;

      // Add local tracks
      stream.getTracks().forEach(track => {
        console.log(`[IOS VOICE] pc.addTrack: ${track.kind}`);
        pc.addTrack(track, stream);
      });

      // Listen for remote tracks
      pc.ontrack = (event) => {
        console.log('[IOS VOICE] pc.ontrack EVENT FIRED');
        if (event.streams && event.streams[0]) {
          console.log('[IOS VOICE] remote stream assigned (streams[0])');
          setRemoteStream(event.streams[0]);
        } else {
          console.log('[IOS VOICE] remote stream assigned (fallback new MediaStream)');
          setRemoteStream(new MediaStream([event.track]));
        }
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          console.log('[IOS VOICE] pc.onicecandidate -> EMIT webrtc_ice_candidate');
          socket.emit('webrtc_ice_candidate', {
            roomId,
            from: playerId,
            candidate: event.candidate
          });
        }
      };

      // Connection state monitors
      pc.oniceconnectionstatechange = () => {
        console.log(`[IOS VOICE] pc.oniceconnectionstatechange: ${pc.iceConnectionState}`);
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          setVoiceState('connected');
        } else if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
          // It might just be temporarily disconnected, but failed means it's dead.
          if (pc.iceConnectionState === 'failed') setVoiceState('error');
        }
      };

      pc.onconnectionstatechange = () => {
        console.log(`[IOS VOICE] pc.onconnectionstatechange: ${pc.connectionState}`);
        if (pc.connectionState === 'connected') {
          setVoiceState('connected');
        } else if (pc.connectionState === 'failed') {
          setVoiceState('error');
        }
      };

      pc.onsignalingstatechange = () => {
        console.log(`[IOS VOICE] pc.onsignalingstatechange: ${pc.signalingState}`);
      };

      setVoiceState('connecting');

      // P2 signals readiness so P1 can send offer safely
      if (!isInitiator && socket) {
        console.log('[IOS VOICE] Non-initiator sending ready_for_offer');
        socket.emit('ready_for_offer', {
          roomId,
          from: playerId
        });
      } else if (isInitiator && p2ReadyForOfferRef.current) {
        attemptSendOffer();
      }

    } catch (err: any) {
      console.error('[IOS VOICE] Error accessing microphone:', err);
      setVoiceState('no-permission');
    }
  }, [roomId, playerId, socket, isInitiator, attemptSendOffer, isActive]);

  // Clean up WebRTC
  const cleanupWebRTC = useCallback(() => {
    console.log('[IOS VOICE] cleanupWebRTC called');
    isCleaningUp.current = true;
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.enabled = false;
        track.stop();
      });
      localStreamRef.current = null;
    }
    
    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.oniceconnectionstatechange = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.onsignalingstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    
    p2ReadyForOfferRef.current = false;
    offerSentRef.current = false;
    iceCandidateQueue.current = [];
    setRemoteStream(null);
    setVoiceState('idle');
    isCleaningUp.current = false;
  }, []);

  // Handle Activation/Deactivation based on Room State
  useEffect(() => {
    if (isActive) {
      initWebRTC();
    } else {
      cleanupWebRTC();
    }
    // We intentionally DO NOT return cleanupWebRTC() here for normal unmounts
    // unless the room is actually deactivated. React strict mode or minor updates
    // should not tear down the connection.
  }, [isActive, initWebRTC, cleanupWebRTC]);

  // Run cleanup ONLY on full unmount to prevent race conditions on simple re-renders
  useEffect(() => {
    return () => cleanupWebRTC();
  }, [cleanupWebRTC]);

  // Handle Socket Signaling
  useEffect(() => {
    if (!socket) return;

    const handleReadyForOffer = (data: { roomId: string, from: string }) => {
      if (data.from === playerId) return;
      if (isInitiator) {
        console.log('[IOS VOICE] ready_for_offer RECEIVED');
        p2ReadyForOfferRef.current = true;
        attemptSendOffer();
      }
    };

    const handleOffer = async (data: { roomId: string, sdp: string, from: string }) => {
      if (data.from === playerId) return;
      console.log('[IOS VOICE] webrtc_offer RECEIVED');
      const pc = pcRef.current;
      if (!pc) {
        console.warn('[IOS VOICE] PeerConnection not initialized yet when offer received');
        return;
      }
      
      try {
        await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: data.sdp }));
        console.log(`[IOS VOICE] REMOTE DESCRIPTION SET (Offer). signalingState: ${pc.signalingState}`);
        
        while (iceCandidateQueue.current.length > 0) {
          const candidate = iceCandidateQueue.current.shift();
          if (candidate) {
            console.log('[IOS VOICE] Processing queued ICE candidate');
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          }
        }

        console.log('[IOS VOICE] ANSWER CREATED (creating...)');
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        console.log(`[IOS VOICE] ANSWER CREATED and LocalDescription set. signalingState: ${pc.signalingState}`);
        
        socket.emit('webrtc_answer', {
          roomId,
          from: playerId,
          sdp: answer.sdp
        });
        console.log('[IOS VOICE] webrtc_answer SENT');
      } catch (e) {
        console.error('[IOS VOICE] handleOffer error', e);
      }
    };

    const handleAnswer = async (data: { roomId: string, sdp: string, from: string }) => {
      if (data.from === playerId) return;
      console.log('[IOS VOICE] webrtc_answer RECEIVED');
      const pc = pcRef.current;
      if (!pc) return;
      
      try {
        await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: data.sdp }));
        console.log(`[IOS VOICE] REMOTE DESCRIPTION SET (Answer). signalingState: ${pc.signalingState}`);
        
        while (iceCandidateQueue.current.length > 0) {
          const candidate = iceCandidateQueue.current.shift();
          if (candidate) {
            console.log('[IOS VOICE] Processing queued ICE candidate');
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          }
        }
      } catch (e) {
        console.error('[IOS VOICE] handleAnswer error', e);
      }
    };

    const handleIceCandidate = async (data: { roomId: string, candidate: any, from: string }) => {
      if (data.from === playerId) return;
      console.log('[IOS VOICE] webrtc_ice_candidate RECEIVED');
      const pc = pcRef.current;
      if (!pc) {
        console.log('[IOS VOICE] Queuing ICE candidate (No PC yet)');
        iceCandidateQueue.current.push(data.candidate);
        return;
      }
      
      if (pc.remoteDescription) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          console.log('[IOS VOICE] ICE candidate processed directly');
        } catch (e) {
          console.error('[IOS VOICE] Error adding ICE candidate directly:', e);
        }
      } else {
        console.log('[IOS VOICE] Queuing ICE candidate (No remoteDescription yet)');
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

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const nextMuted = !prev;
      console.log(`[IOS VOICE] Toggling mute state to: ${nextMuted}`);
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach(track => {
          track.enabled = !nextMuted;
          console.log(`[IOS VOICE] Track enabled set to: ${track.enabled}`);
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
    retryAccess: initWebRTC
  };
};
