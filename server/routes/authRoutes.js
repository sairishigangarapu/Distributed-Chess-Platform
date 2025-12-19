const express = require('express');
const router = express.Router();
const { register, login, logout, getMe } = require('../controllers/authController');
const { isLoggedIn } = require('../middleware/authMiddleware');
const { validateRegistration, validateLogin, sanitizeInput } = require('../middleware/validation');

// @route   GET /register
// @desc    Render registration page
router.get('/register', (req, res) => {
    res.render('register');
});

// @route   POST /register
// @desc    Register a new user
router.post('/register', sanitizeInput, validateRegistration, register);

// @route   GET /login
// @desc    Render login page
router.get('/login', (req, res) => {
    res.render('login');
});

// @route   POST /login
// @desc    Login user
router.post('/login', sanitizeInput, validateLogin, login);

// @route   GET /logout
// @desc    Logout user
router.get('/logout', logout);

// API Routes (for future React frontend)
// @route   GET /api/auth/me
// @desc    Get current user
router.get('/api/auth/me', isLoggedIn, getMe);

module.exports = router;
