const jwt = require('jsonwebtoken');

/**
 * Middleware to verify JWT token and protect routes
 */
const isLoggedIn = (req, res, next) => {
    try {
        const token = req.cookies.token;
        
        if (!token) {
            const err = new Error('Please log in to continue.');
            err.status = 401;
            throw err;
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            error.message = 'Invalid token. Please log in again.';
            error.status = 401;
        } else if (error.name === 'TokenExpiredError') {
            error.message = 'Session expired. Please log in again.';
            error.status = 401;
        }
        next(error);
    }
};

/**
 * Generate JWT token for a user
 */
const generateToken = (user) => {
    return jwt.sign(
        { 
            email: user.email, 
            userid: user._id 
        },
        process.env.JWT_SECRET || 'secret',
        { 
            expiresIn: process.env.JWT_EXPIRES_IN || '24h' 
        }
    );
};

/**
 * Optional auth - attaches user if token exists, but doesn't require it
 */
const optionalAuth = (req, res, next) => {
    try {
        const token = req.cookies.token;
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
            req.user = decoded;
        }
    } catch (error) {
        // Token invalid, but that's okay for optional auth
        req.user = null;
    }
    next();
};

module.exports = {
    isLoggedIn,
    generateToken,
    optionalAuth
};
