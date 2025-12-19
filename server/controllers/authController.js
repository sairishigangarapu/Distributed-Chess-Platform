const bcrypt = require('bcrypt');
const User = require('../models/User');
const { generateToken } = require('../middleware/authMiddleware');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = asyncHandler(async (req, res, next) => {
    const { username, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ 
        $or: [{ email }, { username }] 
    });

    if (existingUser) {
        if (existingUser.email === email) {
            throw new AppError('This email is already registered. Try a different one.', 409);
        }
        throw new AppError('This username is already taken. Try a different one.', 409);
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
        username,
        email,
        password: hashedPassword,
        profilepic: 'default.png',
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        winRate: 0
    });

    // Generate token
    const token = generateToken(user);

    // Set cookie
    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    // Redirect for browser, JSON for API
    if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(201).json({
            success: true,
            message: 'Registration successful',
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    }

    res.redirect('/dashboard');
});

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
        throw new AppError('Invalid email or password.', 401);
    }

    // Validate password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
        throw new AppError('Invalid email or password.', 401);
    }

    // Generate token
    const token = generateToken(user);

    // Set cookie
    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    // Redirect for browser, JSON for API
    if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(200).json({
            success: true,
            message: 'Login successful',
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    }

    res.redirect('/dashboard');
});

/**
 * @desc    Logout user
 * @route   GET /api/auth/logout
 * @access  Private
 */
const logout = (req, res) => {
    res.cookie('token', '', { 
        expires: new Date(0), 
        httpOnly: true 
    });

    if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(200).json({
            success: true,
            message: 'Logged out successfully'
        });
    }

    res.redirect('/login');
};

/**
 * @desc    Get current logged in user
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.user.userid).select('-password');
    
    if (!user) {
        throw new AppError('User not found.', 404);
    }

    res.status(200).json({
        success: true,
        user
    });
});

module.exports = {
    register,
    login,
    logout,
    getMe
};
