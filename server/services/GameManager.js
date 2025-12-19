const { Chess } = require('chess.js');

/**
 * GameManager - Manages multiple concurrent chess games
 * Solves the single-game limitation of the original implementation
 */
class GameManager {
    constructor() {
        this.games = new Map(); // gameId -> GameState
        this.playerToGame = new Map(); // oderId -> gameId (for quick lookup)
        this.waitingPlayer = null; // Player waiting for an opponent
    }

    /**
     * Create a new game with a host player
     */
    createGame(player) {
        const gameId = this._generateGameId();
        const game = {
            id: gameId,
            chess: new Chess(),
            white: player,
            black: null,
            spectators: new Set(),
            createdAt: new Date(),
            status: 'waiting' // waiting, active, finished
        };

        this.games.set(gameId, game);
        this.playerToGame.set(player.oderId, gameId);
        
        return game;
    }

    /**
     * Join an existing game or create/join matchmaking queue
     */
    joinGame(player, specificGameId = null) {
        // If specific game requested (for rejoining or spectating)
        if (specificGameId) {
            const game = this.games.get(specificGameId);
            if (!game) return { success: false, error: 'Game not found' };
            
            // Check if player was already in this game
            if (game.white?.userId === player.userId) {
                game.white.socketId = player.socketId;
                return { success: true, game, role: 'w' };
            }
            if (game.black?.userId === player.userId) {
                game.black.socketId = player.socketId;
                return { success: true, game, role: 'b' };
            }
            
            // Join as spectator
            game.spectators.add(player.socketId);
            return { success: true, game, role: 'spectator' };
        }

        // Check if player is already in a game
        const existingGameId = this.playerToGame.get(player.userId);
        if (existingGameId) {
            const existingGame = this.games.get(existingGameId);
            if (existingGame && existingGame.status !== 'finished') {
                const role = existingGame.white?.userId === player.userId ? 'w' : 'b';
                return { success: true, game: existingGame, role, rejoined: true };
            }
        }

        // Matchmaking: pair with waiting player or wait
        if (this.waitingPlayer && this.waitingPlayer.userId !== player.userId) {
            // Create game with waiting player as white
            const game = this.createGame(this.waitingPlayer);
            game.black = player;
            game.status = 'active';
            this.playerToGame.set(player.userId, game.id);
            this.waitingPlayer = null;
            
            return { success: true, game, role: 'b', gameStarted: true };
        } else {
            // No one waiting, become the waiting player
            this.waitingPlayer = player;
            const game = this.createGame(player);
            
            return { success: true, game, role: 'w', waiting: true };
        }
    }

    /**
     * Process a move in a game
     */
    makeMove(gameId, playerId, move) {
        const game = this.games.get(gameId);
        if (!game) return { success: false, error: 'Game not found' };

        // Verify it's this player's turn
        const playerRole = this._getPlayerRole(game, playerId);
        if (!playerRole || playerRole === 'spectator') {
            return { success: false, error: 'You are not a player in this game' };
        }

        if (game.chess.turn() !== playerRole) {
            return { success: false, error: "It's not your turn" };
        }

        // Attempt the move
        try {
            const result = game.chess.move(move);
            if (!result) {
                return { success: false, error: 'Invalid move' };
            }

            // Check game status
            const status = this._getGameStatus(game);
            
            return { 
                success: true, 
                move: result, 
                fen: game.chess.fen(),
                status
            };
        } catch (error) {
            return { success: false, error: 'Invalid move format' };
        }
    }

    /**
     * Handle player disconnection
     */
    handleDisconnect(socketId, userId) {
        // Remove from waiting queue
        if (this.waitingPlayer?.socketId === socketId) {
            const gameId = this.playerToGame.get(this.waitingPlayer.userId);
            if (gameId) {
                this.games.delete(gameId);
                this.playerToGame.delete(this.waitingPlayer.userId);
            }
            this.waitingPlayer = null;
            return { gameEnded: false };
        }

        // Find the game this player was in
        const gameId = this.playerToGame.get(userId);
        if (!gameId) return { gameEnded: false };

        const game = this.games.get(gameId);
        if (!game) return { gameEnded: false };

        // Remove from spectators
        game.spectators.delete(socketId);

        // Check if a player disconnected
        let winner = null;
        let loser = null;

        if (game.white?.socketId === socketId) {
            winner = game.black;
            loser = game.white;
            game.status = 'finished';
        } else if (game.black?.socketId === socketId) {
            winner = game.white;
            loser = game.black;
            game.status = 'finished';
        }

        if (game.status === 'finished') {
            return { 
                gameEnded: true, 
                gameId,
                winner,
                loser,
                reason: 'disconnect'
            };
        }

        return { gameEnded: false };
    }

    /**
     * Get game state
     */
    getGame(gameId) {
        return this.games.get(gameId);
    }

    /**
     * Check if game exists
     */
    gameExists(gameId) {
        return this.games.has(gameId);
    }

    /**
     * Get all active games for spectating
     */
    getActiveGames() {
        const activeGames = [];
        for (const [gameId, game] of this.games) {
            if (game.status === 'active') {
                activeGames.push({
                    gameId,
                    white: game.white?.username || 'Unknown',
                    black: game.black?.username || 'Unknown',
                    spectatorCount: game.spectators.size,
                    moveCount: game.chess.history().length
                });
            }
        }
        return activeGames;
    }

    /**
     * Clean up finished game
     */
    cleanupGame(gameId) {
        const game = this.games.get(gameId);
        if (game) {
            if (game.white) this.playerToGame.delete(game.white.userId);
            if (game.black) this.playerToGame.delete(game.black.userId);
            this.games.delete(gameId);
        }
    }

    /**
     * Get game status object
     */
    _getGameStatus(game) {
        const chess = game.chess;
        
        if (chess.isCheckmate()) {
            const winner = chess.turn() === 'w' ? 'Black' : 'White';
            return { 
                gameOver: true, 
                result: 'checkmate', 
                winner,
                message: `Checkmate! ${winner} wins!`
            };
        }
        if (chess.isDraw()) {
            return { 
                gameOver: true, 
                result: 'draw', 
                message: 'Game Over: Draw!' 
            };
        }
        if (chess.isStalemate()) {
            return { 
                gameOver: true, 
                result: 'stalemate', 
                message: 'Game Over: Stalemate!' 
            };
        }
        if (chess.isThreefoldRepetition()) {
            return { 
                gameOver: true, 
                result: 'repetition', 
                message: 'Game Over: Draw by Threefold Repetition!' 
            };
        }
        if (chess.isInsufficientMaterial()) {
            return { 
                gameOver: true, 
                result: 'insufficient', 
                message: 'Game Over: Draw by Insufficient Material!' 
            };
        }
        if (chess.isCheck()) {
            return { 
                gameOver: false, 
                inCheck: true,
                turn: chess.turn(),
                message: `${chess.turn() === 'w' ? 'White' : 'Black'} is in check!`
            };
        }

        return { 
            gameOver: false, 
            turn: chess.turn(),
            message: `Turn: ${chess.turn() === 'w' ? 'White' : 'Black'}`
        };
    }

    /**
     * Get player's role in a game
     */
    _getPlayerRole(game, oderId) {
        if (game.white?.oderId === oderId) return 'w';
        if (game.black?.oderId === oderId) return 'b';
        return 'spectator';
    }

    /**
     * Generate unique game ID
     */
    _generateGameId() {
        return `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

module.exports = GameManager;
