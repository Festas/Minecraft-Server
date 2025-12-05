const { body, param, query, validationResult } = require('express-validator');

/**
 * Middleware to check validation results
 */
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

/**
 * Common validation rules
 */
const validations = {
    // Login validation
    login: [
        body('username')
            .trim()
            .isLength({ min: 1, max: 50 })
            .withMessage('Username must be between 1 and 50 characters')
            .matches(/^[a-zA-Z0-9_@.-]+$/)
            .withMessage('Username can only contain letters, numbers, underscores, hyphens, dots, and @ symbols'),
        body('password')
            .isLength({ min: 1 })
            .withMessage('Password is required'),
        validate
    ],

    // Command execution validation
    executeCommand: [
        body('command')
            .trim()
            .isLength({ min: 1, max: 500 })
            .withMessage('Command must be between 1 and 500 characters')
            .matches(/^[a-zA-Z0-9_\-/\s.:[\]{}@=,]+$/)
            .withMessage('Command contains invalid characters'),
        validate
    ],

    // Player management validation
    playerName: [
        param('player')
            .trim()
            .isLength({ min: 3, max: 16 })
            .withMessage('Player name must be between 3 and 16 characters')
            .matches(/^[a-zA-Z0-9_]+$/)
            .withMessage('Player name can only contain letters, numbers, and underscores'),
        validate
    ],

    // File path validation
    filePath: [
        body('path')
            .trim()
            .notEmpty()
            .withMessage('Path is required')
            .matches(/^[a-zA-Z0-9_\-/.]+$/)
            .withMessage('Path contains invalid characters')
            .custom((value) => {
                // Prevent directory traversal - check for various patterns
                const normalizedPath = value.toLowerCase();
                
                // Check for .. patterns (including URL encoded)
                if (value.includes('..') || normalizedPath.includes('%2e%2e') || 
                    normalizedPath.includes('%252e%252e')) {
                    throw new Error('Directory traversal attempt detected');
                }
                
                // Check for absolute paths
                if (value.startsWith('/') || value.startsWith('\\')) {
                    throw new Error('Absolute paths are not allowed');
                }
                
                // Check for backslashes (Windows path separator)
                if (value.includes('\\')) {
                    throw new Error('Backslashes are not allowed in paths');
                }
                
                return true;
            }),
        validate
    ],

    // Plugin name validation
    pluginName: [
        body('name')
            .trim()
            .isLength({ min: 1, max: 100 })
            .withMessage('Plugin name must be between 1 and 100 characters')
            .matches(/^[a-zA-Z0-9_\-.]+$/)
            .withMessage('Plugin name contains invalid characters'),
        validate
    ],

    // Backup name validation
    backupName: [
        param('name')
            .optional()
            .trim()
            .matches(/^[a-zA-Z0-9_\-.]+$/)
            .withMessage('Backup name contains invalid characters'),
        validate
    ],

    // Pagination validation
    pagination: [
        query('page')
            .optional()
            .isInt({ min: 1 })
            .withMessage('Page must be a positive integer'),
        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('Limit must be between 1 and 100'),
        validate
    ]
};

module.exports = {
    validate,
    validations
};
