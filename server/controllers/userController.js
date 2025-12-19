const User = require('../models/User');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

/**
 * @desc    Get user profile
 * @route   GET /api/users/profile
 * @access  Private
 */
const getProfile = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.user.userid).select('-password');
    
    if (!user) {
        throw new AppError('User not found.', 404);
    }

    // For browser requests, render the profile page
    if (!req.xhr && !req.headers.accept?.includes('application/json')) {
        return res.render('profile', { user });
    }

    res.status(200).json({
        success: true,
        user
    });
});

/**
 * @desc    Get profile upload page
 * @route   GET /api/users/profile/upload
 * @access  Private
 */
const getProfileUploadPage = (req, res) => {
    res.render('profileupload');
};

/**
 * @desc    Upload profile picture
 * @route   POST /api/users/upload
 * @access  Private
 */
const uploadProfilePic = asyncHandler(async (req, res, next) => {
    if (!req.file) {
        throw new AppError('No image file uploaded. Please choose a JPG or PNG.', 400);
    }

    const user = await User.findById(req.user.userid);
    if (!user) {
        throw new AppError('User not found.', 404);
    }

    // Update profile picture
    user.profilepic = req.file.filename;
    await user.save();

    if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(200).json({
            success: true,
            message: 'Profile picture updated successfully',
            profilepic: user.profilepic
        });
    }

    res.redirect('/profile');
});

/**
 * @desc    Get all users
 * @route   GET /api/users
 * @access  Private
 */
const getAllUsers = asyncHandler(async (req, res, next) => {
    const users = await User.find({}, 'username email profilepic createdAt')
        .sort({ createdAt: -1 });

    if (!req.xhr && !req.headers.accept?.includes('application/json')) {
        return res.render('users', { users });
    }

    res.status(200).json({
        success: true,
        count: users.length,
        users
    });
});

/**
 * @desc    Get leaderboard
 * @route   GET /api/users/leaderboard
 * @access  Private
 */
const getLeaderboard = asyncHandler(async (req, res, next) => {
    const users = await User.find({ gamesPlayed: { $gt: 0 } })
        .select('username profilepic gamesPlayed wins losses draws winRate')
        .sort({ winRate: -1, wins: -1, gamesPlayed: -1 })
        .limit(100);

    if (!req.xhr && !req.headers.accept?.includes('application/json')) {
        return res.render('leaderboard', { users });
    }

    res.status(200).json({
        success: true,
        count: users.length,
        leaderboard: users
    });
});

/**
 * @desc    Get user by ID
 * @route   GET /api/users/:id
 * @access  Private
 */
const getUserById = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
        throw new AppError('User not found.', 404);
    }

    res.status(200).json({
        success: true,
        user
    });
});

/**
 * @desc    Update user stats (internal use)
 * @param   {String} winnerId - Winner's user ID
 * @param   {String} loserId - Loser's user ID  
 * @param   {Boolean} isDraw - Whether the game was a draw
 */
const updateGameStats = async (winnerId, loserId, isDraw = false) => {
    try {
        if (isDraw) {
            if (winnerId) {
                const player1 = await User.findById(winnerId);
                if (player1) await player1.recordDraw();
            }
            if (loserId) {
                const player2 = await User.findById(loserId);
                if (player2) await player2.recordDraw();
            }
        } else {
            if (winnerId) {
                const winner = await User.findById(winnerId);
                if (winner) await winner.recordWin();
            }
            if (loserId) {
                const loser = await User.findById(loserId);
                if (loser) await loser.recordLoss();
            }
        }
    } catch (error) {
        console.error('Failed to update game stats:', error);
    }
};

module.exports = {
    getProfile,
    getProfileUploadPage,
    uploadProfilePic,
    getAllUsers,
    getLeaderboard,
    getUserById,
    updateGameStats
};
