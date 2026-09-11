import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { SocketManager } from './socket/SocketManager';

dotenv.config();

const app = express();
app.use(cors());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'duoplay-server'
  });
});

app.get('/', (req, res) => {
  res.status(200).send('DuoPlay API is running. Socket.io is active.');
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*', // Allows connections from the frontend on Render
    methods: ['GET', 'POST']
  }
});

new SocketManager(io);

const PORT = process.env.PORT || 3001;

// Escuchar en 0.0.0.0 es recomendado para servicios alojados como Render
httpServer.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
