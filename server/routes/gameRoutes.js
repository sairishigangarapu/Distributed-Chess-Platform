const express = require('express');
const router = express.Router();
const { 
    getDashboard, 
    getPlayPage, 
    getChatPage, 
    getSpectatePage,
    spectateGame 
} = require('../controllers/gameController');
const { isLoggedIn } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(isLoggedIn);

// @route   GET /dashboard
// @desc    Get dashboard page
router.get('/dashboard', getDashboard);

// @route   GET /play
// @desc    Get chess game page
router.get('/play', getPlayPage);

// @route   GET /chat
// @desc    Get chat page
router.get('/chat', getChatPage);

// @route   GET /spectate
// @desc    Get list of active games to spectate
router.get('/spectate', getSpectatePage);

// @route   GET /spectate/:gameId
// @desc    Spectate a specific game
router.get('/spectate/:gameId', spectateGame);

module.exports = router;
