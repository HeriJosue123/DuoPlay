import { useEffect, useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';

export type VoiceState = 'idle' | 'requesting' | 'connecting' | 'connected' | 'error' | 'no-permission';

interface UseVoiceChatProps {
  roomId: string;
  playerId: string;
  socket: Socket | null;
  isActive: boolean;
  isInitiator: boolean;
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
      console.log('[WebRTC] Creating offer...');
      const offer = await pcRef.current.createOffer();
      await pcRef.current.setLocalDescription(offer);
      console.log('[WebRTC] Offer created and local description set. Sending to peer...');
      
      if (socket) {
        socket.emit('webrtc_offer', {
          roomId,
          from: playerId,
          sdp: offer.sdp
        });
      }
    } catch (err) {
      console.error('[WebRTC] Error creating/sending offer:', err);
    }
  }, [isInitiator, socket, roomId, playerId]);

  // Initialize Audio & PeerConnection
  const initWebRTC = useCallback(async () => {
    if (pcRef.current) return; // Already initialized
    if (isCleaningUp.current) return;
    
    console.log('[WebRTC] Initializing WebRTC...');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error('[WebRTC] getUserMedia not supported on this browser.');
      setVoiceState('no-permission');
      return;
    }

    try {
      setVoiceState('requesting');
      console.log('[WebRTC] Requesting microphone permission...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });
      console.log('[WebRTC] Microphone permission granted. Stream obtained.');
      
      localStreamRef.current = stream;
      
      // Microphone MUST start OFF (Muted = true initially)
      stream.getAudioTracks().forEach(track => {
        track.enabled = false;
      });
      setIsMuted(true);
      
      if (socket) {
        socket.emit('voice_status', { roomId, playerId, isMuted: true });
      }

      console.log('[WebRTC] Creating RTCPeerConnection...');
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

      // Listen for remote tracks
      pc.ontrack = (event) => {
        console.log('[WebRTC] Remote track received:', event);
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        } else {
          setRemoteStream(new MediaStream([event.track]));
        }
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          console.log('[WebRTC] Local ICE candidate generated, sending to peer...');
          socket.emit('webrtc_ice_candidate', {
            roomId,
            from: playerId,
            candidate: event.candidate
          });
        }
      };

      // Connection state monitors
      pc.oniceconnectionstatechange = () => {
        console.log(`[WebRTC] ICE Connection State changed to: ${pc.iceConnectionState}`);
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          setVoiceState('connected');
        } else if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
          // It might just be temporarily disconnected, but failed means it's dead.
          if (pc.iceConnectionState === 'failed') setVoiceState('error');
        }
      };

      pc.onconnectionstatechange = () => {
        console.log(`[WebRTC] Connection State changed to: ${pc.connectionState}`);
        if (pc.connectionState === 'connected') {
          setVoiceState('connected');
        } else if (pc.connectionState === 'failed') {
          setVoiceState('error');
        }
      };

      pc.onsignalingstatechange = () => {
        console.log(`[WebRTC] Signaling State changed to: ${pc.signalingState}`);
      };

      setVoiceState('connecting');

      // P2 signals readiness so P1 can send offer safely
      if (!isInitiator && socket) {
        console.log('[WebRTC] I am NOT the initiator. Sending ready_for_offer...');
        socket.emit('ready_for_offer', {
          roomId,
          from: playerId
        });
      } else if (isInitiator && p2ReadyForOfferRef.current) {
        console.log('[WebRTC] I am the initiator and peer is ready. Triggering offer...');
        attemptSendOffer();
      }

    } catch (err: any) {
      console.error('[WebRTC] Error acquiring microphone:', err);
      setVoiceState('no-permission');
    }
  }, [roomId, playerId, socket, isInitiator, attemptSendOffer, isActive]);

  // Clean up WebRTC
  const cleanupWebRTC = useCallback(() => {
    isCleaningUp.current = true;
    console.log('[WebRTC] Cleaning up WebRTC...');
    
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
      console.log('[WebRTC] Received ready_for_offer from peer.');
      if (isInitiator) {
        p2ReadyForOfferRef.current = true;
        attemptSendOffer();
      }
    };

    const handleOffer = async (data: { roomId: string, sdp: string, from: string }) => {
      if (data.from === playerId) return;
      console.log('[WebRTC] Received offer from peer.');
      const pc = pcRef.current;
      if (!pc) {
        console.warn('[WebRTC] Received offer but RTCPeerConnection is null.');
        return;
      }
      
      try {
        await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: data.sdp }));
        console.log('[WebRTC] Remote description (offer) set.');
        
        while (iceCandidateQueue.current.length > 0) {
          const candidate = iceCandidateQueue.current.shift();
          if (candidate) {
            console.log('[WebRTC] Processing queued ICE candidate...');
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          }
        }

        console.log('[WebRTC] Creating answer...');
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        console.log('[WebRTC] Local description (answer) set. Sending to peer...');
        
        socket.emit('webrtc_answer', {
          roomId,
          from: playerId,
          sdp: answer.sdp
        });
      } catch (e) {
        console.error('[WebRTC] Error handling offer:', e);
      }
    };

    const handleAnswer = async (data: { roomId: string, sdp: string, from: string }) => {
      if (data.from === playerId) return;
      console.log('[WebRTC] Received answer from peer.');
      const pc = pcRef.current;
      if (!pc) return;
      
      try {
        await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: data.sdp }));
        console.log('[WebRTC] Remote description (answer) set.');
        
        while (iceCandidateQueue.current.length > 0) {
          const candidate = iceCandidateQueue.current.shift();
          if (candidate) {
            console.log('[WebRTC] Processing queued ICE candidate...');
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          }
        }
      } catch (e) {
        console.error('[WebRTC] Error handling answer:', e);
      }
    };

    const handleIceCandidate = async (data: { roomId: string, candidate: any, from: string }) => {
      if (data.from === playerId) return;
      console.log('[WebRTC] Received ICE candidate from peer.');
      const pc = pcRef.current;
      if (!pc) {
        console.log('[WebRTC] RTCPeerConnection not ready, queueing ICE candidate.');
        iceCandidateQueue.current.push(data.candidate);
        return;
      }
      
      if (pc.remoteDescription) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
          console.error('[WebRTC] Error adding ICE candidate:', e);
        }
      } else {
        console.log('[WebRTC] Remote description not set yet, queueing ICE candidate.');
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
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach(track => {
          track.enabled = !nextMuted;
        });
      }
      
      if (socket) {
        socket.emit('voice_status', { roomId, playerId, isMuted: nextMuted });
      }
      
      return nextMuted;
    });
  }, [socket, roomId, playerId]);

  return {
    voiceState,
    isMuted,
    toggleMute,
    remoteStream,
    retryAccess: initWebRTC
  };
};
