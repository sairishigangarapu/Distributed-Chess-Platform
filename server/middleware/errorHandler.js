/**
 * Custom error class for API errors
 */
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res, next) => {
    const err = new AppError(`Cannot find ${req.originalUrl} on this server`, 404);
    next(err);
};

/**
 * Global error handler middleware
 */
const globalErrorHandler = (err, req, res, next) => {
    console.error('Error:', err.stack || err);

    const statusCode = err.statusCode || err.status || 500;
    const message = process.env.NODE_ENV === 'production' && statusCode === 500
        ? 'Oops! Something went wrong. Please try again.'
        : err.message || 'An unexpected error occurred.';

    // If headers already sent, delegate to default Express error handler
    if (res.headersSent) {
        return next(err);
    }

    // Check if request expects JSON (API request)
    if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(statusCode).json({
            success: false,
            status: err.status || 'error',
            message,
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        });
    }

    // Render error page for browser requests
    res.status(statusCode);
    try {
        res.render('error', { message });
    } catch (renderError) {
        console.error('Error rendering error page:', renderError);
        res.type('txt').send(`Server Error: ${message}`);
    }
};

module.exports = {
    AppError,
    asyncHandler,
    notFoundHandler,
    globalErrorHandler
};
