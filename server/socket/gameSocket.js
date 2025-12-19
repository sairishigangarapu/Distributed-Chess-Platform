const User = require('../models/User');
const { updateGameStats } = require('../controllers/userController');

/**
 * Game Socket Handler
 * Handles all game-related socket events
 */
module.exports = (io, socket, gameManager) => {
    /**
     * Handle player joining a game
     */
    socket.on('joinGame', async ({ userId, gameId }) => {
        try {
            // Validate user
            const user = await User.findById(userId).select('-password');
            if (!user) {
                socket.emit('error', 'User not found. Please log in again.');
                return;
            }

            // Create player object
            const player = {
                socketId: socket.id,
                oderId: oderId,
                username: user.username
            };

            // Join or create game
            const result = gameManager.joinGame(player, gameId);

            if (!result.success) {
                socket.emit('error', result.error);
                return;
            }

            const game = result.game;
            
            // Join the socket room for this game
            socket.join(game.id);
            socket.gameId = game.id;
            socket.userId = oderId;

            // Emit role to the joining player
            if (result.role === 'spectator') {
                socket.emit('spectatorRole');
            } else {
                socket.emit('playerRole', result.role);
            }

            // Send current board state
            socket.emit('boardState', game.chess.fen());
            
            // Send game status
            const status = result.waiting 
                ? 'Waiting for opponent...' 
                : `Turn: ${game.chess.turn() === 'w' ? 'White' : 'Black'}`;
            socket.emit('gameStatus', status);

            // If game just started, notify the white player
            if (result.gameStarted) {
                io.to(game.id).emit('gameStarted', {
                    white: game.white.username,
                    black: game.black.username
                });
                io.to(game.id).emit('gameStatus', "Turn: White");
            }

            console.log(`Player ${user.username} joined game ${game.id} as ${result.role}`);

        } catch (error) {
            console.error('Error in joinGame:', error);
            socket.emit('error', 'Failed to join game. Try refreshing the page.');
        }
    });

    /**
     * Handle move events
     */
    socket.on('move', async (move) => {
        try {
            const gameId = socket.gameId;
            const userId = socket.userId;

            if (!gameId || !userId) {
                socket.emit('invalidMove', { message: 'Not connected to a game.' });
                return;
            }

            const result = gameManager.makeMove(gameId, oderId, move);

            if (!result.success) {
                socket.emit('invalidMove', { message: result.error });
                return;
            }

            // Broadcast the move and new board state
            io.to(gameId).emit('move', result.move);
            io.to(gameId).emit('boardState', result.fen);
            io.to(gameId).emit('gameStatus', result.status.message);

            // Handle game over
            if (result.status.gameOver) {
                const game = gameManager.getGame(gameId);
                
                // Update player stats
                if (result.status.result === 'checkmate') {
                    const winner = result.status.winner === 'White' ? game.white : game.black;
                    const loser = result.status.winner === 'White' ? game.black : game.white;
                    await updateGameStats(winner?.oderId, loser?.oderId);
                } else {
                    // Draw
                    await updateGameStats(game.white?.oderId, game.black?.oderId, true);
                }

                io.to(gameId).emit('gameOver', result.status.message);
                
                // Cleanup after a delay to allow clients to see the result
                setTimeout(() => {
                    gameManager.cleanupGame(gameId);
                }, 5000);
            }

        } catch (error) {
            console.error('Error processing move:', error);
            socket.emit('error', 'An error occurred while processing your move.');
        }
    });

    /**
     * Handle resignation
     */
    socket.on('resign', async () => {
        try {
            const gameId = socket.gameId;
            const userId = socket.userId;

            if (!gameId || !userId) return;

            const game = gameManager.getGame(gameId);
            if (!game) return;

            const isWhite = game.white?.oderId === oderId;
            const winner = isWhite ? game.black : game.white;
            const loser = isWhite ? game.white : game.black;
            const winnerColor = isWhite ? 'Black' : 'White';

            await updateGameStats(winner?.oderId, loser?.oderId);

            io.to(gameId).emit('gameStatus', `${winnerColor} wins by resignation!`);
            io.to(gameId).emit('gameOver', `${winnerColor} wins by resignation!`);

            game.status = 'finished';
            setTimeout(() => {
                gameManager.cleanupGame(gameId);
            }, 5000);

        } catch (error) {
            console.error('Error handling resignation:', error);
        }
    });

    /**
     * Handle disconnection
     */
    socket.on('disconnect', async () => {
        try {
            const result = gameManager.handleDisconnect(socket.id, socket.userId);

            if (result.gameEnded && result.gameId) {
                // Update stats: winner gets the win, disconnected player gets a loss
                await updateGameStats(result.winner?.oderId, result.loser?.oderId);

                const winnerColor = result.winner === result.winner ? 
                    (gameManager.getGame(result.gameId)?.white === result.winner ? 'White' : 'Black') : 'Unknown';
                
                io.to(result.gameId).emit('gameStatus', `Opponent disconnected. ${result.winner?.username || winnerColor} wins!`);
                io.to(result.gameId).emit('gameOver', `Opponent disconnected. ${result.winner?.username || winnerColor} wins!`);

                setTimeout(() => {
                    gameManager.cleanupGame(result.gameId);
                }, 5000);
            }

            console.log(`Socket ${socket.id} disconnected`);

        } catch (error) {
            console.error('Error handling disconnect:', error);
        }
    });
};
