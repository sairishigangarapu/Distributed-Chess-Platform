/**
 * Super Chess Server
 * Entry point for the application
 */

// Load environment variables first
require('dotenv').config();

const http = require('http');
const { Server } = require('socket.io');

// Import app and database
const createApp = require('./app');
const connectDB = require('./config/db');
const initializeSocket = require('./socket');

// Create Express app
const app = createApp();

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
});

// Initialize socket handlers
initializeSocket(io, app);

// Server configuration
const PORT = process.env.PORT || 3000;

/**
 * Start the server
 */
const startServer = async () => {
    try {
        // Connect to database
        await connectDB();

        // Start listening
        server.listen(PORT, () => {
            console.log(`
╔════════════════════════════════════════════╗
║                                            ║
║   ♟️  Super Chess Server                    ║
║                                            ║
║   Server running on port ${PORT}              ║
║   Environment: ${process.env.NODE_ENV || 'development'}            ║
║                                            ║
║   http://localhost:${PORT}                    ║
║                                            ║
╚════════════════════════════════════════════╝
            `);
        });

        // Handle server errors
        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                console.error(`Port ${PORT} is already in use. Please choose a different port.`);
            } else {
                console.error('Server error:', error);
            }
            process.exit(1);
        });

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Graceful shutdown
const gracefulShutdown = (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    
    server.close(() => {
        console.log('HTTP server closed.');
        
        // Close database connection
        const mongoose = require('mongoose');
        mongoose.connection.close(false, () => {
            console.log('MongoDB connection closed.');
            process.exit(0);
        });
    });

    // Force close after 10 seconds
    setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Start the server
startServer();

module.exports = { app, server, io };
