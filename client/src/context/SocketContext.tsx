import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

// Simple UUID generator for persistent session
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function getStoredPlayerId() {
  let id = localStorage.getItem('duoplay_player_id');
  if (!id) {
    id = generateUUID();
    localStorage.setItem('duoplay_player_id', id);
  }
  return id;
}

// Production: use the Render backend URL from VITE_SERVER_URL.
// Local development: fall back to the backend on port 3001.
const SOCKET_URL = import.meta.env.VITE_SERVER_URL || `http://${window.location.hostname}:3001`;

interface SocketContextProps {
  socket: Socket | null;
  isConnected: boolean;
  playerId: string;
}

const SocketContext = createContext<SocketContextProps>({
  socket: null,
  isConnected: false,
  playerId: '',
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [playerId] = useState(getStoredPlayerId());

  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to socket server');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from socket server');
    });

    return () => {
      newSocket.close();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected, playerId }}>
      {children}
    </SocketContext.Provider>
  );
};
