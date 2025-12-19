const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @desc    Get dashboard page
 * @route   GET /dashboard
 * @access  Private
 */
const getDashboard = (req, res) => {
    res.render('dashboard');
};

/**
 * @desc    Get game play page
 * @route   GET /play
 * @access  Private
 */
const getPlayPage = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.user.userid).select('-password');
    res.render('chess', { 
        title: 'Chess Game', 
        user, 
        isSpectator: false 
    });
});

/**
 * @desc    Get chat page
 * @route   GET /chat
 * @access  Private
 */
const getChatPage = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.user.userid).select('-password');
    res.render('chat', { user });
});

/**
 * @desc    Get spectate list page
 * @route   GET /spectate
 * @access  Private
 */
const getSpectatePage = asyncHandler(async (req, res, next) => {
    // Games will be injected from the GameManager service
    const activeGames = req.app.get('gameManager')?.getActiveGames() || [];
    res.render('spectate', { activeGames });
});

/**
 * @desc    Spectate a specific game
 * @route   GET /spectate/:gameId
 * @access  Private
 */
const spectateGame = asyncHandler(async (req, res, next) => {
    const { gameId } = req.params;
    const gameManager = req.app.get('gameManager');
    
    if (!gameManager || !gameManager.gameExists(gameId)) {
        const err = new Error('This game does not exist or has ended.');
        err.status = 404;
        throw err;
    }

    const user = await User.findById(req.user.userid).select('-password');
    res.render('chess', { 
        title: 'Spectate Game', 
        user, 
        isSpectator: true, 
        gameId 
    });
});

module.exports = {
    getDashboard,
    getPlayPage,
    getChatPage,
    getSpectatePage,
    spectateGame
};
