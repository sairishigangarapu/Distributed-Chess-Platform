const User = require('../models/User');

/**
 * Chat Socket Handler
 * Handles all chat-related socket events
 */
module.exports = (io, socket, chatService) => {
    /**
     * Handle sending a message
     */
    socket.on('sendMessage', async ({ userId, message }) => {
        try {
            // Validate user
            const user = await User.findById(userId).select('username profilepic');
            if (!user) {
                socket.emit('chatError', 'User not found. Please log in again.');
                return;
            }

            // Validate message
            if (!message || typeof message !== 'string' || message.trim().length === 0) {
                socket.emit('chatError', 'Message cannot be empty.');
                return;
            }

            if (message.length > 500) {
                socket.emit('chatError', 'Message is too long. Maximum 500 characters.');
                return;
            }

            // Filter and sanitize the message
            const { isClean, cleanMessage, violations } = chatService.filterMessage(message);

            if (!isClean) {
                socket.emit('chatError', 'Please keep the chat friendly. Inappropriate language is not allowed.');
                console.log(`Filtered message from ${user.username}: ${violations.join(', ')}`);
                return;
            }

            // Format the message
            const chatMessage = chatService.formatMessage(user, cleanMessage);

            // Broadcast to all connected clients
            // If using game rooms, could use io.to(gameId).emit()
            io.emit('receiveMessage', chatMessage);

            console.log(`Chat: ${user.username}: ${cleanMessage.substring(0, 50)}...`);

        } catch (error) {
            console.error('Error sending message:', error);
            socket.emit('chatError', 'Failed to send message. Please try again.');
        }
    });

    /**
     * Handle sending a message to a specific game room
     */
    socket.on('sendGameMessage', async ({ userId, message, gameId }) => {
        try {
            const user = await User.findById(userId).select('username');
            if (!user) {
                socket.emit('chatError', 'User not found.');
                return;
            }

            if (!message || message.trim().length === 0) {
                return;
            }

            const { isClean, cleanMessage } = chatService.filterMessage(message);

            if (!isClean) {
                socket.emit('chatError', 'Please keep the chat friendly.');
                return;
            }

            const chatMessage = chatService.formatMessage(user, cleanMessage);

            // Send only to the game room
            io.to(gameId).emit('receiveGameMessage', chatMessage);

        } catch (error) {
            console.error('Error sending game message:', error);
            socket.emit('chatError', 'Failed to send message.');
        }
    });

    /**
     * Handle typing indicator
     */
    socket.on('typing', ({ username, gameId }) => {
        if (gameId) {
            socket.to(gameId).emit('userTyping', { username });
        }
    });

    /**
     * Handle stop typing indicator
     */
    socket.on('stopTyping', ({ username, gameId }) => {
        if (gameId) {
            socket.to(gameId).emit('userStoppedTyping', { username });
        }
    });
};
