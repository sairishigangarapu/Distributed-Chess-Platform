const GameManager = require('../services/GameManager');
const ChatService = require('../services/ChatService');
const gameSocketHandler = require('./gameSocket');
const chatSocketHandler = require('./chatSocket');
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');

/**
 * Main Socket Handler
 * Initializes socket.io and registers all event handlers
 */
const initializeSocket = (io, app) => {
    // Initialize services
    const gameManager = new GameManager();
    const chatService = new ChatService();

    // Make gameManager available to routes (for spectate list)
    app.set('gameManager', gameManager);

    // Initialize Redis Pub/Sub adapter
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const pubClient = createClient({ url: redisUrl });
    const subClient = pubClient.duplicate();

    Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
        io.adapter(createAdapter(pubClient, subClient));
        console.log(`Socket.IO Redis Adapter initialized (${redisUrl})`);
    }).catch(err => {
        console.error('Failed to initialize Redis Adapter:', err);
    });

    // Connection handler
    io.on('connection', (socket) => {
        console.log(`New connection: ${socket.id}`);

        // Register game handlers
        gameSocketHandler(io, socket, gameManager);

        // Register chat handlers
        chatSocketHandler(io, socket, chatService);

        // Ping/pong for connection health
        socket.on('ping', () => {
            socket.emit('pong');
        });

        // Error handling
        socket.on('error', (error) => {
            console.error(`Socket error for ${socket.id}:`, error);
        });
    });

    // Periodic cleanup of stale games
    setInterval(() => {
        const now = Date.now();
        const staleThreshold = 2 * 60 * 60 * 1000; // 2 hours

        for (const [gameId, game] of gameManager.games) {
            if (game.status === 'finished' || 
                (game.status === 'waiting' && now - game.createdAt.getTime() > staleThreshold)) {
                gameManager.cleanupGame(gameId);
                console.log(`Cleaned up stale game: ${gameId}`);
            }
        }
    }, 30 * 60 * 1000); // Run every 30 minutes

    console.log('Socket.io initialized');
    
    return { gameManager, chatService };
};

module.exports = initializeSocket;
