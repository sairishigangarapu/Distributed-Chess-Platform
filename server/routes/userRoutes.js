const express = require('express');
const router = express.Router();
const { 
    getProfile, 
    getProfileUploadPage,
    uploadProfilePic, 
    getAllUsers, 
    getLeaderboard,
    getUserById 
} = require('../controllers/userController');
const { isLoggedIn } = require('../middleware/authMiddleware');
const upload = require('../config/multer');

// All routes require authentication
router.use(isLoggedIn);

// @route   GET /profile
// @desc    Get current user's profile
router.get('/profile', getProfile);

// @route   GET /profile/upload
// @desc    Get profile picture upload page
router.get('/profile/upload', getProfileUploadPage);

// @route   POST /upload
// @desc    Upload profile picture
router.post('/upload', upload.single('image'), uploadProfilePic);

// @route   GET /users
// @desc    Get all users
router.get('/users', getAllUsers);

// @route   GET /leaderboard
// @desc    Get leaderboard
router.get('/leaderboard', getLeaderboard);

// API Routes (for future React frontend)
// @route   GET /api/users/:id
// @desc    Get user by ID
router.get('/api/users/:id', getUserById);

module.exports = router;
