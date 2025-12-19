const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require('cors');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const gameRoutes = require('./routes/gameRoutes');

// Import middleware
const { notFoundHandler, globalErrorHandler } = require('./middleware/errorHandler');

/**
 * Create and configure Express application
 */
const createApp = () => {
    const app = express();

    // ======================
    // MIDDLEWARE
    // ======================

    // CORS configuration
    app.use(cors({
        origin: process.env.CLIENT_URL || 'http://localhost:3000',
        credentials: true
    }));

    // Body parsers
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Cookie parser
    app.use(cookieParser());

    // ======================
    // VIEW ENGINE
    // ======================
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, '../views'));

    // ======================
    // STATIC FILES
    // ======================
    app.use(express.static(path.join(__dirname, '../public')));
    app.use('/images/uploads', express.static(path.join(__dirname, '../public/images/uploads')));

    // ======================
    // ROUTES
    // ======================

    // Home redirect
    app.get('/', (req, res) => {
        res.redirect('/login');
    });

    // Auth routes (login, register, logout)
    app.use('/', authRoutes);

    // User routes (profile, leaderboard, users)
    app.use('/', userRoutes);

    // Game routes (dashboard, play, chat, spectate)
    app.use('/', gameRoutes);

    // Error route for client-side errors
    app.get('/error', (req, res) => {
        const message = req.query.message || 'An unexpected error occurred.';
        res.status(400).render('error', { message });
    });

    // ======================
    // ERROR HANDLING
    // ======================

    // 404 handler
    app.use(notFoundHandler);

    // Global error handler
    app.use(globalErrorHandler);

    return app;
};

module.exports = createApp;
