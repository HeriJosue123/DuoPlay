"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const SocketManager_1 = require("./socket/SocketManager");
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
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
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: '*', // Allows connections from the frontend on Render
        methods: ['GET', 'POST']
    }
});
new SocketManager_1.SocketManager(io);
const PORT = process.env.PORT || 3001;
// Escuchar en 0.0.0.0 es recomendado para servicios alojados como Render
httpServer.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
